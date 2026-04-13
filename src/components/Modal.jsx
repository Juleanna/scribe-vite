import { useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

/**
 * Universal modal: confirm dialogs, alerts, toasts
 * variant: 'confirm' | 'success' | 'info'
 */
export default function Modal({ open, onClose, onConfirm, title, message, variant = 'confirm', confirmText, cancelText }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open && confirmRef.current) confirmRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const icons = {
    confirm: <AlertTriangle className="w-6 h-6 text-red-500" />,
    success: <CheckCircle className="w-6 h-6 text-green-500" />,
    info: <Info className="w-6 h-6 text-indigo-500" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900/50 max-w-sm w-full p-6 animate-modal-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            variant === 'confirm' ? 'bg-red-50 dark:bg-red-900/30' :
            variant === 'success' ? 'bg-green-50 dark:bg-green-900/30' :
            'bg-indigo-50 dark:bg-indigo-900/30'
          }`}>
            {icons[variant]}
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 text-center mb-2">{title}</h3>
        {message && <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">{message}</p>}

        {/* Actions */}
        <div className="flex gap-3">
          {variant === 'confirm' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {cancelText || 'Скасувати'}
              </button>
              <button
                ref={confirmRef}
                onClick={() => { onConfirm?.(); onClose(); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
              >
                {confirmText || 'Видалити'}
              </button>
            </>
          ) : (
            <button
              ref={confirmRef}
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
