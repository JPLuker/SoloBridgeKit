// Single source of truth for persisting a resolved task into a mission.
// No publisher prose or table contents are stored here.
import { createTaskRecord, appendTaskRecord } from './rollhistory.mjs';
import { applyTaskOutcome } from './resources.mjs';

export function commitTaskToMission(episode, labels, params, outcome) {
  if (!episode || !Array.isArray(episode.taskHistory)) throw new Error('Mission data is missing.');
  const attribute = String(labels?.attribute ?? '').trim();
  const discipline = String(labels?.discipline ?? '').trim();
  if (!attribute || !discipline) throw new Error('Select an attribute and discipline.');
  const before = {
    momentum: episode.momentum === true,
    threat: episode.threat === true,
    nextTaskHard: episode.nextTaskHard === true
  };
  const record = createTaskRecord({
    attribute, discipline, focusApplies: params?.focusApplies === true, result: outcome
  });
  const updatedEpisode = {
    ...episode,
    taskHistory: appendTaskRecord(episode.taskHistory, record),
    ...applyTaskOutcome(episode, outcome)
  };
  return { updatedEpisode, record, before };
}
