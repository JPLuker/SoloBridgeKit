import { CHARACTER_ATTRIBUTES, CHARACTER_DISCIPLINES, createCharacter } from './model.mjs';

// Captain's Log (2026) lifepath summary, PDF pages 97–98 and finishing rules, PDF page 135.
// Stage-specific species, upbringing, education and career-event option restrictions
// are NOT bundled: the user checks their privately imported book and enters their choices.
export const LIFEPATH_STEPS = Object.freeze([
  { id: 'species', title: '1. Species', page: 97, attributes: 3, disciplines: 0, values: 0, focuses: 0, pattern: 'threeDistinct' },
  { id: 'environment', title: '2. Environment', page: 109, attributes: 1, disciplines: 1, values: 1, focuses: 0, pattern: 'single' },
  { id: 'outlook', title: '3. Early outlook', page: 113, attributes: 3, disciplines: 1, values: 0, focuses: 1, pattern: 'twoPlusOne' },
  { id: 'education', title: '4. Education', page: 121, attributes: 3, disciplines: 4, values: 1, focuses: 3, pattern: 'education' },
  { id: 'career', title: '5. Career length', page: 128, attributes: 0, disciplines: 0, values: 1, focuses: 0, pattern: 'none' },
  { id: 'event1', title: '6. Career event 1', page: 129, attributes: 1, disciplines: 1, values: 0, focuses: 1, pattern: 'single' },
  { id: 'event2', title: '6. Career event 2', page: 129, attributes: 1, disciplines: 1, values: 0, focuses: 1, pattern: 'single' },
  { id: 'finishing', title: '7. Finishing touches', page: 135, attributes: 2, disciplines: 2, values: 1, focuses: 0, pattern: 'twoDistinct' }
]);
const keyed = names => Object.fromEntries(names.map(n => [n.toLowerCase(), 0]));
const summaryNumbers = source => Object.values(source).reduce((s, n) => s + n, 0);

export function createLifepath() {
  return { stages: Object.fromEntries(LIFEPATH_STEPS.map(step => [step.id, {
    choice: '', attributes: keyed(CHARACTER_ATTRIBUTES), disciplines: keyed(CHARACTER_DISCIPLINES),
    value: '', focuses: '', notes: ''
  }])), appliedAt: null };
}

function numberMap(input, keys) {
  const result = {};
  for (const name of keys) {
    const key = name.toLowerCase();
    const n = input?.[key] ?? 0;
    if ((typeof n !== 'number' && typeof n !== 'string') || n === '' || !/^\d+$/.test(String(n)) || Number(n) > 30) {
      throw new Error(`${name} bonus must be a whole number from 0 to 30.`);
    }
    result[key] = Number(n);
  }
  return result;
}

export function normalizeLifepath(raw) {
  const blank = createLifepath();
  const stages = {};
  for (const step of LIFEPATH_STEPS) {
    const saved = raw?.stages?.[step.id] || {};
    stages[step.id] = {
      choice: String(saved.choice ?? ''),
      attributes: numberMap(saved.attributes, CHARACTER_ATTRIBUTES),
      disciplines: numberMap(saved.disciplines, CHARACTER_DISCIPLINES),
      value: String(saved.value ?? ''), focuses: String(saved.focuses ?? ''), notes: String(saved.notes ?? '')
    };
  }
  return { ...blank, stages, appliedAt: raw?.appliedAt ?? null };
}

export const focusLines = text => String(text).split(/\r?\n/).map(s => s.trim()).filter(Boolean);

function maxValues(values, cap) {
  return Object.values(values).every(n => n <= cap);
}

export function validateLifepathStep(stepId, record) {
  const def = LIFEPATH_STEPS.find(s => s.id === stepId);
  if (!def) throw new Error('Unknown lifepath step.');
  const errors = [];
  const attr = numberMap(record?.attributes, CHARACTER_ATTRIBUTES);
  const disc = numberMap(record?.disciplines, CHARACTER_DISCIPLINES);
  const a = Object.values(attr).filter(Boolean);
  const d = Object.values(disc).filter(Boolean);
  const totalA = summaryNumbers(attr), totalD = summaryNumbers(disc);
  if (!String(record.choice || '').trim() && def.id !== 'finishing') errors.push('Enter your choice from the rulebook.');
  if (totalA !== def.attributes) errors.push(`Allocate ${def.attributes} attribute points (${totalA} assigned).`);
  if (totalD !== def.disciplines) errors.push(`Allocate ${def.disciplines} discipline points (${totalD} assigned).`);
  if (def.pattern === 'threeDistinct' && (a.length !== 3 || a.some(n => n !== 1))) errors.push('Choose three different attributes, +1 each.');
  if (def.pattern === 'twoDistinct' && (a.length !== 2 || a.some(n => n !== 1) || d.length !== 2 || d.some(n => n !== 1))) errors.push('Choose two different attributes and disciplines, +1 each.');
  if (def.pattern === 'twoPlusOne' && (a.length !== 2 || !a.includes(2) || !a.includes(1))) errors.push('Early outlook bonuses require +2 and +1 in different attributes.');
  if (def.pattern === 'education') {
    if (!(a.length === 2 && a.includes(2) && a.includes(1)) && !(a.length === 3 && a.every(n => n === 1))) {
      errors.push('Education attributes must be +2/+1 or +1/+1/+1.');
    }
    if (d.length !== 3 || !d.includes(2) || d.filter(n => n === 1).length !== 2) errors.push('Education disciplines must be +2/+1/+1.');
  }
  if (!maxValues(attr, 3) || !maxValues(disc, 4)) errors.push('One or more bonuses exceed the permitted allocation.');
  if ((String(record.value ?? '').trim() ? 1 : 0) !== def.values) errors.push(def.values ? 'Enter a value for this step.' : 'This step does not grant a value.');
  if (focusLines(record.focuses ?? '').length !== def.focuses) errors.push(`Enter ${def.focuses} focus${def.focuses === 1 ? '' : 'es'}, one per line.`);
  return errors;
}

export function lifepathReview(raw) {
  const lifepath = normalizeLifepath(raw);
  const attr = Object.fromEntries(CHARACTER_ATTRIBUTES.map(n => [n.toLowerCase(), 7]));
  const disc = Object.fromEntries(CHARACTER_DISCIPLINES.map(n => [n.toLowerCase(), 1]));
  const errors = [];
  const stageStatus = {};
  const values = [], focuses = [];
  for (const def of LIFEPATH_STEPS) {
    const stage = lifepath.stages[def.id];
    stageStatus[def.id] = validateLifepathStep(def.id, stage);
    errors.push(...stageStatus[def.id].map(message => `${def.title}: ${message}`));
    for (const key of Object.keys(attr)) attr[key] += stage.attributes[key];
    for (const key of Object.keys(disc)) disc[key] += stage.disciplines[key];
    if (def.id === 'education' && Object.values(disc).some(n => n > 4)) {
      errors.push('Education: disciplines cannot exceed 4 at this step.');
    }
    if (stage.value.trim()) values.push(stage.value.trim());
    focuses.push(...focusLines(stage.focuses));
  }
  const aValues = Object.values(attr), dValues = Object.values(disc);
  if (aValues.some(n => n > 12) || aValues.filter(n => n === 12).length > 1) errors.push('Final attributes exceed the cap: max 12, only one at 12. Redistribute at finishing.');
  if (dValues.some(n => n > 5) || dValues.filter(n => n === 5).length > 1) errors.push('Final disciplines exceed the cap: max 5, only one at 5. Redistribute at finishing.');
  if (summaryNumbers(attr) !== 56 || summaryNumbers(disc) !== 16) errors.push('Final totals must be 56 attribute and 16 discipline points.');
  if (values.length !== 4 || focuses.length !== 6) errors.push('A completed character needs four values and six focuses.');
  return { attributes: attr, disciplines: disc, values, focuses, errors, stageStatus, ready: errors.length === 0 };
}

export function applyLifepathToCharacter(character, raw) {
  const review = lifepathReview(raw);
  if (!review.ready) throw new Error(review.errors[0]);
  const stages = normalizeLifepath(raw).stages;
  const result = { ...createCharacter(), ...character,
    attributes: Object.fromEntries(Object.entries(review.attributes).map(([k, v]) => [k, String(v)])),
    disciplines: Object.fromEntries(Object.entries(review.disciplines).map(([k, v]) => [k, String(v)])),
    species: stages.species.choice, environment: stages.environment.choice,
    earlyOutlook: stages.outlook.choice, education: stages.education.choice,
    careerLength: stages.career.choice,
    careerEvents: [stages.event1.choice, stages.event2.choice].join('\n'),
    focuses: review.focuses.join('\n'), values: review.values.join('\n'),
    lifepath: { ...normalizeLifepath(raw), appliedAt: new Date().toISOString() }
  };
  return result;
}