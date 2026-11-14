import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrewMember, createShip } from '../model.mjs';
import { normalizeCrewMember, normalizeCrewRoster, crewSheetReview, crewTaskTarget,
  shipCrewTaskTarget, crewAssignments, addCrewConnection, removeCrewConnection } from '../crew-management.mjs';
test('legacy crew keep names and relationship notes with empty optional NPC sheets',()=>{
  const old=createCrewMember('Owner-written officer');
  old.relationship='Original personal backstory';old.role='Science specialist';
  const member=normalizeCrewMember(old);
  assert.equal(member.name,'Owner-written officer');
  assert.equal(member.relationship,'Original personal backstory');
  assert.equal(member.attributes.reason,'');
  assert.equal(member.sheetMode,'lightweight');
});
test('optional full NPC sheet requires complete, source-entered stats and Focus',()=>{
  const member=normalizeCrewMember(createCrewMember('Crew A'));
  member.sheetMode='full';
  assert.equal(crewSheetReview(member).ready,false);
  for(const k of Object.keys(member.attributes))member.attributes[k]='8';
  for(const k of Object.keys(member.disciplines))member.disciplines[k]='2';
  member.focuses='Player-entered expertise';
  const review=crewSheetReview(member);
  assert.equal(review.ready,true);
  assert.equal(crewTaskTarget(member,'reason','science').target,10);
  member.attributes.reason='13';
  assert.throws(()=>normalizeCrewMember(member),/7–12/);
});
test('ship department as crew representation uses ship ratings without invented NPC scores',()=>{
  const ship=createShip();
  ship.systems.computers='10';ship.departments.science='3';
  assert.equal(shipCrewTaskTarget(ship,'computers','science').target,13);
  assert.throws(()=>shipCrewTaskTarget(ship,'weapons','security'),/source-confirmed/);
  assert.throws(()=>shipCrewTaskTarget(ship,'invalid','science'),/valid ship/);
});
test('assignments and player-authored crew links survive without auto storytelling',()=>{
  const a=normalizeCrewMember(createCrewMember('A'));
  const b=normalizeCrewMember(createCrewMember('B'));
  a.assignment='away-team';a.duty='Player-selected science survey';
  const linked=addCrewConnection(a,b.id,'Close friend from earlier mission');
  assert.equal(linked.connections.length,1);
  assert.equal(linked.connections[0].description,'Close friend from earlier mission');
  assert.equal(crewAssignments([linked,b])['away-team'][0].id,a.id);
  assert.throws(()=>addCrewConnection(linked,b.id,'duplicate'),/unique/);
  assert.equal(removeCrewConnection(linked,b.id).connections.length,0);
  assert.equal(a.connections.length,0);
  assert.throws(()=>addCrewConnection(a,a.id,'self'),/different/);
});
test('NPC roster rejects duplicate records and malformed stat storage',()=>{
  const a=createCrewMember('A');
  assert.throws(()=>normalizeCrewRoster([a,a]),/duplicate/);
  const bad={...a,attributes:{control:'bad'}};
  assert.throws(()=>normalizeCrewMember(bad),/Attribute/);
  assert.equal(normalizeCrewRoster([]).length,0);
});
