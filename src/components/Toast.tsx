import { Info, AlertCircle, CheckCircle, X } from 'lucide-react';
import type { ToastMessage } from '../hooks/useToast';
import styles from './Toast.module.css';

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: number) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const IconComponent = {
    info: Info,
    error: AlertCircle,
    success: CheckCircle,
  }[toast.type];

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`} role="alert" aria-live="polite">
      <span className={`${styles.icon} ${styles[toast.type]}`}>
        <IconComponent size={14} />
      </span>
      <span className={styles.text}>{toast.text}</span>
      <button
        className={styles.closeButton}
        onClick={() => onRemove(toast.id)}
        aria-label="通知を閉じる"
      >
        <X size={12} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: number) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.container} aria-label="通知">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
