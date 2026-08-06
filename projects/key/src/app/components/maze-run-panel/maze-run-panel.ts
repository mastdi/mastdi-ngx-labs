import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  TARGET_IDS,
  TARGET_LABELS,
  type MazeRunEngine,
  type TargetId,
} from '../../engine/maze-run-engine';
import { formatDuration } from '../../engine/maze-io';

@Component({
  selector: 'app-maze-run-panel',
  imports: [MatButtonModule, MatCardModule],
  templateUrl: './maze-run-panel.html',
  styleUrl: './maze-run-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MazeRunPanel implements OnInit, OnDestroy {
  readonly engine = input.required<MazeRunEngine>();
  readonly label = input('Maze');
  readonly targetLabels = input<Record<TargetId, string>>(TARGET_LABELS);

  readonly targetIds = TARGET_IDS;
  readonly formatDuration = formatDuration;

  private readonly tick = signal(0);
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  /** True for 3s after each valid hit, driving the whole-card flash. */
  readonly cardFlash = signal(false);
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFlashedHitCount = 0;

  readonly hitIds = computed(() => this.engine().hitTargetIds());
  readonly rejection = computed(() => this.engine().rejected());
  readonly isRunning = computed(() => this.engine().status() === 'running');
  readonly isDone = computed(() => this.engine().isDone());
  readonly gaveUp = computed(() => this.engine().status() === 'given-up');
  readonly elapsedDisplay = computed(() => {
    this.tick();
    return formatDuration(this.engine().elapsedMs());
  });

  constructor() {
    // Reacts to accepted hits only: registerHit() appends to hits() solely on a
    // valid hit, so a rejected/wrong-target press never touches this signal and
    // never triggers the card flash.
    effect(() => {
      const hitCount = this.engine().hits().length;
      if (hitCount > this.lastFlashedHitCount) {
        this.flashCard();
      }
      this.lastFlashedHitCount = hitCount;
    });
  }

  ngOnInit(): void {
    this.tickTimer = setInterval(() => this.tick.update((t) => t + 1), 50);
  }

  ngOnDestroy(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.flashTimer) clearTimeout(this.flashTimer);
  }

  giveUp(): void {
    this.engine().giveUp();
  }

  private flashCard(): void {
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.cardFlash.set(true);
    this.flashTimer = setTimeout(() => {
      this.cardFlash.set(false);
      this.flashTimer = null;
    }, 2000);
  }
}
