import { normalizeMissionScenes } from './missions.mjs';
import { normalizeBookmarks } from './bookmarks.mjs';
import { normalizeTaskHistory } from './rollhistory.mjs';
import { normalizeDocumentRole } from './content-policy.mjs';
import { validateBookPack } from './book-data.mjs';
import { normalizePrivateTables } from './private-tables.mjs';
import { normalizePrivateOptions } from './private-options.mjs';
import { normalizePrivateShips } from './private-ships.mjs';
import { normalizeCompiledRecords } from './compiler-data.mjs';
export const DATA_VERSION = 1;

// These labels are transcribed from the owner's Captain's Log blank forms v1.2.
// They are record fields, not a substitute for the actual game rules.
export const CHARACTER_ATTRIBUTES = ['Control', 'Daring', 'Fitness', 'Insight', 'Presence', 'Reason'];
export const CHARACTER_DISCIPLINES = ['Command', 'Conn', 'Security', 'Engineering', 'Science', 'Medicine'];
export const SHIP_SYSTEMS = ['Comms', 'Computers', 'Engines', 'Sensors', 'Structure', 'Weapons'];
export const SHIP_DEPARTMENTS = [...CHARACTER_DISCIPLINES];

function emptyRatings(names) {
  return Object.fromEntries(names.map(name => [name.toLowerCase(), '']));
}

export function createCharacter() {
  return {
    name: '', species: '', pronouns: '', traits: '', rank: '', assignment: '',
    environment: '', earlyOutlook: '', education: '', careerLength: '',
    careerEvents: '', focuses: '', values: '', equipment: '',
    background: '', notes: '', lifepath: null,
    development: { history: [], conditions: [] },
    attributes: emptyRatings(CHARACTER_ATTRIBUTES),
    disciplines: emptyRatings(CHARACTER_DISCIPLINES)
  };
}

export function createShip() {
  return {
    name: '', registry: '', className: '', scale: '', traits: '', talents: '', notes: '',
    kind: 'starship', era: '', builder: null,
    systems: emptyRatings(SHIP_SYSTEMS), departments: emptyRatings(SHIP_DEPARTMENTS)
  };
}

export function normalizeCampaign(campaign) {
  const character = campaign.character || {};
  const ship = campaign.ship || {};
  const episodes = Array.isArray(campaign.episodes) ? campaign.episodes : [];
  return {
    ...campaign,
    character: {...createCharacter(), ...character,
      attributes: {...emptyRatings(CHARACTER_ATTRIBUTES), ...character.attributes},
      disciplines: {...emptyRatings(CHARACTER_DISCIPLINES), ...character.disciplines},
      development: { history: Array.isArray(character.development?.history)
        ? character.development.history : [],
        conditions: Array.isArray(character.development?.conditions)
          ? character.development.conditions : [] }
    },
    ship: {...createShip(), ...ship,
      systems: {...emptyRatings(SHIP_SYSTEMS), ...ship.systems},
      departments: {...emptyRatings(SHIP_DEPARTMENTS), ...ship.departments}
    },
    crew: Array.isArray(campaign.crew) ? campaign.crew : [],
    episodes: episodes.map(normalizeEpisode)
  };
}

export function normalizeEpisode(episode) {
  return {
    ...episode, ...normalizeMissionScenes(episode),
    summary: episode.summary ?? '', development: episode.development ?? '',
    careerEvents: episode.careerEvents ?? '',
    valueMarks: { minus: false, plus: false, challenged: false, ...episode.valueMarks },
    momentum: episode.momentum === true, threat: episode.threat === true,
    nextTaskHard: episode.nextTaskHard === true, taskHistory: normalizeTaskHistory(episode.taskHistory),
    actLogs: { actOne: '', actTwo: '', actThree: '', closing: '', valuesChallenged: '', ...episode.actLogs }
  };
}


export function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createCampaign(name) {
  const title = String(name ?? '').trim();
  if (!title || title.length > 100) throw new Error('Campaign name must be 1–100 characters.');
  const now = new Date().toISOString();
  return {
    id: makeId(), title, createdAt: now, updatedAt: now,
    character: createCharacter(),
    ship: createShip(),
    crew: [], episodes: []
  };
}

export function createEpisode(title) {
  const value = String(title ?? '').trim();
  if (!value || value.length > 140) throw new Error('Mission title must be 1–140 characters.');
  return normalizeEpisode({ id: makeId(), title: value, status: 'active', createdAt: new Date().toISOString(), entries: [] });
}

export function createCrewMember(name) {
  const value = String(name ?? '').trim();
  if (!value || value.length > 120) throw new Error('Crew name must be 1–120 characters.');
  return { id: makeId(), name: value, role: '', rank: '', department: '', relationship: '', notes: '' };
}

export function createEntry(text) {
  const value = String(text ?? '').trim();
  if (!value) throw new Error('Write a log entry first.');
  return { id: makeId(), text: value, at: new Date().toISOString() };
}

// Captain's Log (2026), Rules of Play, PDF pp. 194, 198–200; Focuses, PDF p. 203.
// Mechanical rules only. The licensed text, examples and tables are not distributed.
export function resolveTask({ attribute, discipline, dice, difficulty = 1, focusApplies = false }) {
  if (!Number.isInteger(attribute) || attribute < 0 || attribute > 30 ||
      !Number.isInteger(discipline) || discipline < 0 || discipline > 30) {
    throw new Error('Enter valid Attribute and Discipline ratings.');
  }
  if (![1, 2].includes(difficulty)) throw new Error('Difficulty must be 1 or 2.');
  if (!Array.isArray(dice) || dice.length !== 2 ||
      dice.some(value => !Number.isInteger(value) || value < 1 || value > 20)) {
    throw new Error('A task uses exactly two valid d20 results.');
  }
  const target = attribute + discipline;
  const successes = dice.filter(value => value <= target).length;
  return {
    dice: [...dice], target, difficulty, successes,
    success: successes >= difficulty,
    momentumEarned: difficulty === 1 && successes === 2,
    threatGenerated: dice.includes(20),
    focusAdvantage: Boolean(focusApplies) && dice.some(value => value <= discipline)
  };
}

// Intentionally raw dice only until purchased books verify interpretation.
export function rollDice(count = 2, sides = 20, random = secureRandom) {
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error('Dice count must be 1–20.');
  if (![6, 20].includes(sides)) throw new Error('Only d6 and d20 are available.');
  return Array.from({ length: count }, () => {
    const value = random(sides);
    if (!Number.isInteger(value) || value < 1 || value > sides) throw new Error('Invalid random result.');
    return value;
  });
}

function secureRandom(sides) {
  const max = 0x100000000;
  const ceiling = max - (max % sides);
  const draw = new Uint32Array(1);
  do { crypto.getRandomValues(draw); } while (draw[0] >= ceiling);
  return (draw[0] % sides) + 1;
}

export function validateBundle(bundle) {
  if (!bundle || bundle.format !== 'solobridgekit' || bundle.version !== DATA_VERSION ||
      !Array.isArray(bundle.campaigns) || !Array.isArray(bundle.documents) ||
      (bundle.includesDocuments != null && typeof bundle.includesDocuments !== 'boolean')) {
    throw new Error('Unsupported or damaged SoloBridgeKit backup.');
  }
  const ids = new Set();
  for (const c of bundle.campaigns) {
    if (!c || typeof c.id !== 'string' || !c.id || typeof c.title !== 'string' ||
        !Array.isArray(c.episodes) || !c.character || !c.ship || ids.has(c.id)) {
      throw new Error('The backup contains an invalid campaign.');
    }
    const history = c.character?.development;
    if (history != null) {
      if (!history || typeof history !== 'object' || Array.isArray(history) ||
          !Array.isArray(history.history) || !Array.isArray(history.conditions) ||
          history.history.length > 1000 || history.conditions.length > 200)
        throw new Error('Backup contains an invalid character development history.');
      const records = [...history.history, ...history.conditions];
      const developmentIds = new Set();
      for (const record of records) {
        if (!record || typeof record.id !== 'string' || !record.id ||
            developmentIds.has(record.id) || !/^[a-f0-9]{64}$/.test(record.sourcePdfSha256 ?? '') ||
            !Number.isSafeInteger(record.sourcePage) || record.sourcePage < 1 || record.sourcePage > 2000)
          throw new Error('Backup contains a damaged or duplicate character development record.');
        developmentIds.add(record.id);
      }
    }
    ids.add(c.id);
  }
  const docIds = new Set();
  for (const d of bundle.documents) {
    if (!d || typeof d.id !== 'string' || typeof d.name !== 'string' ||
        typeof d.base64 !== 'string' || d.base64.length % 4 !== 0 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(d.base64) || !d.base64.startsWith('JVBERi0') ||
        !Number.isSafeInteger(d.size) || d.size < 5 ||
        d.size !== (d.base64.length / 4 * 3 - (d.base64.endsWith('==') ? 2 : d.base64.endsWith('=') ? 1 : 0)) || docIds.has(d.id)) {
      throw new Error('The backup contains an invalid document.');
    }
    normalizeBookmarks(d.bookmarks);
    normalizeDocumentRole(d.role);
    if (d.bookPack) {
      validateBookPack(d.bookPack);
      normalizePrivateTables(d.tables, d.bookPack.sourceSha256);
      normalizePrivateOptions(d.options, d.bookPack.sourceSha256);
      normalizePrivateShips(d.ships, d.bookPack.sourceSha256);
      normalizeCompiledRecords(d.compiledRecords, d.bookPack.sourceSha256, d.bookPack.pageCount, { allowStale: true });
    } else if ((d.tables != null && d.tables.length) || (d.options != null && d.options.length) || (d.ships != null && d.ships.length) || (d.compiledRecords != null && d.compiledRecords.length))
      throw new Error('Private options, tables, and ship classes require a prepared corebook.');
    docIds.add(d.id);
  }
  return bundle;
}