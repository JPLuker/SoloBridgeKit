import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign, createEpisode, createEntry, rollDice, validateBundle, DATA_VERSION, normalizeCampaign, normalizeEpisode, CHARACTER_ATTRIBUTES, CHARACTER_DISCIPLINES, SHIP_SYSTEMS, SHIP_DEPARTMENTS } from '../model.mjs';

test('campaign starts with independent character, ship and episode records', () => {
  const a = createCampaign('  First voyage  ');
  const b = createCampaign('Another voyage');
  assert.equal(a.title, 'First voyage');
  assert.notEqual(a.id, b.id);
  assert.deepEqual(a.episodes, []);
  assert.equal(a.ship.registry, '');
});
test('campaign and mission reject empty input', () => {
  assert.throws(() => createCampaign(' '));
  assert.throws(() => createEpisode(' '));
  assert.throws(() => createEntry(' '));
});
test('entries and episodes have stable ids and timestamps', () => {
  const episode = createEpisode('The crossing');
  const entry = createEntry('Investigated the anomaly.');
  assert.ok(episode.id && episode.createdAt && entry.id && entry.at);
});
test('dice are raw and preserve each die', () => {
  assert.deepEqual(rollDice(2, 20, () => 19), [19, 19]);
  assert.deepEqual(rollDice(3, 6, () => 1), [1, 1, 1]);
  assert.throws(() => rollDice(0, 20));
  assert.throws(() => rollDice(1, 3));
  assert.throws(() => rollDice(1, 20, () => 22));
});
test('backup schema refuses invalid or future versions', () => {
  assert.throws(() => validateBundle({format:'solobridgekit',version:99,campaigns:[],documents:[]}));
  assert.throws(() => validateBundle({format:'solobridgekit',version:DATA_VERSION,campaigns:[{id:'a'}],documents:[]}));
  assert.equal(validateBundle({format:'solobridgekit',version:DATA_VERSION,campaigns:[],documents:[]}).version, DATA_VERSION);
});

test('source forms define six attributes, six disciplines, six ship systems and six departments', () => {
  assert.deepEqual(CHARACTER_ATTRIBUTES, ['Control', 'Daring', 'Fitness', 'Insight', 'Presence', 'Reason']);
  assert.deepEqual(CHARACTER_DISCIPLINES, ['Command', 'Conn', 'Security', 'Engineering', 'Science', 'Medicine']);
  assert.deepEqual(SHIP_SYSTEMS, ['Comms', 'Computers', 'Engines', 'Sensors', 'Structure', 'Weapons']);
  assert.equal(SHIP_DEPARTMENTS.length, 6);
  const campaign = createCampaign('Survey duty');
  assert.equal(campaign.character.attributes.control, '');
  assert.equal(campaign.ship.departments.engineering, '');
  assert.equal(campaign.character.environment, '');
  assert.equal(campaign.ship.talents, '');
});

test('old sparse saves keep their values when expanded into the new sheet model', () => {
  const legacy = { id: 'old', title: 'Old game', character: { name: 'Officer', rank: 'Lt.' },
    ship: { name: 'Ship' }, episodes: [{ id: 'e', title: 'Mission', entries: [] }] };
  const campaign = normalizeCampaign(legacy);
  assert.equal(campaign.character.name, 'Officer');
  assert.equal(campaign.character.rank, 'Lt.');
  assert.equal(campaign.character.attributes.control, '');
  assert.equal(campaign.ship.name, 'Ship');
  assert.equal(campaign.episodes[0].tracker, 0);
  assert.equal(campaign.episodes[0].actLogs.actOne, '');
});

test('new mission has blank three-act logs and 15-step tracker is not auto-advanced', () => {
  const ep = createEpisode('Survey');
  assert.deepEqual(ep.valueMarks, { minus: false, plus: false, challenged: false });
  assert.equal(ep.tracker, 0);
  assert.equal(ep.actLogs.actOne, '');
  assert.equal(normalizeEpisode({ ...ep, scenes: undefined, tracker: 3 }).tracker, 3); // legacy counter migration
});

// Source: Captain's Log (2026), Rules of Play PDF pp. 194, 198-200; Focuses p. 203.
test('one success resolves a standard task, and target is attribute plus discipline', async () => {
  const {resolveTask} = await import('../model.mjs');
  const outcome = resolveTask({attribute:9,discipline:4,dice:[18,13]});
  assert.equal(outcome.target,13);
  assert.equal(outcome.success,true);
  assert.equal(outcome.successes,1);
  assert.equal(outcome.momentumEarned,false);
});
test('two successes generate one momentum on a normal task', async () => {
  const {resolveTask} = await import('../model.mjs');
  const outcome = resolveTask({attribute:9,discipline:4,dice:[1,13]});
  assert.equal(outcome.success,true);
  assert.equal(outcome.momentumEarned,true);
});
test('increased difficulty requires two successes and never generates momentum', async () => {
  const {resolveTask} = await import('../model.mjs');
  const fail = resolveTask({attribute:9,discipline:4,dice:[2,17],difficulty:2});
  const success = resolveTask({attribute:9,discipline:4,dice:[1,9],difficulty:2});
  assert.equal(fail.success,false);
  assert.equal(success.success,true);
  assert.equal(success.momentumEarned,false);
});
test('twenty generates threat even when the task succeeds; two twenties do not stack', async () => {
  const {resolveTask} = await import('../model.mjs');
  const mixed = resolveTask({attribute:9,discipline:4,dice:[1,20]});
  const double = resolveTask({attribute:9,discipline:4,dice:[20,20]});
  assert.equal(mixed.success,true);
  assert.equal(mixed.threatGenerated,true);
  assert.equal(double.threatGenerated,true);
});
test('relevant focus provides advantage when a die is at or below discipline', async () => {
  const {resolveTask} = await import('../model.mjs');
  assert.equal(resolveTask({attribute:9,discipline:4,dice:[4,19],focusApplies:true}).focusAdvantage,true);
  assert.equal(resolveTask({attribute:9,discipline:4,dice:[4,19],focusApplies:false}).focusAdvantage,false);
  assert.equal(resolveTask({attribute:9,discipline:4,dice:[5,19],focusApplies:true}).focusAdvantage,false);
});
test('task resolver refuses bad ratings, dice and unsupported difficulty', async () => {
  const {resolveTask} = await import('../model.mjs');
  assert.throws(() => resolveTask({attribute:'9',discipline:4,dice:[1,2]}));
  assert.throws(() => resolveTask({attribute:9,discipline:4,dice:[1,2,3]}));
  assert.throws(() => resolveTask({attribute:9,discipline:4,dice:[1,21]}));
  assert.throws(() => resolveTask({attribute:9,discipline:4,dice:[1,2],difficulty:3}));
});
test('mission resource flags survive normalization of current saves', () => {
  const episode = createEpisode('Field survey');
  assert.equal(episode.momentum,false);
  assert.equal(episode.threat,false);
  const saved = normalizeEpisode({...episode, momentum:true, threat:true});
  assert.equal(saved.momentum,true);
  assert.equal(saved.threat,true);
});