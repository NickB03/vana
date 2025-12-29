// Pulse duration in ms - must match CSS animation duration
export const PULSE_DURATION_MS = 2000;

/**
 * Calculate the animation delay needed to sync all skeleton elements
 * to the same "beat" of the pulse animation cycle.
 *
 * By using a negative delay based on (currentTime % duration), all elements
 * will appear at the same point in the animation cycle regardless of when
 * they mount.
 */
export function getSyncDelay(): number {
  return -(Date.now() % PULSE_DURATION_MS);
}
