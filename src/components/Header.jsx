import { useState } from 'react';
import { Download, FileDown, FileText } from 'lucide-react';
import { useI18n } from '../i18n';

export default function Header({
  projectTitle,
  setProjectTitle,
  steps,
  exportToHTML,
  exportToPDF,
  exportToMarkdown,
  extCaptureEnabled,
  onToggleExtensionCapture,
}) {
  const { t, locale, setLocale } = useI18n();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold">S</span>
          {isEditing ? (
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              className="text-3xl font-bold border-b-2 border-indigo-600 focus:outline-none"
              autoFocus
              placeholder={t('header.titlePlaceholder')}
            />
          ) : (
            <h1
              className="text-3xl font-bold text-gray-800 cursor-pointer hover:text-indigo-600"
              title={t('header.clickToEdit')}
              onClick={() => setIsEditing(true)}
            >
              {projectTitle}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Language segmented control */}
          <div className="inline-flex items-center rounded-full bg-gray-100 p-1 border border-gray-200" role="group" aria-label={t('app.language')}>
            <button
              type="button"
              onClick={() => setLocale('ru')}
              aria-pressed={locale === 'ru'}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${locale === 'ru' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:text-gray-900'}`}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => setLocale('en')}
              aria-pressed={locale === 'en'}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${locale === 'en' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:text-gray-900'}`}
            >
              EN
            </button>
          </div>

          <button
            onClick={onToggleExtensionCapture}
            title={`${t('headerExt.toggle')} (Alt+C)`}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${extCaptureEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-gray-50 text-gray-700 border-gray-300'}`}
          >
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${extCaptureEnabled ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
            <span className="text-sm font-medium">{t('headerExt.toggle')} · {extCaptureEnabled ? t('headerExt.on') : t('headerExt.off')}</span>
          </button>

          {steps.length > 0 && (
            <div className="flex gap-3">
              <button onClick={exportToHTML} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium">
                <Download className="w-5 h-5" />
                {t('export.html')}
              </button>
              <button onClick={exportToMarkdown} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                <FileText className="w-5 h-5" />
                {t('export.md')}
              </button>
              <button onClick={exportToPDF} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                <FileDown className="w-5 h-5" />
                {t('export.pdf')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
