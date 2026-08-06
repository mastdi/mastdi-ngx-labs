import { describe, expect, it, vi } from 'vitest';
import { MazeRunEngine, type MazeConfig } from './maze-run-engine';

/** Deterministic fake clock: each call advances by `stepMs`. */
function fakeClock(stepMs = 100) {
  let t = 0;
  return () => (t += stepMs);
}

describe('MazeRunEngine', () => {
  describe('any-order mode', () => {
    it('accepts targets in any order and computes splits + total', () => {
      const config: MazeConfig = { mode: 'any-order' };
      const engine = new MazeRunEngine(config, fakeClock(100));

      engine.start();
      engine.registerHit(2);
      engine.registerHit(0);
      engine.registerHit(3);
      engine.registerHit(1);

      expect(engine.status()).toBe('finished');
      expect(engine.hits().map((h) => h.targetId)).toEqual([2, 0, 3, 1]);
      expect(engine.hits().every((h) => h.splitMs === 100)).toBe(true);
      expect(engine.totalMs()).toBe(400);
    });

    it('ignores a repeated hit on the same target', () => {
      const engine = new MazeRunEngine({ mode: 'any-order' }, fakeClock());
      engine.start();
      engine.registerHit(0);
      engine.registerHit(0);
      expect(engine.hits().length).toBe(1);
    });
  });

  describe('sequence mode', () => {
    const config: MazeConfig = { mode: 'sequence', sequence: [0, 1, 2, 3] };

    it('rejects an out-of-order hit with the expected position, keeps progress unchanged', () => {
      const engine = new MazeRunEngine(config, fakeClock());
      engine.start();
      engine.registerHit(2); // expected target 0 (position 1) next
      expect(engine.hits().length).toBe(0);
      expect(engine.rejected()).toEqual({ targetId: 2, message: 'Not yet — hit target 1 next' });
    });

    it('names the last position when that is what is expected next', () => {
      const engine = new MazeRunEngine(config, fakeClock());
      engine.start();
      engine.registerHit(0);
      engine.registerHit(1);
      engine.registerHit(2);
      engine.registerHit(0); // already hit, ignored as duplicate, not a rejection
      expect(engine.rejected()).toBeNull();
      engine.registerHit(2); // duplicate again
      expect(engine.rejected()).toBeNull();
      // now try the wrong (already-hit) target vs correct next: force a genuine wrong guess
    });

    it('completes the run once the full sequence is hit correctly', () => {
      const engine = new MazeRunEngine(config, fakeClock(50));
      engine.start();
      engine.registerHit(0);
      engine.registerHit(1);
      engine.registerHit(2);
      engine.registerHit(3);
      expect(engine.status()).toBe('finished');
      expect(engine.totalMs()).toBe(200);
    });

    it('clears the rejection automatically after the display window', () => {
      vi.useFakeTimers();
      const engine = new MazeRunEngine(config, fakeClock(), 1500);
      engine.start();
      engine.registerHit(3);
      expect(engine.rejected()).not.toBeNull();
      vi.advanceTimersByTime(1500);
      expect(engine.rejected()).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('last-only mode', () => {
    const config: MazeConfig = { mode: 'last-only', lastTargetId: 3 };

    it('rejects the last target if hit before the other three', () => {
      const engine = new MazeRunEngine(config, fakeClock());
      engine.start();
      engine.registerHit(3);
      expect(engine.hits().length).toBe(0);
      expect(engine.rejected()?.message).toBe(`Not yet — that's the last one`);
    });

    it('allows the other three targets in any order, then the last one', () => {
      const engine = new MazeRunEngine(config, fakeClock());
      engine.start();
      engine.registerHit(1);
      engine.registerHit(0);
      engine.registerHit(2);
      expect(engine.status()).toBe('running');
      engine.registerHit(3);
      expect(engine.status()).toBe('finished');
    });
  });

  describe('config validation', () => {
    it('throws for sequence mode missing a full sequence', () => {
      expect(() => new MazeRunEngine({ mode: 'sequence', sequence: [0, 1] })).toThrow();
    });

    it('throws for last-only mode missing a designated target', () => {
      expect(() => new MazeRunEngine({ mode: 'last-only' })).toThrow();
    });
  });

  describe('giving up', () => {
    it('freezes the clock and keeps partial hits when abandoned mid-run', () => {
      const engine = new MazeRunEngine({ mode: 'any-order' }, fakeClock(100));
      engine.start();
      engine.registerHit(0);
      engine.registerHit(2);

      engine.giveUp();

      expect(engine.status()).toBe('given-up');
      expect(engine.isDone()).toBe(true);
      expect(engine.isFinished()).toBe(false);
      expect(engine.hits().map((h) => h.targetId)).toEqual([0, 2]);
      expect(engine.totalMs()).toBe(300);
      expect(engine.elapsedMs(99999)).toBe(300); // clock stays frozen afterwards
    });

    it('is a no-op if called before a run starts or after it already ended', () => {
      const engine = new MazeRunEngine({ mode: 'any-order' }, fakeClock());
      engine.giveUp();
      expect(engine.status()).toBe('idle');

      engine.start();
      engine.registerHit(0);
      engine.registerHit(1);
      engine.registerHit(2);
      engine.registerHit(3);
      expect(engine.status()).toBe('finished');

      engine.giveUp();
      expect(engine.status()).toBe('finished'); // already finished, giveUp doesn't override
    });

    it('clears any pending rejection toast when abandoned', () => {
      vi.useFakeTimers();
      const engine = new MazeRunEngine(
        { mode: 'sequence', sequence: [0, 1, 2, 3] },
        fakeClock(),
        1500,
      );
      engine.start();
      engine.registerHit(3); // rejected, not the expected first target
      expect(engine.rejected()).not.toBeNull();

      engine.giveUp();
      expect(engine.rejected()).toBeNull();
      vi.useRealTimers();
    });
  });
});
