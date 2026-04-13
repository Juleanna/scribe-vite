import { useState } from 'react';
import { Edit2, Save, MoveUp, MoveDown, Trash2, Sparkles, Brain, Pencil } from 'lucide-react';
import { useI18n } from '../i18n';
import ImageEditor from './ImageEditor';

export default function StepCard({ step, index, editingStep, setEditingStep, autoDescribe, useLocalRecognition, updateStep, regenerateDescription, moveStep, deleteStep, isLast, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragOver }) {
  const { t } = useI18n();
  const isEditing = editingStep === step.id;
  const [showImageEditor, setShowImageEditor] = useState(false);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-4 md:p-6 transition-all cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50 border-2 border-dashed border-indigo-400' : ''} ${isDragOver ? 'border-2 border-dashed border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
    >
      <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
        <div className="flex items-center gap-3 md:block flex-shrink-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-base md:text-lg">
            {index + 1}
          </div>
          {/* Mobile action buttons inline with step number */}
          <div className="flex md:hidden gap-1 ml-auto">
            {editingStep !== step.id && (
              <button onClick={() => setEditingStep(step.id)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title={t('step.edit')} aria-label={t('step.edit')}>
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            {step.type === 'image' && (
              <button onClick={() => setShowImageEditor(true)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title={t('editor.editImage')} aria-label={t('editor.editImage')}>
                <Pencil className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => moveStep(step.id, 'up')} disabled={index === 0} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('step.moveUp')} aria-label={t('step.moveUp')}>
              <MoveUp className="w-5 h-5" />
            </button>
            <button onClick={() => moveStep(step.id, 'down')} disabled={isLast} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('step.moveDown')} aria-label={t('step.moveDown')}>
              <MoveDown className="w-5 h-5" />
            </button>
            <button onClick={() => deleteStep(step.id)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title={t('step.delete')} aria-label={t('step.delete')}>
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 w-full">
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={step.title}
                onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                className="w-full text-lg md:text-xl font-semibold border-b-2 border-indigo-600 focus:outline-none pb-1 dark:bg-gray-800 dark:text-gray-100"
                placeholder={t('step.titlePlaceholder')}
              />
              <textarea
                value={step.description}
                onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg p-3 focus:border-indigo-600 focus:outline-none resize-none text-sm md:text-base"
                rows="3"
                placeholder={t('step.descPlaceholder')}
              />
              <button onClick={() => setEditingStep(null)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors min-h-[44px]">
                <Save className="w-4 h-4" />
                {t('step.save')}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100">{step.title}</h3>
                {step.type === 'video' && (
                  <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded">{t('step.videoBadge')}</span>
                )}
                {step.isGenerating && (
                  <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-1 rounded flex items-center gap-1 animate-pulse" aria-live="polite">
                    <Sparkles className="w-3 h-3" />
                    {t('autod.generating')}
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm md:text-base">{step.description}</p>
              {step.type === 'image' && autoDescribe && !step.isGenerating && (
                <button onClick={() => regenerateDescription(step.id)} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 mb-2 min-h-[44px]">
                  {useLocalRecognition ? <Brain className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  {t('autod.regenerate')}
                </button>
              )}
            </div>
          )}

          {step.type === 'image' ? (
            <div className="relative mt-4 group">
              <img src={step.media} alt={step.title} className="w-full rounded-lg shadow-md dark:shadow-gray-900/20" />
              <button
                onClick={() => setShowImageEditor(true)}
                className="absolute top-2 right-2 p-2 min-w-[44px] min-h-[44px] flex items-center gap-1.5 bg-white/90 dark:bg-gray-800/90 text-indigo-600 dark:text-indigo-400 rounded-lg shadow hover:bg-white dark:hover:bg-gray-800 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 text-sm font-medium"
                title={t('editor.editImage')}
                aria-label={t('editor.editImage')}
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">{t('editor.editImage')}</span>
              </button>
            </div>
          ) : (
            <video src={step.media} controls className="w-full rounded-lg shadow-md dark:shadow-gray-900/20 mt-4" />
          )}
        </div>

        {/* Desktop action buttons */}
        <div className="hidden md:flex flex-col gap-2">
          {editingStep !== step.id && (
            <button onClick={() => setEditingStep(step.id)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title={t('step.edit')} aria-label={t('step.edit')}>
              <Edit2 className="w-5 h-5" />
            </button>
          )}
          {step.type === 'image' && (
            <button onClick={() => setShowImageEditor(true)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title={t('editor.editImage')} aria-label={t('editor.editImage')}>
              <Pencil className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => moveStep(step.id, 'up')} disabled={index === 0} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('step.moveUp')} aria-label={t('step.moveUp')}>
            <MoveUp className="w-5 h-5" />
          </button>
          <button onClick={() => moveStep(step.id, 'down')} disabled={isLast} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('step.moveDown')} aria-label={t('step.moveDown')}>
            <MoveDown className="w-5 h-5" />
          </button>
          <button onClick={() => deleteStep(step.id)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title={t('step.delete')} aria-label={t('step.delete')}>
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showImageEditor && step.type === 'image' && (
        <ImageEditor
          imageUrl={step.media}
          onSave={(newDataUrl) => {
            updateStep(step.id, 'media', newDataUrl);
            setShowImageEditor(false);
          }}
          onClose={() => setShowImageEditor(false)}
        />
      )}
    </div>
  );
}
