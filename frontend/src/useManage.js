import { useCallback, useEffect, useState } from 'react';

// Shared logic for the management pages: load data, run an action, show a message.
export function useManage(loadFn) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState(null);

  const reload = useCallback(async () => {
    try { setData(await loadFn()); setLoadError(null); } catch (e) { setLoadError(e.message); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { reload(); }, [reload]);

  // Runs `fn`, shows a success/error message, reloads the data. Returns true on success.
  const run = async (fn, successText, setErrors) => {
    setNotice(null);
    try {
      await fn();
      setErrors?.({});
      setNotice({ type: 'success', text: successText });
      await reload();
      return true;
    } catch (e) {
      setErrors?.(e.fields || {});
      setNotice({ type: 'error', text: e.message });
      return false;
    }
  };
  return { data, loadError, notice, setNotice, reload, run };
}
