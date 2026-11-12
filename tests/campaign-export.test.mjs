import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign, createEpisode, createEntry } from '../model.mjs';
import { renderCampaignJournal, renderEpisodeJournal, journalFilename } from '../campaign-export.mjs';

test('campaign export preserves player-created character, crew and episode history', () => {
  const campaign = createCampaign('Voyage of Test');
  campaign.character.name = 'An original officer';
  campaign.ship.name = 'Sample ship';
  const episode = createEpisode('First mission');
  episode.entries.push(createEntry('Player-created scene notes'));
  campaign.episodes.push(episode);
  const journal = renderCampaignJournal(campaign);
  for (const value of ['Voyage of Test', 'An original officer', 'Sample ship', 'First mission', 'Player-created scene notes'])
    assert.ok(journal.includes(value), value);
  assert.equal(renderEpisodeJournal(episode).includes('Player-created scene notes'), true);
});
test('default journal export never reads privately imported source documents', () => {
  const campaign = createCampaign('Sample');
  campaign.documents = [{ bookPack: { pages: [{ text: 'DO_NOT_EXPORT_PRIVATE_BOOK_TEXT' }] } }];
  campaign.bookPack = { pages: [{ text: 'DO_NOT_EXPORT_PRIVATE_BOOK_TEXT' }] };
  assert.equal(renderCampaignJournal(campaign).includes('DO_NOT_EXPORT_PRIVATE_BOOK_TEXT'), false);
});
test('journal filename is bounded, portable and does not inherit path separators', () => {
  assert.equal(journalFilename('../../  Sample / Voyage'), 'sample-voyage-journal.md');
  assert.ok(journalFilename('Some name').endsWith('.md'));
});
