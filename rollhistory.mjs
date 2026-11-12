// Player-initiated mechanical roll records; no narrative is generated.
const MAX_NAME = 80;

function validateRecord(record) {
  if (!record || typeof record.id !== 'string' || !record.id || typeof record.at !== 'string' ||
      typeof record.attribute !== 'string' || record.attribute.length > MAX_NAME ||
      typeof record.discipline !== 'string' || record.discipline.length > MAX_NAME ||
      !Array.isArray(record.dice) || record.dice.length !== 2 ||
      record.dice.some(x => !Number.isInteger(x) || x < 1 || x > 20) ||
      !Number.isInteger(record.target) || record.target < 0 || record.target > 60 ||
      ![1,2].includes(record.difficulty) ||
      !Number.isInteger(record.successes) || record.successes < 0 || record.successes > 2 ||
      typeof record.success !== 'boolean' || typeof record.momentumEarned !== 'boolean' ||
      typeof record.threatGenerated !== 'boolean' || typeof record.focusAdvantage !== 'boolean' ||
      typeof record.focusApplies !== 'boolean' ||
      (record.originalDice != null && (!Array.isArray(record.originalDice) || record.originalDice.length !== 2 ||
        record.originalDice.some(x => !Number.isInteger(x) || x < 1 || x > 20))) ||
      (record.rerolledDie != null && ![1,2].includes(record.rerolledDie))) {
    throw new Error('A saved task roll is damaged.');
  }
}

export function normalizeTaskHistory(history) {
  if (history == null) return [];
  if (!Array.isArray(history)) throw new Error('Task history could not be read.');
  const ids = new Set();
  return history.map(record => {
    validateRecord(record);
    if (ids.has(record.id)) throw new Error('The same task roll was saved twice.');
    ids.add(record.id);
    return { ...record, dice: [...record.dice], ...(record.originalDice ? { originalDice: [...record.originalDice] } : {}) };
  });
}

export function createTaskRecord({ attribute, discipline, focusApplies, result },
  id = globalThis.crypto?.randomUUID?.(), at = new Date().toISOString()) {
  const record = {
    id, at, attribute: String(attribute ?? ''), discipline: String(discipline ?? ''),
    focusApplies: Boolean(focusApplies), dice: [...(result?.dice ?? [])],
    target: result?.target, difficulty: result?.difficulty, successes: result?.successes,
    success: result?.success, momentumEarned: result?.momentumEarned,
    threatGenerated: result?.threatGenerated, focusAdvantage: result?.focusAdvantage
  };
  validateRecord(record);
  return record;
}

export function appendTaskRecord(history, record) {
  const records = normalizeTaskHistory(history);
  const next = normalizeTaskHistory([record]);
  if (records.some(x => x.id === next[0].id)) throw new Error('Task roll already saved.');
  return [...records, next[0]];
}

export function rerollTaskRecord(history, id, dieIndex, newResult) {
  const records = normalizeTaskHistory(history);
  if (!Number.isInteger(dieIndex) || ![0,1].includes(dieIndex)) throw new Error('Choose a die to reroll.');
  const previous = records.find(x => x.id === id);
  if (!previous) throw new Error('The original roll could not be found.');
  if (previous.originalDice) throw new Error('This roll has already been rerolled.');
  const changed = createTaskRecord({ attribute: previous.attribute, discipline: previous.discipline,
    focusApplies: previous.focusApplies, result: newResult }, id, previous.at);
  if (changed.dice[1-dieIndex] !== previous.dice[1-dieIndex]) {
    throw new Error('Only one die can change during this reroll.');
  }
  return records.map(x => x.id === id ? { ...changed, originalDice: [...previous.dice], rerolledDie: dieIndex + 1 } : x);
}

export function deleteTaskRecord(history, id) {
  const records = normalizeTaskHistory(history);
  if (!records.some(x=>x.id===id)) throw new Error('Task roll not found.');
  return records.filter(x => x.id !== id);
}