import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyReleaseProvenance} from '../scripts/verify-release-provenance.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');

test('independent provenance verification catches modified, missing and extra files',()=>{
  const dir=mkdtempSync(join(tmpdir(),'solobridge-provenance-'));
  try{
    const dist=join(dir,'dist');mkdirSync(dist);
    writeFileSync(join(dist,'app.mjs'),'synthetic app');
    const report={format:'solobridgekit-build-provenance',schemaVersion:1,
      applicationVersion:'0.25.0',fileCount:1,
      files:[{path:'app.mjs',bytes:13,sha256:sha('synthetic app')}]};
    assert.equal(verifyReleaseProvenance(report,dist).filesVerified,1);
    writeFileSync(join(dist,'app.mjs'),'tampered bytes');
    assert.throws(()=>verifyReleaseProvenance(report,dist),/mismatch/);
    writeFileSync(join(dist,'app.mjs'),'synthetic app');
    writeFileSync(join(dist,'extra.js'),'unexpected');
    assert.throws(()=>verifyReleaseProvenance(report,dist),/Extra or missing/);
    assert.throws(()=>verifyReleaseProvenance({...report,files:[{path:'../outside',bytes:1,sha256:sha('x')}]},dist),/unsafe/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
