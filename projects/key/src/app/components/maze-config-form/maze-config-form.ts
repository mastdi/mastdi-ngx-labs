import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
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
import { IntegrationOption, IntraManagerApi } from '../../services/intramanager-api';

type ConnectionState = 'idle' | 'testing' | 'unlocking' | 'success' | 'error';

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
    MatExpansionModule,
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
  private readonly intraManagerApi = inject(IntraManagerApi);

  readonly targetIds = TARGET_IDS;
  readonly sequencePositions = [0, 1, 2, 3] as const;

  /** Physical-key hints shown alongside the name field, since the id alone is meaningless. */
  readonly keyHints: Record<TargetId, string> = {
    0: 'Arrow ↑ / W',
    1: 'Arrow → / D',
    2: 'Arrow ↓ / S',
    3: 'Arrow ← / A',
  };

  /** Prior setup to reopen the form with, e.g. when returning via "Back to setup". */
  readonly initialSetup = input<MazeSetup | null>(null);

  readonly configured = output<MazeSetup>();
  readonly connectionState = signal<ConnectionState>('idle');
  readonly connectionError = signal('');
  readonly hasStoredApiKey = signal(this.intraManagerApi.hasStoredApiKey());
  readonly integrations = signal<IntegrationOption[]>([]);

  constructor() {
    // Reacts to initialSetup itself (rather than a one-shot ngOnInit) so a value
    // arriving after the component's first change-detection pass — e.g. via
    // fixture.componentRef.setInput() in tests, called after construction —
    // still prefills the form correctly.
    effect(() => {
      const setup = this.initialSetup();
      if (!setup) return;

      this.configForm.patchValue({
        mode: setup.config.mode,
        dualMaze: setup.dualMaze,
        countdownSeconds: setup.countdownSeconds,
        labels: {
          target0: setup.labels[0],
          target1: setup.labels[1],
          target2: setup.labels[2],
          target3: setup.labels[3],
        },
        lastTargetId:
          setup.config.mode === 'last-only'
            ? setup.config.lastTargetId
            : this.configForm.controls.lastTargetId.value,
        sequence:
          setup.config.mode === 'sequence' && setup.config.sequence
            ? {
                position0: setup.config.sequence[0],
                position1: setup.config.sequence[1],
                position2: setup.config.sequence[2],
                position3: setup.config.sequence[3],
              }
            : this.configForm.controls.sequence.getRawValue(),
      });
    });
  }

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

  readonly integrationForm = this.fb.group({
    apiKey: this.fb.control('', {
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    masterPassword: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  readonly unlockForm = this.fb.group({
    masterPassword: this.fb.control('', {
      validators: [Validators.required],
    }),
  });

  readonly integrationId = this.fb.control<number | null>(null, Validators.required);

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

  async testAndStoreApiKey(): Promise<void> {
    if (this.integrationForm.invalid || this.connectionState() === 'testing') {
      this.integrationForm.markAllAsTouched();
      return;
    }

    const { apiKey, masterPassword } = this.integrationForm.getRawValue();
    this.connectionState.set('testing');
    this.connectionError.set('');

    try {
      const integrations = await this.intraManagerApi.testAndStoreApiKey(apiKey, masterPassword);
      this.integrationForm.reset();
      this.integrationId.reset();
      this.integrations.set(integrations);
      this.hasStoredApiKey.set(true);
      this.connectionState.set('success');
    } catch (error: unknown) {
      this.connectionError.set(this.connectionErrorMessage(error));
      this.connectionState.set('error');
    }
  }

  async unlockStoredSettings(): Promise<void> {
    if (this.unlockForm.invalid || this.connectionState() === 'unlocking') {
      this.unlockForm.markAllAsTouched();
      return;
    }

    this.connectionState.set('unlocking');
    this.connectionError.set('');

    try {
      const integrations = await this.intraManagerApi.unlockStoredApiKey(
        this.unlockForm.getRawValue().masterPassword,
      );
      const storedIntegrationId = this.intraManagerApi.storedIntegrationId();
      const selectedIntegrationId = integrations.some(
        ({ integration_id }) => integration_id === storedIntegrationId,
      )
        ? storedIntegrationId
        : null;

      this.unlockForm.reset();
      this.integrations.set(integrations);
      this.integrationId.setValue(selectedIntegrationId);
      this.connectionState.set('success');
    } catch {
      this.unlockForm.reset();
      this.connectionError.set(
        'The settings could not be unlocked. Check your master password and try again.',
      );
      this.connectionState.set('error');
    }
  }

  resetStoredSettings(): void {
    this.intraManagerApi.resetStoredSettings();
    this.hasStoredApiKey.set(false);
    this.integrations.set([]);
    this.integrationId.reset();
    this.integrationForm.reset();
    this.unlockForm.reset();
    this.connectionError.set('');
    this.connectionState.set('idle');
  }

  storeIntegrationId(integrationId: number): void {
    this.intraManagerApi.storeIntegrationId(integrationId);
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

  private connectionErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = error.status;
      if (status === 401 || status === 403) {
        return 'The API key was rejected. Check the key and try again.';
      }
    }

    return 'The connection could not be verified. Check the key and your network connection.';
  }
}
