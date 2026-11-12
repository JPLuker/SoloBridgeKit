// Captain's Log (2026), mission tracker: PDF pp. 191–193.
// An act has player-selectable scene count. Original log entries are retained.
export const DEFAULT_SCENE_PLAN = [5, 5, 5];

export function validateScenePlan(plan) {
  if (!Array.isArray(plan) || plan.length !== 3 || plan.some(n => !Number.isInteger(n) || n < 1 || n > 30)) {
    throw new Error('Each of the three acts needs 1–30 scenes.');
  }
  return [...plan];
}

export function createScene(act, number, existing = {}) {
  return { id: existing.id || `${act}:${number}`, act, number, title: String(existing.title ?? ''),
    notes: String(existing.notes ?? ''), completed: Boolean(existing.completed), completedAt: existing.completedAt ?? null };
}

export function createMissionScenes(plan = DEFAULT_SCENE_PLAN) {
  return validateScenePlan(plan).flatMap((count, index) => Array.from({ length: count }, (_, i) => createScene(index + 1, i + 1)));
}

export function normalizeMissionScenes(mission) {
  const plan = validateScenePlan(mission.scenePlan || DEFAULT_SCENE_PLAN);
  const saved = Array.isArray(mission.scenes) ? mission.scenes : [];
  // Only initial migration from old saves uses the legacy aggregate counter.
  const legacyComplete = saved.length === 0 ? Math.max(0, Number(mission.tracker) || 0) : 0;
  let index = 0;
  const scenes = createMissionScenes(plan).map(scene => {
    const old = saved.find(s => s.act === scene.act && s.number === scene.number);
    const migrated = old ? createScene(scene.act, scene.number, old) : createScene(scene.act, scene.number,
      index < legacyComplete ? { completed: true } : {});
    index++;
    return migrated;
  });
  return { scenePlan: plan, scenes, tracker: scenes.filter(s => s.completed).length };
}

export function updateScenePlan(mission, newPlan) {
  const plan = validateScenePlan(newPlan);
  const current = normalizeMissionScenes(mission);
  for (const scene of current.scenes) {
    if (scene.number > plan[scene.act - 1] && (scene.completed || scene.title.trim() || scene.notes.trim())) {
      throw new Error(`Act ${scene.act} scene ${scene.number} has progress or notes. Clear it before reducing scene count.`);
    }
  }
  return normalizeMissionScenes({ ...mission, ...current, scenePlan: plan });
}

export function toggleMissionScene(mission, act, number, completed) {
  const current = normalizeMissionScenes(mission);
  const selected = current.scenes.find(s => s.act === act && s.number === number);
  if (!selected) throw new Error('Scene not found.');
  selected.completed = Boolean(completed);
  selected.completedAt = completed ? new Date().toISOString() : null;
  return { ...current, tracker: current.scenes.filter(s => s.completed).length };
}