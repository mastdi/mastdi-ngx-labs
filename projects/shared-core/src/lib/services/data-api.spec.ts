import { TestBed } from '@angular/core/testing';

import { DataApi } from './data-api';

describe('DataApi', () => {
  let service: DataApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
