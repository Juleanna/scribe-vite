import { useRef, useState } from 'react';
import { Camera, Upload, Video, Square, Sparkles, Brain, ArrowUpRight, BoxSelect, Layers, Mic, MicOff, Settings } from 'lucide-react';
import { useI18n } from '../i18n';

export default function Controls({
  autoDescribe,
  setAutoDescribe,
  useLocalRecognition,
  setUseLocalRecognition,
  annotationStyle,
  setAnnotationStyle,
  recordOnClickMode,
  setRecordOnClickMode,
  isDictating,
  dictationSupported,
  onToggleDictation,
  isRecording,
  recordingMode,
  onCaptureScreen,
  onStartAutoCapture,
  onStartRecording,
  onStopAutoCapture,
  onStopRecording,
  onFileUpload,
  fileInputRef,
}) {
  const { t } = useI18n();
  const localRef = useRef(null);
  const inputRef = fileInputRef || localRef;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-4 md:p-6 mb-4 md:mb-6">
      {/* Mobile settings toggle */}
      <button
        type="button"
        onClick={() => setSettingsOpen(!settingsOpen)}
        className="flex md:hidden items-center gap-2 w-full mb-3 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 min-h-[44px]"
      >
        <Settings className="w-4 h-4" />
        <span>{t('controls.settings') || 'Налаштування'}</span>
        <span className={`ml-auto transition-transform ${settingsOpen ? 'rotate-180' : ''}`}>&#9662;</span>
      </button>

      {/* Settings section: always visible on md+, collapsible on mobile */}
      <div className={`${settingsOpen ? 'block' : 'hidden'} md:block`}>
        <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer mb-2">
            <input type="checkbox" checked={autoDescribe} onChange={(e) => setAutoDescribe(e.target.checked)} className="w-5 h-5 text-purple-600" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-900 dark:text-purple-200 font-medium text-sm md:text-base">{t('autod.label')}</span>
            </div>
          </label>

          {autoDescribe && (
            <label className="flex items-center gap-3 cursor-pointer ml-4 md:ml-8">
              <input type="checkbox" checked={useLocalRecognition} onChange={(e) => setUseLocalRecognition(e.target.checked)} className="w-5 h-5 text-indigo-600" />
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-indigo-900 dark:text-indigo-200 font-medium text-sm md:text-base">{t('autod.local')}</span>
              </div>
            </label>
          )}
        </div>

        {/* Annotation style as segmented buttons */}
        <div className="ml-0 md:ml-8 mt-2 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('controls.annotStyle')}</span>
          <div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 p-1 border border-gray-200 dark:border-gray-600 shadow-sm dark:shadow-gray-900/20" role="group" aria-label={t('controls.annotStyle')}>
            <button
              type="button"
              onClick={() => setAnnotationStyle('arrow')}
              aria-pressed={annotationStyle === 'arrow'}
              className={`px-3 py-1.5 text-sm font-medium rounded-full flex items-center gap-1 transition-colors min-h-[44px] ${annotationStyle === 'arrow' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <ArrowUpRight className="w-4 h-4" /> {t('controls.arrow')}
            </button>
            <button
              type="button"
              onClick={() => setAnnotationStyle('box')}
              aria-pressed={annotationStyle === 'box'}
              className={`px-3 py-1.5 text-sm font-medium rounded-full flex items-center gap-1 transition-colors min-h-[44px] ${annotationStyle === 'box' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <BoxSelect className="w-4 h-4" /> {t('controls.box')}
            </button>
            <button
              type="button"
              onClick={() => setAnnotationStyle('both')}
              aria-pressed={annotationStyle === 'both'}
              className={`px-3 py-1.5 text-sm font-medium rounded-full flex items-center gap-1 transition-colors min-h-[44px] ${annotationStyle === 'both' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <Layers className="w-4 h-4" /> {t('controls.both')}
            </button>
          </div>
        </div>

        {/* Record during click-mode */}
        <div className="ml-0 md:ml-8 -mt-2 mb-4 flex flex-col sm:flex-row items-start gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recordOnClickMode}
              onChange={(e) => setRecordOnClickMode(e.target.checked)}
              className="w-5 h-5 text-indigo-600"
            />
            <div>
              <div className="text-sm text-gray-800 dark:text-gray-100 font-medium">{t('clickrec.label')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('clickrec.hint')}</div>
            </div>
          </label>
          {dictationSupported && (
            <button
              type="button"
              onClick={onToggleDictation}
              title={t('dictation.hint')}
              className={`sm:ml-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-sm font-medium min-h-[44px] ${
                isDictating ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700' : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
              }`}
            >
              {isDictating ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span>{t('dictation.label')} · {isDictating ? t('dictation.on') : t('dictation.off')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3 mt-1">
        {!isRecording ? (
          <>
            <button onClick={onCaptureScreen} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium min-h-[44px] text-sm md:text-base">
              <Camera className="w-5 h-5" />
              <span className="truncate">{t('controls.screenshot')}</span>
            </button>
            <button onClick={onStartAutoCapture} className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium min-h-[44px] text-sm md:text-base">
              <Camera className="w-5 h-5" />
              <span className="truncate">{t('controls.autocapture')}</span>
            </button>
            <button onClick={onStartRecording} className="flex items-center justify-center gap-2 bg-rose-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-rose-700 transition-colors font-medium min-h-[44px] text-sm md:text-base">
              <Video className="w-5 h-5" />
              <span className="truncate">{t('controls.record')}</span>
            </button>
          </>
        ) : (
          <button onClick={recordingMode === 'auto' ? onStopAutoCapture : onStopRecording} className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium animate-pulse min-h-[44px] col-span-2 text-sm md:text-base">
            <Square className="w-5 h-5" />
            {t('controls.stop')}
          </button>
        )}

        <button onClick={() => inputRef.current?.click()} disabled={isRecording} className="flex items-center justify-center gap-2 bg-gray-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-sm md:text-base">
          <Upload className="w-5 h-5" />
          <span className="truncate">{t('controls.upload')}</span>
        </button>
        <input ref={inputRef} type="file" accept="image/*,video/*" onChange={onFileUpload} className="hidden" aria-hidden="true" />
      </div>

      {isRecording && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg" role="alert">
          <p className="text-red-700 dark:text-red-400 font-medium text-sm md:text-base" aria-live="polite">
            {recordingMode === 'auto' ? t('controls.recordingAuto') : t('controls.recordingManual')}
          </p>
        </div>
      )}
    </div>
  );
}
