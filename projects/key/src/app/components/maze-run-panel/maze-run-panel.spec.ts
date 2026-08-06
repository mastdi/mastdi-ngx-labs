import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MazeRunPanel } from './maze-run-panel';
import { MazeRunEngine } from '../../engine/maze-run-engine';

describe('MazeRunPanel', () => {
  let fixture: ComponentFixture<MazeRunPanel>;
  let component: MazeRunPanel;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MazeRunPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(MazeRunPanel);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('engine', new MazeRunEngine({ mode: 'any-order' }));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders a target cell per contact, marking hit ones', async () => {
    const engine = new MazeRunEngine({ mode: 'any-order' });
    engine.start();
    engine.registerHit(0);

    fixture.componentRef.setInput('engine', engine);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const targets = fixture.nativeElement.querySelectorAll('.target');
    expect(targets.length).toBe(4);
    expect(fixture.nativeElement.querySelectorAll('.target.hit').length).toBe(1);
  });

  it('shows the results table once the engine finishes', async () => {
    const engine = new MazeRunEngine({ mode: 'any-order' });
    engine.start();
    [0, 1, 2, 3].forEach((id) => engine.registerHit(id as 0 | 1 | 2 | 3));

    fixture.componentRef.setInput('engine', engine);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('table.splits')).toBeTruthy();
  });
});
