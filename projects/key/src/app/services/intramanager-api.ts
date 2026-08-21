import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SecureStorage, UserConfig } from 'shared-core';

interface StoredApiHeader {
  // TODO: Change to x-api-key once it is fixed in the backend
  key: 'token';
  value: string;
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

  async testAndStoreApiKey(apiKey: string, masterPassword: string): Promise<void> {
    const header: StoredApiHeader = {
      key: 'token',
      value: apiKey.trim(),
    };

    await firstValueFrom(
      this.http.get<unknown>(IntraManagerApi.integrationsUrl, {
        headers: new HttpHeaders({ [header.key]: header.value }),
      }),
    );

    const encryptedHeader = await this.secureStorage.encryptSecret(
      JSON.stringify(header),
      masterPassword,
    );

    this.userConfig.url = IntraManagerApi.integrationsUrl;
    this.userConfig.header = encryptedHeader;
  }
}
