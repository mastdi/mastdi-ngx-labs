import { inject, Injectable, InjectionToken } from '@angular/core';

export const USER_CONFIG_PREFIX = new InjectionToken<string>('USER_CONFIG_PREFIX', {
  providedIn: 'root',
  factory: () => 'MASTDI_TANITA_',
});

@Injectable({
  providedIn: 'root',
})
export class UserConfig {
  private readonly prefix = inject(USER_CONFIG_PREFIX);
  private readonly URL_KEY = this.prefix + 'URL';
  private readonly HEADER_KEY = this.prefix + 'HEADER';

  get url(): string {
    const url = localStorage.getItem(this.URL_KEY);
    if (url === null) {
      throw Error('No URL found for user config');
    }
    return url;
  }

  set url(value: string) {
    localStorage.setItem(this.URL_KEY, value);
  }

  get header(): string {
    const header = localStorage.getItem(this.HEADER_KEY);
    if (header === null) {
      throw Error('No Header found for user config');
    }
    return header;
  }

  set header(value: string) {
    localStorage.setItem(this.HEADER_KEY, value);
  }

  isConfigSet(): boolean {
    try {
      /* eslint-disable @typescript-eslint/no-unused-expressions */
      this.url;
      this.header;
      /* eslint-enable @typescript-eslint/no-unused-expressions */
    } catch {
      return false;
    }
    return true;
  }

  clear(): void {
    localStorage.removeItem(this.URL_KEY);
    localStorage.removeItem(this.HEADER_KEY);
  }
}
