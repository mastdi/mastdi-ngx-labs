import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UserConfig } from '../../../../../shared-core/src/lib/services/user-config';

@Component({
  selector: 'app-vault-setup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './vault-setup.html',
  styleUrls: ['./vault-setup.scss'],
})
export class VaultSetup {
  private fb = inject(FormBuilder);
  private userConfig = inject(UserConfig);

  setupComplete = output<void>();
  setupForm: FormGroup;

  constructor() {
    this.setupForm = this.fb.group({
      url: ['', [Validators.required, Validators.pattern(/^https:\/\/.+$/)]],
      apiTokenKey: ['', [Validators.required]],
      apiTokenValue: ['', [Validators.required]],
      masterPassword: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSaveSetup(): void {
    if (this.setupForm.invalid) return;
    const { url, apiTokenValue, apiTokenKey, masterPassword } = this.setupForm.value;
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      // Send the payload straight into the Service Worker thread
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_TOKEN_CONFIG',
        url,
        apiTokenKey,
        apiTokenValue,
      });
    } else {
      console.warn('Service Worker is not ready or active yet.');
    }
    this.userConfig.url = url;
    // TODO: Encrypt this using the master password, key stretching and AES-256
    this.userConfig.header = btoa(JSON.stringify({ apiTokenKey: apiTokenValue }));
    this.setupComplete.emit();
  }
}
