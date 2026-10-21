import { useCallback, useEffect, useState } from 'react';

export function useFetch(fetcher, { initialData = null, enabled = true } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    if (!enabled) { setLoading(false); return undefined; }
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => { if (active) setData(result); })
      .catch((requestError) => { if (active) setError(requestError); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [enabled, fetcher, reloadKey]);

  return { data, setData, loading, error, reload };
}
