import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VaultSetup } from './components/vault-setup/vault-setup';
import {VaultUnlock} from './components/vault-unlock/vault-unlock';
import {VaultDashboard} from './components/vault-dashboard/vault-dashboard';

export type WorkspaceState = 'setup' | 'locked' | 'unlocked';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    VaultSetup,
    VaultUnlock,
    VaultDashboard
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  currentStatus = signal<WorkspaceState>('setup');

  ngOnInit(): void {
    this.evaluateStorageState();
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
