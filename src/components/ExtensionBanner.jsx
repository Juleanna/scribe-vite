import { X, Download, Chrome } from 'lucide-react';
import { useI18n } from '../i18n';

export default function ExtensionBanner({ onClose }) {
  const { t } = useI18n();

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6 flex items-start gap-4" role="alert">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
        <Download className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{t('ext.title')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t('ext.description')}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <Chrome className="w-4 h-4" />
            Chrome / Edge / Brave
          </a>
          <a
            href="https://addons.mozilla.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.95 16.15c-.56 1.37-1.57 2.5-2.85 3.25a8.07 8.07 0 01-4.1 1.1 8.07 8.07 0 01-4.1-1.1 8.08 8.08 0 01-2.85-3.25A8.1 8.1 0 013.5 12c0-1.5.4-2.9 1.1-4.1a8.07 8.07 0 012.85-3.25A8.07 8.07 0 0111.55 3.5c1.5 0 2.88.4 4.1 1.1a8.07 8.07 0 012.85 3.25c.7 1.2 1.1 2.6 1.1 4.1 0 1.5-.4 2.88-1.1 4.1z"/></svg>
            Firefox
          </a>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('ext.hint')}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
        aria-label={t('ext.close') || 'Close'}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
