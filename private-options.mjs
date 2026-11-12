// Reusable, privately verified lifepath choices derived from the player's own book.
// No copyrighted character options are bundled in this source.
const HASH = /^[0-9a-f]{64}$/;
const STEPS = new Set(['species', 'environment', 'outlook', 'education', 'career', 'event1', 'event2']);
const ATTRIBUTE_KEYS = ['control','daring','fitness','insight','presence','reason'];
const DISCIPLINE_KEYS = ['command','conn','security','engineering','science','medicine'];
export const categoryForStep = stepId => stepId === 'event1' || stepId === 'event2' ? 'careerEvent' : stepId;

function fixedBonuses(raw, allowed, label) {
  if (!raw || typeof raw !== 'object') throw new Error(label + ' bonuses are missing.');
  const record = {};
  for (const key of allowed) {
    const value = Number(raw[key] ?? 0);
    if (!Number.isSafeInteger(value) || value < 0 || value > 5)
      throw new Error(label + ' bonus ' + key + ' is invalid.');
    record[key] = value;
  }
  return record;
}
function clean(value, max, name) {
  if (typeof value !== 'string' || value.length > max)
    throw new Error('Invalid ' + name + '.');
  return value;
}
export function makePrivateOption({ id = globalThis.crypto?.randomUUID?.(),
  stepId, label, page, sourceSha256, record }) {
  if (!STEPS.has(stepId)) throw new Error('Unsupported lifepath stage.');
  if (!HASH.test(sourceSha256 ?? '')) throw new Error('Source PDF fingerprint is missing.');
  if (typeof id !== 'string' || !id || id.length > 120)
    throw new Error('Invalid private option ID.');
  const name = String(label ?? '').trim();
  if (!name || name.length > 120) throw new Error('Enter a name up to 120 characters.');
  const n = Number(page);
  if (!Number.isSafeInteger(n) || n < 1 || n > 2000) throw new Error('Invalid source PDF page.');
  if (!record || typeof record !== 'object') throw new Error('Missing option fields.');
  return {
    id, stage: categoryForStep(stepId), label: name, page: n, sourceSha256,
    record: {
      choice: name,
      attributes: fixedBonuses(record.attributes, ATTRIBUTE_KEYS, 'Attribute'),
      disciplines: fixedBonuses(record.disciplines, DISCIPLINE_KEYS, 'Discipline'),
      value: clean(record.value ?? '', 160, 'value'),
      focuses: clean(record.focuses ?? '', 2000, 'focuses'),
      notes: clean(record.notes ?? '', 4000, 'notes')
    }
  };
}

export function normalizePrivateOptions(options, sourceSha256) {
  if (options == null) return [];
  if (!Array.isArray(options) || !HASH.test(sourceSha256 ?? ''))
    throw new Error('Invalid private options collection.');
  const ids = new Set();
  return options.map(option => {
    if (!option || ids.has(option.id)) throw new Error('Duplicate private option ID.');
    const stage = option.stage === 'careerEvent' ? 'event1' : option.stage;
    const verified = makePrivateOption({ id: option.id, stepId: stage,
      label: option.label, page: option.page, sourceSha256: option.sourceSha256,
      record: option.record });
    if (verified.sourceSha256 !== sourceSha256 || verified.stage !== option.stage)
      throw new Error('Private choice is from a different rulebook.');
    ids.add(option.id);
    return verified;
  });
}
export function addPrivateOption(options, option, sourceSha256) {
  const existing = normalizePrivateOptions(options, sourceSha256);
  if (existing.some(x => x.id === option.id)) throw new Error('Option already exists.');
  return normalizePrivateOptions([...existing, option], sourceSha256);
}
export function removePrivateOption(options, id, sourceSha256) {
  const existing = normalizePrivateOptions(options, sourceSha256);
  if (!existing.some(x => x.id === id)) throw new Error('Option not found.');
  return existing.filter(x => x.id !== id);
}
export function optionsForStep(options, stepId, sourceSha256) {
  if (!STEPS.has(stepId)) return [];
  return normalizePrivateOptions(options, sourceSha256).filter(option => option.stage === categoryForStep(stepId));
}
export function applyPrivateOption(option, stepId) {
  if (!STEPS.has(stepId) || option?.stage !== categoryForStep(stepId))
    throw new Error('This option does not belong to the selected lifepath step.');
  return {
    choice: option.label,
    attributes: { ...option.record.attributes },
    disciplines: { ...option.record.disciplines },
    value: option.record.value,
    focuses: option.record.focuses,
    notes: option.record.notes
  };
}
