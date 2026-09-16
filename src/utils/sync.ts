/// <reference types="vite/client" />
import { useEffect } from 'react';
import { setupFirestoreRealtimeListeners } from '../services/clientFirestore';

let activeEventSource: EventSource | null = null;
let reconnectTimer: any = null;
let backgroundPollTimer: any = null;

export function initGlobalSync() {
  if (activeEventSource) {
    activeEventSource.close();
  }

  // 1. Direct Cloud Firestore onSnapshot realtime listeners
  const cleanupFirestoreListeners = setupFirestoreRealtimeListeners((collection) => {
    window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection } }));
  });

  // 2. Server-Sent Events (SSE) stream listener
  function connectSSE() {
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
      if (failCount >= 3) {
        return;
      }
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectSSE();
        }, 10000);
      }
    };
  }

  connectSSE();

  // 3. Multi-tab storage sync handler
  const handleStorageEvent = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key.includes('plan') || e.key.includes('admin_cached_plans')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'subscription_plans' } }));
    } else if (e.key.includes('branding') || e.key.includes('setting')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'system_settings' } }));
    } else if (e.key.includes('supervisor')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'supervisors' } }));
    } else if (e.key.includes('partner')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'partners' } }));
    } else if (e.key.includes('site') || e.key.includes('related')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'related_sites' } }));
    } else if (e.key.includes('user')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'users' } }));
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  // 4. Background heartbeat pulse every 15s to keep all views synchronized seamlessly
  backgroundPollTimer = setInterval(() => {
    window.dispatchEvent(new CustomEvent('sync_heartbeat', { detail: { timestamp: Date.now() } }));
  }, 15000);

  return () => {
    if (activeEventSource) activeEventSource.close();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (backgroundPollTimer) clearInterval(backgroundPollTimer);
    window.removeEventListener('storage', handleStorageEvent);
    cleanupFirestoreListeners();
  };
}

export function useSync(collectionName: string | string[], onUpdate: () => void) {
  useEffect(() => {
    const handleUpdate = (e: any) => {
      const cols = Array.isArray(collectionName) ? collectionName : [collectionName];
      if (cols.includes(e.detail?.collection) || e.detail?.collection === 'all') {
        onUpdate();
      }
    };

    window.addEventListener('sync_update', handleUpdate);
    return () => window.removeEventListener('sync_update', handleUpdate);
  }, [collectionName, onUpdate]);
}
