import { createCampaign, createEpisode, createEntry, rollDice, resolveTask, makeId, normalizeCampaign,
  CHARACTER_ATTRIBUTES, CHARACTER_DISCIPLINES, SHIP_SYSTEMS, SHIP_DEPARTMENTS } from './model.mjs';
import { all, get, put, remove, saveCampaign, createBackup, restoreBackup, resetData, database } from './storage.mjs';

const PAGES = [
  ['home', 'Home'], ['character', 'Character'], ['starship', 'Starship'],
  ['log', "Captain's log"], ['library', 'Library'], ['dice', 'Dice'], ['settings', 'Settings']
];
const MOBILE_PAGES = ['home', 'character', 'log', 'library', 'more'];
const state = { page: 'home', campaigns: [], activeId: null, campaign: null, documents: [],
  activeEpisodeId: null, roll: null, taskRoll: null, busy: false };
const $ = selector => document.querySelector(selector);
const content = $('#content');

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'htmlFor') node.htmlFor = value;
    else if (key === 'onClick') node.addEventListener('click', value);
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  return node;
}
function title(text, detail = '') {
  return el('div', { class: 'page-heading' }, [el('h1', { text }), ...(detail ? [el('p', { text: detail })] : [])]);
}
function card(children, extra = '') { return el('section', { class: `card ${extra}` }, children); }
function button(text, callback, style = 'primary') {
  return el('button', { type: 'button', class: `button ${style}`, text, onClick: callback });
}
function line(label, value) {
  return el('div', { class: 'line' }, [el('span', { text: label }), el('strong', { text: value || 'Not set' })]);
}
function field(labelText, name, value = '', options = {}) {
  const label = el('label', { class: 'field' });
  label.append(el('span', { text: labelText }));
  const input = options.multiline ? el('textarea', { name, rows: '4' }) : el('input', {
    name, type: options.number ? 'number' : 'text',
    ...(options.number ? { min: '0', max: '30', step: '1', inputmode: 'numeric' } : { maxlength: options.maxlength || '160' }),
    autocomplete: 'off'
  });
  input.value = value || '';
  if (options.required) input.required = true;
  if (options.placeholder) input.placeholder = options.placeholder;
  label.append(input);
  return label;
}
function empty(text, action) {
  const section = card([el('p', { class: 'muted', text })]);
  if (action) section.append(action);
  return section;
}
function isoDate(value) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
}
function notify(message, error = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { toast.hidden = true; }, 4500);
}
function failure(error) { console.error(error); notify(error?.message || 'An operation failed.', true); }
function download(name, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = el('a', { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function refresh() {
  state.campaigns = (await all('campaigns')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  state.documents = await all('documents');
  state.campaign = state.campaigns.find(c => c.id === state.activeId) || null;
  if (!state.campaign) {
    state.activeId = state.campaigns[0]?.id || null;
    state.campaign = state.campaigns[0] || null;
  }
  if (state.campaign) state.campaign = normalizeCampaign(state.campaign);
  $('#campaign-label').textContent = state.campaign?.title || 'None selected';
  render();
}
async function persist() {
  if (!state.campaign) return;
  $('#save-status').textContent = 'Saving…';
  await saveCampaign(state.campaign);
  $('#save-status').textContent = 'Saved locally';
  await refresh();
}
function go(page) {
  state.page = page;
  render();
  content.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function navigation() {
  const makeButton = ([id, label]) => {
    const item = button(label, () => go(id), 'nav-button');
    if (state.page === id || (id === 'more' && ['more', 'starship', 'dice', 'settings'].includes(state.page))) {
      item.classList.add('active');
      item.setAttribute('aria-current', 'page');
    }
    return item;
  };
  $('#desktop-nav').replaceChildren(...PAGES.map(makeButton));
  $('#mobile-nav').replaceChildren(...MOBILE_PAGES.map(id => makeButton([id, id === 'more' ? 'More' : PAGES.find(p => p[0] === id)[1]])));
}
function campaignRequired() {
  return empty('Create a campaign to start.', button('Create campaign', () => go('home')));
}
function render() {
  navigation();
  const views = { home: renderHome, character: renderCharacter, starship: renderStarship,
    log: renderLog, library: renderLibrary, dice: renderDice, settings: renderSettings, more: renderMore };
  content.replaceChildren(views[state.page]());
}

function renderHome() {
  const root = el('div', { class: 'page' });
  root.append(title('Home'));
  const select = el('select', { 'aria-label': 'Select campaign' });
  for (const c of state.campaigns) {
    const option = el('option', { value: c.id, text: c.title });
    if (state.activeId === c.id) option.selected = true;
    select.append(option);
  }
  select.addEventListener('change', () => { state.activeId = select.value; state.activeEpisodeId = null; refresh().catch(failure); });
  const createForm = el('form', { class: 'inline-form' });
  const input = el('input', { name: 'title', placeholder: 'New campaign name', maxlength: '100', required: '' });
  createForm.append(input, el('button', { class: 'button primary', type: 'submit', text: 'Create campaign' }));
  createForm.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const campaign = createCampaign(input.value);
      await saveCampaign(campaign); state.activeId = campaign.id;
      state.activeEpisodeId = null;
      await refresh(); notify('Campaign created.');
    } catch (error) { failure(error); }
  });
  root.append(card([el('h2', { text: 'Campaigns' }), ...(state.campaigns.length ? [select] : [el('p', { class: 'muted', text: 'No campaigns yet.' })]), createForm]));
  if (state.campaign) {
    const campaign = state.campaign;
    const active = campaign.episodes.find(e => e.status === 'active');
    const overview = card([
      el('div', { class: 'row between' }, [el('h2', { text: campaign.title }), el('span', { class: 'pill', text: 'Local save' })]),
      line('Character', campaign.character.name), line('Starship', campaign.ship.name),
      line('Missions', String(campaign.episodes.length)),
      el('div', { class: 'actions' }, [
        button(active ? 'Resume mission' : 'Open captain’s log', () => { state.activeEpisodeId = active?.id || null; go('log'); }),
        button('Character sheet', () => go('character'), 'secondary')
      ])
    ]);
    root.append(overview);
  }
  return root;
}
function ratingFields(names, source, prefix) {
  return el('div', { class: 'field-grid ratings' }, names.map(name => field(name, `${prefix}_${name.toLowerCase()}`, source?.[name.toLowerCase()] ?? '', { number: true })));
}
function saveRatings(values, names, prefix) {
  return Object.fromEntries(names.map(name => {
    const raw = String(values[`${prefix}_${name.toLowerCase()}`] ?? '').trim();
    if (raw && (!/^\d+$/.test(raw) || Number(raw) > 30)) throw new Error(`${name} must be a whole number from 0 to 30.`);
    return [name.toLowerCase(), raw];
  }));
}
function flatValues(values, names) {
  return Object.fromEntries(names.map(name => [name, String(values[name] ?? '')]));
}
function renderCharacter() {
  const root = el('div', { class: 'page' });
  root.append(title('Character'));
  if (!state.campaign) { root.append(campaignRequired()); return root; }
  const c = state.campaign.character;
  const form = el('form', { class: 'form-stack' });
  form.append(card([
    el('h2', { text: 'Identity' }),
    el('div', { class: 'field-grid' }, [
      field('Name', 'name', c.name, { required: true }), field('Pronouns', 'pronouns', c.pronouns),
      field('Species', 'species', c.species), field('Traits', 'traits', c.traits),
      field('Rank', 'rank', c.rank), field('Assignment', 'assignment', c.assignment)
    ])
  ]));
  form.append(card([
    el('h2', { text: 'Attributes' }), ratingFields(CHARACTER_ATTRIBUTES, c.attributes, 'attribute'),
    el('h2', { text: 'Disciplines' }), ratingFields(CHARACTER_DISCIPLINES, c.disciplines, 'discipline')
  ]));
  form.append(card([
    el('h2', { text: 'Lifepath and career' }),
    el('div', { class: 'field-grid' }, [
      field('Environment', 'environment', c.environment), field('Early outlook', 'earlyOutlook', c.earlyOutlook),
      field('Education', 'education', c.education), field('Career length', 'careerLength', c.careerLength)
    ]),
    field('Career events', 'careerEvents', c.careerEvents, { multiline: true }),
    field('Focuses', 'focuses', c.focuses, { multiline: true }),
    field('Values', 'values', c.values, { multiline: true }),
    field('Equipment or other details', 'equipment', c.equipment, { multiline: true }),
    field('Background', 'background', c.background, { multiline: true }),
    field('Notes', 'notes', c.notes, { multiline: true })
  ]));
  form.append(el('button', { class: 'button primary', type: 'submit', text: 'Save character' }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const flat = ['name', 'pronouns', 'species', 'traits', 'rank', 'assignment', 'environment',
      'earlyOutlook', 'education', 'careerLength', 'careerEvents', 'focuses', 'values', 'equipment', 'background', 'notes'];
    try {
      state.campaign.character = { ...c, ...flatValues(values, flat),
        attributes: saveRatings(values, CHARACTER_ATTRIBUTES, 'attribute'),
        disciplines: saveRatings(values, CHARACTER_DISCIPLINES, 'discipline') };
      await persist(); notify('Character saved.');
    } catch (error) { failure(error); }
  });
  root.append(form);
  return root;
}
function renderStarship() {
  const root = el('div', { class: 'page' });
  root.append(title('Starship / station'));
  if (!state.campaign) { root.append(campaignRequired()); return root; }
  const c = state.campaign.ship;
  const form = el('form', { class: 'form-stack' });
  form.append(card([
    el('h2', { text: 'Record' }),
    el('div', { class: 'field-grid' }, [field('Name', 'name', c.name), field('Registry', 'registry', c.registry),
      field('Class', 'className', c.className), field('Scale', 'scale', c.scale)]),
    field('Traits', 'traits', c.traits, { multiline: true }),
    field('Talents', 'talents', c.talents, { multiline: true }),
    field('Notes', 'notes', c.notes, { multiline: true })
  ]));
  form.append(card([
    el('h2', { text: 'Systems' }), ratingFields(SHIP_SYSTEMS, c.systems, 'system'),
    el('h2', { text: 'Departments' }), ratingFields(SHIP_DEPARTMENTS, c.departments, 'department')
  ]));
  form.append(el('button', { class: 'button primary', type: 'submit', text: 'Save ship' }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    try {
      state.campaign.ship = { ...c, ...flatValues(values,
        ['name', 'registry', 'className', 'scale', 'traits', 'talents', 'notes']),
        systems: saveRatings(values, SHIP_SYSTEMS, 'system'),
        departments: saveRatings(values, SHIP_DEPARTMENTS, 'department') };
      await persist(); notify('Ship saved.');
    } catch (error) { failure(error); }
  });
  root.append(form);
  return root;
}
function renderLog() {
  const root = el('div', { class: 'page' });
  root.append(title("Captain's log"));
  if (!state.campaign) { root.append(campaignRequired()); return root; }
  const campaign = state.campaign;
  const createForm = el('form', { class: 'inline-form' });
  const missionName = el('input', { maxlength: '140', required: '', placeholder: 'New mission title', 'aria-label': 'New mission title' });
  createForm.append(missionName, el('button', { type: 'submit', class: 'button primary', text: 'Start mission' }));
  createForm.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const episode = createEpisode(missionName.value);
      campaign.episodes.unshift(episode); state.activeEpisodeId = episode.id;
      await persist(); notify('Mission started.');
    } catch (error) { failure(error); }
  });
  const missionSelect = el('select', { 'aria-label': 'Select mission' });
  for (const episode of campaign.episodes) {
    const option = el('option', { value: episode.id, text: `${episode.title}${episode.status === 'completed' ? ' (Complete)' : ''}` });
    if ((state.activeEpisodeId || campaign.episodes[0]?.id) === episode.id) option.selected = true;
    missionSelect.append(option);
  }
  missionSelect.addEventListener('change', () => { state.activeEpisodeId = missionSelect.value; render(); });
  root.append(card([el('h2', { text: 'Missions' }), createForm, ...(campaign.episodes.length ? [missionSelect] : [])]));
  const selected = campaign.episodes.find(e => e.id === state.activeEpisodeId) || campaign.episodes[0];
  if (!selected) { root.append(empty('No missions yet.')); return root; }
  const missionForm = el('form', { class: 'form-stack' });
  const act = selected.actLogs;
  const marks = selected.valueMarks;
  const marksRow = el('div', { class: 'actions' }, [
    ...[['minus', '−'], ['plus', '+'], ['challenged', '!']].map(([key, symbol]) => {
      const label = el('label', { class: 'mark-choice' });
      const input = el('input', { type: 'checkbox', name: `mark_${key}` });
      input.checked = !!marks[key];
      label.append(input, el('span', { text: symbol, title: key }));
      return label;
    })
  ]);
  const tracker = field('Mission tracker (0–15)', 'tracker', String(selected.tracker), { number: true });
  tracker.querySelector('input').max = '15';
  missionForm.append(card([
    el('h2', { text: 'Mission record' }),
    field('Summary', 'summary', selected.summary, { multiline: true }),
    field('Development', 'development', selected.development, { multiline: true }),
    field('Career events', 'careerEvents', selected.careerEvents, { multiline: true }),
    el('div', { class: 'field' }, [el('span', { text: 'Values' }), marksRow]), tracker
  ]));
  missionForm.append(card([
    el('h2', { text: 'Episode logs' }),
    field('Opening log — Act One', 'actOne', act.actOne, { multiline: true }),
    field('Supplementary log — Act Two', 'actTwo', act.actTwo, { multiline: true }),
    field('Supplementary log — Act Three', 'actThree', act.actThree, { multiline: true }),
    field('Closing log', 'closing', act.closing, { multiline: true }),
    field('Values used or challenged', 'valuesChallenged', act.valuesChallenged, { multiline: true })
  ]));
  missionForm.append(el('button', { class: 'button primary', type: 'submit', text: 'Save mission record' }));
  missionForm.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(missionForm));
    const n = Number(values.tracker);
    if (!Number.isInteger(n) || n < 0 || n > 15) { failure(new Error('Mission tracker must be 0–15.')); return; }
    selected.tracker = n;
    Object.assign(selected, flatValues(values, ['summary', 'development', 'careerEvents']));
    selected.valueMarks = { minus: !!values.mark_minus, plus: !!values.mark_plus, challenged: !!values.mark_challenged };
    selected.actLogs = flatValues(values, ['actOne', 'actTwo', 'actThree', 'closing', 'valuesChallenged']);
    try { await persist(); notify('Mission record saved.'); } catch (error) { failure(error); }
  });
  const entries = el('div', { class: 'timeline' }, selected.entries.map(entry => {
    const item = el('article', { class: 'entry' });
    item.append(el('time', { text: isoDate(entry.at), datetime: entry.at }), el('p', { text: entry.text }));
    item.append(button('Delete', async () => {
      if (!confirm('Delete this log entry?')) return;
      selected.entries = selected.entries.filter(e => e.id !== entry.id);
      try { await persist(); } catch (error) { failure(error); }
    }, 'danger subtle'));
    return item;
  }));
  const form = el('form', { class: 'form-stack' });
  const textarea = el('textarea', { rows: '5', placeholder: 'Record what happened…', required: '', 'aria-label': 'New log entry' });
  form.append(textarea, el('button', { class: 'button primary', type: 'submit', text: 'Add log entry' }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try { selected.entries.push(createEntry(textarea.value)); await persist(); notify('Log entry saved.'); }
    catch (error) { failure(error); }
  });
  root.append(card([
    el('div', { class: 'row between' }, [el('h2', { text: selected.title }),
      button(selected.status === 'active' ? 'Complete mission' : 'Reopen mission', async () => {
        selected.status = selected.status === 'active' ? 'completed' : 'active';
        try { await persist(); } catch (error) { failure(error); }
      }, 'secondary')]),
    line('Status', selected.status === 'active' ? 'Active' : 'Complete'),
    entries,
    form
  ]));
  root.append(missionForm);
  return root;
}

function renderLibrary() {
  const root = el('div', { class: 'page' });
  root.append(title('Library', 'Your PDFs stay in this browser unless you export them.'));
  const fileInput = el('input', { type: 'file', accept: '.pdf,application/pdf', multiple: '', 'aria-label': 'Choose PDF files' });
  fileInput.addEventListener('change', async () => {
    const files = [...fileInput.files];
    if (!files.length) return;
    try {
      $('#save-status').textContent = 'Importing…';
      for (const file of files) {
        if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) throw new Error('Select PDF files only.');
        const signature = new TextDecoder().decode((await file.slice(0, 5).arrayBuffer()));
        if (signature !== '%PDF-') throw new Error(`${file.name} is not a valid PDF.`);
        await put('documents', { id: makeId(), name: file.name, size: file.size,
          importedAt: new Date().toISOString(), blob: file });
      }
      await refresh(); notify(`${files.length} PDF${files.length === 1 ? '' : 's'} imported.`);
    } catch (error) { failure(error); } finally { $('#save-status').textContent = 'Saved locally'; }
  });
  root.append(card([el('h2', { text: 'Import rulebooks' }), fileInput,
    el('p', { class: 'hint', text: 'PDFs are stored locally in IndexedDB. Browser storage is device-specific. Export a backup before clearing browser data.' })]));
  if (!state.documents.length) { root.append(empty('No PDFs imported.')); return root; }
  const list = el('div', { class: 'list' });
  for (const document of state.documents) {
    list.append(el('div', { class: 'list-row' }, [
      el('div', {}, [el('strong', { text: document.name }),
        el('p', { class: 'muted', text: `${(document.size / 1048576).toFixed(1)} MB · ${isoDate(document.importedAt)}` })]),
      el('div', { class: 'actions' }, [
        button('Read', () => openPdf(document).catch(failure), 'secondary'),
        button('Remove', async () => {
          if (!confirm(`Remove ${document.name} from this browser?`)) return;
          try { await remove('documents', document.id); await refresh(); } catch (error) { failure(error); }
        }, 'danger subtle')
      ])
    ]));
  }
  root.append(card([el('h2', { text: 'My PDFs' }), list]));
  return root;
}
let pdfUrl;
async function openPdf(doc) {
  const record = await get('documents', doc.id);
  if (!record) throw new Error('PDF not found.');
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  pdfUrl = URL.createObjectURL(record.blob);
  $('#pdf-title').textContent = doc.name;
  $('#pdf-frame').src = pdfUrl;
  $('#pdf-dialog').showModal();
}
$('#close-pdf').addEventListener('click', () => $('#pdf-dialog').close());
$('#pdf-dialog').addEventListener('close', () => {
  $('#pdf-frame').removeAttribute('src');
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  pdfUrl = undefined;
});

function renderDice() {
  const root = el('div', { class: 'page' });
  root.append(title('Dice'));
  const campaign = state.campaign;
  const episode = campaign?.episodes.find(e => e.id === state.activeEpisodeId) ||
    campaign?.episodes.find(e => e.status === 'active');
  if (campaign) {
    const char = campaign.character;
    const taskCard = card([el('h2', { text: 'Task roll' })]);
    const picker = (names, label, source) => {
      const wrapper = el('label', { class: 'field' });
      wrapper.append(el('span', { text: label }));
      const select = el('select', { 'aria-label': label });
      for (const name of names) {
        const score = String(source[name.toLowerCase()] ?? '').trim();
        const option = el('option', { value: name.toLowerCase(), text: score ? `${name} (${score})` : `${name} (unset)` });
        select.append(option);
      }
      wrapper.append(select);
      return { wrapper, select };
    };
    const attribute = picker(CHARACTER_ATTRIBUTES, 'Attribute', char.attributes);
    const discipline = picker(CHARACTER_DISCIPLINES, 'Discipline', char.disciplines);
    const difficulty = el('select', { 'aria-label': 'Difficulty' }, [
      el('option', { value: '1', text: 'Normal (1 success)' }),
      el('option', { value: '2', text: 'Increased (2 successes)' })
    ]);
    const focusLabel = el('label', { class: 'check-field' });
    const focus = el('input', { type: 'checkbox' });
    focusLabel.append(focus, el('span', { text: 'Relevant focus applies' }));
    const preview = el('div', { class: 'results', 'aria-live': 'polite' });
    const target = el('p', { class: 'muted' });
    const updateTarget = () => {
      const a = char.attributes[attribute.select.value];
      const d = char.disciplines[discipline.select.value];
      target.textContent = a !== '' && d !== '' ? `Target number: ${Number(a) + Number(d)}` : 'Set both ratings on the character sheet to roll.';
    };
    attribute.select.addEventListener('change', updateTarget);
    discipline.select.addEventListener('change', updateTarget);
    updateTarget();
    const roll = button('Roll task', async () => {
      try {
        const a = String(char.attributes[attribute.select.value] ?? '').trim();
        const d = String(char.disciplines[discipline.select.value] ?? '').trim();
        if (a === '' || d === '') throw new Error('Set both ratings on the character sheet first.');
        const outcome = resolveTask({ attribute: Number(a), discipline: Number(d),
          dice: rollDice(2, 20), difficulty: Number(difficulty.value), focusApplies: focus.checked });
        preview.replaceChildren(
          el('div', { class: 'dice-row' }, outcome.dice.map(n => el('span', { class: 'die', text: String(n) }))),
          line('Target', String(outcome.target)),
          line('Result', outcome.success ? 'Success' : 'Failure'),
          line('Successes', `${outcome.successes} / ${outcome.difficulty}`),
          line('Momentum', outcome.momentumEarned ? 'Generated' : 'None generated'),
          line('Threat', outcome.threatGenerated ? 'Generated' : 'None generated'),
          ...(outcome.focusAdvantage ? [line('Focus', 'Advantage triggered')] : [])
        );
        if (episode && (outcome.momentumEarned || outcome.threatGenerated)) {
          episode.momentum ||= outcome.momentumEarned;
          episode.threat ||= outcome.threatGenerated;
          await persist();
          // persist refreshes the view, so keep the result visible after rendering.
          state.taskRoll = outcome;
          render();
        } else {
          state.taskRoll = outcome;
        }
      } catch (error) { failure(error); }
    });
    taskCard.append(el('div', { class: 'field-grid' }, [attribute.wrapper, discipline.wrapper, el('label', { class: 'field' }, [el('span', { text: 'Difficulty' }), difficulty])]),
      focusLabel, target, roll, preview);
    if (state.taskRoll) {
      const result = state.taskRoll;
      preview.replaceChildren(
        el('div', { class: 'dice-row' }, result.dice.map(n => el('span', { class: 'die', text: String(n) }))),
        line('Target', String(result.target)), line('Result', result.success ? 'Success' : 'Failure'),
        line('Successes', `${result.successes} / ${result.difficulty}`),
        line('Momentum', result.momentumEarned ? 'Generated' : 'None generated'),
        line('Threat', result.threatGenerated ? 'Generated' : 'None generated'),
        ...(result.focusAdvantage ? [line('Focus', 'Advantage triggered')] : [])
      );
    }
    root.append(taskCard);
    if (episode) {
      const tokenCard = card([el('h2', { text: 'Mission resources' }),
        line('Mission', episode.title),
        line('Momentum', episode.momentum ? 'Available' : 'None'),
        line('Threat', episode.threat ? 'Pending' : 'None'),
        el('div', { class: 'actions' }, [
          button('Spend Momentum', async () => {
            if (!episode.momentum) return;
            episode.momentum = false;
            try { await persist(); } catch (error) { failure(error); }
          }, 'secondary'),
          button('Resolve Threat', async () => {
            if (!episode.threat) return;
            episode.threat = false;
            try { await persist(); } catch (error) { failure(error); }
          }, 'secondary')
        ])
      ]);
      root.append(tokenCard);
    }
  } else {
    root.append(empty('Create a campaign to use character task rolls.', button('Create campaign', () => go('home'))));
  }
  const diceCount = el('select', { 'aria-label': 'Number of dice' });
  for (let i = 1; i <= 5; i++) diceCount.append(el('option', { value: i, text: `${i} ${i === 1 ? 'die' : 'dice'}` }));
  diceCount.value = '2';
  const sides = el('select', { 'aria-label': 'Die type' });
  sides.append(el('option', { value: 20, text: 'd20' }), el('option', { value: 6, text: 'd6' }));
  const results = el('div', { class: 'results', 'aria-live': 'polite' });
  if (state.roll) showRoll(results, state.roll);
  root.append(card([el('h2', { text: 'Raw dice' }), el('div', { class: 'actions' }, [diceCount, sides, button('Roll', () => {
    try { state.roll = { dice: rollDice(Number(diceCount.value), Number(sides.value)), sides: Number(sides.value) };
      showRoll(results, state.roll); } catch (error) { failure(error); }
  })]), results]));
  return root;
}
function showRoll(container, roll) {
  const total = roll.dice.reduce((sum, n) => sum + n, 0);
  container.replaceChildren(el('div', { class: 'dice-row' }, roll.dice.map(value => el('span', { class: 'die', text: String(value) }))),
    line('Total', String(total)));
}

function renderMore() {
  return el('div', { class: 'page' }, [title('More'), card([
    button('Starship / station', () => go('starship'), 'secondary'),
    button('Dice', () => go('dice'), 'secondary'),
    button('Settings', () => go('settings'), 'secondary')
  ])]);
}

function renderSettings() {
  const root = el('div', { class: 'page' });
  root.append(title('Settings'));
  root.append(card([el('h2', { text: 'Data & storage' }),
    el('p', { class: 'muted', text: 'Backups include campaigns, characters, ships, missions and imported PDF files. Large PDF libraries can make backups large.' }),
    el('div', { class: 'actions' }, [
      button('Export everything', async () => {
        try {
          $('#save-status').textContent = 'Exporting…';
          const backup = await createBackup();
          download(`solobridgekit-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup), 'application/json');
          notify('Backup downloaded.');
        } catch (error) { failure(error); } finally { $('#save-status').textContent = 'Ready'; }
      }),
      button('Delete all data', async () => {
        if (!confirm('Delete all campaigns, logs and imported PDFs from this browser? This cannot be undone.')) return;
        try { await resetData(); state.activeId = null; state.activeEpisodeId = null; await refresh(); notify('Local data deleted.'); }
        catch (error) { failure(error); }
      }, 'danger subtle')
    ])
  ]));
  const restoreInput = el('input', { type: 'file', accept: '.json,application/json', 'aria-label': 'Restore from backup' });
  restoreInput.addEventListener('change', async () => {
    const file = restoreInput.files?.[0]; if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      if (!confirm('Restore this backup? Your current local campaigns and PDFs will be replaced. Export a backup first.')) return;
      await restoreBackup(raw);
      state.activeId = null; state.activeEpisodeId = null;
      await refresh(); notify('Backup restored.');
    } catch (error) { failure(error); } finally { restoreInput.value = ''; }
  });
  root.append(card([el('h2', { text: 'Restore' }), restoreInput]));
  root.append(card([el('h2', { text: 'About' }), el('p', { class: 'muted', text: 'SoloBridgeKit 0.2.0' })]));
  return root;
}

async function initialize() {
  try {
    if (!('indexedDB' in window)) throw new Error('This browser does not support local storage.');
    await database();
    await refresh();
    $('#save-status').textContent = 'Saved locally';
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline cache unavailable.', error));
    }
  } catch (error) {
    content.replaceChildren(empty(error.message || 'Could not load local data.'));
    $('#save-status').textContent = 'Storage error';
    failure(error);
  }
}
initialize();
