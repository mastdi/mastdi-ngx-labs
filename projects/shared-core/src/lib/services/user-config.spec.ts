import { TestBed } from '@angular/core/testing';

import { UserConfig } from './user-config';

describe('UserConfig', () => {
  let service: UserConfig;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserConfig);
    service.clear();
  });

  afterEach(() => {
    // Cleanup after each test execution
    service.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should preserve and recall assigned configuration values accurately', () => {
    const testUrl = 'https://api.test.local/v1';
    const testHeader = 'Bearer token-xyz-123';

    // Act: Set values purely through the public setters
    service.url = testUrl;
    service.header = testHeader;

    // Assert: Verify values persist exactly as assigned using public getters
    expect(service.url).toBe(testUrl);
    expect(service.header).toBe(testHeader);
  });

  it('should throw an error when accessing properties that have not been configured', () => {
    // Assert: An unconfigured service must throw the specified domain errors
    expect(() => service.url).toThrow(new Error('No URL found for user config'));
    expect(() => service.header).toThrow(new Error('No Header found for user config'));
  });

  describe('isConfigSet', () => {
    it('should evaluate to false when properties are missing values', () => {
      // Scenario A: Completely empty state
      expect(service.isConfigSet()).toBeFalsy();

      // Scenario B: Partially assigned state
      service.url = 'https://api.test.local/v1';
      expect(service.isConfigSet()).toBeFalsy();
    });

    it('should evaluate to true only when both properties have been successfully defined', () => {
      service.url = 'https://api.test.local/v1';
      service.header = 'Bearer token-xyz-123';

      expect(service.isConfigSet()).toBeTruthy();
    });
  });
});
