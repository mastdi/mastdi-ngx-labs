import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VaultDashboard } from './vault-dashboard';

describe('VaultDashboard', () => {
  let component: VaultDashboard;
  let fixture: ComponentFixture<VaultDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(VaultDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
