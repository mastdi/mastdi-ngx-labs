import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserConfig {
  private readonly PREFIX = 'MASTDI_TANITA_';
  private readonly URL_KEY: string;
  private readonly HEADER_KEY: string;

  constructor() {
    this.URL_KEY = this.PREFIX + 'URL';
    this.HEADER_KEY = this.PREFIX + 'HEADER';
  }

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
      this.url;
      this.header;
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
