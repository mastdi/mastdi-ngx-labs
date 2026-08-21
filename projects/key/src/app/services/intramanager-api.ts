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

export interface IntegrationOption {
  integration_id: number;
  title: string;
}

@Injectable({
  providedIn: 'root',
})
export class IntraManagerApi {
  static readonly integrationsUrl = 'https://board-api.intramanager.com/v1/integrations';

  private readonly http = inject(HttpClient);
  private readonly secureStorage = inject(SecureStorage);
  private readonly userConfig = inject(UserConfig);

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

    return this.integrationOptions(response);
  }

  storedIntegrationId(): number | null {
    return this.userConfig.integrationId;
  }

  resetStoredSettings(): void {
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
