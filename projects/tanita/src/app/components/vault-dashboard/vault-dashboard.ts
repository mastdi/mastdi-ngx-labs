import { Component, inject, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TanitaFileParser } from '../../shared/services/tanita-file-parser';
import { DataApi } from 'shared-core';

type UploadStatus = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-vault-dashboard',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './vault-dashboard.html',
  styleUrls: ['./vault-dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultDashboard {
  private readonly parserService = inject(TanitaFileParser);
  private readonly dataApi = inject(DataApi);

  vaultLocked = output<void>();

  // State Management via Signals
  readonly status = signal<UploadStatus>('idle');
  readonly uploadedRowsCount = signal<number>(0);

  async onFileSelected(event: Event): Promise<void> {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (!fileList || fileList.length === 0) {
      return;
    }

    this.status.set('loading');

    try {
      const records = await this.parserService.parseTanitaCsv(fileList[0]);
      await this.dataApi.uploadPayload(records);

      // Update state with record dimensions safely using array structure mapping
      this.uploadedRowsCount.set(Array.isArray(records) ? records.length : 0);
      this.status.set('success');
    } catch {
      this.status.set('error');
      // Potential extension: assign an error message tracking signal here
    } finally {
      // Clear value so the same file selection fires the change handle again if needed
      element.value = '';
    }
  }

  onReset(): void {
    this.status.set('idle');
    this.uploadedRowsCount.set(0);
  }

  onLockWorkspace(): void {
    this.vaultLocked.emit();
  }
}
