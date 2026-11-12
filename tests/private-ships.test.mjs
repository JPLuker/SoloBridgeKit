import test from 'node:test';
import assert from 'node:assert/strict';
import { makePrivateShip, normalizePrivateShips, addPrivateShip,
  removePrivateShip, applyPrivateShip } from '../private-ships.mjs';
const sha = 'a'.repeat(64);
const ratings = { comms:'8', computers:'8', engines:'8', sensors:'8', structure:'8', weapons:'8' };
const departments = { command:'2', conn:'2', security:'2', engineering:'2', science:'2', medicine:'2' };
const sample = () => makePrivateShip({ id:'test-ship', sourceSha256:sha, page:150,
  kind:'starship', className:'Sample user class', era:'Sample era',
  scale:4, systems:ratings, departments });
test('source-matched class templates are validated and persistent', () => {
  const ship = sample();
  assert.equal(ship.scale, '4');
  assert.equal(addPrivateShip([], ship, sha).length, 1);
  assert.throws(() => normalizePrivateShips([ship], 'f'.repeat(64)), /another source/);
  assert.equal(removePrivateShip([ship], ship.id, sha).length, 0);
  assert.throws(() => addPrivateShip([ship], ship, sha), /Duplicate/);
});
test('invalid class ratings and scales cannot be saved', () => {
  const base = sample();
  assert.throws(() => makePrivateShip({ ...base, scale:0 }), /scale/);
  assert.throws(() => makePrivateShip({ ...base, systems:{...ratings, comms:'21'} }), /comms/);
  assert.throws(() => makePrivateShip({ ...base, kind:'imaginary' }), /home type/);
});
test('applying saved class does not overwrite player identity and is isolated', () => {
  const current = { name:'My ship', registry:'Test-0001', talents:'', className:'' };
  const result = applyPrivateShip(current, sample());
  assert.equal(result.className, 'Sample user class');
  assert.equal(result.name, 'My ship');
  result.systems.comms = '12';
  assert.equal(sample().systems.comms, '8');
});
