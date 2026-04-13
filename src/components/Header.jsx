import { useState } from 'react';
import { Download, FileDown, FileText, ArrowLeft, LogOut, ChevronDown } from 'lucide-react';
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
}) {
  const { t, locale, setLocale } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-4 md:mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {onBackToProjects && (
            <button
              onClick={onBackToProjects}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title={t('header.back')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex-shrink-0">S</span>
          {isEditing ? (
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              className="text-xl md:text-3xl font-bold border-b-2 border-indigo-600 focus:outline-none min-w-0"
              autoFocus
              placeholder={t('header.titlePlaceholder')}
            />
          ) : (
            <h1
              className="text-xl md:text-3xl font-bold text-gray-800 cursor-pointer hover:text-indigo-600 truncate"
              title={t('header.clickToEdit')}
              onClick={() => setIsEditing(true)}
            >
              {projectTitle}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          {/* Language segmented control */}
          <div className="inline-flex items-center rounded-full bg-gray-100 p-1 border border-gray-200" role="group" aria-label={t('app.language')}>
            <button
              type="button"
              onClick={() => setLocale('uk')}
              aria-pressed={locale === 'uk'}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors min-h-[44px] ${locale === 'uk' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:text-gray-900'}`}
            >
              UK
            </button>
            <button
              type="button"
              onClick={() => setLocale('en')}
              aria-pressed={locale === 'en'}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors min-h-[44px] ${locale === 'en' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:text-gray-900'}`}
            >
              EN
            </button>
          </div>

          <button
            onClick={onToggleExtensionCapture}
            title={`${t('headerExt.toggle')} (Alt+C)`}
            className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-md border transition-colors ${extCaptureEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-gray-50 text-gray-700 border-gray-300'}`}
          >
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${extCaptureEnabled ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
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
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[180px]">
                    <button
                      onClick={() => { exportToHTML(); setExportOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 text-sm font-medium text-gray-700 min-h-[44px]"
                    >
                      <Download className="w-4 h-4 text-green-600" />
                      {t('export.html')}
                    </button>
                    <button
                      onClick={() => { exportToMarkdown(); setExportOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 text-sm font-medium text-gray-700 border-t border-gray-100 min-h-[44px]"
                    >
                      <FileText className="w-4 h-4 text-emerald-600" />
                      {t('export.md')}
                    </button>
                    <button
                      onClick={() => { exportToPDF(); setExportOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 text-sm font-medium text-gray-700 border-t border-gray-100 min-h-[44px]"
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
            <div className="flex items-center gap-2 ml-1 md:ml-2 pl-2 border-l border-gray-200">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-[44px] min-h-[44px] justify-center"
                title={t('profile.title')}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                    {(user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-gray-600 hidden md:inline">{user.email}</span>
              </button>
              <button
                onClick={onLogout}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title={t('header.logout')}
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
