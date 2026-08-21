import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IntraManagerApi } from '../../services/intramanager-api';
import { MazeConfigForm } from './maze-config-form';

describe('MazeConfigForm', () => {
  let component: MazeConfigForm;
  let fixture: ComponentFixture<MazeConfigForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MazeConfigForm],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(MazeConfigForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits any-order config by default', () => {
    const emitted: unknown[] = [];
    component.configured.subscribe((setup) => emitted.push(setup));

    component.submit();

    expect(emitted).toEqual([
      {
        config: { mode: 'any-order' },
        dualMaze: false,
        countdownSeconds: 3,
        labels: { 0: 'North', 1: 'East', 2: 'South', 3: 'West' },
      },
    ]);
  });

  it('blocks submission while the sequence has duplicate targets', () => {
    component.configForm.controls.mode.setValue('sequence');
    component.configForm.controls.sequence.patchValue({ position0: 0, position1: 0 });
    fixture.detectChanges();

    expect(component.canSubmit()).toBe(false);
  });

  it('prefills from a prior setup when reopened', () => {
    fixture.componentRef.setInput('initialSetup', {
      config: { mode: 'last-only', lastTargetId: 2 },
      dualMaze: true,
      countdownSeconds: 5,
      labels: { 0: 'Bookshelf', 1: 'Window', 2: 'Doorway', 3: 'Sofa' },
    });
    fixture.detectChanges();

    const raw = component.configForm.getRawValue();
    expect(raw.mode).toBe('last-only');
    expect(raw.dualMaze).toBe(true);
    expect(raw.countdownSeconds).toBe(5);
    expect(raw.lastTargetId).toBe(2);
    expect(raw.labels).toEqual({
      target0: 'Bookshelf',
      target1: 'Window',
      target2: 'Doorway',
      target3: 'Sofa',
    });
  });

  it('tests and stores valid Advanced API-key settings', async () => {
    const intraManagerApi = TestBed.inject(IntraManagerApi);
    const testAndStore = vi
      .spyOn(intraManagerApi, 'testAndStoreApiKey')
      .mockResolvedValue(undefined);
    component.integrationForm.setValue({
      apiKey: 'board-key',
      masterPassword: 'master-password',
    });

    await component.testAndStoreApiKey();

    expect(testAndStore).toHaveBeenCalledWith('board-key', 'master-password');
    expect(component.connectionState()).toBe('success');
    expect(component.hasStoredApiKey()).toBe(true);
    expect(component.integrationForm.getRawValue()).toEqual({ apiKey: '', masterPassword: '' });
  });
});
