import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { IntraManagerApi } from './services/intramanager-api';

describe('App', () => {
  const blueBotTeam = {
    active: true,
    children_nested: [],
    name: 'BlueBot',
    team_id: 3,
    users: [] as Array<{ image: string | null; name: string; user_id: number }>,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('starts on the config screen', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-maze-config-form')).toBeTruthy();
  });

  it('moves to the ready screen once setup is configured', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    await fixture.whenStable();

    app.onConfigured({
      config: { mode: 'any-order' },
      dualMaze: false,
      countdownSeconds: 3,
      labels: { '0': 'A', '1': 'B', '2': 'C', '3': 'D' },
    });
    fixture.detectChanges();

    expect(app.phase()).toBe('ready');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Press start when ready');
    expect(compiled.querySelector('.board-users')).toBeNull();
  });

  it('lists organization users on the ready screen when Board is configured and unlocked', async () => {
    const intraManagerApi = TestBed.inject(IntraManagerApi);
    vi.spyOn(intraManagerApi, 'isBoardIntegrationUnlocked').mockReturnValue(true);
    vi.spyOn(intraManagerApi, 'getOrganizationUsers').mockResolvedValue([
      {
        active: true,
        display_name: 'Ada Lovelace',
        email: 'ada@example.com',
        first_name: 'Ada',
        last_name: 'Lovelace',
        user_id: 42,
      },
    ]);
    vi.spyOn(intraManagerApi, 'getRobotTeams').mockResolvedValue([blueBotTeam]);
    const fixture = TestBed.createComponent(App);

    fixture.componentInstance.onConfigured({
      config: { mode: 'any-order' },
      dualMaze: false,
      countdownSeconds: 3,
      labels: { '0': 'A', '1': 'B', '2': 'C', '3': 'D' },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.controller-select')).toHaveLength(1);
    expect(compiled.querySelectorAll('.team-select')).toHaveLength(1);
    expect(compiled.textContent).toContain('Arrows controller');
  });

  it('shows a controller dropdown for each robot in a dual maze', async () => {
    const intraManagerApi = TestBed.inject(IntraManagerApi);
    vi.spyOn(intraManagerApi, 'isBoardIntegrationUnlocked').mockReturnValue(true);
    vi.spyOn(intraManagerApi, 'getOrganizationUsers').mockResolvedValue([
      {
        active: true,
        display_name: 'Ada Lovelace',
        email: 'ada@example.com',
        first_name: 'Ada',
        last_name: 'Lovelace',
        user_id: 42,
      },
    ]);
    vi.spyOn(intraManagerApi, 'getRobotTeams').mockResolvedValue([blueBotTeam]);
    const fixture = TestBed.createComponent(App);

    fixture.componentInstance.onConfigured({
      config: { mode: 'any-order' },
      dualMaze: true,
      countdownSeconds: 3,
      labels: { '0': 'A', '1': 'B', '2': 'C', '3': 'D' },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.controller-selectors mat-label'),
      (label) => label.textContent,
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.controller-select'),
    ).toHaveLength(2);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.controller-selectors.dual'),
    ).toBeTruthy();
    expect(labels).toEqual(['Arrows team', 'Arrows controller', 'WASD team', 'WASD controller']);
  });

  it('shows selected Board controller names in the run panel labels', async () => {
    const intraManagerApi = TestBed.inject(IntraManagerApi);
    vi.spyOn(intraManagerApi, 'isBoardIntegrationUnlocked').mockReturnValue(true);
    vi.spyOn(intraManagerApi, 'getOrganizationUsers').mockResolvedValue([]);
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const arrowsController = {
      active: true,
      display_name: 'Ada Lovelace',
      email: 'ada@example.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
      user_id: 42,
    };
    const wasdController = {
      active: true,
      display_name: 'Grace Hopper',
      email: 'grace@example.com',
      first_name: 'Grace',
      last_name: 'Hopper',
      user_id: 43,
    };
    const arrowsTeam = {
      ...blueBotTeam,
      users: [{ image: null, name: 'Ada Lovelace', user_id: 42 }],
    };
    const wasdTeam = {
      ...blueBotTeam,
      name: 'mBot',
      team_id: 2,
      users: [{ image: null, name: 'Grace Hopper', user_id: 43 }],
    };
    vi.spyOn(intraManagerApi, 'getRobotTeams').mockResolvedValue([arrowsTeam, wasdTeam]);
    vi.spyOn(intraManagerApi, 'postIntegrationData').mockResolvedValue();

    app.onConfigured({
      config: { mode: 'any-order' },
      dualMaze: true,
      countdownSeconds: 0,
      labels: { '0': 'A', '1': 'B', '2': 'C', '3': 'D' },
    });
    app.primaryController.set(arrowsController);
    app.secondaryController.set(wasdController);
    app.primaryTeam.set(arrowsTeam);
    app.secondaryTeam.set(wasdTeam);
    await fixture.whenStable();
    await app.beginCountdown();
    fixture.detectChanges();

    const titles = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('mat-card-title'),
      (title) => title.textContent?.trim(),
    );
    expect(titles).toEqual(['Maze 1 (Ada Lovelace)', 'Maze 2 (Grace Hopper)']);
  });

  it('keeps the input labels when Board integration is not used', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.onConfigured({
      config: { mode: 'any-order' },
      dualMaze: true,
      countdownSeconds: 0,
      labels: { '0': 'A', '1': 'B', '2': 'C', '3': 'D' },
    });
    app.beginCountdown();
    fixture.detectChanges();

    const titles = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('mat-card-title'),
      (title) => title.textContent?.trim(),
    );
    expect(titles).toEqual(['Maze 1 (arrows)', 'Maze 2 (WASD)']);
  });

  it('creates a missing Board user and refreshes the dropdown users', async () => {
    const intraManagerApi = TestBed.inject(IntraManagerApi);
    const createdUser = {
      active: true,
      alias: 'New player',
      display_name: '',
      email: null,
      first_name: '',
      last_name: '',
      user_id: 44,
    };
    vi.spyOn(intraManagerApi, 'createOrganizationUser').mockResolvedValue([createdUser]);
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const submitEvent = new Event('submit', { cancelable: true });
    app.newUserName.setValue('New player');

    await app.createOrganizationUser(submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);
    expect(intraManagerApi.createOrganizationUser).toHaveBeenCalledWith('New player');
    expect(app.organizationUsers()).toEqual([createdUser]);
    expect(app.organizationUserName(createdUser)).toBe('New player');
    expect(app.newUserName.value).toBe('');
    expect(app.createUserState()).toBe('success');
  });

  it('adds a missing controller to the selected team before starting', async () => {
    const intraManagerApi = TestBed.inject(IntraManagerApi);
    const controller = {
      active: true,
      display_name: 'Ada Lovelace',
      email: 'ada@example.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
      user_id: 42,
    };
    vi.spyOn(intraManagerApi, 'isBoardIntegrationUnlocked').mockReturnValue(true);
    vi.spyOn(intraManagerApi, 'getOrganizationUsers').mockResolvedValue([controller]);
    vi.spyOn(intraManagerApi, 'getRobotTeams').mockResolvedValue([blueBotTeam]);
    let finishAdding: (() => void) | undefined;
    const addUser = vi.spyOn(intraManagerApi, 'addUserToTeam').mockReturnValue(
      new Promise<void>((resolve) => {
        finishAdding = resolve;
      }),
    );
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.onConfigured({
      config: { mode: 'any-order' },
      dualMaze: false,
      countdownSeconds: 0,
      labels: { '0': 'A', '1': 'B', '2': 'C', '3': 'D' },
    });
    await fixture.whenStable();
    app.primaryController.set(controller);
    app.primaryTeam.set(blueBotTeam);

    const starting = app.beginCountdown();
    expect(addUser).toHaveBeenCalledWith(3, 42);
    expect(app.phase()).toBe('ready');
    finishAdding?.();
    await starting;

    expect(app.phase()).toBe('run');
  });

  it('posts complete run snapshots with stable run identifiers and accumulated timing', async () => {
    const intraManagerApi = TestBed.inject(IntraManagerApi);
    const controller = {
      active: true,
      display_name: 'Ada Lovelace',
      email: 'ada@example.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
      user_id: 42,
    };
    const team = {
      ...blueBotTeam,
      users: [{ image: null, name: 'Ada Lovelace', user_id: 42 }],
    };
    vi.spyOn(intraManagerApi, 'isBoardIntegrationUnlocked').mockReturnValue(true);
    vi.spyOn(intraManagerApi, 'getOrganizationUsers').mockResolvedValue([controller]);
    vi.spyOn(intraManagerApi, 'getRobotTeams').mockResolvedValue([team]);
    const postData = vi.spyOn(intraManagerApi, 'postIntegrationData').mockResolvedValue();
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.onConfigured({
      config: { mode: 'any-order' },
      dualMaze: false,
      countdownSeconds: 0,
      labels: { '0': 'A', '1': 'B', '2': 'C', '3': 'D' },
    });
    await fixture.whenStable();
    app.primaryController.set(controller);
    app.primaryTeam.set(team);

    await app.beginCountdown();
    await vi.waitFor(() => expect(postData).toHaveBeenCalledTimes(1));
    const initialData = postData.mock.calls[0][0];
    expect(initialData).toEqual(
      expect.objectContaining({
        UserId: 42,
        TeamId: 3,
        TeamName: 'BlueBot',
        Progress: 0,
        CheckpointsReached: 0,
        Completed: false,
      }),
    );
    expect(initialData).not.toHaveProperty('FinishedAt');
    expect(initialData).not.toHaveProperty('TotalTime');

    for (const key of ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']) {
      app.onKeydown({ key, target: null, preventDefault: vi.fn() } as unknown as KeyboardEvent);
    }
    await vi.waitFor(() => expect(postData).toHaveBeenCalledTimes(5));

    const finalData = postData.mock.calls[4][0];
    expect(finalData).toEqual(
      expect.objectContaining({
        PrimaryKey: initialData.PrimaryKey,
        RunId: initialData.RunId,
        UserId: 42,
        TeamId: 3,
        Progress: 100,
        CheckpointsReached: 4,
        WaypointOrder: '1-2-3-4',
        Completed: true,
        FinishedAt: expect.any(String),
        TotalTime: expect.any(Number),
        Waypoint1Time: expect.any(Number),
        Waypoint2Time: expect.any(Number),
        Waypoint3Time: expect.any(Number),
        Waypoint4Time: expect.any(Number),
        Checkpoint1Time: expect.any(Number),
        Checkpoint2Time: expect.any(Number),
        Checkpoint3Time: expect.any(Number),
      }),
    );
  });

  it('does not mark a given-up run as finished or completed', async () => {
    const intraManagerApi = TestBed.inject(IntraManagerApi);
    const controller = {
      active: true,
      display_name: 'Ada Lovelace',
      email: null,
      first_name: 'Ada',
      last_name: 'Lovelace',
      user_id: 42,
    };
    const team = {
      ...blueBotTeam,
      users: [{ image: null, name: 'Ada Lovelace', user_id: 42 }],
    };
    vi.spyOn(intraManagerApi, 'isBoardIntegrationUnlocked').mockReturnValue(true);
    vi.spyOn(intraManagerApi, 'getOrganizationUsers').mockResolvedValue([controller]);
    vi.spyOn(intraManagerApi, 'getRobotTeams').mockResolvedValue([team]);
    const postData = vi.spyOn(intraManagerApi, 'postIntegrationData').mockResolvedValue();
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.onConfigured({
      config: { mode: 'any-order' },
      dualMaze: false,
      countdownSeconds: 0,
      labels: { '0': 'A', '1': 'B', '2': 'C', '3': 'D' },
    });
    await fixture.whenStable();
    app.primaryController.set(controller);
    app.primaryTeam.set(team);
    await app.beginCountdown();
    await vi.waitFor(() => expect(postData).toHaveBeenCalledTimes(1));

    app.primaryEngine?.giveUp();
    if (app.primaryEngine) app.onRunEnded(app.primaryEngine);
    await vi.waitFor(() => expect(postData).toHaveBeenCalledTimes(2));

    const abandonedData = postData.mock.calls[1][0];
    expect(abandonedData.Completed).toBe(false);
    expect(abandonedData).not.toHaveProperty('FinishedAt');
    expect(abandonedData).not.toHaveProperty('TotalTime');
  });
});
