import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SecureStorage, UserConfig } from 'shared-core';

interface StoredApiHeader {
  key: 'token';
  value: string;
}

interface IntegrationsResponse {
  integrations: IntegrationResponseItem[];
}

interface IntegrationResponseItem {
  active: boolean;
  integration_id: number | null;
  title: string | null;
  type: string | null;
}

interface OrganizationUsersResponse {
  users: OrganizationUser[];
}

interface TeamsResponse {
  teams: OrganizationTeam[];
}

export interface IntegrationOption {
  integration_id: number;
  title: string;
}

export interface OrganizationUser {
  active: boolean;
  alias?: string | null;
  display_name: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  user_id: number | null;
}

export interface TeamUser {
  image: string | null;
  name: string;
  user_id: number;
}

export interface OrganizationTeam {
  active: boolean;
  children_nested: OrganizationTeam[];
  name: string;
  team_id: number;
  users: TeamUser[];
}

@Injectable({
  providedIn: 'root',
})
export class IntraManagerApi {
  static readonly integrationsUrl = 'https://board-api.intramanager.com/v1/integrations';
  static readonly organizationUsersUrl =
    'https://board-api.intramanager.com/v1/organizations/users';
  static readonly robotTeamsUrl =
    'https://board-api.intramanager.com/v1/teams?active=true&include_users=true&nested=true';

  private readonly http = inject(HttpClient);
  private readonly secureStorage = inject(SecureStorage);
  private readonly userConfig = inject(UserConfig);
  private unlockedHeader: StoredApiHeader | null = null;

  hasStoredApiKey(): boolean {
    return this.userConfig.isConfigSet();
  }

  async testAndStoreApiKey(apiKey: string, masterPassword: string): Promise<IntegrationOption[]> {
    const header: StoredApiHeader = {
      key: 'token',
      value: apiKey.trim(),
    };

    const response = await firstValueFrom(
      this.http.get<IntegrationsResponse>(IntraManagerApi.integrationsUrl, {
        headers: new HttpHeaders({ [header.key]: header.value }),
      }),
    );

    const encryptedHeader = await this.secureStorage.encryptSecret(
      JSON.stringify(header),
      masterPassword,
    );

    this.userConfig.url = IntraManagerApi.integrationsUrl;
    this.userConfig.header = encryptedHeader;
    this.unlockedHeader = header;

    return this.integrationOptions(response);
  }

  async unlockStoredApiKey(masterPassword: string): Promise<IntegrationOption[]> {
    const decryptedHeader = await this.secureStorage.decryptSecret(
      this.userConfig.header,
      masterPassword,
    );
    const header = this.parseStoredHeader(decryptedHeader);
    const response = await firstValueFrom(
      this.http.get<IntegrationsResponse>(this.userConfig.url, {
        headers: new HttpHeaders({ [header.key]: header.value }),
      }),
    );
    this.unlockedHeader = header;

    return this.integrationOptions(response);
  }

  isBoardIntegrationUnlocked(): boolean {
    return this.unlockedHeader !== null && this.storedIntegrationId() !== null;
  }

  async getOrganizationUsers(): Promise<OrganizationUser[]> {
    const response = await firstValueFrom(
      this.http.get<OrganizationUsersResponse>(IntraManagerApi.organizationUsersUrl, {
        headers: this.unlockedHeaders(),
      }),
    );

    return response.users;
  }

  async createOrganizationUser(alias: string): Promise<OrganizationUser[]> {
    await firstValueFrom(
      this.http.post<unknown>(
        IntraManagerApi.organizationUsersUrl,
        { alias: alias.trim(), team_id: null },
        { headers: this.unlockedHeaders() },
      ),
    );

    return this.getOrganizationUsers();
  }

  async getRobotTeams(): Promise<OrganizationTeam[]> {
    const response = await firstValueFrom(
      this.http.get<TeamsResponse>(IntraManagerApi.robotTeamsUrl, {
        headers: this.unlockedHeaders(),
      }),
    );

    return response.teams.find(({ name }) => name === 'Robots')?.children_nested ?? [];
  }

  async addUserToTeam(teamId: number, userId: number): Promise<void> {
    await firstValueFrom(
      this.http.put<unknown>(
        `https://board-api.intramanager.com/v1/teams/${teamId}/users/${userId}`,
        null,
        { headers: this.unlockedHeaders() },
      ),
    );
  }

  storedIntegrationId(): number | null {
    return this.userConfig.integrationId;
  }

  resetStoredSettings(): void {
    this.unlockedHeader = null;
    this.userConfig.clear();
  }

  private integrationOptions(response: IntegrationsResponse): IntegrationOption[] {
    return response.integrations
      .filter(
        (
          integration,
        ): integration is IntegrationResponseItem & {
          integration_id: number;
          title: string;
        } =>
          integration.active &&
          integration.type === 'api' &&
          Number.isInteger(integration.integration_id) &&
          typeof integration.title === 'string',
      )
      .map(({ integration_id, title }) => ({ integration_id, title }));
  }

  private parseStoredHeader(value: string): StoredApiHeader {
    const header: unknown = JSON.parse(value);
    if (
      typeof header !== 'object' ||
      header === null ||
      !('key' in header) ||
      header.key !== 'token' ||
      !('value' in header) ||
      typeof header.value !== 'string'
    ) {
      throw new Error('The stored API-key settings are invalid.');
    }

    return { key: header.key, value: header.value };
  }

  private unlockedHeaders(): HttpHeaders {
    if (!this.unlockedHeader) {
      throw new Error('The Board settings must be unlocked before users can be loaded.');
    }

    return new HttpHeaders({ [this.unlockedHeader.key]: this.unlockedHeader.value });
  }

  storeIntegrationId(integrationId: number): void {
    this.userConfig.integrationId = integrationId;
  }
}
