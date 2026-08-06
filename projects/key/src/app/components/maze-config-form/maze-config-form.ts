import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  TARGET_IDS,
  TARGET_LABELS,
  type MazeConfig,
  type MazeMode,
  type TargetId,
} from '../../engine/maze-run-engine';

export interface MazeSetup {
  config: MazeConfig;
  dualMaze: boolean;
  countdownSeconds: number;
  labels: Record<TargetId, string>;
}

@Component({
  selector: 'app-maze-config-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './maze-config-form.html',
  styleUrls: ['./maze-config-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MazeConfigForm {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly targetIds = TARGET_IDS;
  readonly sequencePositions = [0, 1, 2, 3] as const;

  /** Physical-key hints shown alongside the name field, since the id alone is meaningless. */
  readonly keyHints: Record<TargetId, string> = {
    0: 'Arrow ↑ / W',
    1: 'Arrow → / D',
    2: 'Arrow ↓ / S',
    3: 'Arrow ← / A',
  };

  readonly configured = output<MazeSetup>();

  readonly configForm = this.fb.group({
    mode: this.fb.control<MazeMode>('any-order', { validators: [Validators.required] }),
    dualMaze: this.fb.control(false),
    countdownSeconds: this.fb.control(3, {
      validators: [Validators.min(0), Validators.max(10)],
    }),
    sequence: this.fb.group({
      position0: this.fb.control<TargetId>(0),
      position1: this.fb.control<TargetId>(1),
      position2: this.fb.control<TargetId>(2),
      position3: this.fb.control<TargetId>(3),
    }),
    lastTargetId: this.fb.control<TargetId>(3),
    labels: this.fb.group({
      target0: this.fb.control(TARGET_LABELS[0], {
        validators: [Validators.required, Validators.maxLength(24)],
      }),
      target1: this.fb.control(TARGET_LABELS[1], {
        validators: [Validators.required, Validators.maxLength(24)],
      }),
      target2: this.fb.control(TARGET_LABELS[2], {
        validators: [Validators.required, Validators.maxLength(24)],
      }),
      target3: this.fb.control(TARGET_LABELS[3], {
        validators: [Validators.required, Validators.maxLength(24)],
      }),
    }),
  });

  // Read labels back out with the same 'target' + id key convention used above.
  private readonly labelKey = (id: TargetId) => `target${id}` as const;

  private readonly mode = toSignal(this.configForm.controls.mode.valueChanges, {
    initialValue: this.configForm.controls.mode.value,
  });

  private readonly sequenceValue = toSignal(this.configForm.controls.sequence.valueChanges, {
    initialValue: this.configForm.controls.sequence.getRawValue(),
  });

  private readonly labelsStatus = toSignal(this.configForm.controls.labels.statusChanges, {
    initialValue: this.configForm.controls.labels.status,
  });

  readonly isSequenceMode = computed(() => this.mode() === 'sequence');
  readonly isLastOnlyMode = computed(() => this.mode() === 'last-only');

  readonly sequenceHasDuplicates = computed(() => {
    const value = this.sequenceValue();
    const ids = [value.position0, value.position1, value.position2, value.position3];
    return new Set(ids).size !== 4;
  });

  readonly labelsInvalid = computed(() => this.labelsStatus() === 'INVALID');

  readonly canSubmit = computed(
    () => (!this.isSequenceMode() || !this.sequenceHasDuplicates()) && !this.labelsInvalid(),
  );

  /** Live labels, used to render target names in the sequence/last-only pickers below. */
  readonly currentLabels = toSignal(this.configForm.controls.labels.valueChanges, {
    initialValue: this.configForm.controls.labels.getRawValue(),
  });

  labelFor(id: TargetId): string {
    return this.currentLabels()[this.labelKey(id)] || TARGET_LABELS[id];
  }

  submit(): void {
    if (this.configForm.invalid || !this.canSubmit()) return;

    const raw = this.configForm.getRawValue();
    const config: MazeConfig =
      raw.mode === 'sequence'
        ? {
            mode: 'sequence',
            sequence: [
              raw.sequence.position0,
              raw.sequence.position1,
              raw.sequence.position2,
              raw.sequence.position3,
            ],
          }
        : raw.mode === 'last-only'
          ? { mode: 'last-only', lastTargetId: raw.lastTargetId }
          : { mode: 'any-order' };

    const labels: Record<TargetId, string> = {
      0: raw.labels.target0.trim(),
      1: raw.labels.target1.trim(),
      2: raw.labels.target2.trim(),
      3: raw.labels.target3.trim(),
    };

    this.configured.emit({
      config,
      dualMaze: raw.dualMaze,
      countdownSeconds: raw.countdownSeconds,
      labels,
    });
  }
}
