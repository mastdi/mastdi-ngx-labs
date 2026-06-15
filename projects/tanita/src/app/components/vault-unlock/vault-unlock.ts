import { Component, output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UserConfig, SecureStorage } from 'shared-core';

@Component({
  selector: 'app-vault-unlock',
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
  templateUrl: './vault-unlock.html',
  styleUrls: ['./vault-unlock.scss'],
})
export class VaultUnlock implements OnInit {
  private fb = inject(FormBuilder);
  private readonly userConfig = inject(UserConfig);
  private readonly secureStorage = inject(SecureStorage);

  unlockComplete = output<void>();
  storageReset = output<void>();
  unlockForm: FormGroup;

  constructor() {
    this.unlockForm = this.fb.group({
      masterPassword: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    if (!this.userConfig.isConfigSet()) {
      this.onWipeStorage();
    }
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'RESET_TOKEN_CONFIG',
      });
    }
  }

  async onUnlock(): Promise<void> {
    if (this.unlockForm.invalid) return;
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      console.warn('Service Worker is not ready or active yet.');
      return;
    }
    const { masterPassword } = this.unlockForm.value;
    const url = this.userConfig.url;
    let header;
    try {
      header = JSON.parse(
        await this.secureStorage.decryptSecret(this.userConfig.header, masterPassword),
      );
    } catch {
      // TODO: Maybe add some message as well?
      this.unlockForm.reset();
      return;
    }
    // Send the payload straight into the Service Worker thread
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_TOKEN_CONFIG',
      url,
      apiTokenKey: header.key,
      apiTokenValue: header.value,
    });
    this.unlockComplete.emit();
  }

  onWipeStorage(): void {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      return;
    }
    navigator.serviceWorker.controller.postMessage({
      type: 'RESET_TOKEN_CONFIG',
    });
    this.userConfig.clear();
    this.storageReset.emit();
  }
}
