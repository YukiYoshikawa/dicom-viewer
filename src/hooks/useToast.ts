import { useState, useCallback } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'info' | 'error' | 'success';
}

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return { toasts, addToast, removeToast };
}
