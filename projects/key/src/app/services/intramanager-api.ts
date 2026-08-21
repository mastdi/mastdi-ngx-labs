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

export interface IntegrationOption {
  integration_id: number;
  title: string;
}

export interface OrganizationUser {
  active: boolean;
  display_name: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  user_id: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class IntraManagerApi {
  static readonly integrationsUrl = 'https://board-api.intramanager.com/v1/integrations';
  static readonly organizationUsersUrl =
    'https://board-api.intramanager.com/v1/organizations/users';

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
    if (!this.unlockedHeader) {
      throw new Error('The Board settings must be unlocked before users can be loaded.');
    }

    const response = await firstValueFrom(
      this.http.get<OrganizationUsersResponse>(IntraManagerApi.organizationUsersUrl, {
        headers: new HttpHeaders({
          [this.unlockedHeader.key]: this.unlockedHeader.value,
        }),
      }),
    );

    return response.users;
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

  storeIntegrationId(integrationId: number): void {
    this.userConfig.integrationId = integrationId;
  }
}
