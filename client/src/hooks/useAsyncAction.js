/**
 * useAsyncAction - wraps an async call with loading + error state.
 *
 * Keeps the many "click -> await -> toast" handlers in the pages short and
 * consistent:
 *
 *   const { run, loading } = useAsyncAction(async () => { ... });
 *   <button onClick={run} disabled={loading}>Save</button>
 */
import { useCallback, useState } from 'react';

export function useAsyncAction(action) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      return await action(...args);
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [action]);

  return { run, loading, error, setError };
}

export default useAsyncAction;
