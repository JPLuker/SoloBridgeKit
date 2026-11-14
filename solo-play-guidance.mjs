// R4: context-sensitive, non-narrative first-session guidance.
// This never creates plot, characters, dialogue, or a dice outcome.
export function soloPlayPrompt(mission){
  const entries=Array.isArray(mission?.entries)?mission.entries:[];
  const scenes=Array.isArray(mission?.scenes)?mission.scenes:[];
  if(!entries.length){
    return {
      title:'Begin your first scene',
      explanation:'A scene is one moment in your story. Decide where your character is, what is happening right now, and what they want to try.',
      instruction:'Write the opening situation in your own words. You can introduce details gradually; a complete story outline is not required.',
      next:'Record your opening'
    };
  }
  if(scenes.length&&scenes.every(scene=>scene.completed)){
    return {
      title:'Review what happened',
      explanation:'You have marked all planned scenes complete. Read your notes and decide whether this mission is ready to end.',
      instruction:'You can reopen a scene, add an entry, or finish the mission. Nothing ends automatically.',
      next:'Review your log'
    };
  }
  return {
    title:'Continue your scene',
    explanation:'Choose what your character tries next. If the outcome is uncertain and matters, use a task roll; otherwise describe the result yourself.',
    instruction:'When something changes, record what happened in the log and move to the next scene when you are ready.',
    next:'Add what happens next'
  };
}
