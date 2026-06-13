import { inject, Injectable } from '@angular/core';
import { UserConfig } from './user-config';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataApi {
  private http = inject(HttpClient);
  private userConfig = inject(UserConfig);

  uploadPayload(payload: unknown): Promise<unknown> {
    const targetUrl = this.userConfig.url;

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return firstValueFrom(this.http.post<unknown>(targetUrl, payload, { headers }));
  }
}
