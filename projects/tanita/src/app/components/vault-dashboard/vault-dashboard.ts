import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TanitaFileParser } from '../../shared/services/tanita-file-parser';

@Component({
  selector: 'app-vault-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './vault-dashboard.html',
  styleUrls: ['./vault-dashboard.scss'],
})
export class VaultDashboard {
  private parserService: TanitaFileParser = inject(TanitaFileParser);
  vaultLocked = output<void>();

  async onFileSelected(event: Event): Promise<void> {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (!fileList || fileList.length === 0) {
      return;
    }
    const records = await this.parserService.parseTanitaCsv(fileList[0]);

    console.log(records);
  }

  onLockWorkspace(): void {
    this.vaultLocked.emit();
  }
}
