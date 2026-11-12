// Captain's Log (2026), Momentum and Threat, PDF pp. 198–200.
// Pure token state changes; the player supplies the narrative consequence.
export function taskDifficulty(episode, manualIncreased = false) {
  return episode?.nextTaskHard || manualIncreased ? 2 : 1;
}

export function applyTaskOutcome(episode, outcome) {
  const pendingDifficulty = episode.nextTaskHard === true;
  return {
    momentum: Boolean(episode.momentum || outcome.momentumEarned),
    threat: Boolean((pendingDifficulty ? false : episode.threat) || outcome.threatGenerated),
    nextTaskHard: false
  };
}

export function spendMomentum(episode, use) {
  if (!episode.momentum) throw new Error('No Momentum available.');
  if (use === 'advantage' || use === 'reroll') return { momentum: false };
  if (use === 'remove-threat') {
    if (!episode.threat) throw new Error('No Threat to remove.');
    return { momentum: false, threat: false, nextTaskHard: false };
  }
  throw new Error('Unsupported Momentum use.');
}

export function spendThreat(episode, use) {
  if (!episode.threat) throw new Error('No Threat pending.');
  if (use === 'complication') return { threat: false, nextTaskHard: false };
  if (use === 'increase-difficulty') return { threat: true, nextTaskHard: true };
  throw new Error('Unsupported Threat use.');
}