import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

/**
 * Loads data with loading/error state. `fn` returns the API promise;
 * reload() refetches. Stale responses (after deps change) are ignored.
 */
export function useData(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, meta: null, loading: enabled, error: null });
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await fn();
      if (id === seq.current) setState({ data: res.data, meta: res.meta || null, loading: false, error: null });
    } catch (err) {
      if (id === seq.current) setState(s => ({ ...s, loading: false, error: err }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { if (enabled) load(); }, [load, enabled]);

  return { ...state, reload: load, setData: (data) => setState(s => ({ ...s, data })) };
}

// Small session cache for reference data used across pages (locations, public settings)
const cache = new Map();
export function useCached(key, url, ttlMs = 5 * 60 * 1000) {
  const hit = cache.get(key);
  const fresh = hit && Date.now() - hit.at < ttlMs;
  const [data, setData] = useState(fresh ? hit.data : null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (fresh) return;
    let alive = true;
    const pending = hit?.promise || api.get(url).then(r => r.data);
    cache.set(key, { ...hit, promise: pending });
    pending
      .then(d => { cache.set(key, { data: d, at: Date.now() }); if (alive) setData(d); })
      .catch(e => { cache.delete(key); if (alive) setError(e); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, error, loading: !data && !error };
}

export const useLocations = () => useCached('locations', '/locations');
export const usePublicSettings = () => useCached('settings', '/settings/public');
