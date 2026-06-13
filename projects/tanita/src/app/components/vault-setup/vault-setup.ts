import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
    const { apiToken } = this.setupForm.value;
    localStorage.setItem('tanita_vault', btoa(apiToken));
    const { url, apiTokenValue, apiTokenKey, masterPassword } = this.setupForm.value;
    this.setupComplete.emit();
  }
}
