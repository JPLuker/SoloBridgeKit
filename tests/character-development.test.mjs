import test from 'node:test';
import assert from 'node:assert/strict';
import { createCharacter } from '../model.mjs';
import { applyCharacterMilestone, replaceChallengedValue, addCharacterCondition,
  updateCharacterCondition, swapEndOfMissionFocus, normalizeCharacterDevelopment } from '../character-development.mjs';
const sha='b'.repeat(64);
const completed={missionId:'fictional-episode',missionComplete:true,sourcePdfSha256:sha,reason:'value-used'};
function complete(){
  const char=createCharacter();
  char.attributes={control:'12',daring:'10',fitness:'9',insight:'9',presence:'8',reason:'8'};
  char.disciplines={command:'5',conn:'3',security:'2',engineering:'2',science:'2',medicine:'2'};
  char.values='Value A\nValue B\nValue C\nValue D';
  char.focuses='Focus A\nFocus B\nFocus C\nFocus D\nFocus E\nFocus F';
  return char;
}
test('after a completed mission, one source-linked attribute redistribution is allowed',()=>{
  const c=complete();
  const next=applyCharacterMilestone(c,{type:'attribute-shift',from:'control',to:'reason'},completed);
  assert.equal(next.attributes.control,'11');
  assert.equal(next.attributes.reason,'9');
  assert.equal(c.attributes.control,'12');
  assert.equal(next.development.history[0].sourcePage,142);
  assert.throws(()=>applyCharacterMilestone(next,{type:'discipline-shift',from:'command',to:'conn'},completed),/already/);
});
test('cap and floor constraints refuse invalid adjustments without changing source',()=>{
  const c=complete();
  assert.throws(()=>applyCharacterMilestone(c,{type:'attribute-shift',from:'reason',to:'control'},completed),/above 12/);
  assert.throws(()=>applyCharacterMilestone(c,{type:'discipline-shift',from:'conn',to:'command'},completed),/above 5/);
  assert.throws(()=>applyCharacterMilestone(c,{type:'attribute-shift',from:'control',to:'control'},completed),/different/);
  assert.equal(c.development?.history?.length??0,0);
});
test('milestone requires a completed mission and a finished 56/16 character',()=>{
  const c=complete();
  assert.throws(()=>applyCharacterMilestone(c,{type:'focus-swap',from:'Focus A',to:'New focus'},
    {...completed,missionComplete:false}),/completed mission/);
  c.attributes.reason='7';
  assert.throws(()=>applyCharacterMilestone(c,{type:'focus-swap',from:'Focus A',to:'New focus'},completed),/56\/16/);
});
test('milestone focus replacement keeps six focuses, refuses duplicates',()=>{
  const c=complete();
  const updated=applyCharacterMilestone(c,{type:'focus-swap',from:'Focus A',to:'Focus G'},completed);
  assert.equal(updated.focuses.split('\n').length,6);
  assert.ok(updated.focuses.includes('Focus G'));
  assert.throws(()=>applyCharacterMilestone(c,{type:'focus-swap',from:'Focus A',to:'Focus B'},completed),/different, unused/);
});
test('challenged value replacement requires explicit confirmation and retains source reference',()=>{
  const c=complete();
  assert.throws(()=>replaceChallengedValue(c,{from:'Value A',to:'Changed'},completed),/Confirm/);
  const result=replaceChallengedValue(c,{from:'Value A',to:'Changed'}, {...completed,challenged:true});
  assert.ok(result.values.includes('Changed'));
  assert.equal(result.development.history[0].sourcePage,202);
  assert.throws(()=>replaceChallengedValue(result,{from:'Value A',to:'Again'}, {...completed,challenged:true}),/not found|already/);
});
test('ongoing injuries are descriptive, persistent and do not change ratings',()=>{
  const c=complete();
  const injured=addCharacterCondition(c,{label:'Player-described injury',notes:'Requires treatment'},
    {sourcePdfSha256:sha});
  assert.equal(injured.development.conditions[0].state,'active');
  assert.equal(injured.attributes.control,c.attributes.control);
  const recovered=updateCharacterCondition(injured,injured.development.conditions[0].id,'resolved');
  assert.equal(recovered.development.conditions[0].state,'resolved');
  assert.equal(recovered.development.history.length,0);
  assert.throws(()=>updateCharacterCondition(recovered,'missing','active'),/no longer exists/);
  assert.equal(normalizeCharacterDevelopment(recovered.development).conditions.length,1);
});

test('one mission-end Focus refresh is allowed alongside a different milestone',()=>{
  const c=complete();
  const advanced=applyCharacterMilestone(c,{type:'attribute-shift',from:'control',to:'reason'},completed);
  const refreshed=swapEndOfMissionFocus(advanced,{from:'Focus A',to:'Focus G'},completed);
  assert.equal(refreshed.development.history.length,2);
  assert.equal(refreshed.development.history[1].sourcePage,203);
  assert.ok(refreshed.focuses.includes('Focus G'));
  assert.throws(()=>swapEndOfMissionFocus(refreshed,{from:'Focus B',to:'Focus H'},completed),/already been changed/);
  const focusMilestone=applyCharacterMilestone(c,{type:'focus-swap',from:'Focus A',to:'Focus G'},completed);
  assert.throws(()=>swapEndOfMissionFocus(focusMilestone,{from:'Focus B',to:'Focus H'},completed),/already been changed/);
});
