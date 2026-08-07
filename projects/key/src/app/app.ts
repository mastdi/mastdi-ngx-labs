import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MazeConfigForm, type MazeSetup } from './components/maze-config-form/maze-config-form';
import { MazeRunPanel } from './components/maze-run-panel/maze-run-panel';
import { MazeRunEngine, TARGET_LABELS, type TargetId } from './engine/maze-run-engine';
import { ARROW_KEY_MAP, WASD_KEY_MAP } from './engine/maze-io';

type Phase = 'config' | 'ready' | 'run';

@Component({
  selector: 'app-root',
  imports: [MatButtonModule, MazeConfigForm, MazeRunPanel],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class App {
  readonly phase = signal<Phase>('config');
  readonly countdownValue = signal<number | null>(null);
  readonly targetLabels = signal<Record<TargetId, string>>(TARGET_LABELS);
  /** Remembers the full last setup so "Back to setup" / "Run again" can prefill the form. */
  readonly lastSetup = signal<MazeSetup | null>(null);

  primaryEngine: MazeRunEngine | null = null;
  secondaryEngine: MazeRunEngine | null = null;

  private countdownSeconds = 3;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  onConfigured(setup: MazeSetup): void {
    this.primaryEngine = new MazeRunEngine(setup.config);
    this.secondaryEngine = setup.dualMaze ? new MazeRunEngine(setup.config) : null;
    this.countdownSeconds = setup.countdownSeconds;
    this.targetLabels.set(setup.labels);
    this.lastSetup.set(setup);
    this.phase.set('ready');
  }

  beginCountdown(): void {
    this.phase.set('run');
    let remaining = this.countdownSeconds;

    if (remaining <= 0) {
      this.startEngines();
      return;
    }

    this.countdownValue.set(remaining);
    this.countdownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        this.clearCountdownTimer();
        this.countdownValue.set(null);
        this.startEngines();
      } else {
        this.countdownValue.set(remaining);
      }
    }, 1000);
  }

  resetToConfig(): void {
    this.clearCountdownTimer();
    this.countdownValue.set(null);
    this.primaryEngine = null;
    this.secondaryEngine = null;
    this.phase.set('config');
  }

  allFinished(): boolean {
    const primaryDone = this.primaryEngine?.isDone() ?? true;
    const secondaryDone = this.secondaryEngine?.isDone() ?? true;
    return primaryDone && secondaryDone;
  }

  runAgain(): void {
    // Reset engine timer/state instances if applicable
    this.primaryEngine?.reset();
    this.secondaryEngine?.reset();

    // Set phase back to ready where the "Start" button is located
    this.phase.set('ready');
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.isTypingTarget(event.target)) return;

    const primaryTarget = ARROW_KEY_MAP[event.key];
    if (primaryTarget !== undefined && this.primaryEngine) {
      event.preventDefault();
      this.primaryEngine.registerHit(primaryTarget);
      return;
    }

    const secondaryTarget = WASD_KEY_MAP[event.key];
    if (secondaryTarget !== undefined && this.secondaryEngine) {
      event.preventDefault();
      this.secondaryEngine.registerHit(secondaryTarget);
    }
  }

  private startEngines(): void {
    this.primaryEngine?.start();
    this.secondaryEngine?.start();
  }

  private clearCountdownTimer(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    const tag = (target as HTMLElement | null)?.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }
}
