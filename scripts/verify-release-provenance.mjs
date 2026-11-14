// Offline verification of a separately downloaded UNTESTED build and its
// per-file checksums. No trust is inferred from a matching checksum alone.
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,resolve,relative,sep} from 'node:path';

export function verifyReleaseProvenance(report,directory){
  if(!report||report.format!=='solobridgekit-build-provenance'||
    report.schemaVersion!==1||!Array.isArray(report.files)||
    !Number.isSafeInteger(report.fileCount)||report.fileCount!==report.files.length)
    throw new Error('Unsupported or damaged build provenance report.');
  const root=resolve(directory);
  const actual=[];
  function visit(directory){
    for(const dirent of readdirSync(directory,{withFileTypes:true})){
      const file=join(directory,dirent.name);
      if(dirent.isDirectory()){visit(file);continue;}
      if(!dirent.isFile())throw new Error('Unexpected symlink/special file in build.');
      actual.push(relative(root,file).split(sep).join('/'));
    }
  }
  visit(root);
  const paths=new Set();
  for(const entry of report.files){
    const rel=entry?.path;
    if(typeof rel!=='string'||!rel||rel.startsWith('/')||
      rel.split('/').some(part=>part==='..'||part==='.'||!part)||
      !/^[a-f0-9]{64}$/.test(entry.sha256??'')||
      !Number.isSafeInteger(entry.bytes)||entry.bytes<0||paths.has(rel))
      throw new Error('Invalid, duplicate or unsafe provenance file entry.');
    paths.add(rel);
    const source=join(root,...rel.split('/'));
    const info=statSync(source);
    if(!info.isFile()||info.size!==entry.bytes)
      throw new Error('Build size mismatch: '+rel);
    const digest=createHash('sha256').update(readFileSync(source)).digest('hex');
    if(digest!==entry.sha256)throw new Error('Build hash mismatch: '+rel);
  }
  if(actual.length!==paths.size||actual.some(rel=>!paths.has(rel)))
    throw new Error('Extra or missing packaged build files.');
  return {filesVerified:actual.length,applicationVersion:report.applicationVersion};
}

if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){
  const [reportPath,directory]=process.argv.slice(2);
  if(!reportPath||!directory)throw new Error('Usage: node scripts/verify-release-provenance.mjs <report.json> <dist-dir>');
  const report=JSON.parse(readFileSync(resolve(reportPath),'utf8'));
  const result=verifyReleaseProvenance(report,directory);
  console.log('Verified '+result.filesVerified+' application files against SHA-256 build provenance for v'+result.applicationVersion+'.');
}
