// NPC roster: optional player-entered full sheets or lightweight ship crew.
// Source: owner's Captain's Log 2026 PDF pp. 207–208.
// No automatically generated NPC statistics or narrative content.
// Names are the ordinary form fields; duplicate them locally to avoid a cycle
// between model normalization and optional crew module.
const attributes = ['control','daring','fitness','insight','presence','reason'];
const disciplines = ['command','conn','security','engineering','science','medicine'];
const systems = ['comms','computers','engines','sensors','structure','weapons'];
const deptKeys = disciplines;
const ASSIGNMENTS = new Set(['onboard','away-team','unassigned']);
const STATUSES = new Set(['available','busy','unavailable']);
const trim = (value,max,label) => {
  if (typeof value !== 'string' || value.length > max)
    throw new Error('Invalid crew ' + label + '.');
  return value.trim();
};
const blank = keys => Object.fromEntries(keys.map(key => [key,'']));
function ratings(source, keys, min, max, label) {
  const result = blank(keys);
  if (source == null) return result;
  if (!source || typeof source !== 'object' || Array.isArray(source))
    throw new Error('Invalid crew '+label+' ratings.');
  for (const key of keys) {
    const value = String(source[key] ?? '').trim();
    if (!value) continue;
    if (!/^\d+$/.test(value) || Number(value)<min || Number(value)>max)
      throw new Error('Crew '+key+' '+label+' must be '+min+'–'+max+'.');
    result[key] = value;
  }
  return result;
}
function cleanLinks(links, ownId) {
  if (links == null) return [];
  if (!Array.isArray(links) || links.length > 50)
    throw new Error('Invalid crew relationships.');
  const unique = new Set();
  return links.map(item => {
    if (!item || typeof item !== 'object' || typeof item.crewId !== 'string' ||
      !item.crewId || item.crewId === ownId || unique.has(item.crewId))
      throw new Error('Crew relationship targets must be different and unique.');
    unique.add(item.crewId);
    return { crewId: item.crewId,
      description: trim(item.description,600,'relationship description') };
  });
}
export function normalizeCrewMember(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
      typeof raw.id !== 'string' || !raw.id || raw.id.length > 120)
    throw new Error('Invalid saved crew member.');
  const mode = raw.sheetMode === 'full' ? 'full' : 'lightweight';
  const assignment = ASSIGNMENTS.has(raw.assignment) ? raw.assignment : 'unassigned';
  const status = STATUSES.has(raw.status) ? raw.status : 'available';
  return {
    ...raw,
    name: trim(raw.name ?? '',120,'name'),
    rank: trim(raw.rank ?? '',120,'rank'),
    role: trim(raw.role ?? '',120,'role'),
    department: trim(raw.department ?? '',120,'department'),
    relationship: trim(raw.relationship ?? '',2000,'relationship'),
    notes: trim(raw.notes ?? '',4000,'notes'),
    assignment,
    duty: trim(raw.duty ?? '',200,'duty'),
    status,
    sheetMode: mode,
    focuses: trim(raw.focuses ?? '',2500,'focuses'),
    attributes: ratings(raw.attributes,attributes,7,12,'Attribute'),
    disciplines: ratings(raw.disciplines,disciplines,1,5,'Discipline'),
    connections: cleanLinks(raw.connections,raw.id)
  };
}
export function normalizeCrewRoster(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length > 300)
    throw new Error('Crew roster is invalid or too large.');
  const seen = new Set();
  const roster = raw.map(entry => {
    const member = normalizeCrewMember(entry);
    if (!member.name || seen.has(member.id))
      throw new Error('Crew roster has a missing name or duplicate ID.');
    seen.add(member.id);
    return member;
  });
  // Keep a player-authored relationship note when its target crew member
  // disappears. Never silently delete the note: flag the missing link in UI.
  return roster;
}
export function crewSheetReview(member) {
  const saved=normalizeCrewMember(member), a=saved.attributes,d=saved.disciplines;
  const emptyA=attributes.filter(key=>!a[key]), emptyD=disciplines.filter(key=>!d[key]);
  const focusLines=saved.focuses.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const errors=[];
  if (saved.sheetMode==='full') {
    if(emptyA.length || emptyD.length)
      errors.push('Enter all six Attributes and all six Disciplines for a full NPC sheet.');
    if(!focusLines.length)errors.push('Enter at least one personally selected Focus.');
  }
  return {ready:errors.length===0,errors,hasFullRatings:emptyA.length===0&&emptyD.length===0,
    focusCount:focusLines.length,mode:saved.sheetMode};
}
export function crewTaskTarget(member, attribute, discipline) {
  const m=normalizeCrewMember(member), review=crewSheetReview(m);
  if(m.sheetMode!=='full' || !review.ready)
    throw new Error('This officer needs a completed personal NPC sheet for an individual task.');
  if (!attributes.includes(attribute)||!disciplines.includes(discipline))
    throw new Error('Select a valid NPC Attribute and Discipline.');
  return {target:Number(m.attributes[attribute])+Number(m.disciplines[discipline]),
    attribute,discipline,sourcePage:207};
}
export function shipCrewTaskTarget(ship,system,department) {
  if(!systems.includes(system)||!deptKeys.includes(department))
    throw new Error('Select a valid ship System and Department.');
  const a=String(ship?.systems?.[system]??'').trim(),
    d=String(ship?.departments?.[department]??'').trim();
  if(!/^\d+$/.test(a)||Number(a)<6||Number(a)>12||
     !/^\d+$/.test(d)||Number(d)<1||Number(d)>5)
    throw new Error('The ship needs source-confirmed System and Department ratings.');
  return {target:Number(a)+Number(d),system,department,sourcePage:208};
}
export function addCrewConnection(member,crewId,description) {
  const saved=normalizeCrewMember(member);
  return {...saved,connections:cleanLinks([...saved.connections,
    {crewId,description}],saved.id)};
}
export function removeCrewConnection(member,crewId) {
  const saved=normalizeCrewMember(member);
  return {...saved,connections:saved.connections.filter(link=>link.crewId!==crewId)};
}
export function crewAssignments(roster) {
  return normalizeCrewRoster(roster).reduce((result,member)=>{
    result[member.assignment].push(member);
    return result;
  },{'onboard':[],'away-team':[],'unassigned':[]});
}
