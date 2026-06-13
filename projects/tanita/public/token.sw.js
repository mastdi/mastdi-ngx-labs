// src/sw.js

// This lives strictly in the Service Worker's RAM thread memory
let activeCredentials = null;

// Listen for secure token updates from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_TOKEN_CONFIG') {
    activeCredentials = {
      url: event.data.url,
      apiTokenKey: event.data.apiTokenKey,
      apiTokenValue: event.data.apiTokenValue
    };
    console.log('SW: Token loaded securely into thread memory.');
  }
});

// Intercept network requests
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  // Check if we have credentials in memory and if the URL matches exactly
  if (activeCredentials && event.request.url === activeCredentials.url) {

    const newHeaders = new Headers(event.request.headers);
    newHeaders.append(activeCredentials.apiTokenKey, activeCredentials.apiTokenValue);

    const modifiedRequest = new Request(event.request, {
      headers: newHeaders,
      mode: 'cors'
    });

    event.respondWith(fetch(modifiedRequest));
  } else {
    event.respondWith(fetch(event.request));
  }
});

// Immediately claim control of the page without waiting for a refresh
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
