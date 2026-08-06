import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MazeConfigForm } from './maze-config-form';

describe('MazeConfigForm', () => {
  let component: MazeConfigForm;
  let fixture: ComponentFixture<MazeConfigForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MazeConfigForm],
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
});
