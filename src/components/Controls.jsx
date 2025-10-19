import { useRef } from 'react';
import { Camera, Upload, Video, Square, Sparkles, Brain, ArrowUpRight, BoxSelect, Layers } from 'lucide-react';
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
  const inputRef = fileInputRef || useRef(null);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer mb-2">
          <input type="checkbox" checked={autoDescribe} onChange={(e) => setAutoDescribe(e.target.checked)} className="w-5 h-5 text-purple-600" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-purple-900 font-medium">{t('autod.label')}</span>
          </div>
        </label>

        {autoDescribe && (
          <label className="flex items-center gap-3 cursor-pointer ml-8">
            <input type="checkbox" checked={useLocalRecognition} onChange={(e) => setUseLocalRecognition(e.target.checked)} className="w-5 h-5 text-indigo-600" />
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              <span className="text-indigo-900 font-medium">{t('autod.local')}</span>
            </div>
          </label>
        )}
      </div>

      {/* Annotation style as segmented buttons */}
      <div className="ml-8 mt-2 mb-4 flex items-center gap-3">
        <span className="text-sm text-gray-700">{t('controls.annotStyle')}</span>
        <div className="inline-flex items-center rounded-full bg-gray-100 p-1 border border-gray-200 shadow-sm" role="group" aria-label={t('controls.annotStyle')}>
          <button
            type="button"
            onClick={() => setAnnotationStyle('arrow')}
            aria-pressed={annotationStyle === 'arrow'}
            className={`px-3 py-1.5 text-sm font-medium rounded-full flex items-center gap-1 transition-colors ${annotationStyle === 'arrow' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:text-gray-900'}`}
          >
            <ArrowUpRight className="w-4 h-4" /> {t('controls.arrow')}
          </button>
          <button
            type="button"
            onClick={() => setAnnotationStyle('box')}
            aria-pressed={annotationStyle === 'box'}
            className={`px-3 py-1.5 text-sm font-medium rounded-full flex items-center gap-1 transition-colors ${annotationStyle === 'box' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:text-gray-900'}`}
          >
            <BoxSelect className="w-4 h-4" /> {t('controls.box')}
          </button>
          <button
            type="button"
            onClick={() => setAnnotationStyle('both')}
            aria-pressed={annotationStyle === 'both'}
            className={`px-3 py-1.5 text-sm font-medium rounded-full flex items-center gap-1 transition-colors ${annotationStyle === 'both' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:text-gray-900'}`}
          >
            <Layers className="w-4 h-4" /> {t('controls.both')}
          </button>
        </div>
      </div>

      {/* Record during click-mode */}
      <div className="ml-8 -mt-2 mb-4 flex items-start gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={recordOnClickMode}
            onChange={(e) => setRecordOnClickMode(e.target.checked)}
            className="w-5 h-5 text-indigo-600"
          />
          <div>
            <div className="text-sm text-gray-800 font-medium">{t('clickrec.label')}</div>
            <div className="text-xs text-gray-500">{t('clickrec.hint')}</div>
          </div>
        </label>
      </div>

      <div className="flex flex-wrap gap-3 mt-1">
        {!isRecording ? (
          <>
            <button onClick={onCaptureScreen} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              <Camera className="w-5 h-5" />
              {t('controls.screenshot')}
            </button>
            <button onClick={onStartAutoCapture} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium">
              <Camera className="w-5 h-5" />
              {t('controls.autocapture')}
            </button>
            <button onClick={onStartRecording} className="flex items-center gap-2 bg-rose-600 text-white px-6 py-3 rounded-lg hover:bg-rose-700 transition-colors font-medium">
              <Video className="w-5 h-5" />
              {t('controls.record')}
            </button>
          </>
        ) : (
          <button onClick={recordingMode === 'auto' ? onStopAutoCapture : onStopRecording} className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium animate-pulse">
            <Square className="w-5 h-5" />
            {t('controls.stop')}
          </button>
        )}

        <button onClick={() => inputRef.current?.click()} disabled={isRecording} className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
          <Upload className="w-5 h-5" />
          {t('controls.upload')}
        </button>
        <input ref={inputRef} type="file" accept="image/*,video/*" onChange={onFileUpload} className="hidden" />
      </div>

      {isRecording && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">
            {recordingMode === 'auto' ? t('controls.recordingAuto') : t('controls.recordingManual')}
          </p>
        </div>
      )}
    </div>
  );
}
