import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
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
  });
});
