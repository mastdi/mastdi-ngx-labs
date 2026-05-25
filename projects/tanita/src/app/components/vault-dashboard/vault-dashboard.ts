import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-vault-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './vault-dashboard.html',
  styleUrls: ['./vault-dashboard.scss']
})
export class VaultDashboard {
  vaultLocked = output<void>();

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      console.log('Target CSV Identified:', fileList[0].name);
    }
  }

  onLockWorkspace(): void {
    this.vaultLocked.emit();
  }
}
