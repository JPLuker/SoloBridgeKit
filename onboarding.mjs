// Novice-facing import explanations. Keep game-specific publisher text out of
// the public bundle. This never bypasses source verification.
export function explainRulebookImportFailure(error,role='corebook'){
  const message=String(error?.message??'');
  if(role!=='corebook')return message||'The PDFs could not be imported. Try again.';
  if(/Incomplete corebook page index/i.test(message))
    return 'This PDF is too short or incomplete to be the main rulebook. Select the full Captain\'s Log (2026) rulebook, not its blank forms or a short supplement. Nothing from this attempt was saved.';
  if(/does not contain a readable|password|encrypted|unable to extract|scanned/i.test(message))
    return 'The app could not read the rules text from this PDF. Check that it is the complete, readable 2026 Captain\'s Log rulebook rather than scanned pictures or a locked file. Your existing data was not changed.';
  if(/not a valid PDF|valid PDF files only|PDF file/i.test(message))
    return 'Choose the actual .pdf document, not a ZIP archive, a cover image or a download shortcut. No files from this attempt were saved.';
  if(/Import cancelled/i.test(message))return 'Import cancelled. Your earlier books and campaigns are unchanged.';
  return message||'The rulebook could not be prepared. Check the file and try again; earlier saves are unchanged.';
}
export const BEGINNER_STEPS=Object.freeze([
  {title:'Add your rulebook',description:'Choose your own Captain\'s Log PDF. The app reads it privately in this browser.'},
  {title:'Create your character',description:'Make choices one at a time. You do not need to memorize the rules.'},
  {title:'Start your first mission',description:'Describe what your character tries, then use dice to resolve uncertain actions.'}
]);
