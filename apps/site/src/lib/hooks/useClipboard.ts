import { useCallback, useState } from 'react';

export function useClipboard(text: string, timeout = 1500) {
  const [hasCopied, setHasCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), timeout);
    } catch {
      // ignore permission denied / insecure context errors
    }
  }, [text, timeout]);

  return { hasCopied, onCopy };
}
