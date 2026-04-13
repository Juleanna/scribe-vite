import { Edit2, Save, MoveUp, MoveDown, Trash2, Sparkles, Brain } from 'lucide-react';
import { useI18n } from '../i18n';

export default function StepCard({ step, index, editingStep, setEditingStep, autoDescribe, useLocalRecognition, updateStep, regenerateDescription, moveStep, deleteStep, isLast }) {
  const { t } = useI18n();
  const isEditing = editingStep === step.id;
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
      <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
        <div className="flex items-center gap-3 md:block flex-shrink-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-base md:text-lg">
            {index + 1}
          </div>
          {/* Mobile action buttons inline with step number */}
          <div className="flex md:hidden gap-1 ml-auto">
            {editingStep !== step.id && (
              <button onClick={() => setEditingStep(step.id)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title={t('step.edit')}>
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => moveStep(step.id, 'up')} disabled={index === 0} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('step.moveUp')}>
              <MoveUp className="w-5 h-5" />
            </button>
            <button onClick={() => moveStep(step.id, 'down')} disabled={isLast} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('step.moveDown')}>
              <MoveDown className="w-5 h-5" />
            </button>
            <button onClick={() => deleteStep(step.id)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('step.delete')}>
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
                className="w-full text-lg md:text-xl font-semibold border-b-2 border-indigo-600 focus:outline-none pb-1"
                placeholder={t('step.titlePlaceholder')}
              />
              <textarea
                value={step.description}
                onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-indigo-600 focus:outline-none resize-none text-sm md:text-base"
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
                <h3 className="text-lg md:text-xl font-semibold text-gray-800">{step.title}</h3>
                {step.type === 'video' && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">{t('step.videoBadge')}</span>
                )}
                {step.isGenerating && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3 h-3" />
                    {t('autod.generating')}
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-2 text-sm md:text-base">{step.description}</p>
              {step.type === 'image' && autoDescribe && !step.isGenerating && (
                <button onClick={() => regenerateDescription(step.id)} className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-2 min-h-[44px]">
                  {useLocalRecognition ? <Brain className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  {t('autod.regenerate')}
                </button>
              )}
            </div>
          )}

          {step.type === 'image' ? (
            <img src={step.media} alt={step.title} className="w-full rounded-lg shadow-md mt-4" />
          ) : (
            <video src={step.media} controls className="w-full rounded-lg shadow-md mt-4" />
          )}
        </div>

        {/* Desktop action buttons */}
        <div className="hidden md:flex flex-col gap-2">
          {editingStep !== step.id && (
            <button onClick={() => setEditingStep(step.id)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title={t('step.edit')}>
              <Edit2 className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => moveStep(step.id, 'up')} disabled={index === 0} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('step.moveUp')}>
            <MoveUp className="w-5 h-5" />
          </button>
          <button onClick={() => moveStep(step.id, 'down')} disabled={isLast} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('step.moveDown')}>
            <MoveDown className="w-5 h-5" />
          </button>
          <button onClick={() => deleteStep(step.id)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('step.delete')}>
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
