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

  storeIntegrationId(integrationId: number): void {
    this.userConfig.integrationId = integrationId;
  }
}
