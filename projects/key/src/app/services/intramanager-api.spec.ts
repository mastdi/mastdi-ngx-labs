import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SecureStorage, UserConfig } from 'shared-core';
import { IntraManagerApi } from './intramanager-api';

describe('IntraManagerApi', () => {
  let service: IntraManagerApi;
  let httpTesting: HttpTestingController;
  let userConfig: UserConfig;
  const secureStorage = {
    encryptSecret: vi.fn<(secret: string, password: string) => Promise<string>>(),
  };

  beforeEach(() => {
    secureStorage.encryptSecret.mockReset();
    secureStorage.encryptSecret.mockResolvedValue('encrypted-api-header');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SecureStorage, useValue: secureStorage },
      ],
    });

    service = TestBed.inject(IntraManagerApi);
    httpTesting = TestBed.inject(HttpTestingController);
    userConfig = TestBed.inject(UserConfig);
    userConfig.clear();
  });

  afterEach(() => {
    httpTesting.verify();
    userConfig.clear();
  });

  it('tests the API key and stores only the encrypted header', async () => {
    const result = service.testAndStoreApiKey(' board-key ', 'master-password');
    const request = httpTesting.expectOne(IntraManagerApi.integrationsUrl);

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('X-API-Key')).toBe('board-key');
    request.flush([]);
    await result;

    expect(secureStorage.encryptSecret).toHaveBeenCalledWith(
      JSON.stringify({ key: 'X-API-Key', value: 'board-key' }),
      'master-password',
    );
    expect(userConfig.url).toBe(IntraManagerApi.integrationsUrl);
    expect(userConfig.header).toBe('encrypted-api-header');
    expect(userConfig.header).not.toContain('board-key');
    expect(service.hasStoredApiKey()).toBe(true);
  });

  it('does not store a rejected API key', async () => {
    const result = service.testAndStoreApiKey('wrong-key', 'master-password');
    const request = httpTesting.expectOne(IntraManagerApi.integrationsUrl);

    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(result).rejects.toBeTruthy();
    expect(secureStorage.encryptSecret).not.toHaveBeenCalled();
    expect(service.hasStoredApiKey()).toBe(false);
  });
});
