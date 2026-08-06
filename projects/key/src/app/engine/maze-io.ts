import type { TargetId } from './maze-run-engine';

/** Primary maze: arrow keys, compass-ordered to match TARGET_LABELS. */
export const ARROW_KEY_MAP: Record<string, TargetId> = {
  ArrowUp: 0,
  ArrowRight: 1,
  ArrowDown: 2,
  ArrowLeft: 3,
};

/** Secondary maze (dual mode only): WASD, same compass order. */
export const WASD_KEY_MAP: Record<string, TargetId> = {
  w: 0,
  W: 0,
  d: 1,
  D: 1,
  s: 2,
  S: 2,
  a: 3,
  A: 3,
};

/** Formats milliseconds as `SS.mmm`, or `M:SS.mmm` once a run passes a minute. */
export function formatDuration(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms));
  const minutes = Math.floor(totalMs / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  const secStr = seconds.toString().padStart(2, '0');
  const msStr = millis.toString().padStart(3, '0');
  return minutes > 0 ? `${minutes}:${secStr}.${msStr}` : `${secStr}.${msStr}`;
}
