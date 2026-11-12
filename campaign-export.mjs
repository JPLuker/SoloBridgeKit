// Portable, user-authored campaign journals; never include private rulebook documents.
import { normalizeCampaign, normalizeEpisode } from './model.mjs';

const safe = value => String(value ?? '').replace(/\r/g, '').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
const oneLine = value => safe(value).replace(/\n+/g, ' ');
const section = (title, content) => ['## ' + title, '', content || '_Not recorded_', ''];
const field = (name, value) => `**${name}:** ${oneLine(value) || 'Not recorded'}`;
const ratings = data => Object.entries(data || {}).map(([name, value]) =>
  `- ${name.charAt(0).toUpperCase() + name.slice(1)}: ${oneLine(value) || '—'}`).join('\n');
export function journalFilename(title, suffix = 'journal') {
  const slug = String(title ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 75) || 'campaign';
  return `${slug}-${suffix}.md`;
}
export function renderEpisodeJournal(raw) {
  const mission = normalizeEpisode(raw);
  const result = ['# ' + (oneLine(mission.title) || 'Untitled mission'), '',
    field('Status', mission.status === 'completed' ? 'Completed' : 'Active'),
    field('Started', mission.createdAt), '',
    ...section('Summary', safe(mission.summary)),
    ...section('Development', safe(mission.development)),
    ...section('Career events', safe(mission.careerEvents))];
  const logs = [
    ['Opening log — Act One', mission.actLogs.actOne],
    ['Opening log — Act Two', mission.actLogs.actTwo],
    ['Opening log — Act Three', mission.actLogs.actThree],
    ['Closing log', mission.actLogs.closing],
    ['Values used or challenged', mission.actLogs.valuesChallenged]
  ];
  for (const [title, value] of logs) if (String(value || '').trim()) result.push(...section(title, safe(value)));
  result.push('## Scenes', '');
  for (const scene of mission.scenes) {
    result.push(`### Act ${scene.act}, Scene ${scene.number}${scene.completed ? ' (complete)' : ''}`, '',
      ...(scene.title ? [oneLine(scene.title), ''] : []),
      ...(scene.notes ? [safe(scene.notes), ''] : []));
  }
  result.push('## Timeline', '');
  const entries = Array.isArray(mission.entries) ? mission.entries : [];
  if (!entries.length) result.push('_No entries_', '');
  for (const entry of entries) {
    result.push(`### ${oneLine(entry.at) || 'Undated'}`, '', safe(entry.text), '');
  }
  result.push('## Task rolls', '');
  if (!mission.taskHistory.length) result.push('_No task rolls_', '');
  for (const roll of mission.taskHistory) {
    result.push(`- ${oneLine(roll.at)} · ${oneLine(roll.attribute)} + ${oneLine(roll.discipline)} · ${roll.success ? 'Success' : 'Failure'} · ${roll.dice.join(', ')} · ${roll.successes}/${roll.difficulty} successes`);
  }
  return result.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
export function renderCampaignJournal(raw) {
  const campaign = normalizeCampaign(raw);
  const character = campaign.character, ship = campaign.ship;
  const result = ['# ' + (oneLine(campaign.title) || 'Untitled campaign'), '',
    field('Created', campaign.createdAt), '',
    '## Character', '',
    field('Name', character.name), field('Species', character.species),
    field('Rank', character.rank), field('Assignment', character.assignment), '',
    '### Attributes', '', ratings(character.attributes), '',
    '### Disciplines', '', ratings(character.disciplines), '',
    ...section('Values', safe(character.values)),
    ...section('Focuses', safe(character.focuses)),
    ...section('Character notes', safe(character.notes)),
    '## Ship or station', '',
    field('Name', ship.name), field('Registry', ship.registry),
    field('Class', ship.className), field('Scale', ship.scale), '',
    '### Systems', '', ratings(ship.systems), '',
    '### Departments', '', ratings(ship.departments), '',
    ...section('Ship traits', safe(ship.traits)),
    ...section('Ship talents', safe(ship.talents)),
    '## Crew', ''];
  if (!campaign.crew.length) result.push('_No crew recorded_', '');
  for (const crew of campaign.crew) {
    result.push(`### ${oneLine(crew.name)}`, '',
      field('Rank', crew.rank), field('Role', crew.role),
      field('Department', crew.department), '',
      ...(crew.relationship ? [safe(crew.relationship), ''] : []),
      ...(crew.notes ? [safe(crew.notes), ''] : []));
  }
  result.push('## Episodes', '');
  if (!campaign.episodes.length) result.push('_No episodes recorded_', '');
  for (const episode of campaign.episodes) {
    result.push('---', '', renderEpisodeJournal(episode));
  }
  return result.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
