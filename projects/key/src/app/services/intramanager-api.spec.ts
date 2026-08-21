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
    decryptSecret: vi.fn<(secret: string, password: string) => Promise<string>>(),
  };

  beforeEach(() => {
    secureStorage.encryptSecret.mockReset();
    secureStorage.encryptSecret.mockResolvedValue('encrypted-api-header');
    secureStorage.decryptSecret.mockReset();
    secureStorage.decryptSecret.mockResolvedValue(
      JSON.stringify({ key: 'token', value: 'stored-board-key' }),
    );

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
    expect(request.request.headers.get('token')).toBe('board-key');
    request.flush({
      integrations: [
        { active: true, integration_id: 12, title: 'Active API integration', type: 'api' },
        { active: true, integration_id: 18, title: 'Active non-API integration', type: 'csv' },
        { active: false, integration_id: 24, title: 'Inactive API integration', type: 'api' },
        { active: true, integration_id: null, title: null, type: 'api' },
      ],
    });
    await expect(result).resolves.toEqual([
      { integration_id: 12, title: 'Active API integration' },
    ]);

    expect(secureStorage.encryptSecret).toHaveBeenCalledWith(
      JSON.stringify({ key: 'token', value: 'board-key' }),
      'master-password',
    );
    expect(userConfig.url).toBe(IntraManagerApi.integrationsUrl);
    expect(userConfig.header).toBe('encrypted-api-header');
    expect(userConfig.header).not.toContain('board-key');
    expect(service.hasStoredApiKey()).toBe(true);
  });

  it('stores only the selected integration id', () => {
    service.storeIntegrationId(12);

    expect(userConfig.integrationId).toBe(12);
    expect(localStorage.getItem('MASTDI_TANITA_INTEGRATION_ID')).toBe('12');
    expect(localStorage.length).toBe(1);
  });

  it('unlocks stored settings and fetches integrations without storing the decrypted key', async () => {
    userConfig.url = IntraManagerApi.integrationsUrl;
    userConfig.header = 'encrypted-api-header';
    userConfig.integrationId = 12;

    const result = service.unlockStoredApiKey('master-password');
    await Promise.resolve();
    const request = httpTesting.expectOne(IntraManagerApi.integrationsUrl);

    expect(request.request.headers.get('token')).toBe('stored-board-key');
    request.flush({
      integrations: [
        { active: true, integration_id: 12, title: 'Stored integration', type: 'api' },
      ],
    });

    await expect(result).resolves.toEqual([{ integration_id: 12, title: 'Stored integration' }]);
    expect(secureStorage.decryptSecret).toHaveBeenCalledWith(
      'encrypted-api-header',
      'master-password',
    );
    expect(userConfig.header).toBe('encrypted-api-header');
    expect(service.storedIntegrationId()).toBe(12);
    expect(service.isBoardIntegrationUnlocked()).toBe(true);
  });

  it('loads organization users with the unlocked Board token', async () => {
    userConfig.url = IntraManagerApi.integrationsUrl;
    userConfig.header = 'encrypted-api-header';
    userConfig.integrationId = 12;

    const unlock = service.unlockStoredApiKey('master-password');
    await Promise.resolve();
    httpTesting.expectOne(IntraManagerApi.integrationsUrl).flush({
      integrations: [
        { active: true, integration_id: 12, title: 'Stored integration', type: 'api' },
      ],
    });
    await unlock;

    const result = service.getOrganizationUsers();
    const request = httpTesting.expectOne(IntraManagerApi.organizationUsersUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('token')).toBe('stored-board-key');
    request.flush({
      users: [
        {
          active: true,
          display_name: 'Ada Lovelace',
          email: 'ada@example.com',
          first_name: 'Ada',
          last_name: 'Lovelace',
          user_id: 42,
        },
      ],
    });

    await expect(result).resolves.toEqual([
      {
        active: true,
        display_name: 'Ada Lovelace',
        email: 'ada@example.com',
        first_name: 'Ada',
        last_name: 'Lovelace',
        user_id: 42,
      },
    ]);
  });

  it('does not load organization users before Board settings are unlocked', async () => {
    await expect(service.getOrganizationUsers()).rejects.toThrow(
      'The Board settings must be unlocked before users can be loaded.',
    );
  });

  it('creates an organization user and refreshes the user list', async () => {
    userConfig.url = IntraManagerApi.integrationsUrl;
    userConfig.header = 'encrypted-api-header';
    userConfig.integrationId = 12;

    const unlock = service.unlockStoredApiKey('master-password');
    await Promise.resolve();
    httpTesting.expectOne(IntraManagerApi.integrationsUrl).flush({ integrations: [] });
    await unlock;

    const result = service.createOrganizationUser(' New player ');
    const createRequest = httpTesting.expectOne(IntraManagerApi.organizationUsersUrl);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.headers.get('token')).toBe('stored-board-key');
    expect(createRequest.request.body).toEqual({ alias: 'New player', team_id: null });
    createRequest.flush({});
    await Promise.resolve();

    const usersRequest = httpTesting.expectOne(IntraManagerApi.organizationUsersUrl);
    expect(usersRequest.request.method).toBe('GET');
    usersRequest.flush({
      users: [
        {
          active: true,
          alias: 'New player',
          display_name: '',
          email: null,
          first_name: '',
          last_name: '',
          user_id: 44,
        },
      ],
    });

    await expect(result).resolves.toEqual([
      expect.objectContaining({ alias: 'New player', user_id: 44 }),
    ]);
  });

  it('returns nested teams from the first top-level Robots team', async () => {
    userConfig.url = IntraManagerApi.integrationsUrl;
    userConfig.header = 'encrypted-api-header';
    userConfig.integrationId = 12;
    const unlock = service.unlockStoredApiKey('master-password');
    await Promise.resolve();
    httpTesting.expectOne(IntraManagerApi.integrationsUrl).flush({ integrations: [] });
    await unlock;

    const result = service.getRobotTeams();
    const request = httpTesting.expectOne(IntraManagerApi.robotTeamsUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('token')).toBe('stored-board-key');
    request.flush({
      teams: [
        {
          active: true,
          children_nested: [],
          name: 'Other',
          team_id: 9,
          users: [],
        },
        {
          active: true,
          children_nested: [
            {
              active: true,
              children_nested: [],
              name: 'BlueBot',
              team_id: 3,
              users: [{ image: null, name: 'David D', user_id: 18731 }],
            },
          ],
          name: 'Robots',
          team_id: 1,
          users: [],
        },
      ],
    });

    await expect(result).resolves.toEqual([
      expect.objectContaining({ name: 'BlueBot', team_id: 3 }),
    ]);
  });

  it('adds a user to a team with the unlocked Board token', async () => {
    userConfig.url = IntraManagerApi.integrationsUrl;
    userConfig.header = 'encrypted-api-header';
    userConfig.integrationId = 12;
    const unlock = service.unlockStoredApiKey('master-password');
    await Promise.resolve();
    httpTesting.expectOne(IntraManagerApi.integrationsUrl).flush({ integrations: [] });
    await unlock;

    const result = service.addUserToTeam(3, 18731);
    const request = httpTesting.expectOne(
      'https://board-api.intramanager.com/v1/teams/3/users/18731',
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBeNull();
    expect(request.request.headers.get('token')).toBe('stored-board-key');
    request.flush({});

    await expect(result).resolves.toBeUndefined();
  });

  it('resets all stored settings', () => {
    userConfig.url = IntraManagerApi.integrationsUrl;
    userConfig.header = 'encrypted-api-header';
    userConfig.integrationId = 12;

    service.resetStoredSettings();

    expect(service.hasStoredApiKey()).toBe(false);
    expect(service.storedIntegrationId()).toBeNull();
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
