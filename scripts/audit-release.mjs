// Build provenance and release-safety audit. No commercial book content is
// embedded in this report; it contains only local application asset hashes.
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,mkdirSync,writeFileSync,statSync,existsSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const dist=join(root,'dist');
const hash=data=>createHash('sha256').update(data).digest('hex');
const readJson=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const pkg=readJson('package.json');
const lock=readJson('package-lock.json');
if(pkg.name!==lock.name||pkg.version!==lock.version||
  lock.lockfileVersion!==3||lock.packages?.['']?.version!==pkg.version)
  throw new Error('The committed npm lockfile does not match the app version.');
const deps={...pkg.dependencies,...pkg.devDependencies};
const provenance=[];
for(const [name,version] of Object.entries(deps)){
  if(!/^\d+\.\d+\.\d+$/.test(version))
    throw new Error('Dependency '+name+' must be pinned to an exact version.');
  const entry=lock.packages['node_modules/'+name];
  if(!entry||entry.version!==version||!/^sha(256|384|512)-/.test(entry.integrity??''))
    throw new Error('Dependency '+name+' is absent or not integrity-pinned in package-lock.json.');
  const installed=JSON.parse(readFileSync(join(root,'node_modules',name,'package.json'),'utf8'));
  if(installed.version!==version||!installed.license)
    throw new Error('Dependency '+name+' lacks matching local version/license metadata.');
  provenance.push({name,version,license:installed.license});
}
const files=[];
function walk(directory){
  for(const dirent of readdirSync(directory,{withFileTypes:true})){
    const path=join(directory,dirent.name);
    if(dirent.isDirectory()){walk(path);continue;}
    if(!dirent.isFile())throw new Error('Non-file encountered inside distribution.');
    const rel=relative(dist,path).replaceAll('\\','/');
    const data=readFileSync(path);
    files.push({path:rel,bytes:data.length,sha256:hash(data)});
  }
}
if(!existsSync(dist))throw new Error('Build the source-free distribution first.');
walk(dist);
files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
for(const required of ['index.html','app.mjs','sw.js','vendor/pdf.mjs','vendor/pdf.worker.mjs','vendor/PDFJS-LICENSE.txt']){
  if(!files.some(file=>file.path===required))throw new Error('Missing packaged asset: '+required);
}
const sw=readFileSync(join(dist,'sw.js'),'utf8');
for(const local of ['app.mjs','model.mjs','library-books.mjs','mission-workspace.mjs']){
  if(!sw.includes("'./"+local+"'"))throw new Error('Offline cache lacks '+local);
}
const report={
  format:'solobridgekit-build-provenance',schemaVersion:1,
  applicationVersion:pkg.version,
  packageLockSha256:hash(readFileSync(join(root,'package-lock.json'))),
  directDependencies:provenance,
  fileCount:files.length,
  files,
  releaseApproved:false,
  releaseBlockers:[
    'No public code license has been chosen by the owner.',
    'Real-device acceptance with the private 2026 rulebook is still open.',
    'Owner has not approved an official release candidate or version 1.0.'
  ]
};
const target=join(root,'test-output');
mkdirSync(target,{recursive:true});
const filename='SoloBridgeKit-'+pkg.version+'-UNTESTED-provenance.json';
writeFileSync(join(target,filename),JSON.stringify(report,null,2)+'\n',{flag:'w'});
console.log('Audited '+report.fileCount+' packaged application files; SHA-256 provenance saved to '+filename+'. Official release gates remain OPEN.');
