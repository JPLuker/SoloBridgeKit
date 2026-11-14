import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign, createEpisode } from '../model.mjs';
import { createRecoveryDraft, recoverDraftAsNewCampaign, RECOVERY_FORMAT } from '../recovery.mjs';

test('recovery draft contains only player campaign and no imported book data', () => {
  const campaign = createCampaign('My private game');
  campaign.episodes.push(createEpisode('My story'));
  campaign.character.notes = 'Important unsaved words';
  const draft = createRecoveryDraft(campaign);
  assert.equal(draft.format, RECOVERY_FORMAT);
  assert.equal(draft.campaign.character.notes, 'Important unsaved words');
  assert.equal(Object.hasOwn(draft, 'documents'), false);
  assert.equal(Object.hasOwn(draft, 'bookPack'), false);
});
test('recovery imports as a distinct campaign and preserves original snapshot', () => {
  const campaign = createCampaign('Original');
  campaign.character.notes = 'Unsaved story';
  campaign.revision = 15;
  const draft = createRecoveryDraft(campaign);
  const recovered = recoverDraftAsNewCampaign(draft, () => 'new-unique-id');
  assert.equal(recovered.id, 'new-unique-id');
  assert.equal(recovered.title, 'Original (recovered)');
  assert.equal(recovered.revision, 0);
  assert.equal(recovered.character.notes, 'Unsaved story');
  assert.equal(draft.campaign.id, campaign.id);
});
test('recovery refuses damaged drafts and source campaigns', () => {
  const campaign = createCampaign('Working');
  assert.throws(() => recoverDraftAsNewCampaign({campaign}), /Not a supported/);
  assert.throws(() => recoverDraftAsNewCampaign({ ...createRecoveryDraft(campaign),
    campaign: { id: 'broken' } }), /invalid campaign/);
  assert.throws(() => recoverDraftAsNewCampaign(createRecoveryDraft(campaign), () => campaign.id),
    /ID was invalid/);
});
