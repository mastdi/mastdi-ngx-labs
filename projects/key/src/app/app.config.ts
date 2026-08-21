import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { USER_CONFIG_PREFIX } from 'shared-core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    { provide: USER_CONFIG_PREFIX, useValue: 'MASTDI_KEY_INTRAMANAGER_' },
  ],
};
