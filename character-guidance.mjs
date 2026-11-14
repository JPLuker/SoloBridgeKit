// Source-verified lifepath selection and provenance, with no publisher data bundled.
import { LIFEPATH_STEPS, normalizeLifepath, validateLifepathStep } from './lifepath.mjs';
import { applyPrivateOption, categoryForStep } from './private-options.mjs';

const HASH = /^[a-f0-9]{64}$/;
const mechanicalKeys = ['attributes', 'disciplines'];
const equals = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export function sameVerifiedMechanics(stage, option) {
  if (!stage || !option || stage.choice !== option.label) return false;
  const result = applyPrivateOption(option, option.stage === 'careerEvent' ? 'event1' : option.stage);
  return mechanicalKeys.every(key => equals(stage[key],result[key]));
}
function validateSourceOption(stepId, option, sourceSha256, pageCount) {
  const step = LIFEPATH_STEPS.find(item => item.id === stepId);
  if (!step || step.id === 'finishing') throw new Error('Choose an applicable lifepath stage.');
  if (!HASH.test(sourceSha256 ?? '') || option?.sourceSha256 !== sourceSha256 ||
      option.stage !== categoryForStep(stepId))
    throw new Error('This choice is not confirmed for the selected private corebook and stage.');
  if (!Number.isSafeInteger(option.page) || option.page < 1 || option.page > pageCount)
    throw new Error('Verified choice source page is invalid.');
  const stage = applyPrivateOption(option,stepId);
  // Player-authored values and focus names can be supplied later. Validate the
  // mechanical distribution now using temporary placeholders, without storing them.
  const proof = {...stage, value: step.values ? (stage.value || 'Player-supplied value') : stage.value,
    focuses: stage.focuses || Array.from({length:step.focuses},(_,i)=>'Player focus '+(i+1)).join('\n') };
  const issues = validateLifepathStep(stepId, proof);
  if (issues.length) throw new Error(step.title + ': ' + issues[0]);
  return stage;
}
export function chooseVerifiedLifepathOption(rawPath, stepId, option, sourceSha256, pageCount) {
  const chosen = validateSourceOption(stepId,option,sourceSha256,pageCount);
  const path = normalizeLifepath(rawPath);
  const previous = path.stages[stepId];
  path.stages[stepId] = {
    ...chosen,
    // Preserve personally written stage notes on changing a choice.
    notes: previous?.notes || chosen.notes,
    sourceRef: { recordId: option.id, sourceSha256,
      page: option.page, label: option.label }
  };
  path.appliedAt = null;
  return path;
}
export function stageSourceStatus(stage, stepId, options, sourceSha256) {
  if (!stage?.sourceRef) return 'manual';
  if (stage.sourceRef.sourceSha256 !== sourceSha256) return 'different-source';
  const option = Array.isArray(options)
    ? options.find(item => item.id === stage.sourceRef.recordId) : undefined;
  if (!option || option.sourceSha256 !== sourceSha256 ||
      option.stage !== categoryForStep(stepId) || option.page !== stage.sourceRef.page)
    return 'missing-choice';
  return sameVerifiedMechanics(stage,option) ? 'verified' : 'modified';
}
export function auditGuidedLifepath(rawPath, options, sourceSha256) {
  const path=normalizeLifepath(rawPath), status={};
  for (const step of LIFEPATH_STEPS.filter(s=>s.id!=='finishing')) {
    status[step.id] = stageSourceStatus(path.stages[step.id],step.id,options,sourceSha256);
  }
  return { status, ready: Object.values(status).every(s=>s==='verified'),
    count: Object.values(status).filter(s=>s==='verified').length,
    total: Object.keys(status).length };
}
