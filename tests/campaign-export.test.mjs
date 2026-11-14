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


test('journal preserves scene context but strips private table text and old generated titles',()=>{
  const ep=createEpisode('Player journal');
  ep.activeSceneId='3:2';
  ep.entries.push({id:'ref1',at:new Date().toISOString(),kind:'table-reference',
    text:'Private table reference · PDF page 210 · roll 2',
    sceneId:'3:2',sourceSha256:'b'.repeat(64),page:210,rollValue:2,tableId:'private-table'});
  ep.entries.push({id:'legacy-ref',at:new Date().toISOString(),
    text:'Table: Licensed privately imported title, PDF page 210, roll 3'});
  const journal=renderEpisodeJournal(ep);
  assert.ok(journal.includes('Act 3, Scene 2'));
  assert.ok(journal.includes('PDF page 210 · roll 2'));
  assert.ok(journal.includes('PDF page 210 · roll 3'));
  assert.equal(journal.includes('Licensed privately imported title'),false);
});


test('episode journal retains authored scene Values and unresolved threads only',()=>{
  const ep=createEpisode('Solo mission');
  ep.scenes[0].valuesUsed='Player-created value reference';
  ep.threads=[{id:'private-thread',title:'My unresolved mystery',
    notes:'My own context',createdAt:'2026-11-14T10:00:00Z',
    createdSceneId:'1:1',resolvedSceneId:null,resolvedAt:null,status:'open'}];
  const journal=renderEpisodeJournal(ep);
  assert.ok(journal.includes('Player-created value reference'));
  assert.ok(journal.includes('My unresolved mystery'));
  assert.ok(journal.includes('Unresolved'));
  assert.ok(journal.includes('Act 1, Scene 1'));
});
