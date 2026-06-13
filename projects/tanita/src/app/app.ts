import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VaultSetup } from './components/vault-setup/vault-setup';
import { VaultUnlock } from './components/vault-unlock/vault-unlock';
import { VaultDashboard } from './components/vault-dashboard/vault-dashboard';
import { UserConfig } from '../../../shared-core/src/lib/services/user-config';

export type WorkspaceState = 'setup' | 'locked' | 'unlocked';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, VaultSetup, VaultUnlock, VaultDashboard],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  private readonly userConfig: UserConfig = inject(UserConfig);
  currentStatus = signal<WorkspaceState>('setup');

  ngOnInit(): void {
    // main.ts (or app.component.ts ngOnInit)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/token.sw.js')
          .then((reg) => {
            console.log('Custom Service Worker registered!', reg.scope);
            this.evaluateStorageState();
          })
          .catch((err) => console.error('Service Worker registration failed:', err));
      });
    }
  }

  evaluateStorageState(): void {
    if (this.userConfig.isConfigSet()) {
      this.currentStatus.set('locked');
    } else {
      this.currentStatus.set('setup');
    }
  }
}
