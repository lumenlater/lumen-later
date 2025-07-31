import { useState, useEffect } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

const toastState = {
  toasts: [] as Toast[],
  addToast: (toast: Omit<Toast, 'id'>) => {},
  removeToast: (id: string) => {},
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastState.addToast = (toast) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };

    toastState.removeToast = (id) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };
  }, []);

  const toast = (props: Omit<Toast, 'id'>) => {
    toastState.addToast(props);
  };

  return {
    toast,
    toasts,
  };
}