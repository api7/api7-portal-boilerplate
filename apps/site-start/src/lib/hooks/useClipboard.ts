import copy from 'copy-to-clipboard';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useClipboard(text?: string, timeout = 1500) {
  const [hasCopied, setHasCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const onCopy = useCallback(
    async (overrideText?: string) => {
      const value = overrideText ?? text;
      if (value === undefined) return;
      if (!(await copy(value))) return;
      setHasCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setHasCopied(false), timeout);
    },
    [text, timeout],
  );

  return { hasCopied, onCopy };
}
