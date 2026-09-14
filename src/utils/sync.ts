/// <reference types="vite/client" />
import { useEffect } from 'react';

let activeEventSource: EventSource | null = null;
let reconnectTimer: any = null;

export function initGlobalSync() {
  if (activeEventSource) {
    activeEventSource.close();
  }

  function connect() {
    const appUrl = import.meta.env.VITE_APP_URL || '';
    const url = `${appUrl.replace(/\/$/, '')}/api/sync`;
    activeEventSource = new EventSource(url);
    
    activeEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update' && data.collection) {
          window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: data.collection } }));
        }
      } catch (e) {
        // Suppress parsing errors to avoid UI crashes
      }
    };

    let failCount = 0;
    activeEventSource.onerror = () => {
      activeEventSource?.close();
      failCount++;
      // In serverless environments (like Vercel), SSE is not supported, so cease retrying after 3 attempts
      if (failCount >= 3) {
        return;
      }
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 10000);
      }
    };
  }

  connect();

  return () => {
    if (activeEventSource) activeEventSource.close();
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };
}

export function useSync(collectionName: string | string[], onUpdate: () => void) {
  useEffect(() => {
    const handleUpdate = (e: any) => {
      const cols = Array.isArray(collectionName) ? collectionName : [collectionName];
      if (cols.includes(e.detail?.collection)) {
        onUpdate();
      }
    };
    
    window.addEventListener('sync_update', handleUpdate);
    return () => window.removeEventListener('sync_update', handleUpdate);
  }, [collectionName, onUpdate]);
}
