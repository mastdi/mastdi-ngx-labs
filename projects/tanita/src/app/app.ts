import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VaultSetup } from './components/vault-setup/vault-setup';
import { VaultUnlock } from './components/vault-unlock/vault-unlock';
import { VaultDashboard } from './components/vault-dashboard/vault-dashboard';

export type WorkspaceState = 'setup' | 'locked' | 'unlocked';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, VaultSetup, VaultUnlock, VaultDashboard],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
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
    const savedToken = localStorage.getItem('tanita_vault');
    if (savedToken) {
      this.currentStatus.set('locked');
    } else {
      this.currentStatus.set('setup');
    }
  }
}
