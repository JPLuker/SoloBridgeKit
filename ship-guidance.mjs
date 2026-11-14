// Source provenance for private class templates. No official vessel data included.
import { makePrivateShip, applyPrivateShip } from './private-ships.mjs';
import { createShipBuilder, normalizeShipBuilder, reviewShipBuilder, applyShipBuilder } from './shipbuilder.mjs';

const HASH=/^[a-f0-9]{64}$/;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function selectVerifiedShipClass(rawBuilder, option, sha, pageCount){
  if(!HASH.test(sha??'') || option?.sourceSha256!==sha)
    throw new Error('Ship class is from a different or unverified source PDF.');
  const verified=makePrivateShip(option);
  if(!Number.isSafeInteger(verified.page)||verified.page>pageCount)
    throw new Error('Ship class source page is outside the imported PDF.');
  const existing=normalizeShipBuilder(rawBuilder ?? createShipBuilder());
  const selected=applyPrivateShip(existing,verified);
  return {...selected, mode:'guided',
    sourceRef:{recordId:verified.id,sourceSha256:sha,page:verified.page,className:verified.className},
    appliedAt:null};
}
export function shipSourceStatus(rawBuilder,options,sha){
  const plan=normalizeShipBuilder(rawBuilder);
  if(!plan.sourceRef)return 'manual';
  if(plan.sourceRef.sourceSha256!==sha)return 'different-source';
  const choice=Array.isArray(options)? options.find(x=>x.id===plan.sourceRef.recordId):null;
  if(!choice || choice.sourceSha256!==sha || choice.page!==plan.sourceRef.page)return 'missing-class';
  const expected=makePrivateShip(choice);
  return plan.kind===expected.kind && plan.era===expected.era &&
    plan.className===expected.className && String(plan.scale)===String(expected.scale) &&
    equal(plan.systems,expected.systems) && equal(plan.departments,expected.departments)
      ? 'verified' : 'modified';
}
export function applyGuidedShipBuilder(ship,rawBuilder,options,sha){
  const state=shipSourceStatus(rawBuilder,options,sha);
  if(state!=='verified')throw new Error('Ship class data is not verified ('+state+').');
  const report=reviewShipBuilder(rawBuilder);
  if(!report.ready)throw new Error(report.errors[0]);
  return applyShipBuilder(ship,rawBuilder);
}
