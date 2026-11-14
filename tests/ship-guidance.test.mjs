import test from 'node:test';
import assert from 'node:assert/strict';
import { makePrivateShip } from '../private-ships.mjs';
import { createShipBuilder } from '../shipbuilder.mjs';
import { createShip } from '../model.mjs';
import { selectVerifiedShipClass, shipSourceStatus, applyGuidedShipBuilder } from '../ship-guidance.mjs';

const sha='f'.repeat(64);
function template(){
  return makePrivateShip({id:'fictional-hull',sourceSha256:sha,page:160,
    kind:'starship',era:'Fictional era',className:'Fictional survey class',scale:3,
    systems:Object.fromEntries(['comms','computers','engines','sensors','structure','weapons'].map(k=>[k,8])),
    departments:Object.fromEntries(['command','conn','security','engineering','science','medicine'].map(k=>[k,2]))});
}
test('verified class applies source ratings without erasing a custom identity',()=>{
  const original=createShipBuilder();
  original.name='Player-named ship';original.registry='Owner registry';
  original.notes='Original player notes';original.talents='Talent A\nTalent B\nTalent C';
  original.polityTrait='Player-chosen polity';
  const source=template();
  const plan=selectVerifiedShipClass(original,source,sha,336);
  assert.equal(plan.sourceRef.recordId,'fictional-hull');
  assert.equal(plan.name,'Player-named ship');
  assert.equal(plan.notes,'Original player notes');
  assert.equal(plan.systems.engines,'8');
  assert.equal(shipSourceStatus(plan,[source],sha),'verified');
  const applied=applyGuidedShipBuilder(createShip(),plan,[source],sha);
  assert.equal(applied.name,'Player-named ship');
  assert.equal(applied.registry,'Owner registry');
  assert.equal(applied.builder.sourceRef.page,160);
});
test('stale or modified class ratings cannot be applied as verified',()=>{
  const entry=template(), draft=createShipBuilder();
  const selected=selectVerifiedShipClass(draft,entry,sha,336);
  selected.systems.comms='9';
  assert.equal(shipSourceStatus(selected,[entry],sha),'modified');
  assert.throws(()=>applyGuidedShipBuilder(createShip(),selected,[entry],sha),/not verified/);
  assert.equal(shipSourceStatus(selected,[],sha),'missing-class');
  assert.equal(shipSourceStatus(selected,[entry],'a'.repeat(64)),'different-source');
});
test('another PDF, malformed source page and incomplete player setup are blocked',()=>{
  const entry=template();
  assert.throws(()=>selectVerifiedShipClass(createShipBuilder(),entry,'a'.repeat(64),336),/different/);
  assert.throws(()=>selectVerifiedShipClass(createShipBuilder(),entry,sha,150),/outside/);
  const incomplete=selectVerifiedShipClass(createShipBuilder(),entry,sha,336);
  assert.throws(()=>applyGuidedShipBuilder(createShip(),incomplete,[entry],sha),/polity trait|Name|talents/i);
});
test('legacy manual ship drafts remain independent',()=>{
  const plan=createShipBuilder();
  plan.name='Custom ship';
  assert.equal(shipSourceStatus(plan,[],sha),'manual');
});
