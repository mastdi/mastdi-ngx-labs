import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MazeConfigForm, type MazeSetup } from './components/maze-config-form/maze-config-form';
import { MazeRunPanel } from './components/maze-run-panel/maze-run-panel';
import { MazeRunEngine, TARGET_LABELS, type TargetId } from './engine/maze-run-engine';
import { ARROW_KEY_MAP, WASD_KEY_MAP } from './engine/maze-io';
import {
  IntraManagerApi,
  type OrganizationTeam,
  type OrganizationUser,
} from './services/intramanager-api';

type Phase = 'config' | 'ready' | 'run';
type UsersState = 'idle' | 'loading' | 'success' | 'error';
type CreateUserState = 'idle' | 'creating' | 'success' | 'error';
type StartState = 'idle' | 'adding-users' | 'error';

@Component({
  selector: 'app-root',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MazeConfigForm,
    MazeRunPanel,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class App {
  private readonly intraManagerApi = inject(IntraManagerApi);

  readonly phase = signal<Phase>('config');
  readonly countdownValue = signal<number | null>(null);
  readonly targetLabels = signal<Record<TargetId, string>>(TARGET_LABELS);
  /** Remembers the full last setup so "Back to setup" / "Run again" can prefill the form. */
  readonly lastSetup = signal<MazeSetup | null>(null);
  readonly organizationUsers = signal<OrganizationUser[]>([]);
  readonly robotTeams = signal<OrganizationTeam[]>([]);
  readonly usersState = signal<UsersState>('idle');
  readonly primaryController = signal<OrganizationUser | null>(null);
  readonly secondaryController = signal<OrganizationUser | null>(null);
  readonly primaryTeam = signal<OrganizationTeam | null>(null);
  readonly secondaryTeam = signal<OrganizationTeam | null>(null);
  readonly newUserName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/\S/)],
  });
  readonly createUserState = signal<CreateUserState>('idle');
  readonly startState = signal<StartState>('idle');
  readonly startError = signal('');
  readonly startDisabled = computed(() => {
    if (this.startState() === 'adding-users') return true;
    if (this.usersState() === 'idle') return false;
    if (this.usersState() !== 'success') return true;

    const primaryMissing = !this.primaryController() || !this.primaryTeam();
    const secondaryMissing =
      this.secondaryEngine !== null && (!this.secondaryController() || !this.secondaryTeam());
    return primaryMissing || secondaryMissing;
  });
  readonly primaryRunLabel = computed(
    () => `Maze 1 (${this.controllerNameOrFallback(this.primaryController(), 'arrows')})`,
  );
  readonly secondaryRunLabel = computed(
    () => `Maze 2 (${this.controllerNameOrFallback(this.secondaryController(), 'WASD')})`,
  );

  primaryEngine: MazeRunEngine | null = null;
  secondaryEngine: MazeRunEngine | null = null;

  private countdownSeconds = 3;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private readonly confirmedMemberships = signal<ReadonlySet<string>>(new Set());

  onConfigured(setup: MazeSetup): void {
    this.primaryEngine = new MazeRunEngine(setup.config);
    this.secondaryEngine = setup.dualMaze ? new MazeRunEngine(setup.config) : null;
    this.countdownSeconds = setup.countdownSeconds;
    this.targetLabels.set(setup.labels);
    this.lastSetup.set(setup);
    this.primaryController.set(null);
    this.secondaryController.set(null);
    this.primaryTeam.set(null);
    this.secondaryTeam.set(null);
    this.confirmedMemberships.set(new Set());
    this.newUserName.reset();
    this.createUserState.set('idle');
    this.startState.set('idle');
    this.startError.set('');
    this.phase.set('ready');
    void this.loadOrganizationUsers();
  }

  async beginCountdown(): Promise<void> {
    if (this.usersState() === 'idle') {
      this.startCountdown();
      return;
    }

    const assignments = this.boardAssignments();
    if (!assignments) {
      this.startError.set('Select a team and controller for each robot, then try again.');
      this.startState.set('error');
      return;
    }

    this.startError.set('');
    this.startState.set('adding-users');
    const missingAssignments = assignments.filter(
      ({ team, user }) => !this.hasTeamMembership(team, user),
    );

    try {
      await Promise.all(
        missingAssignments.map(({ team, user }) =>
          this.intraManagerApi.addUserToTeam(team.team_id, user.user_id as number),
        ),
      );
      this.confirmedMemberships.update(
        (memberships) =>
          new Set([
            ...memberships,
            ...missingAssignments.map(({ team, user }) =>
              this.membershipKey(team.team_id, user.user_id as number),
            ),
          ]),
      );
      this.startState.set('idle');
      this.startCountdown();
    } catch {
      this.startError.set('The controllers could not be added to their teams. Try again.');
      this.startState.set('error');
    }
  }

  private startCountdown(): void {
    this.phase.set('run');
    let remaining = this.countdownSeconds;

    if (remaining <= 0) {
      this.startEngines();
      return;
    }

    this.countdownValue.set(remaining);
    this.countdownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        this.clearCountdownTimer();
        this.countdownValue.set(null);
        this.startEngines();
      } else {
        this.countdownValue.set(remaining);
      }
    }, 1000);
  }

  resetToConfig(): void {
    this.clearCountdownTimer();
    this.countdownValue.set(null);
    this.primaryEngine = null;
    this.secondaryEngine = null;
    this.phase.set('config');
  }

  allFinished(): boolean {
    const primaryDone = this.primaryEngine?.isDone() ?? true;
    const secondaryDone = this.secondaryEngine?.isDone() ?? true;
    return primaryDone && secondaryDone;
  }

  runAgain(): void {
    // Reset engine timer/state instances if applicable
    this.primaryEngine?.reset();
    this.secondaryEngine?.reset();

    // Set phase back to ready where the "Start" button is located
    this.phase.set('ready');
  }

  organizationUserName(user: OrganizationUser): string {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return (
      user.display_name?.trim() ||
      user.alias?.trim() ||
      fullName ||
      user.email?.trim() ||
      (user.user_id === null ? 'Unnamed user' : `User ${user.user_id}`)
    );
  }

  async createOrganizationUser(event?: Event): Promise<void> {
    event?.preventDefault();

    if (this.newUserName.invalid || this.createUserState() === 'creating') {
      this.newUserName.markAsTouched();
      return;
    }

    this.createUserState.set('creating');
    try {
      const users = await this.intraManagerApi.createOrganizationUser(this.newUserName.value);
      this.organizationUsers.set(users);
      this.newUserName.reset();
      this.createUserState.set('success');
    } catch {
      this.createUserState.set('error');
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.isTypingTarget(event.target)) return;

    const primaryTarget = ARROW_KEY_MAP[event.key];
    if (primaryTarget !== undefined && this.primaryEngine) {
      event.preventDefault();
      this.primaryEngine.registerHit(primaryTarget);
      return;
    }

    const secondaryTarget = WASD_KEY_MAP[event.key];
    if (secondaryTarget !== undefined && this.secondaryEngine) {
      event.preventDefault();
      this.secondaryEngine.registerHit(secondaryTarget);
    }
  }

  private startEngines(): void {
    this.primaryEngine?.start();
    this.secondaryEngine?.start();
  }

  private async loadOrganizationUsers(): Promise<void> {
    this.organizationUsers.set([]);
    this.robotTeams.set([]);

    if (!this.intraManagerApi.isBoardIntegrationUnlocked()) {
      this.usersState.set('idle');
      return;
    }

    this.usersState.set('loading');
    try {
      const [users, teams] = await Promise.all([
        this.intraManagerApi.getOrganizationUsers(),
        this.intraManagerApi.getRobotTeams(),
      ]);
      this.organizationUsers.set(users);
      this.robotTeams.set(teams);
      this.usersState.set('success');
    } catch {
      this.usersState.set('error');
    }
  }

  private controllerNameOrFallback(controller: OrganizationUser | null, fallback: string): string {
    return controller ? this.organizationUserName(controller) : fallback;
  }

  private boardAssignments(): Array<{
    team: OrganizationTeam;
    user: OrganizationUser & { user_id: number };
  }> | null {
    const primary = this.validAssignment(this.primaryTeam(), this.primaryController());
    if (!primary) return null;

    if (!this.secondaryEngine) return [primary];

    const secondary = this.validAssignment(this.secondaryTeam(), this.secondaryController());
    return secondary ? [primary, secondary] : null;
  }

  private validAssignment(
    team: OrganizationTeam | null,
    user: OrganizationUser | null,
  ): { team: OrganizationTeam; user: OrganizationUser & { user_id: number } } | null {
    return team && user && Number.isInteger(user.user_id)
      ? { team, user: user as OrganizationUser & { user_id: number } }
      : null;
  }

  private hasTeamMembership(
    team: OrganizationTeam,
    user: OrganizationUser & { user_id: number },
  ): boolean {
    return (
      team.users.some(({ user_id }) => user_id === user.user_id) ||
      this.confirmedMemberships().has(this.membershipKey(team.team_id, user.user_id))
    );
  }

  private membershipKey(teamId: number, userId: number): string {
    return `${teamId}:${userId}`;
  }

  private clearCountdownTimer(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    const tag = (target as HTMLElement | null)?.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }
}
