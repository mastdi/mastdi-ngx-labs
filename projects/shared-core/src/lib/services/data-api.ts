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

  uploadPayload(payload: any[] | Record<string, any>): Promise<any> {
    const targetUrl = this.userConfig.url;

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return firstValueFrom(this.http.post<any>(targetUrl, payload, { headers }));
  }
}
