// Recovery drafts contain player-authored campaign data ONLY: no PDFs or private
// compiled rulebooks. A recovered draft is imported as a NEW campaign to avoid
// overwriting the newer record that caused the conflict.
import { createCampaign, makeId, normalizeCampaign, validateBundle, DATA_VERSION } from './model.mjs';

export const RECOVERY_FORMAT = 'solobridgekit-recovery-draft';
export const RECOVERY_VERSION = 1;

function assertCampaign(value) {
  validateBundle({ format: 'solobridgekit', version: DATA_VERSION,
    campaigns: [value], documents: [], includesDocuments: false });
}

export function createRecoveryDraft(campaign) {
  const snapshot = structuredClone(campaign);
  assertCampaign(snapshot);
  return { format: RECOVERY_FORMAT, version: RECOVERY_VERSION,
    capturedAt: new Date().toISOString(), campaign: snapshot };
}

export function recoverDraftAsNewCampaign(input, idFactory = makeId) {
  if (!input || input.format !== RECOVERY_FORMAT || input.version !== RECOVERY_VERSION ||
      !input.campaign) throw new Error('Not a supported SoloBridgeKit recovery draft.');
  assertCampaign(input.campaign);
  const old = normalizeCampaign(structuredClone(input.campaign));
  const id = idFactory();
  if (typeof id !== 'string' || !id || id === old.id) throw new Error('Recovery campaign ID was invalid.');
  const suffix = ' (recovered)';
  const title = String(old.title).slice(0, 100 - suffix.length) + suffix;
  const now = new Date().toISOString();
  // A recovery import is a new independent campaign. Never carry the old
  // storage epoch into a new record: restores intentionally invalidate it.
  const recovered = { ...old, id, title, createdAt: now, updatedAt: now, revision: 0 };
  delete recovered.storageEpoch;
  return recovered;
}
