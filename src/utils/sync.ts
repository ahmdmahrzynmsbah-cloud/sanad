import { useEffect } from 'react';

export function initGlobalSync() {
  const eventSource = new EventSource('/api/sync');
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'update' && data.collection) {
        window.dispatchEvent(new CustomEvent('sync_update', { detail: { collection: data.collection } }));
      }
    } catch (e) {
      console.error('Failed to parse sync event', e);
    }
  };

  eventSource.onerror = (error) => {
    // EventSource will auto-reconnect on most errors
  };

  return () => eventSource.close();
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
