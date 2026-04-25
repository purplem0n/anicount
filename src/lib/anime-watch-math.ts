/**
 * Reference block for the equivalence line only: 12 episodes at 24 minutes each
 * (One Punch Man season 1 style cour).
 */
export const MINUTES_PER_EPISODE_REFERENCE = 24
export const ONE_PUNCH_MAN_SEASON1_EPISODES = 12

const REFERENCE_BLOCK_MINUTES =
  ONE_PUNCH_MAN_SEASON1_EPISODES * MINUTES_PER_EPISODE_REFERENCE

/** How many full reference blocks (12×24 min) fit into `totalMinutes`. */
export function onePunchManSeason1EquivalenceCount(totalMinutes: number): number {
  if (REFERENCE_BLOCK_MINUTES <= 0 || totalMinutes <= 0) return 0
  return Math.round(totalMinutes / REFERENCE_BLOCK_MINUTES)
}

