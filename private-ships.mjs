// Private user-verified starship/station class templates from local source books.
// Only the schema is distributed, never published class statistics or talent descriptions.
const HASH = /^[a-f0-9]{64}$/;
const SYSTEMS = ['comms','computers','engines','sensors','structure','weapons'];
const DEPARTMENTS = ['command','conn','security','engineering','science','medicine'];
function numericRatings(raw, keys, minimum, maximum, allowEmpty = false) {
  if (!raw || typeof raw !== 'object') throw new Error('Missing class ratings.');
  const result = {};
  for (const key of keys) {
    const value = String(raw[key] ?? '').trim();
    if (value === '' && allowEmpty) { result[key] = ''; continue; }
    if (!/^\d+$/.test(value) || Number(value) < minimum || Number(value) > maximum)
      throw new Error(`${key} must be ${minimum}–${maximum}.`);
    result[key] = value;
  }
  return result;
}
export function makePrivateShip({ id = globalThis.crypto?.randomUUID?.(),
  sourceSha256, page, kind, era, className, scale, systems, departments }) {
  if (!HASH.test(sourceSha256 ?? '')) throw new Error('Invalid source fingerprint.');
  if (typeof id !== 'string' || !id || id.length > 120) throw new Error('Invalid class ID.');
  if (!Number.isSafeInteger(Number(page)) || Number(page) < 1 || Number(page) > 2000)
    throw new Error('Invalid PDF page.');
  if (!['starship','station'].includes(kind)) throw new Error('Invalid home type.');
  const name = String(className ?? '').trim();
  if (!name || name.length > 120) throw new Error('Enter a class name.');
  const setting = String(era ?? '').trim();
  if (!setting || setting.length > 120) throw new Error('Enter an era.');
  const size = Number(scale);
  if (!Number.isSafeInteger(size) || size < 1 || size > 30) throw new Error('Invalid scale.');
  return {
    id, sourceSha256, page: Number(page), kind, era: setting, className: name,
    scale: String(size),
    systems: numericRatings(systems, SYSTEMS, 6, 12, kind === 'station'),
    departments: numericRatings(departments, DEPARTMENTS, 1, 5, kind === 'station')
  };
}
export function normalizePrivateShips(ships, sourceSha256) {
  if (ships == null) return [];
  if (!Array.isArray(ships) || !HASH.test(sourceSha256 ?? ''))
    throw new Error('Invalid private ship catalog.');
  const ids = new Set();
  return ships.map(ship => {
    if (!ship || ids.has(ship.id)) throw new Error('Duplicate ship template ID.');
    const verified = makePrivateShip(ship);
    if (verified.sourceSha256 !== sourceSha256)
      throw new Error('Ship class belongs to another source PDF.');
    ids.add(verified.id);
    return verified;
  });
}
export function addPrivateShip(ships, ship, sourceSha256) {
  const old = normalizePrivateShips(ships, sourceSha256);
  if (old.some(x => x.id === ship.id)) throw new Error('Duplicate ship template.');
  return normalizePrivateShips([...old, ship], sourceSha256);
}
export function removePrivateShip(ships, id, sourceSha256) {
  const old = normalizePrivateShips(ships, sourceSha256);
  if (!old.some(x => x.id === id)) throw new Error('Ship template not found.');
  return old.filter(x => x.id !== id);
}
export function applyPrivateShip(builder, ship) {
  if (!ship) throw new Error('Choose a saved class.');
  return {
    ...builder,
    kind: ship.kind, era: ship.era, className: ship.className, scale: ship.scale,
    systems: { ...ship.systems }, departments: { ...ship.departments },
    appliedAt: null
  };
}
