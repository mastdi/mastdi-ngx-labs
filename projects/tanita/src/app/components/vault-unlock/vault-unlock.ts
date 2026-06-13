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
export class VaultUnlock {
  private fb = inject(FormBuilder);
  private userConfig = inject(UserConfig);

  unlockComplete = output<void>();
  storageReset = output<void>();
  unlockForm: FormGroup;

  constructor() {
    this.unlockForm = this.fb.group({
      password: ['', [Validators.required]],
    });
  }

  onUnlock(): void {
    if (this.unlockForm.invalid) return;
    this.unlockComplete.emit();
  }

  onWipeStorage(): void {
    this.userConfig.clear();
    this.storageReset.emit();
  }
}
