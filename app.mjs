import { createCampaign, createEpisode, createEntry, createCrewMember, rollDice, resolveTask, makeId, normalizeCampaign,
  CHARACTER_ATTRIBUTES, CHARACTER_DISCIPLINES, SHIP_SYSTEMS, SHIP_DEPARTMENTS } from './model.mjs';
import { all, get, put, remove, saveCampaign, createBackup, restoreBackup, resetData, database } from './storage.mjs';
import { createLifepath, normalizeLifepath, LIFEPATH_STEPS, validateLifepathStep, lifepathReview, applyLifepathToCharacter } from './lifepath.mjs';
import { updateScenePlan, toggleMissionScene } from './missions.mjs';
import { taskDifficulty, applyTaskOutcome, spendMomentum, spendThreat } from './resources.mjs';
import { createShipBuilder, normalizeShipBuilder, reviewShipBuilder, applyShipBuilder } from './shipbuilder.mjs';
import { createBookmark, normalizeBookmarks, addBookmark, removeBookmark } from './bookmarks.mjs';
import { rerollTaskRecord, deleteTaskRecord } from './rollhistory.mjs';
import { normalizeDocumentRole, requiresCorebook, shouldReplaceDocumentsInRestore } from './content-policy.mjs';
import { hasPreparedCorebook, verifyPreparedBook, searchBookPack } from './book-data.mjs';
import { preparePdfInBrowser } from './browser-compiler.mjs';
import { suggestRowsFromPage, formatCandidateRows, makePrivateTable, normalizePrivateTables, addPrivateTable, removePrivateTable, rollPrivateTable } from './private-tables.mjs';
import { makePrivateOption, normalizePrivateOptions, addPrivateOption, removePrivateOption, optionsForStep, applyPrivateOption } from './private-options.mjs';
import { makePrivateShip, normalizePrivateShips, addPrivateShip, removePrivateShip, applyPrivateShip } from './private-ships.mjs';
import { commitTaskToMission } from './mission-actions.mjs';
import { renderCampaignJournal, renderEpisodeJournal, journalFilename } from './campaign-export.mjs';

const PAGES = [
  ['home', 'Home'], ['character', 'Character'], ['starship', 'Starship'], ['crew', 'Crew'],
  ['log', "Captain's log"], ['library', 'Library'], ['dice', 'Dice'], ['settings', 'Settings']
];
const MOBILE_PAGES = ['home', 'character', 'log', 'library', 'more'];
const state = { page: 'home', campaigns: [], activeId: null, campaign: null, documents: [],
  activeEpisodeId: null, activeScene: null, activeCrewId: null, openDocumentId: null, lifepathIndex: 0, shipStep: 0, roll: null, taskRoll: null, taskMeta: null, busy: false, navigationVersion: 0 };
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

async function refresh(expectedNavigationVersion = null) {
  state.campaigns = (await all('campaigns')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  state.documents = await all('documents');
  state.campaign = state.campaigns.find(c => c.id === state.activeId) || null;
  if (!state.campaign) {
    state.activeId = state.campaigns[0]?.id || null;
    state.campaign = state.campaigns[0] || null;
  }
  if (state.campaign) state.campaign = normalizeCampaign(state.campaign);
  $('#campaign-label').textContent = state.campaign?.title || 'None selected';
  // A save from another page must not redraw and erase inputs on the current page.
  if (expectedNavigationVersion === null || expectedNavigationVersion === state.navigationVersion) render();
}
async function persist() {
  if (!state.campaign) return;
  const navigationAtSave = state.navigationVersion;
  $('#save-status').textContent = 'Saving…';
  await saveCampaign(state.campaign);
  $('#save-status').textContent = 'Saved locally';
  await refresh(navigationAtSave);
}
function go(page) {
  state.navigationVersion++;
  state.page = page;
  render();
  content.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function navigation() {
  const makeButton = ([id, label]) => {
    const item = button(label, () => go(id), 'nav-button');
    if (state.page === id || (state.page === 'lifepath' && id === 'character') || (state.page === 'shipbuilder' && id === 'starship') || (id === 'more' && ['more', 'starship', 'shipbuilder', 'crew', 'dice', 'settings'].includes(state.page))) {
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
function corebookPrompt() {
  return card([
    el('h2', { text: 'Prepare your corebook' }),
    el('p', { class: 'muted', text: "Import your own Captain's Log PDF. SoloBridgeKit prepares your private rules data on this device before gameplay becomes available." }),
    button('Set up corebook', () => go('library'))
  ]);
}
function render() {
  navigation();
  if (requiresCorebook(state.page) && !hasPreparedCorebook(state.documents)) {
    content.replaceChildren(el('div', { class: 'page' }, [title('Import your corebook'), corebookPrompt()]));
    return;
  }
  const views = { home: renderHome, character: renderCharacter, lifepath: renderLifepath, starship: renderStarship,
    crew: renderCrew, shipbuilder: renderShipBuilder, log: renderLog, library: renderLibrary, dice: renderDice, settings: renderSettings, more: renderMore };
  content.replaceChildren(views[state.page]());
}

function renderHome() {
  const root = el('div', { class: 'page' });
  root.append(title('Home'));
  if (!hasPreparedCorebook(state.documents)) { root.append(corebookPrompt()); return root; }
  const select = el('select', { 'aria-label': 'Select campaign' });
  for (const c of state.campaigns) {
    const option = el('option', { value: c.id, text: c.title });
    if (state.activeId === c.id) option.selected = true;
    select.append(option);
  }
  select.addEventListener('change', () => { state.activeId = select.value; state.activeEpisodeId = null; state.taskRoll = null; state.taskMeta = null; refresh().catch(failure); });
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
        button('Character sheet', () => go('character'), 'secondary'),
        button('Export journal', () => {
          try {
            download(journalFilename(campaign.title), renderCampaignJournal(campaign),
              'text/markdown;charset=utf-8');
          } catch (error) { failure(error); }
        }, 'secondary')
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
  if (state.campaign) root.append(el('div', { class: 'actions' }, [button('Guided lifepath', () => go('lifepath'), 'secondary')]));
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
function renderLifepath() {
  const root = el('div', { class: 'page' });
  root.append(title('Character lifepath'));
  if (!state.campaign) { root.append(campaignRequired()); return root; }
  const c = state.campaign.character;
  const path = normalizeLifepath(c.lifepath || createLifepath());
  const current = LIFEPATH_STEPS[state.lifepathIndex] || LIFEPATH_STEPS[0];
  const saved = path.stages[current.id];
  const review = lifepathReview(path);
  const nav = el('div', { class: 'step-navigation', 'aria-label': 'Lifepath steps' });
  const form = el('form', { class: 'form-stack' });
  const readStep = () => {
    const raw = Object.fromEntries(new FormData(form));
    const bonuses = prefix => Object.fromEntries((prefix === 'attribute' ? CHARACTER_ATTRIBUTES : CHARACTER_DISCIPLINES)
      .map(name => [name.toLowerCase(), Number(raw[`${prefix}_${name.toLowerCase()}`] || 0)]));
    return { choice: String(raw.choice || ''), attributes: bonuses('attribute'), disciplines: bonuses('discipline'),
      value: String(raw.value || ''), focuses: String(raw.focuses || ''), notes: String(raw.notes || '') };
  };
  const report = el('div', { class: 'lifepath-validation', 'aria-live': 'polite' });
  const validateDraft = () => {
    try {
      const draft = readStep();
      const issues = validateLifepathStep(current.id, draft);
      report.replaceChildren(...(issues.length ? issues.map(e => el('p', { class: 'hint', text: e })) :
        [el('p', { class: 'hint', text: 'Step ready.' })]));
    } catch (error) { report.replaceChildren(el('p', { class: 'hint', text: error.message })); }
  };
  const saveStep = async () => {
    const next = readStep();
    // Save incomplete drafts as well. Invalid drafts never modify the campaign.
    validateLifepathStep(current.id, next);
    path.stages[current.id] = next;
    path.appliedAt = null;
    c.lifepath = path;
    await persist();
  };
  for (let i = 0; i < LIFEPATH_STEPS.length; i++) {
    const step = LIFEPATH_STEPS[i];
    const buttonNode = button(step.title, async () => {
      try { await saveStep(); state.lifepathIndex = i; render(); }
      catch (error) { failure(error); }
    }, i === state.lifepathIndex ? 'secondary selected-step' : 'subtle');
    buttonNode.setAttribute('aria-current', i === state.lifepathIndex ? 'step' : 'false');
    const errors = review.stageStatus[step.id];
    buttonNode.textContent = `${step.title}${errors.length ? '' : ' ✓'}`;
    nav.append(buttonNode);
  }
  root.append(nav);
  const corebook = state.documents.find(d => d.role === 'corebook' && d.bookPack);
  if (corebook && current.id !== 'finishing') {
    const presets = optionsForStep(corebook.options, current.id, corebook.bookPack.sourceSha256);
    if (presets.length) {
      const list = el('select', { 'aria-label': 'Saved private lifepath choice' });
      for (const option of presets)
        list.append(el('option', { value: option.id, text: option.label }));
      root.append(card([
        el('h2', { text: 'Saved private choices' }),
        list,
        el('div', { class: 'actions' }, [
          button('Apply saved choice', async () => {
            try {
              const option = presets.find(x => x.id === list.value);
              if (!option) throw new Error('Select a saved choice.');
              const existing = readStep();
              if (existing.choice && !confirm('Replace the current lifepath step with this saved choice?')) return;
              path.stages[current.id] = applyPrivateOption(option, current.id);
              path.appliedAt = null;
              c.lifepath = path;
              await persist();
              notify('Saved choice applied. Verify the step before continuing.');
            } catch (error) { failure(error); }
          }),
          button('Open source page', () => {
            const option = presets.find(x => x.id === list.value);
            if (option) openPdf(corebook, option.page).catch(failure);
          }, 'secondary')
        ])
      ]));
    }
  }
  const selectRef = corebook || state.documents.find(d => /captain.*log.*(2026|solo)/i.test(d.name)) || state.documents[0];
  const heading = el('div', { class: 'row between' }, [
    el('h2', { text: current.title }),
    selectRef ? button(`Open PDF · page ${current.page}`, () => openPdf(selectRef, current.page).catch(failure), 'secondary') :
      el('span', { class: 'hint', text: `Corebook PDF page ${current.page}` })
  ]);
  form.append(card([
    heading,
    field(current.id === 'finishing' ? 'Final notes (optional)' : 'Selected option', 'choice', saved.choice),
    el('p', { class: 'hint', text: 'Use your purchased book for the legal option and its specific bonuses. The builder checks totals and final caps, not every species or career-event restriction.' }),
    ...(current.attributes ? [el('h2', { text: `Attribute bonuses · ${current.attributes} points` }),
      el('div', { class: 'field-grid ratings' }, CHARACTER_ATTRIBUTES.map(name => {
        const control = field(name, `attribute_${name.toLowerCase()}`, String(saved.attributes[name.toLowerCase()]), { number: true });
        const number = control.querySelector('input'); number.max = current.id === 'species' || current.id === 'finishing' ? '1' : '2';
        return control;
      }))] : []),
    ...(current.disciplines ? [el('h2', { text: `Discipline bonuses · ${current.disciplines} points` }),
      el('div', { class: 'field-grid ratings' }, CHARACTER_DISCIPLINES.map(name => {
        const control = field(name, `discipline_${name.toLowerCase()}`, String(saved.disciplines[name.toLowerCase()]), { number: true });
        control.querySelector('input').max = current.id === 'education' ? '2' : '1';
        return control;
      }))] : []),
    ...(current.values ? [field('Value', 'value', saved.value)] : []),
    ...(current.focuses ? [field(`Focuses · ${current.focuses} line${current.focuses > 1 ? 's' : ''}`, 'focuses', saved.focuses, { multiline: true })] : []),
    field('Notes', 'notes', saved.notes, { multiline: true }), report
  ]));
  form.addEventListener('input', validateDraft);
  const actions = el('div', { class: 'actions' }, [
    button('Save step', () => saveStep().then(() => notify('Lifepath saved.')).catch(failure), 'secondary'),
    button(state.lifepathIndex < LIFEPATH_STEPS.length - 1 ? 'Save and next' : 'Save and review', async () => {
      try {
        await saveStep();
        if (state.lifepathIndex < LIFEPATH_STEPS.length - 1) state.lifepathIndex++;
        render();
      } catch (error) { failure(error); }
    })
  ]);
  if (corebook && current.id !== 'finishing') {
    actions.append(button('Save as private choice', async () => {
      try {
        const draft = readStep();
        const errors = validateLifepathStep(current.id, draft);
        if (errors.length) throw new Error(errors[0]);
        const latest = await get('documents', corebook.id);
        if (!latest?.bookPack) throw new Error('Prepared corebook unavailable.');
        const option = makePrivateOption({ stepId: current.id, label: draft.choice,
          page: current.page, sourceSha256: latest.bookPack.sourceSha256, record: draft });
        latest.options = addPrivateOption(latest.options, option, latest.bookPack.sourceSha256);
        await put('documents', latest);
        path.stages[current.id] = draft;
        path.appliedAt = null;
        c.lifepath = path;
        await persist();
        notify('Private choice saved for future characters.');
      } catch (error) { failure(error); }
    }, 'secondary'));
  }
  form.append(actions);
  root.append(form);
  validateDraft();
  const total = (list) => Object.values(list).reduce((a, b) => a + b, 0);
  const totals = card([
    el('h2', { text: 'Final review' }),
    line('Attributes', `${total(review.attributes)} / 56`),
    line('Disciplines', `${total(review.disciplines)} / 16`),
    line('Values', `${review.values.length} / 4`),
    line('Focuses', `${review.focuses.length} / 6`),
    el('div', { class: 'field-grid ratings' }, [
      ...CHARACTER_ATTRIBUTES.map(name => line(name, String(review.attributes[name.toLowerCase()]))),
      ...CHARACTER_DISCIPLINES.map(name => line(name, String(review.disciplines[name.toLowerCase()])))
    ]),
    ...(review.ready ? [el('p', { class: 'hint', text: 'All totals and caps pass. Check option-specific bonuses in the book before applying.' })] :
      [el('p', { class: 'hint', text: `${review.errors.length} remaining checks. Complete the steps before applying.` })]),
    button('Apply to character sheet', async () => {
      try {
        await saveStep();
        const latest = lifepathReview(c.lifepath);
        if (!latest.ready) throw new Error(latest.errors[0]);
        if (Object.values(c.attributes).some(v => v !== '') || Object.values(c.disciplines).some(v => v !== '')) {
          if (!confirm('Replace the current character ratings, values and focuses with the lifepath results?')) return;
        }
        state.campaign.character = applyLifepathToCharacter(c, c.lifepath);
        await persist(); notify('Lifepath applied to character.'); go('character');
      } catch (error) { failure(error); }
    }, review.ready ? 'primary' : 'secondary')
  ]);
  totals.querySelector('button').disabled = !review.ready;
  root.append(totals);
  return root;
}

function renderStarship() {
  const root = el('div', { class: 'page' });
  root.append(title('Starship / station'));
  if (state.campaign) root.append(el('div', { class: 'actions' }, [button('Guided ship setup', () => go('shipbuilder'), 'secondary'), button('Crew roster', () => go('crew'), 'secondary')]));
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
const SHIP_STEPS = [
  ['Setting', 147], ['Class and ratings', 149], ['Polity', 147], ['Unique trait', 174], ['Talents', 175], ['Identity', 180]
];
function renderShipBuilder() {
  const root = el('div', { class: 'page' }, [title('Guided ship setup')]);
  if (!state.campaign) { root.append(campaignRequired()); return root; }
  const ship = state.campaign.ship;
  const builder = normalizeShipBuilder(ship.builder || createShipBuilder());
  const idx = state.shipStep;
  const form = el('form', { class: 'form-stack' });
  const read = () => {
    const fields = Object.fromEntries(new FormData(form));
    const next = normalizeShipBuilder(builder);
    const assign = keys => keys.forEach(key => {if (Object.hasOwn(fields,key)) next[key]=String(fields[key]);});
    if (idx === 0) assign(['kind','era']);
    if (idx === 1) {
      assign(['className','scale']);
      for (const [prefix,keys,target] of [['system', SHIP_SYSTEMS,'systems'],['department',SHIP_DEPARTMENTS,'departments']]) {
        for (const label of keys) {
          const key=label.toLowerCase();next[target][key]=String(fields[`${prefix}_${key}`] || '');
        }
      }
    }
    if (idx === 2) assign(['polityTrait']);
    if (idx === 3) assign(['uniqueTrait']);
    if (idx === 4) assign(['talents']);
    if (idx === 5) assign(['name','registry']);
    next.appliedAt=null;
    return next;
  };
  const save = async () => {ship.builder=read();await persist();};
  const nav=el('div',{class:'step-navigation'});
  SHIP_STEPS.forEach(([label],i) => {
    const control=button(`${i+1}. ${label}`,async()=>{
      try { await save();state.shipStep=i;render(); }catch(error){failure(error);}
    }, i===idx?'secondary selected-step':'subtle');
    control.setAttribute('aria-current', i===idx?'step':'false');
    nav.append(control);
  });
  root.append(nav);
  const corebook = state.documents.find(d => d.role === 'corebook' && d.bookPack);
  if (idx === 1 && corebook) {
    const savedClasses = normalizePrivateShips(corebook.ships, corebook.bookPack.sourceSha256);
    if (savedClasses.length) {
      const choose = el('select', { 'aria-label': 'Saved private starship or station class' });
      savedClasses.forEach(x => choose.append(el('option', { value: x.id, text: `${x.className} (${x.kind})` })));
      root.append(card([
        el('h2', { text: 'Saved private classes' }), choose,
        el('div', { class: 'actions' }, [
          button('Apply saved class', async () => {
            try {
              const selection = savedClasses.find(x => x.id === choose.value);
              if (!selection) throw new Error('Select a saved class.');
              if (builder.className && !confirm('Replace your current class ratings with this saved template?')) return;
              ship.builder = applyPrivateShip(builder, selection);
              await persist();
              notify('Class loaded. Review its ratings before continuing.');
            } catch (error) { failure(error); }
          }),
          button('Open source page', () => {
            const selection = savedClasses.find(x => x.id === choose.value);
            if (selection) openPdf(corebook, selection.page).catch(failure);
          }, 'secondary')
        ])
      ]));
    }
  }
  const source=corebook||state.documents.find(d=>/captain.*log.*(2026|solo)/i.test(d.name))||state.documents[0];
  const refs=el('div',{class:'row between'},[
    el('h2',{text:SHIP_STEPS[idx][0]}),
    source ? button(`Open PDF · page ${SHIP_STEPS[idx][1]}`,()=>openPdf(source,SHIP_STEPS[idx][1]).catch(failure),'secondary')
      : el('span',{class:'hint',text:`Corebook PDF page ${SHIP_STEPS[idx][1]}`})
  ]);
  const sections=[refs];
  if(idx===0){
    const label=el('label',{class:'field'},[el('span',{text:'Home type'})]);
    const select=el('select',{name:'kind','aria-label':'Home type'});
    for(const [value,text] of [['starship','Starship'],['station','Station / starbase']]){
      const o=el('option',{value,text});if(value===builder.kind)o.selected=true;select.append(o);
    }
    label.append(select);
    sections.push(label,field('Era', 'era',builder.era));
  }
  if(idx===1){
    sections.push(field('Class (if applicable)','className',builder.className),field('Scale','scale',builder.scale,{number:true}));
    const scaleInput=sections.at(-1).querySelector('input');scaleInput.max='100';scaleInput.min='1';
    sections.push(el('p',{class:'hint',text:'Enter the published class statistics from your copy. Do not guess ratings.'}),
      el('h2',{text:'Systems'}), ratingFields(SHIP_SYSTEMS,builder.systems,'system'),
      el('h2',{text:'Departments'}),ratingFields(SHIP_DEPARTMENTS,builder.departments,'department'));
  }
  if(idx===2)sections.push(field('Polity trait','polityTrait',builder.polityTrait));
  if(idx===3)sections.push(field('Additional trait (optional)','uniqueTrait',builder.uniqueTrait));
  if(idx===4)sections.push(field('Ship talents · one per line','talents',builder.talents,{multiline:true}));
  if(idx===5)sections.push(field('Name','name',builder.name),field('Registry (starship)','registry',builder.registry));
  form.append(card(sections));
  const shipActions = el('div',{class:'actions'},[
    button('Save step',()=>save().then(()=>notify('Ship setup saved.')).catch(failure),'secondary'),
    button(idx===5?'Save and review':'Save and next',async()=>{
      try{await save();if(state.shipStep<5)state.shipStep++;render();}catch(error){failure(error);}
    })
  ]);
  if (idx === 1 && corebook) {
    shipActions.append(button('Save private class', async () => {
      try {
        const next = read();
        const latest = await get('documents', corebook.id);
        if (!latest?.bookPack) throw new Error('Prepared corebook unavailable.');
        const template = makePrivateShip({ sourceSha256: latest.bookPack.sourceSha256,
          page: SHIP_STEPS[idx][1], kind: next.kind, era: next.era,
          className: next.className, scale: next.scale,
          systems: next.systems, departments: next.departments });
        latest.ships = addPrivateShip(latest.ships, template, latest.bookPack.sourceSha256);
        await put('documents', latest);
        ship.builder = next;
        await persist();
        notify('Class saved for other starships.');
      } catch (error) { failure(error); }
    }, 'secondary'));
  }
  form.append(shipActions);
  root.append(form);
  const review=reviewShipBuilder(builder);
  const summary=card([
    el('h2',{text:'Ship review'}),
    line('Type',builder.kind==='station'?'Station / starbase':'Starship'),
    line('Class',builder.className),line('Scale',builder.scale),
    line('Talents',`${review.talentCount} / ${review.talentLimit}${builder.kind==='station'?' maximum':''}`),
    el('p',{class:'hint',text:review.ready?'Ready to apply after checking the ratings and talent restrictions in your book.':`${review.errors.length} items need attention.`}),
    ...(review.ready?[]:review.errors.slice(0,5).map(x=>el('p',{class:'hint',text:x}))),
    button('Apply to ship sheet',async()=>{
      try{
        await save();
        const draft=ship.builder;
        const checked=reviewShipBuilder(draft);
        if(!checked.ready)throw new Error(checked.errors[0]);
        if(ship.name||ship.className||ship.registry){
          if(!confirm('Replace the current ship sheet with these selections?'))return;
        }
        state.campaign.ship=applyShipBuilder(ship,draft);
        await persist();go('starship');notify('Ship setup applied.');
      }catch(error){failure(error);}
    },review.ready?'primary':'secondary')
  ]);
  summary.querySelector('button').disabled=!review.ready;
  root.append(summary);
  return root;
}

function renderCrew() {
  const root = el('div',{class:'page'},[title('Crew')]);
  if(!state.campaign){root.append(campaignRequired());return root;}
  const crew=state.campaign.crew;
  const createForm=el('form',{class:'inline-form'},[
    el('input',{name:'name',required:'',maxlength:'120',placeholder:'Crew member name','aria-label':'Crew member name'}),
    el('button',{class:'button primary',type:'submit',text:'Add crew member'})
  ]);
  createForm.addEventListener('submit',async e=>{
    e.preventDefault();try{
      const created=createCrewMember(new FormData(createForm).get('name'));
      crew.push(created);state.activeCrewId=created.id;
      await persist();notify('Crew member added.');
    }catch(error){failure(error);}
  });
  root.append(card([el('h2',{text:'Roster'}),createForm]));
  if(!crew.length)return root;
  const roster=el('div',{class:'list'});
  for(const member of crew){
    roster.append(el('div',{class:'list-row'},[
      el('div',{},[el('strong',{text:member.name}),el('p',{class:'muted',text:[member.rank,member.role].filter(Boolean).join(' · ')||'Details not set'})]),
      el('div',{class:'actions'},[
        button('Edit',()=>{state.activeCrewId=member.id;render();},'secondary'),
        button('Remove',async()=>{
          if(!confirm(`Remove ${member.name} from this crew?`))return;
          state.campaign.crew=crew.filter(c=>c.id!==member.id);
          if(state.activeCrewId===member.id)state.activeCrewId=null;
          try{await persist();}catch(error){failure(error);}
        },'danger subtle')
      ])
    ]));
  }
  root.append(card([el('h2',{text:'Members'}),roster]));
  const active=crew.find(m=>m.id===state.activeCrewId)||crew[0];
  const editor=el('form',{class:'form-stack'},[
    el('h2',{text:active.name}),
    el('div',{class:'field-grid'},[
      field('Name','name',active.name,{required:true}),field('Rank','rank',active.rank),
      field('Role','role',active.role),field('Department','department',active.department)
    ]),
    field('Relationship','relationship',active.relationship,{multiline:true}),
    field('Notes','notes',active.notes,{multiline:true}),
    el('button',{type:'submit',class:'button primary',text:'Save crew member'})
  ]);
  editor.addEventListener('submit',async e=>{
    e.preventDefault();const values=Object.fromEntries(new FormData(editor));
    try{
      if(!String(values.name).trim())throw new Error('Enter a crew member name.');
      Object.assign(active,flatValues(values,['name','rank','role','department','relationship','notes']));
      await persist();notify('Crew member saved.');
    }catch(error){failure(error);}
  });
  root.append(card([editor]));return root;
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
      campaign.episodes.unshift(episode); state.activeEpisodeId = episode.id; state.taskRoll = null; state.taskMeta = null;
      await persist(); notify('Mission started.');
    } catch (error) { failure(error); }
  });
  const missionSelect = el('select', { 'aria-label': 'Select mission' });
  for (const episode of campaign.episodes) {
    const option = el('option', { value: episode.id, text: `${episode.title}${episode.status === 'completed' ? ' (Complete)' : ''}` });
    if ((state.activeEpisodeId || campaign.episodes[0]?.id) === episode.id) option.selected = true;
    missionSelect.append(option);
  }
  missionSelect.addEventListener('change', () => { state.activeEpisodeId = missionSelect.value; state.taskRoll = null; state.taskMeta = null; render(); });
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
  missionForm.append(card([
    el('h2', { text: 'Mission record' }),
    field('Summary', 'summary', selected.summary, { multiline: true }),
    field('Development', 'development', selected.development, { multiline: true }),
    field('Career events', 'careerEvents', selected.careerEvents, { multiline: true }),
    el('div', { class: 'field' }, [el('span', { text: 'Values' }), marksRow])
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
      }, 'secondary'),
      button('Export episode', () => {
        try {
          download(journalFilename(selected.title, 'episode'), renderEpisodeJournal(selected),
            'text/markdown;charset=utf-8');
        } catch (error) { failure(error); }
      }, 'secondary')]),
    line('Status', selected.status === 'active' ? 'Active' : 'Complete'),
    entries,
    form
  ]));
  root.append(renderMissionActions(selected));
  root.append(renderSceneTracker(selected));
  root.append(renderTaskHistory(selected));
  root.append(missionForm);
  return root;
}

async function recordMissionTask(episode, labels, params, outcome) {
  const saved = commitTaskToMission(episode, labels, params, outcome);
  Object.assign(episode, saved.updatedEpisode);
  state.taskRoll = outcome;
  state.taskMeta = { episodeId: episode.id, params, recordId: saved.record.id,
    before: saved.before, rerolled: false };
  await persist();
  return outcome;
}

function ratingPicker(names, label, source) {
  const wrapper = el('label', { class: 'field' }, [el('span', { text: label })]);
  const select = el('select', { 'aria-label': label });
  for (const name of names) {
    const score = String(source[name.toLowerCase()] ?? '').trim();
    select.append(el('option', { value: name.toLowerCase(),
      text: score ? `${name} (${score})` : `${name} (unset)` }));
  }
  wrapper.append(select);
  return { wrapper, select };
}
function renderMissionActions(mission) {
  const cardNode = card([el('h2', { text: 'Scene actions' })]);
  const scene = mission.scenes.find(x => `${x.act}:${x.number}` === state.activeScene) ||
    mission.scenes.find(x => !x.completed) || mission.scenes[0];
  if (scene) cardNode.append(line('Current scene', `Act ${scene.act} · Scene ${scene.number}`));
  cardNode.append(el('div', { class: 'actions' }, [
    button('Open full dice tools', () => go('dice'), 'secondary'),
    button('Open character sheet', () => go('character'), 'secondary')
  ]));
  const character = state.campaign.character;
  const attribute = ratingPicker(CHARACTER_ATTRIBUTES, 'Attribute', character.attributes);
  const discipline = ratingPicker(CHARACTER_DISCIPLINES, 'Discipline', character.disciplines);
  const difficulty = el('select', { 'aria-label': 'Difficulty' }, [
    el('option', { value: '1', text: 'Normal (1)' }),
    el('option', { value: '2', text: 'Increased (2)' })
  ]);
  if (mission.nextTaskHard) { difficulty.value = '2'; difficulty.disabled = true; }
  const focusCheck = el('input', { type: 'checkbox' });
  const result = el('div', { class: 'results', 'aria-live': 'polite' });
  const taskForm = el('form', { class: 'form-stack' }, [
    el('div', { class: 'field-grid' }, [
      attribute.wrapper, discipline.wrapper,
      el('label', { class: 'field' }, [el('span', { text: 'Difficulty' }), difficulty])
    ]),
    el('label', { class: 'check-field' }, [focusCheck, el('span', { text: 'Relevant focus applies' })]),
    el('button', { type: 'submit', class: 'button primary', text: 'Roll task' }), result
  ]);
  taskForm.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const a = String(character.attributes[attribute.select.value] ?? '').trim();
      const d = String(character.disciplines[discipline.select.value] ?? '').trim();
      if (!a || !d) throw new Error('Set both ratings on your character sheet first.');
      const params = { attribute: Number(a), discipline: Number(d),
        difficulty: taskDifficulty(mission, difficulty.value === '2'),
        focusApplies: focusCheck.checked };
      const outcome = resolveTask({ ...params, dice: rollDice(2, 20) });
      await recordMissionTask(mission, { attribute: attribute.select.value,
        discipline: discipline.select.value }, params, outcome);
      notify(outcome.success ? 'Task succeeded and was recorded.' : 'Task failed and was recorded.');
    } catch (error) { failure(error); }
  });
  cardNode.append(taskForm);
  const book = state.documents.find(d => d.role === 'corebook' && d.bookPack);
  const tables = book ? normalizePrivateTables(book.tables, book.bookPack.sourceSha256) : [];
  if (tables.length) {
    const choose = el('select', { 'aria-label': 'Private random table' });
    for (const table of tables) choose.append(el('option', { value: table.id, text: table.title }));
    const rolledResult = el('div', { class: 'results', 'aria-live': 'polite' });
    const row = el('div', { class: 'actions' }, [
      choose,
      button('Roll table', () => {
        try {
          const table = tables.find(t => t.id === choose.value);
          if (!table) throw new Error('Select a private table.');
          const roll = rollPrivateTable(table);
          rolledResult.replaceChildren(
            line('Result', `${roll.value} / ${table.sides}`),
            el('p', { text: roll.entry.text }),
            button('Open source page', () => openPdf(book, table.page).catch(failure), 'secondary'),
            button('Record reference', async () => {
              try {
                // The default campaign export contains a reference, never table prose.
                mission.entries.push(createEntry(`Table: ${table.title}, PDF page ${table.page}, roll ${roll.value}`));
                await persist();
                notify('Table reference added to the mission.');
              } catch (error) { failure(error); }
            }, 'secondary')
          );
        } catch (error) { failure(error); }
      }, 'secondary')
    ]);
    cardNode.append(el('h3', { text: 'Random tables' }), row, rolledResult);
  }
  return cardNode;
}

function renderSceneTracker(mission) {
  const tracker = card([el('h2', { text: 'Scenes' }), line('Progress', `${mission.tracker} / ${mission.scenes.length}`)]);
  const form = el('form', { class: 'inline-form scene-plan' });
  for (let i = 0; i < 3; i++) {
    const f = field(`Act ${i + 1}`, `act${i + 1}`, mission.scenePlan[i], { number: true });
    f.querySelector('input').min = '1'; f.querySelector('input').max = '30';
    form.append(f);
  }
  form.append(el('button', { type: 'submit', class: 'button secondary', text: 'Set scenes' }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const values = new FormData(form);
      Object.assign(mission, updateScenePlan(mission, [1,2,3].map(n => Number(values.get(`act${n}`)))));
      state.activeScene = null; await persist();
    } catch (error) { failure(error); }
  });
  tracker.append(form);
  const scenes = el('div', { class: 'scene-acts' });
  for (let act = 1; act <= 3; act++) {
    const group = el('div', { class: 'scene-act' }, [el('h3', { text: `Act ${act}` })]);
    const buttons = el('div', { class: 'scene-buttons' });
    for (const scene of mission.scenes.filter(s => s.act === act)) {
      const key = `${act}:${scene.number}`;
      const control = button(`${scene.completed ? '✓ ' : ''}${scene.number}`, () => { state.activeScene = key; render(); },
        `${state.activeScene === key ? 'selected-step' : 'secondary'} ${scene.completed ? 'scene-completed' : ''}`);
      control.setAttribute('aria-label', `Act ${act} scene ${scene.number}, ${scene.completed ? 'complete' : 'pending'}`);
      control.setAttribute('aria-pressed', String(state.activeScene === key));
      buttons.append(control);
    }
    group.append(buttons); scenes.append(group);
  }
  tracker.append(scenes);
  const active = mission.scenes.find(s => `${s.act}:${s.number}` === state.activeScene) || mission.scenes.find(s => !s.completed) || mission.scenes[0];
  if (active) {
    const editor = el('form', { class: 'form-stack scene-editor' }, [
      el('h3', { text: `Act ${active.act} · Scene ${active.number}` }),
      field('Scene title', 'title', active.title),
      field('Scene notes', 'notes', active.notes, { multiline: true })
    ]);
    editor.append(el('div', { class: 'actions' }, [
      el('button', { type: 'submit', class: 'button secondary', text: 'Save scene' }),
      button(active.completed ? 'Reopen scene' : 'Complete scene', async () => {
        try {
          const values = new FormData(editor);
          active.title = String(values.get('title') || ''); active.notes = String(values.get('notes') || '');
          Object.assign(mission, toggleMissionScene(mission, active.act, active.number, !active.completed));
          state.activeScene = `${active.act}:${active.number}`; await persist();
        } catch (error) { failure(error); }
      })
    ]));
    editor.addEventListener('submit', async event => {
      event.preventDefault();
      const values = new FormData(editor);
      active.title = String(values.get('title') || ''); active.notes = String(values.get('notes') || '');
      try { await persist(); notify('Scene saved.'); } catch (error) { failure(error); }
    });
    tracker.append(editor);
  }
  return tracker;
}


function renderTaskHistory(mission) {
  const records = mission.taskHistory || [];
  const section = card([el('h2', { text: 'Task rolls' })]);
  if (!records.length) {
    section.append(el('p', { class: 'muted', text: 'No task rolls recorded.' }));
    return section;
  }
  const entries = el('div', { class: 'timeline' });
  for (const roll of [...records].reverse().slice(0,20)) {
    entries.append(el('article', { class: 'entry' }, [
      el('time', { text: isoDate(roll.at), datetime: roll.at }),
      el('strong', { text: `${roll.attribute} + ${roll.discipline} · ${roll.success ? 'Success' : 'Failure'}` }),
      el('p', { text: `2d20: ${roll.dice.join(', ')} · target ${roll.target} · successes ${roll.successes}/${roll.difficulty}` }),
      ...(roll.originalDice ? [el('p', { class: 'hint', text: `Rerolled die ${roll.rerolledDie} from ${roll.originalDice.join(', ')}` })] : []),
      el('p', { class: 'hint', text: [roll.momentumEarned && 'Momentum', roll.threatGenerated && 'Threat', roll.focusAdvantage && 'Focus advantage'].filter(Boolean).join(' · ') || 'No resources generated' }),
      button('Delete roll', async () => {
        try { mission.taskHistory = deleteTaskRecord(mission.taskHistory, roll.id); await persist(); }
        catch (error) { failure(error); }
      }, 'danger subtle')
    ]));
  }
  section.append(entries);
  if (records.length > 20) section.append(el('p', { class: 'hint', text: `Showing the latest 20 of ${records.length} rolls. All rolls are included in backups.` }));
  return section;
}

function renderLibrary() {
  const root = el('div', { class: 'page' });
  root.append(title('Library', 'Your PDFs stay in this browser unless you export them.'));
  const roleSelect = el('select', { 'aria-label': 'Document type' });
  for (const [value, label] of [
    ['corebook', 'Core rulebook'], ['supplement', 'Supplement'], ['forms', 'Forms'], ['reference', 'Other reference']
  ]) roleSelect.append(el('option', { value, text: label }));
  roleSelect.value = 'reference'; // User must explicitly identify the core rulebook.
  const roleField = el('label', { class: 'field' }, [el('span', { text: 'Document type' }), roleSelect]);
  const fileInput = el('input', { type: 'file', accept: '.pdf,application/pdf', multiple: '', 'aria-label': 'Choose PDF files' });
  const progress = el('p', { class: 'hint', role: 'status', 'aria-live': 'polite', text: '' });
  let preparationController = null;
  const cancelPreparation = button('Cancel preparation', () => preparationController?.abort(), 'secondary');
  cancelPreparation.hidden = true;
  fileInput.addEventListener('change', async () => {
    const files = [...fileInput.files];
    if (!files.length) return;
    const requestedRole = normalizeDocumentRole(roleSelect.value);
    try {
      if (requestedRole === 'corebook' && files.length !== 1) throw new Error('Select one core rulebook at a time.');
      fileInput.disabled = true;
      roleSelect.disabled = true;
      $('#save-status').textContent = 'Importing…';
      for (const file of files) {
        if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) throw new Error('Select PDF files only.');
        const signature = new TextDecoder().decode((await file.slice(0, 5).arrayBuffer()));
        if (signature !== '%PDF-') throw new Error(`${file.name} is not a valid PDF.`);
        let bookPack;
        if (requestedRole === 'corebook') {
          preparationController = new AbortController();
          cancelPreparation.hidden = false;
          progress.textContent = 'Preparing your corebook…';
          bookPack = await preparePdfInBrowser(file, {
            signal: preparationController.signal,
            onProgress: ({ page, total }) => {
              progress.textContent = `Preparing page ${page} of ${total}…`;
            }
          });
        }
        await put('documents', { id: makeId(), name: file.name, size: file.size,
          importedAt: new Date().toISOString(), blob: file, role: requestedRole, bookmarks: [],
          ...(bookPack ? { bookPack } : {}) });
      }
      progress.textContent = requestedRole === 'corebook' ? 'Corebook prepared.' : '';
      await refresh();
      notify(requestedRole === 'corebook' ? 'Corebook ready to play.' : `${files.length} PDF${files.length === 1 ? '' : 's'} imported.`);
    } catch (error) {
      progress.textContent = error.message || 'Preparation failed.';
      failure(error);
    } finally {
      fileInput.value = '';
      fileInput.disabled = false;
      roleSelect.disabled = false;
      cancelPreparation.hidden = true;
      preparationController = null;
      $('#save-status').textContent = 'Saved locally';
    }
  });
  root.append(card([el('h2', { text: 'Import rulebooks' }), roleField, fileInput,
    progress, cancelPreparation,
    el('p', { class: 'hint', text: 'Choose Core rulebook before selecting your purchased PDF. It will be prepared locally; the contents are not uploaded.' })]));
  if (!state.documents.length) { root.append(empty('No PDFs imported.')); return root; }
  const list = el('div', { class: 'document-list' });
  for (const document of state.documents) {
    const role = normalizeDocumentRole(document.role);
    const changeRole = button(role === 'corebook' ? 'Unmark corebook' : 'Prepare as corebook', async () => {
      const previousText = changeRole.textContent;
      try {
        const latest = await get('documents', document.id);
        if (!latest) throw new Error('Imported PDF not found.');
        if (role === 'corebook') {
          await put('documents', { ...latest, role: 'reference' });
          await refresh();
          notify('Corebook designation removed.');
          return;
        }
        changeRole.disabled = true;
        changeRole.textContent = 'Preparing…';
        const pack = await preparePdfInBrowser(latest.blob, {
          onProgress: ({ page, total }) => { changeRole.textContent = `Page ${page}/${total}`; }
        });
        await put('documents', { ...latest, role: 'corebook', bookPack: pack });
        await refresh();
        notify('Corebook prepared and ready.');
      } catch (error) {
        changeRole.disabled = false;
        changeRole.textContent = previousText;
        failure(error);
      }
    }, 'secondary');
    const savedBookmarks = normalizeBookmarks(document.bookmarks);
    const prepared = role === 'corebook' && Boolean(document.bookPack);
    const privatePackInput = el('input', { type: 'file', accept: '.json,application/json',
      'aria-label': 'Import locally prepared corebook data' });
    privatePackInput.addEventListener('change', async () => {
      const selected = privatePackInput.files?.[0];
      if (!selected) return;
      try {
        const latest = await get('documents', document.id);
        if (!latest || normalizeDocumentRole(latest.role) !== 'corebook')
          throw new Error('Mark this PDF as your corebook first.');
        const pack = JSON.parse(await selected.text());
        await verifyPreparedBook(latest.blob, pack);
        await put('documents', { ...latest, bookPack: pack });
        state.openDocumentId = document.id;
        await refresh();
        notify('Corebook prepared. Gameplay is available.');
      } catch (error) { failure(error); } finally { privatePackInput.value = ''; }
    });
    const details = el('details', { class: 'document-bookmarks' });
    if (state.openDocumentId === document.id) details.open = true;
    details.addEventListener('toggle', () => {
      if (details.open) state.openDocumentId = document.id;
      else if (state.openDocumentId === document.id) state.openDocumentId = null;
    });
    details.append(el('summary', { text: `Bookmarks (${savedBookmarks.length})` }));
    const bookmarksList = el('div', { class: 'bookmark-list' });
    for (const saved of savedBookmarks) {
      bookmarksList.append(el('div', { class: 'bookmark-row' }, [
        el('span', { text: `${saved.label} · PDF page ${saved.page}` }),
        el('div', { class: 'actions' }, [
          button('Open', () => openPdf(document, saved.page).catch(failure), 'secondary'),
          button('Remove', async () => {
            try {
              const latest = await get('documents', document.id);
              if (!latest) throw new Error('The imported PDF was not found.');
              await put('documents', { ...latest, bookmarks: removeBookmark(latest.bookmarks, saved.id) });
              state.openDocumentId = document.id;
              await refresh(); notify('Bookmark removed.');
            } catch (error) { failure(error); }
          }, 'subtle')
        ])
      ]));
    }
    details.append(bookmarksList);
    const bookmarkForm = el('form', { class: 'inline-form bookmark-form' }, [
      field('Name', 'label', '', { required: true }),
      field('PDF page', 'page', '1', { number: true, required: true }),
      el('button', { class: 'button secondary', type: 'submit', text: 'Save bookmark' })
    ]);
    bookmarkForm.querySelector('[name=page]').min = '1';
    bookmarkForm.querySelector('[name=page]').max = '99999';
    bookmarkForm.addEventListener('submit', async event => {
      event.preventDefault();
      const values = new FormData(bookmarkForm);
      try {
        const latest = await get('documents', document.id);
        if (!latest) throw new Error('The imported PDF was not found.');
        const bookmark = createBookmark(values.get('label'), values.get('page'));
        await put('documents', { ...latest, bookmarks: addBookmark(latest.bookmarks, bookmark) });
        state.openDocumentId = document.id;
        await refresh(); notify('Bookmark saved.');
      } catch (error) { failure(error); }
    });
    details.append(bookmarkForm);
    list.append(el('div', { class: 'document-item' }, [
      el('div', { class: 'list-row' }, [
        el('div', {}, [el('strong', { text: document.name }),
          el('p', { class: 'muted', text: `${role === 'corebook' ? (prepared ? 'Prepared corebook' : 'Corebook not prepared') : role === 'reference' ? 'Other reference' : role} · ${(document.size / 1048576).toFixed(1)} MB · ${isoDate(document.importedAt)}` })]),
        el('div', { class: 'actions' }, [
          changeRole,
          button('Read', () => openPdf(document).catch(failure), 'secondary'),
          button('Remove', async () => {
            if (!confirm(`Remove ${document.name} from this browser?`)) return;
            try { await remove('documents', document.id); await refresh(); } catch (error) { failure(error); }
          }, 'danger subtle')
        ])
      ]), ...(role === 'corebook' ? [
        el('label', { class: 'field' }, [el('span', { text: prepared ? 'Replace private rules index' : 'Import private rules index' }), privatePackInput])
      ] : []), details
    ]));
  }
  root.append(card([el('h2', { text: 'My PDFs' }), list]));
  const readyBook = state.documents.find(doc => doc.role === 'corebook' && doc.bookPack);
  if (readyBook) {
    const searchCard = card([el('h2', { text: 'Search your prepared corebook' })]);
    const form = el('form', { class: 'inline-form' }, [
      field('Search', 'query', '', { required: true, maxlength: 120 }),
      el('button', { class: 'button primary', type: 'submit', text: 'Search' })
    ]);
    const results = el('div', { class: 'document-list', 'aria-live': 'polite' });
    form.addEventListener('submit', event => {
      event.preventDefault();
      try {
        const term = String(new FormData(form).get('query') || '').trim();
        if (term.length < 2) throw new Error('Enter at least two characters.');
        const hits = searchBookPack(readyBook.bookPack, term);
        results.replaceChildren(...(hits.length ? hits.map(hit => card([
          button(`PDF page ${hit.page}`, () => openPdf(readyBook, hit.page).catch(failure), 'secondary'),
          el('p', { class: 'muted', text: hit.excerpt })
        ])) : [el('p', { class: 'muted', text: 'No matches found.' })]));
      } catch (error) { failure(error); }
    });
    searchCard.append(form, results);
    root.append(searchCard, renderPrivateTables(readyBook), renderPrivateOptions(readyBook), renderPrivateShips(readyBook));
  }
  return root;
}

function renderPrivateTables(book) {
  const sourceSha = book.bookPack.sourceSha256;
  const tables = normalizePrivateTables(book.tables, sourceSha);
  const root = card([el('h2', { text: 'Private random tables' })]);
  const form = el('form', { class: 'form-stack' }, [
    el('div', { class: 'field-grid' }, [
      field('Table title', 'title', '', { required: true }),
      field('Source PDF page', 'page', '1', { number: true, required: true })
    ]),
    field('Entries (one per line: 1 | result)', 'rows', '', { multiline: true }),
    el('div', { class: 'actions' }, [
      button('Find rows on page', () => {
        try {
          const page = Number(form.querySelector('[name=page]').value);
          const found = suggestRowsFromPage(book.bookPack, page);
          if (found.length < 2) throw new Error('No usable numbered rows detected. Enter table rows manually.');
          form.querySelector('[name=rows]').value = formatCandidateRows(found);
          notify('Review the extracted rows and numbering before saving.');
        } catch (error) { failure(error); }
      }, 'secondary'),
      el('button', { type: 'submit', class: 'button primary', text: 'Save private table' })
    ])
  ]);
  form.querySelector('[name=page]').max = String(book.bookPack.pageCount);
  form.querySelector('[name=rows]').rows = 6;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const fields = new FormData(form);
      const latest = await get('documents', book.id);
      if (!latest?.bookPack || latest.bookPack.sourceSha256 !== sourceSha)
        throw new Error('Prepared source book is unavailable.');
      const table = makePrivateTable({ title: fields.get('title'), page: fields.get('page'),
        rows: fields.get('rows'), sourceSha256: sourceSha });
      if (table.page > latest.bookPack.pageCount) throw new Error('PDF page is outside this book.');
      latest.tables = addPrivateTable(latest.tables, table, sourceSha);
      await put('documents', latest);
      await refresh();
      notify('Private table saved.');
    } catch (error) { failure(error); }
  });
  root.append(el('p', { class: 'hint', text: 'Table entries come only from your locally imported book. Extracted candidates must be checked before saving.' }), form);
  if (!tables.length) return root;
  const list = el('div', { class: 'document-list' });
  for (const table of tables) {
    const result = el('div', { class: 'results', 'aria-live': 'polite' });
    const controls = el('div', { class: 'actions' }, [
      button('Roll', () => {
        try {
          const rolled = rollPrivateTable(table);
          result.replaceChildren(line('Roll', `${rolled.value} / ${table.sides}`),
            el('p', { text: rolled.entry.text }));
          const campaign = state.campaign;
          const episode = campaign?.episodes.find(e => e.id === state.activeEpisodeId) ||
            campaign?.episodes.find(e => e.status === 'active');
          if (episode) {
            result.append(button('Record roll in mission', async () => {
              try {
                // Save only the page reference and roll number, not publisher table prose.
                episode.entries.push(createEntry(`Private table: ${table.title}, PDF page ${table.page}, roll ${rolled.value}`));
                await persist();
                notify('Reference recorded in mission log.');
              } catch (error) { failure(error); }
            }, 'secondary'));
          }
        } catch (error) { failure(error); }
      }),
      button('Open source page', () => openPdf(book, table.page).catch(failure), 'secondary'),
      button('Remove', async () => {
        if (!confirm(`Remove private table "${table.title}"? Your PDF is unaffected.`)) return;
        try {
          const latest = await get('documents', book.id);
          if (!latest) throw new Error('Document not found.');
          latest.tables = removePrivateTable(latest.tables, table.id, sourceSha);
          await put('documents', latest);
          await refresh();
        } catch (error) { failure(error); }
      }, 'danger subtle')
    ]);
    list.append(el('div', { class: 'document-item' }, [
      el('strong', { text: table.title }),
      el('p', { class: 'hint', text: `PDF page ${table.page} · d${table.sides} · ${table.entries.length} rows` }),
      controls, result
    ]));
  }
  root.append(list);
  return root;
}
function renderPrivateOptions(book) {
  const options = normalizePrivateOptions(book.options, book.bookPack.sourceSha256);
  const panel = card([el('h2', { text: 'Saved lifepath choices' })]);
  if (!options.length) {
    panel.append(el('p', { class: 'hint', text: 'Validated lifepath steps can be saved here and reused when creating another character.' }));
    return panel;
  }
  for (const option of options) {
    panel.append(el('div', { class: 'document-item' }, [
      el('div', {}, [el('strong', { text: option.label }),
        el('p', { class: 'hint', text: `${option.stage} · PDF page ${option.page}` })]),
      el('div', { class: 'actions' }, [
        button('Open source', () => openPdf(book, option.page).catch(failure), 'secondary'),
        button('Remove', async () => {
          if (!confirm(`Remove saved choice "${option.label}"? Existing characters will not change.`)) return;
          try {
            const latest = await get('documents', book.id);
            if (!latest?.bookPack) throw new Error('Prepared book not found.');
            latest.options = removePrivateOption(latest.options, option.id, latest.bookPack.sourceSha256);
            await put('documents', latest);
            await refresh();
          } catch (error) { failure(error); }
        }, 'danger subtle')
      ])
    ]));
  }
  return panel;
}
function renderPrivateShips(book) {
  const classes = normalizePrivateShips(book.ships, book.bookPack.sourceSha256);
  const panel = card([el('h2', { text: 'Saved private ship classes' })]);
  if (!classes.length) {
    panel.append(el('p', { class: 'hint', text: 'Valid class statistics can be saved from guided ship setup and reused for other ships.' }));
    return panel;
  }
  for (const ship of classes) {
    panel.append(el('div', { class: 'document-item' }, [
      el('div', {}, [el('strong', { text: ship.className }),
        el('p', { class: 'hint', text: `${ship.era} · ${ship.kind} · scale ${ship.scale} · PDF page ${ship.page}` })]),
      el('div', { class: 'actions' }, [
        button('Open source', () => openPdf(book, ship.page).catch(failure), 'secondary'),
        button('Remove', async () => {
          if (!confirm(`Remove saved class "${ship.className}"? Existing ships will not change.`)) return;
          try {
            const latest = await get('documents', book.id);
            if (!latest?.bookPack) throw new Error('Prepared corebook not found.');
            latest.ships = removePrivateShip(latest.ships, ship.id, latest.bookPack.sourceSha256);
            await put('documents', latest);
            await refresh();
          } catch (error) { failure(error); }
        }, 'danger subtle')
      ])
    ]));
  }
  return panel;
}
let pdfUrl;
function pdfPageUrl(base, page) {
  const num = Number(page);
  if (!Number.isSafeInteger(num) || num < 1 || num > 99999) throw new Error('Enter a valid PDF page number.');
  return `${base}#page=${num}`;
}
async function openPdf(doc, page = 1) {
  const record = await get('documents', doc.id);
  if (!record) throw new Error('PDF not found.');
  const next = URL.createObjectURL(record.blob);
  try {
    const target = pdfPageUrl(next, page);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfUrl = next;
    $('#pdf-page').value = String(page);
    $('#pdf-title').textContent = doc.name;
    $('#pdf-frame').src = target;
    if (!$('#pdf-dialog').open) $('#pdf-dialog').showModal();
  } catch (error) { URL.revokeObjectURL(next); throw error; }
}
$('#pdf-page-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (!pdfUrl) throw new Error('Open a PDF first.');
    $('#pdf-frame').src = pdfPageUrl(pdfUrl, $('#pdf-page').value);
  } catch (error) { failure(error); }
});
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
    const attribute = ratingPicker(CHARACTER_ATTRIBUTES, 'Attribute', char.attributes);
    const discipline = ratingPicker(CHARACTER_DISCIPLINES, 'Discipline', char.disciplines);
    const difficulty = el('select', { 'aria-label': 'Difficulty' }, [
      el('option', { value: '1', text: 'Normal (1 success)' }),
      el('option', { value: '2', text: 'Increased (2 successes)' })
    ]);
    if (episode?.nextTaskHard) { difficulty.value = '2'; difficulty.disabled = true; }
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
    const showResult = result => {
      preview.replaceChildren(
        el('div', { class: 'dice-row' }, result.dice.map(n => el('span', { class: 'die', text: String(n) }))),
        line('Target', String(result.target)), line('Result', result.success ? 'Success' : 'Failure'),
        line('Successes', `${result.successes} / ${result.difficulty}`),
        line('Momentum', result.momentumEarned ? 'Generated' : 'None generated'),
        line('Threat', result.threatGenerated ? 'Generated' : 'None generated'),
        ...(result.focusAdvantage ? [line('Focus', 'Advantage triggered')] : [])
      );
      const meta = state.taskMeta;
      if (episode && episode.momentum && meta && meta.episodeId === episode.id && !meta.rerolled) {
        const rerollRow = el('div', { class: 'actions' });
        for (let index = 0; index < 2; index++) {
          rerollRow.append(button(`Reroll die ${index + 1} (Momentum)`, async () => {
            try {
              const revised = [...state.taskRoll.dice];
              revised[index] = rollDice(1, 20)[0];
              const nextResult = resolveTask({...meta.params, dice: revised});
              const baseline = {...episode, ...meta.before, momentum: false};
              Object.assign(episode, applyTaskOutcome(baseline, nextResult));
              episode.taskHistory = rerollTaskRecord(episode.taskHistory, meta.recordId, index, nextResult);
              state.taskRoll = nextResult; state.taskMeta.rerolled = true;
              await persist();
              notify(`Die ${index + 1} rerolled. New result applies.`);
            } catch (error) { failure(error); }
          }, 'secondary'));
        }
        preview.append(rerollRow);
      }
    };
    const roll = button('Roll task', async () => {
      try {
        const a = String(char.attributes[attribute.select.value] ?? '').trim();
        const d = String(char.disciplines[discipline.select.value] ?? '').trim();
        if (a === '' || d === '') throw new Error('Set both ratings on the character sheet first.');
        const params = { attribute: Number(a), discipline: Number(d),
          difficulty: taskDifficulty(episode, difficulty.value === '2'), focusApplies: focus.checked };
        const outcome = resolveTask({ ...params, dice: rollDice(2, 20) });
        state.taskRoll = outcome;
        if (episode) {
          await recordMissionTask(episode, { attribute: attribute.select.value,
            discipline: discipline.select.value }, params, outcome);
        } else {
          state.taskMeta = null;
          showResult(outcome);
        }
      } catch (error) { failure(error); }
    });
    taskCard.append(el('div', { class: 'field-grid' }, [attribute.wrapper, discipline.wrapper, el('label', { class: 'field' }, [el('span', { text: 'Difficulty' }), difficulty])]),
      focusLabel, target, ...(episode?.nextTaskHard ? [el('p', { class: 'hint', text: 'Threat is increasing this task’s difficulty.' })] : []),
      roll, preview);
    if (state.taskRoll && (!state.taskMeta || !episode || state.taskMeta.episodeId === episode.id)) showResult(state.taskRoll);
    root.append(taskCard);
    if (episode) {
      root.append(el('div', { class: 'actions' }, [button('Mission roll history', () => { state.activeEpisodeId = episode.id; go('log'); }, 'secondary')]));
      const updateResources = async changes => {
        Object.assign(episode, changes);
        state.taskMeta = null;
        await persist();
      };
      const tokenCard = card([el('h2', { text: 'Mission resources' }),
        line('Mission', episode.title),
        line('Momentum', episode.momentum ? 'Available' : 'None'),
        line('Threat', episode.threat ? (episode.nextTaskHard ? 'Next task increased' : 'Pending') : 'None'),
        el('div', { class: 'actions' }, [
          button('Momentum: advantage', async () => {
            try { await updateResources(spendMomentum(episode, 'advantage')); notify('Momentum spent. Add the advantage to your story.'); }
            catch (error) { failure(error); }
          }, 'secondary'),
          button('Momentum: clear Threat', async () => {
            try { await updateResources(spendMomentum(episode, 'remove-threat')); }
            catch (error) { failure(error); }
          }, 'secondary'),
          button('Threat: next task harder', async () => {
            try { await updateResources(spendThreat(episode, 'increase-difficulty')); }
            catch (error) { failure(error); }
          }, 'secondary')
        ])
      ]);
      const resourceButtons = tokenCard.querySelectorAll('.actions button');
      resourceButtons[0].disabled = !episode.momentum;
      resourceButtons[1].disabled = !(episode.momentum && episode.threat);
      resourceButtons[2].disabled = !episode.threat || episode.nextTaskHard;
      const complication = el('form', { class: 'form-stack' }, [
        field('Complication note', 'complication', '', { multiline: true }),
        el('button', { class: 'button secondary', type: 'submit', text: 'Threat: record complication' })
      ]);
      complication.querySelector('button').disabled = !episode.threat || episode.nextTaskHard;
      complication.addEventListener('submit', async event => {
        event.preventDefault();
        try {
          const note = String(new FormData(complication).get('complication') || '').trim();
          if (!note) throw new Error('Write the complication before spending Threat.');
          episode.entries.push(createEntry(note));
          await updateResources(spendThreat(episode, 'complication'));
          notify('Complication recorded.');
        } catch (error) { failure(error); }
      });
      tokenCard.append(complication);
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
    button('Crew', () => go('crew'), 'secondary'),
    button('Dice', () => go('dice'), 'secondary'),
    button('Settings', () => go('settings'), 'secondary')
  ])]);
}

function renderSettings() {
  const root = el('div', { class: 'page' });
  root.append(title('Settings'));
  const backupPdfToggle = el('input', { type: 'checkbox', 'aria-label': 'Include imported PDFs in private backup' });
  root.append(card([el('h2', { text: 'Data & storage' }),
    el('p', { class: 'muted', text: 'Backups include campaign data. Imported PDFs are excluded unless you choose to include them for private use.' }),
    el('label', { class: 'check-field' }, [backupPdfToggle, el('span', { text: 'Include imported PDFs (private backup only)' })]),
    el('div', { class: 'actions' }, [
      button('Export backup', async () => {
        try {
          $('#save-status').textContent = 'Exporting…';
          const backup = await createBackup({ includeDocuments: backupPdfToggle.checked });
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
      const effect = shouldReplaceDocumentsInRestore(raw)
        ? 'Your campaigns and imported PDFs will be replaced.'
        : 'Your campaigns will be replaced. Your imported PDFs will be kept.';
      if (!confirm(`Restore this backup? ${effect} Export a backup first.`)) return;
      await restoreBackup(raw);
      state.activeId = null; state.activeEpisodeId = null;
      await refresh(); notify('Backup restored.');
    } catch (error) { failure(error); } finally { restoreInput.value = ''; }
  });
  root.append(card([el('h2', { text: 'Restore' }), restoreInput]));
  root.append(card([el('h2', { text: 'About' }), el('p', { class: 'muted', text: 'SoloBridgeKit 0.15.1' })]));
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
