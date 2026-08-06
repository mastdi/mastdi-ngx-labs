import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
  /** Falls back to the compass defaults so existing callers/specs keep working unchanged. */
  readonly targetLabels = input<Record<TargetId, string>>(TARGET_LABELS);

  readonly targetIds = TARGET_IDS;
  readonly formatDuration = formatDuration;

  private readonly tick = signal(0);
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  readonly hitIds = computed(() => this.engine().hitTargetIds());
  readonly rejection = computed(() => this.engine().rejected());
  readonly isRunning = computed(() => this.engine().status() === 'running');
  readonly isDone = computed(() => this.engine().isDone());
  readonly gaveUp = computed(() => this.engine().status() === 'given-up');
  readonly elapsedDisplay = computed(() => {
    this.tick();
    return formatDuration(this.engine().elapsedMs());
  });

  giveUp(): void {
    this.engine().giveUp();
  }

  ngOnInit(): void {
    this.tickTimer = setInterval(() => this.tick.update((t) => t + 1), 50);
  }

  ngOnDestroy(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
  }
}
