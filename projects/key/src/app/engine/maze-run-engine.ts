import { computed, signal } from '@angular/core';

/** The four contacts in a maze, addressed by index. */
export const TARGET_IDS = [0, 1, 2, 3] as const;
export type TargetId = (typeof TARGET_IDS)[number];

/** Default human-readable labels; swap for whatever fits the physical maze. */
export const TARGET_LABELS: Record<TargetId, string> = {
  0: 'North',
  1: 'East',
  2: 'South',
  3: 'West',
};

export type MazeMode = 'any-order' | 'sequence' | 'last-only';

export interface MazeConfig {
  mode: MazeMode;
  /** Required for 'sequence': the full hit order, each of the 4 targets exactly once. */
  sequence?: TargetId[];
  /** Required for 'last-only': which target must be the final one hit. */
  lastTargetId?: TargetId;
}

export interface TargetHit {
  targetId: TargetId;
  /** performance.now()-style timestamp when this hit was accepted. */
  atMs: number;
  /** Time since the previous accepted hit (or since start, for the first hit). */
  splitMs: number;
}

export interface RejectedHit {
  targetId: TargetId;
  message: string;
}

export type MazeRunStatus = 'idle' | 'counting-down' | 'running' | 'finished';

export function validateMazeConfig(config: MazeConfig): string | null {
  if (config.mode === 'sequence') {
    if (!config.sequence || config.sequence.length !== 4) {
      return 'Sequence mode needs an order for all 4 targets.';
    }
    if (new Set(config.sequence).size !== 4) {
      return 'Sequence mode needs each target exactly once.';
    }
  }
  if (config.mode === 'last-only' && config.lastTargetId === undefined) {
    return 'Last-only mode needs a target designated as last.';
  }
  return null;
}

/**
 * Framework-agnostic timer + hit-order validator for a single maze/robot.
 * One instance per concurrent maze (e.g. one for arrows, one for WASD).
 * UI components read its signals; it has no DOM or Angular DI dependency,
 * so it's cheap to unit test directly.
 */
export class MazeRunEngine {
  readonly status = signal<MazeRunStatus>('idle');
  readonly hits = signal<TargetHit[]>([]);
  readonly rejected = signal<RejectedHit | null>(null);
  readonly totalMs = signal<number | null>(null);

  readonly hitTargetIds = computed(() => new Set(this.hits().map((h) => h.targetId)));
  readonly isFinished = computed(() => this.status() === 'finished');

  private startedAtMs: number | null = null;
  private rejectionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    readonly config: MazeConfig,
    private readonly now: () => number = () => performance.now(),
    private readonly rejectionDisplayMs = 1500,
  ) {
    const error = validateMazeConfig(config);
    if (error) throw new Error(error);
  }

  /** Call once the countdown reaches zero. */
  start(): void {
    this.clearRejectionTimer();
    this.status.set('running');
    this.startedAtMs = this.now();
    this.hits.set([]);
    this.rejected.set(null);
    this.totalMs.set(null);
  }

  /** Abort/clear a run and go back to idle (e.g. user hits "reset"). */
  reset(): void {
    this.clearRejectionTimer();
    this.status.set('idle');
    this.hits.set([]);
    this.rejected.set(null);
    this.totalMs.set(null);
    this.startedAtMs = null;
  }

  /** Elapsed time for display while running, or the final total once finished. */
  elapsedMs(nowMs: number = this.now()): number {
    if (this.startedAtMs === null) return 0;
    if (this.status() === 'finished' && this.totalMs() !== null) return this.totalMs()!;
    return nowMs - this.startedAtMs;
  }

  /** Feed a target-key press. No-ops unless a run is currently active. */
  registerHit(targetId: TargetId): void {
    if (this.status() !== 'running' || this.startedAtMs === null) return;
    if (this.hitTargetIds().has(targetId)) return; // duplicate/repeat press, ignore

    const validity = this.checkValidity(targetId);
    if (!validity.valid) {
      this.showRejection(targetId, validity.message);
      return;
    }

    const atMs = this.now();
    const previous = this.hits().at(-1);
    const splitMs = atMs - (previous ? previous.atMs : this.startedAtMs);
    this.hits.update((hits) => [...hits, { targetId, atMs, splitMs }]);
    this.rejected.set(null);

    if (this.hits().length === 4) {
      this.status.set('finished');
      this.totalMs.set(atMs - this.startedAtMs);
    }
  }

  private checkValidity(targetId: TargetId): { valid: true } | { valid: false; message: string } {
    switch (this.config.mode) {
      case 'any-order':
        return { valid: true };

      case 'sequence': {
        const sequence = this.config.sequence!;
        const expected = sequence[this.hits().length];
        if (targetId === expected) return { valid: true };
        const expectedPosition = sequence.indexOf(expected) + 1;
        const expectedIsLast = expectedPosition === sequence.length;
        return {
          valid: false,
          message: expectedIsLast
            ? `Not yet — that's the last one`
            : `Not yet — hit target ${expectedPosition} next`,
        };
      }

      case 'last-only': {
        if (targetId !== this.config.lastTargetId) return { valid: true };
        const othersRemaining = 3 - this.hits().length;
        if (othersRemaining <= 0) return { valid: true };
        return { valid: false, message: `Not yet — that's the last one` };
      }
    }
  }

  private showRejection(targetId: TargetId, message: string): void {
    this.clearRejectionTimer();
    this.rejected.set({ targetId, message });
    this.rejectionTimer = setTimeout(() => this.rejected.set(null), this.rejectionDisplayMs);
  }

  private clearRejectionTimer(): void {
    if (this.rejectionTimer !== null) {
      clearTimeout(this.rejectionTimer);
      this.rejectionTimer = null;
    }
  }
}
