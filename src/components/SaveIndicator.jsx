import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n';

export default function SaveIndicator({ status }) {
  const { t } = useI18n();

  if (!status) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {status === 'saved' && (
        <>
          <Cloud className="w-3.5 h-3.5 text-green-500" />
          <span className="text-green-600 dark:text-green-400">{t('save.saved')}</span>
        </>
      )}
      {status === 'saving' && (
        <>
          <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
          <span className="text-gray-500">{t('save.saving')}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <CloudOff className="w-3.5 h-3.5 text-red-500" />
          <span className="text-red-500">{t('save.error')}</span>
        </>
      )}
    </div>
  );
}
