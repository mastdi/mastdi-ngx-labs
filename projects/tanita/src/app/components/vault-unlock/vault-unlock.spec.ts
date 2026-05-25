import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VaultUnlock } from './vault-unlock';

describe('VaultUnlock', () => {
  let component: VaultUnlock;
  let fixture: ComponentFixture<VaultUnlock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultUnlock],
    }).compileComponents();

    fixture = TestBed.createComponent(VaultUnlock);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
