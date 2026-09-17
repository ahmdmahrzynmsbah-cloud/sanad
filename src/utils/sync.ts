/// <reference types="vite/client" />
import { useEffect } from 'react';
import { setupFirestoreRealtimeListeners } from '../services/clientFirestore';

let activeEventSource: EventSource | null = null;
let reconnectTimer: any = null;
let pollTimer: any = null;
let broadcastChannel: BroadcastChannel | null = null;

// Track latest observed timestamps for each collection to prevent redundant re-renders
const knownTimestamps: Record<string, number> = {};

/**
 * Dispatch a sync update event locally to this window and across browser tabs
 */
export function notifySync(collection: string = 'all') {
  const now = Date.now();
  knownTimestamps[collection] = now;
  knownTimestamps['all'] = now;

  // 1. Dispatch custom event for current window
  try {
    window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection, timestamp: now } }));
  } catch {}

  // 2. Broadcast to other open tabs via BroadcastChannel
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'sync_update', collection, timestamp: now });
    }
  } catch {}

  // 3. Fallback to localStorage trigger for older browsers or if channel failed
  try {
    localStorage.setItem('sanad_sync_pulse', `${collection}:${now}`);
  } catch {}

  // 4. Send asynchronous notification pulse to backend to notify other devices
  try {
    fetch('/api/sync/pulse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection }),
    }).catch(() => {});
  } catch {}
}

export function initGlobalSync() {
  if (activeEventSource) {
    try { activeEventSource.close(); } catch {}
  }
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (pollTimer) clearInterval(pollTimer);

  // Initialize BroadcastChannel
  try {
    if (typeof BroadcastChannel !== 'undefined' && !broadcastChannel) {
      broadcastChannel = new BroadcastChannel('sanad_realtime_sync');
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'sync_update' && event.data?.collection) {
          window.dispatchEvent(
            new CustomEvent('sync_update', {
              detail: { collection: event.data.collection, timestamp: event.data.timestamp || Date.now() },
            })
          );
        }
      };
    }
  } catch (e) {
    console.warn('[Sync] BroadcastChannel init note:', e);
  }

  // 1. Direct Cloud Firestore onSnapshot realtime listeners
  const cleanupFirestoreListeners = setupFirestoreRealtimeListeners((collection) => {
    window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection, timestamp: Date.now() } }));
  });

  // 2. Server-Sent Events (SSE) stream listener with automatic infinite reconnect
  function connectSSE() {
    try {
      const appUrl = import.meta.env.VITE_APP_URL || '';
      const url = `${appUrl.replace(/\/$/, '')}/api/sync`;
      activeEventSource = new EventSource(url);

      activeEventSource.onopen = () => {
        // Connected to realtime SSE stream
      };

      activeEventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data.startsWith(':')) return; // Ignore SSE comments/pings
          const data = JSON.parse(event.data);
          if (data.type === 'update' && data.collection) {
            const col = data.collection;
            const ts = data.timestamp || Date.now();
            knownTimestamps[col] = ts;
            window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: col, timestamp: ts } }));
          } else if (data.type === 'init' && data.timestamps) {
            Object.assign(knownTimestamps, data.timestamps);
          }
        } catch {
          // Suppress JSON parse errors on malformed frames
        }
      };

      activeEventSource.onerror = () => {
        try { activeEventSource?.close(); } catch {}
        activeEventSource = null;
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectSSE();
          }, 3000);
        }
      };
    } catch {
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectSSE();
        }, 5000);
      }
    }
  }

  connectSSE();

  // 3. Fast Version-Polling Engine (Checks /api/sync/version every 2.5s)
  // Ensures 100% sync reliability on every device, mobile screen, and browser
  const checkServerVersion = async () => {
    try {
      const res = await fetch(`/api/sync/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.timestamps) {
        const timestamps = data.timestamps as Record<string, number>;
        let hasChanges = false;
        const changedCols: string[] = [];

        for (const [col, ts] of Object.entries(timestamps)) {
          if (!knownTimestamps[col] || knownTimestamps[col] < ts) {
            knownTimestamps[col] = ts;
            hasChanges = true;
            changedCols.push(col);
          }
        }

        if (hasChanges) {
          changedCols.forEach((col) => {
            window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: col, timestamp: Date.now() } }));
          });
        }
      }
    } catch {
      // Ignore network errors in background poll
    }
  };

  // Run initial version check
  checkServerVersion();
  pollTimer = setInterval(checkServerVersion, 2500);

  // 4. Multi-tab storage sync handler
  const handleStorageEvent = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key === 'sanad_sync_pulse' && e.newValue) {
      const [col] = e.newValue.split(':');
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: col || 'all', timestamp: Date.now() } }));
    } else if (e.key.includes('plan') || e.key.includes('admin_cached_plans')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'subscription_plans', timestamp: Date.now() } }));
    } else if (e.key.includes('branding') || e.key.includes('setting')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'system_settings', timestamp: Date.now() } }));
    } else if (e.key.includes('supervisor')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'supervisors', timestamp: Date.now() } }));
    } else if (e.key.includes('partner')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'partners', timestamp: Date.now() } }));
    } else if (e.key.includes('site') || e.key.includes('related')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'related_sites', timestamp: Date.now() } }));
    } else if (e.key.includes('user')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'users', timestamp: Date.now() } }));
    } else if (e.key.includes('video')) {
      window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: 'videos', timestamp: Date.now() } }));
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  // 5. Visibility / Window Focus handler (triggers instant check when user switches back)
  const handleVisibilityOrFocus = () => {
    if (document.visibilityState === 'visible' || document.hasFocus()) {
      checkServerVersion();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityOrFocus);
  window.addEventListener('focus', handleVisibilityOrFocus);
  window.addEventListener('online', handleVisibilityOrFocus);

  return () => {
    if (activeEventSource) {
      try { activeEventSource.close(); } catch {}
      activeEventSource = null;
    }
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pollTimer) clearInterval(pollTimer);
    window.removeEventListener('storage', handleStorageEvent);
    document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    window.removeEventListener('focus', handleVisibilityOrFocus);
    window.removeEventListener('online', handleVisibilityOrFocus);
    cleanupFirestoreListeners();
  };
}

export function useSync(collectionName: string | string[], onUpdate: () => void) {
  useEffect(() => {
    const handleUpdate = (e: any) => {
      const cols = Array.isArray(collectionName) ? collectionName : [collectionName];
      if (cols.includes(e.detail?.collection) || e.detail?.collection === 'all' || cols.includes('all')) {
        onUpdate();
      }
    };

    window.addEventListener('sync_update', handleUpdate);
    return () => window.removeEventListener('sync_update', handleUpdate);
  }, [collectionName, onUpdate]);
}
