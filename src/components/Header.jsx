import { useState } from 'react';
import { Download, FileDown, FileText, ArrowLeft, LogOut, ChevronDown, Moon, Sun } from 'lucide-react';
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
  onBackToProjects,
  user,
  onLogout,
  onOpenProfile,
  dark,
  setDark,
}) {
  const { t, locale, setLocale } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-4 md:p-6 mb-4 md:mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {onBackToProjects && (
            <button
              onClick={onBackToProjects}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              title={t('header.back')}
              aria-label={t('header.back')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold flex-shrink-0">S</span>
          {isEditing ? (
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              className="text-xl md:text-3xl font-bold border-b-2 border-indigo-600 focus:outline-none min-w-0 dark:bg-gray-800 dark:text-gray-100"
              autoFocus
              placeholder={t('header.titlePlaceholder')}
            />
          ) : (
            <h1
              className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
              title={t('header.clickToEdit')}
              onClick={() => setIsEditing(true)}
            >
              {projectTitle}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={() => setDark(!dark)}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={dark ? t('theme.light') : t('theme.dark')}
            title={dark ? t('theme.light') : t('theme.dark')}
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Language segmented control */}
          <div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 p-1 border border-gray-200 dark:border-gray-600" role="group" aria-label={t('app.language')}>
            <button
              type="button"
              onClick={() => setLocale('uk')}
              aria-pressed={locale === 'uk'}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors min-h-[44px] ${locale === 'uk' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              UK
            </button>
            <button
              type="button"
              onClick={() => setLocale('en')}
              aria-pressed={locale === 'en'}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors min-h-[44px] ${locale === 'en' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              EN
            </button>
          </div>

          <button
            onClick={onToggleExtensionCapture}
            title={`${t('headerExt.toggle')} (Alt+C)`}
            className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-md border transition-colors ${extCaptureEnabled ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}
          >
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${extCaptureEnabled ? 'bg-emerald-500' : 'bg-gray-400'}`} aria-hidden="true"></span>
            <span className="text-sm font-medium hidden sm:inline">{t('headerExt.toggle')} ·</span>
            <span className="text-sm font-medium">{extCaptureEnabled ? t('headerExt.on') : t('headerExt.off')}</span>
          </button>

          {steps.length > 0 && (
            <>
              {/* Desktop export buttons */}
              <div className="hidden md:flex gap-3">
                <button onClick={exportToHTML} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-green-700 transition-colors font-medium">
                  <Download className="w-5 h-5" />
                  {t('export.html')}
                </button>
                <button onClick={exportToMarkdown} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                  <FileText className="w-5 h-5" />
                  {t('export.md')}
                </button>
                <button onClick={exportToPDF} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  <FileDown className="w-5 h-5" />
                  {t('export.pdf')}
                </button>
              </div>

              {/* Mobile export dropdown */}
              <div className="relative md:hidden">
                <button
                  onClick={() => setExportOpen(!exportOpen)}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Download className="w-5 h-5" />
                  {t('export.html')}
                  <ChevronDown className={`w-4 h-4 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-700 z-50 min-w-[180px]">
                    <button
                      onClick={() => { exportToHTML(); setExportOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 min-h-[44px]"
                    >
                      <Download className="w-4 h-4 text-green-600" />
                      {t('export.html')}
                    </button>
                    <button
                      onClick={() => { exportToMarkdown(); setExportOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 min-h-[44px]"
                    >
                      <FileText className="w-4 h-4 text-emerald-600" />
                      {t('export.md')}
                    </button>
                    <button
                      onClick={() => { exportToPDF(); setExportOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 min-h-[44px]"
                    >
                      <FileDown className="w-4 h-4 text-blue-600" />
                      {t('export.pdf')}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* User menu */}
          {user && (
            <div className="flex items-center gap-2 ml-1 md:ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-[44px] min-h-[44px] justify-center"
                title={t('profile.title')}
                aria-label={t('profile.title')}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-sm font-bold">
                    {(user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden md:inline">{user.email}</span>
              </button>
              <button
                onClick={onLogout}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                title={t('header.logout')}
                aria-label={t('header.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
