import { createShip, SHIP_SYSTEMS, SHIP_DEPARTMENTS } from './model.mjs';

// Captain's Log (2026), vessel/station creation outline: PDF pp. 146–148, 172–175, 182–183.
// The player supplies frame statistics and licensed talent names from their own book.
const blankRatings = names => Object.fromEntries(names.map(n => [n.toLowerCase(), '']));

export function createShipBuilder() {
  return { kind: 'starship', era: '', className: '', scale: '', polityTrait: '', uniqueTrait: '',
    name: '', registry: '', talents: '', notes: '',
    systems: blankRatings(SHIP_SYSTEMS), departments: blankRatings(SHIP_DEPARTMENTS),
    mode: 'manual', sourceRef: null, appliedAt: null };
}

export const shipTalentLimit = (kind, scale) => kind === 'station' ? Math.floor(scale / 2) : scale;
export const shipTalents = raw => String(raw || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean);

export function normalizeShipBuilder(raw) {
  const blank = createShipBuilder();
  return {...blank, ...raw,
    mode: raw?.mode === 'guided' ? 'guided' : 'manual',
    sourceRef: raw?.sourceRef && typeof raw.sourceRef === 'object' &&
      typeof raw.sourceRef.recordId === 'string' &&
      /^[a-f0-9]{64}$/.test(raw.sourceRef.sourceSha256 ?? '') &&
      Number.isSafeInteger(raw.sourceRef.page) && raw.sourceRef.page > 0
        ? { recordId: raw.sourceRef.recordId, sourceSha256: raw.sourceRef.sourceSha256,
            page: raw.sourceRef.page, className: String(raw.sourceRef.className ?? '') }
        : null,
    systems: {...blank.systems, ...raw?.systems}, departments: {...blank.departments, ...raw?.departments}};
}

export function reviewShipBuilder(raw) {
  const plan = normalizeShipBuilder(raw);
  const errors = [];
  const kind = plan.kind;
  if (!['starship','station'].includes(kind)) errors.push('Choose starship or station.');
  if (!plan.era.trim()) errors.push('Choose an era.');
  if (kind === 'starship' && !plan.className.trim()) errors.push('Enter a ship class.');
  const scale = Number(plan.scale);
  if (String(plan.scale).trim() === '' || !Number.isSafeInteger(scale) || scale < 1) errors.push('Scale must be a positive whole number.');
  if (!plan.polityTrait.trim()) errors.push('Enter the polity trait.');
  if (!plan.name.trim()) errors.push('Name the ship or station.');
  if (kind === 'starship' && !plan.registry.trim()) errors.push('Enter the ship registry.');
  for (const [labels, record, minimum, maximum, name] of [
    [SHIP_SYSTEMS, plan.systems, 6, 12, 'system'],
    [SHIP_DEPARTMENTS, plan.departments, 1, 5, 'department']
  ]) {
    for (const label of labels) {
      const rawValue = String(record[label.toLowerCase()] ?? '').trim();
      if (kind === 'station' && !rawValue) continue;
      const value = Number(rawValue);
      if (!/^\d+$/.test(rawValue) || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
        errors.push(`${label} ${name} must be ${minimum}–${maximum}.`);
      }
    }
  }
  const talents = shipTalents(plan.talents);
  if (Number.isSafeInteger(scale) && scale > 0) {
    const cap = shipTalentLimit(kind, scale);
    if (kind === 'starship' && talents.length !== cap) errors.push(`Starship needs ${cap} talent${cap === 1 ? '' : 's'} (${talents.length} entered).`);
    if (kind === 'station' && talents.length > cap) errors.push(`Station permits up to ${cap} talents.`);
  }
  return { ready: errors.length === 0, errors, talentCount: talents.length, talentLimit: scale > 0 ? shipTalentLimit(kind,scale) : 0 };
}

export function applyShipBuilder(ship, raw) {
  const plan = normalizeShipBuilder(raw);
  const review = reviewShipBuilder(plan);
  if (!review.ready) throw new Error(review.errors[0]);
  const traits = [plan.polityTrait.trim(), plan.uniqueTrait.trim()].filter(Boolean).join('\n');
  return {...createShip(), ...ship,
    name: plan.name.trim(), registry: plan.registry.trim(), className: plan.className.trim(),
    scale: String(plan.scale), kind: plan.kind, era: plan.era.trim(),
    traits, talents: shipTalents(plan.talents).join('\n'),
    systems: {...plan.systems}, departments: {...plan.departments},
    builder: {...plan, appliedAt: new Date().toISOString()}
  };
}