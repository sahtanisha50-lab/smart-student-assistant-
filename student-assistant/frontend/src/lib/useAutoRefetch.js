'use strict';

import { useEffect, useRef } from 'react';
import { eventBus } from './eventBus';
import { apiFetch } from './api';

// useAutoRefetch(eventNames, path, setData, options?)
// - eventNames: string or array of strings to listen for (e.g. 'client:updated')
// - path: API path to fetch (e.g. '/clients/123')
// - setData: state setter to update with fetched data
// - options: { method, body, autoFetchOnMount = true, setError }
export default function useAutoRefetch(eventNames, path, setData, options = {}) {
  const { method = 'GET', body = null, autoFetchOnMount = true, setError } = options;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function fetchAndSet() {
    try {
      if (setError) setError('');
      const res = await apiFetch(path, { method, body });
      if (!mounted.current) return;
      // if response shape is { data } or { <entity> } we simply pass the whole payload
      setData(res);
    } catch (err) {
      if (!mounted.current) return;
      if (setError) setError(err.message || 'Failed to load data');
      // swallow; component may show its own error
      // eslint-disable-next-line no-console
      console.error('useAutoRefetch error', err.message || err);
    }
  }

  useEffect(() => {
    const names = Array.isArray(eventNames) ? eventNames : [eventNames];
    const offs = names.map(n => eventBus.on(n, fetchAndSet));
    if (autoFetchOnMount) fetchAndSet();
    return () => offs.forEach(off => off());
    // caller may pass deps via path or setData references
  }, [eventNames, path, method]);
}
