import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTask, normalizeEpisode, createEpisode } from '../model.mjs';
import { createTaskRecord, normalizeTaskHistory, appendTaskRecord, rerollTaskRecord, deleteTaskRecord } from '../rollhistory.mjs';

function roll(dice) { return resolveTask({attribute:9,discipline:4,dice,focusApplies:true}); }
function record(id, dice=[2,20]) {
  return createTaskRecord({attribute:'control',discipline:'science',focusApplies:true,result:roll(dice)}, id, '2026-11-12T10:00:00.000Z');
}
test('legacy missions load without a task history',()=>{
  const old = {...createEpisode('Old'),taskHistory:undefined};
  assert.deepEqual(normalizeEpisode(old).taskHistory,[]);
});
test('task record stores the exact two dice, target, focus and outcome',()=>{
  const next=record('one');
  assert.deepEqual(next.dice,[2,20]);
  assert.equal(next.target,13);
  assert.equal(next.success,true);
  assert.equal(next.threatGenerated,true);
  assert.equal(next.focusAdvantage,true);
});
test('adding task records preserves older records and rejects duplicate IDs',()=>{
  const first=record('a'); const second=record('b',[12,14]);
  const history=appendTaskRecord(undefined,first);
  const combined=appendTaskRecord(history,second);
  assert.equal(history.length,1);
  assert.equal(combined.length,2);
  assert.throws(()=>appendTaskRecord(combined,first));
});
test('reroll preserves history identity and original dice, changes only the chosen die',()=>{
  const initial=record('a');
  const next=roll([2,8]);
  const updated=rerollTaskRecord([initial],'a',1,next);
  assert.deepEqual(updated[0].dice,[2,8]);
  assert.deepEqual(updated[0].originalDice,[2,20]);
  assert.equal(updated[0].rerolledDie,2);
  assert.equal(updated[0].at,initial.at);
  assert.equal(updated[0].id,'a');
  assert.equal(initial.originalDice,undefined);
  assert.throws(()=>rerollTaskRecord(updated,'a',1,roll([2,6])),/already/);
});
test('reroll rejects changing the other die or a missing record',()=>{
  const initial=record('a');
  assert.throws(()=>rerollTaskRecord([initial],'a',1,roll([5,8])),/Only one/);
  assert.throws(()=>rerollTaskRecord([initial],'a',2,roll([2,8])),/Choose a die/);
  assert.throws(()=>rerollTaskRecord([initial],'missing',1,roll([2,8])),/not be found/);
});
test('deleting a single roll keeps the others',()=>{
  const history=[record('a'),record('b')];
  assert.deepEqual(deleteTaskRecord(history,'a').map(x=>x.id),['b']);
  assert.equal(history.length,2);
  assert.throws(()=>deleteTaskRecord(history,'missing'));
});
test('invalid saved roll histories are rejected, not silently stripped',()=>{
  assert.deepEqual(normalizeTaskHistory(null),[]);
  assert.throws(()=>normalizeTaskHistory({}));
  assert.throws(()=>normalizeTaskHistory([record('a'),record('a')]));
  assert.throws(()=>normalizeTaskHistory([{...record('a'),dice:[1,40]}]));
});