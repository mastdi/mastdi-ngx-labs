import { Component, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { UserConfig, SecureStorage } from 'shared-core';

@Component({
  selector: 'app-vault-setup',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
  ],
  templateUrl: './vault-setup.html',
  styleUrls: ['./vault-setup.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultSetup {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly userConfig = inject(UserConfig);
  private readonly secureStorage = inject(SecureStorage);

  readonly setupComplete = output<void>();

  // A single, cleanly-scoped nested form hierarchy
  readonly setupForm = this.fb.group({
    integrationStep: this.fb.group({
      url: ['', [Validators.required, Validators.pattern(/^https:\/\/.+$/i)]],
      apiTokenKey: ['', [Validators.required]],
      apiTokenValue: ['', [Validators.required]],
    }),
    passwordStep: this.fb.group({
      masterPassword: ['', [Validators.required, Validators.minLength(6)]],
    }),
  });

  get integrationStepGroup() {
    return this.setupForm.controls.integrationStep;
  }

  get passwordStepGroup() {
    return this.setupForm.controls.passwordStep;
  }

  async onSaveSetup(): Promise<void> {
    if (this.setupForm.invalid) {
      return;
    }

    // Safely extract raw, typed values from the sub-groups
    const { url, apiTokenKey, apiTokenValue } = this.integrationStepGroup.getRawValue();
    const { masterPassword } = this.passwordStepGroup.getRawValue();

    // 1. Update the Service Worker node safely if active
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_TOKEN_CONFIG',
        url,
        apiTokenKey,
        apiTokenValue,
      });
    } else {
      console.warn('Service Worker is not ready or active yet.');
    }

    // 2. Encrypt and save down configuration state mutations
    this.userConfig.url = url;
    this.userConfig.header = await this.secureStorage.encryptSecret(
      JSON.stringify({
        key: apiTokenKey,
        value: apiTokenValue,
      }),
      masterPassword,
    );

    // 3. Notify parent workspace layout of completion
    this.setupComplete.emit();
  }
}
