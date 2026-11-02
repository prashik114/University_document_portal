import { useState, useCallback } from 'react';

/**
 * Provides a simple toast notification system.
 * Returns { toast, showToast } where toast is null when hidden.
 */
export function useToast(durationMs = 3500) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), durationMs);
  }, [durationMs]);

  return { toast, showToast };
}
