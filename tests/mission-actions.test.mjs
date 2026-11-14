import test from 'node:test';
import assert from 'node:assert/strict';
import { createEpisode, resolveTask } from '../model.mjs';
import { commitTaskToMission } from '../mission-actions.mjs';

test('mission action records the resolved task without mutating the original mission', () => {
  const mission = createEpisode('A sample user mission');
  const result = resolveTask({ attribute: 10, discipline: 3, dice: [1,2] });
  const stored = commitTaskToMission(mission, { attribute: 'control', discipline: 'command' },
    { focusApplies: true }, result);
  assert.equal(mission.taskHistory.length, 0);
  assert.equal(stored.updatedEpisode.taskHistory.length, 1);
  assert.equal(stored.updatedEpisode.momentum, true);
  assert.equal(stored.record.attribute, 'control');
  assert.equal(stored.before.momentum, false);
});

test('mission action preserves threat state and uses source-backed roll history', () => {
  const mission = createEpisode('Another user-created mission');
  const result = resolveTask({ attribute: 10, discipline: 3, dice: [20,19] });
  const stored = commitTaskToMission(mission, { attribute: 'daring', discipline: 'security' },
    { focusApplies: false }, result);
  assert.equal(stored.updatedEpisode.threat, true);
  assert.equal(stored.record.success, false);
  assert.throws(() => commitTaskToMission({}, {attribute:'daring', discipline:'security'}, {}, result));
});


test('recorded task inherits the selected saved scene without changing another scene',()=>{
  const ep=createEpisode('Synthetic scene-based mission');
  ep.activeSceneId='2:3';
  const outcome=resolveTask({attribute:8,discipline:3,dice:[1,4]});
  const {updatedEpisode,record}=commitTaskToMission(ep,
    {attribute:'control',discipline:'science'},{focusApplies:true},outcome);
  assert.equal(record.sceneId,'2:3');
  assert.equal(updatedEpisode.taskHistory[0].sceneId,'2:3');
  assert.equal(ep.taskHistory.length,0);
  assert.throws(()=>commitTaskToMission(ep,{attribute:'control',discipline:'science'},
    {sceneId:'3:99'},outcome),/scene no longer exists/);
});
