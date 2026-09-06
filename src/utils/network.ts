/// <reference types="vite/client" />
const originalFetch = window.fetch;

export function setupNetworkRetry() {
  // Global fetch interceptor with exponential backoff for network errors (not 4xx/5xx responses)
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    writable: true,
    value: async function (...args: any[]) {
    let retries = 3;
    let delay = 1000;
    
    // Inject APP_URL if specified and the path is relative (starts with /)
    const appUrl = import.meta.env.VITE_APP_URL || '';
    if (appUrl && typeof args[0] === 'string' && args[0].startsWith('/')) {
      args[0] = `${appUrl.replace(/\/$/, '')}${args[0]}`;
    }

    while (retries > 0) {
      try {
        const response = await originalFetch(...args);
        // We do not retry on 4xx/5xx because those are server responses, 
        // unless it's a 502/503/504 which indicates gateway/proxy issues.
        if (!response.ok && [502, 503, 504].includes(response.status)) {
          throw new Error(`Server returned ${response.status}`);
        }
        return response;
      } catch (error: any) {
        retries -= 1;
        if (retries === 0) {
          throw error;
        }
        // Only retry on TypeError (usually network/connection error) or specific 5xx errors
        if (error instanceof TypeError || error.message.includes('Server returned')) {
          console.warn(`Fetch failed for ${args[0]}, retrying in ${delay}ms... (${retries} retries left)`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw error;
        }
      }
    }
    return originalFetch(...args as Parameters<typeof fetch>); // Fallback
    }
  });
}
