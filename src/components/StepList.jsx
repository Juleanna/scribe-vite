import StepCard from './StepCard';
import { Camera } from 'lucide-react';
import { useI18n } from '../i18n';

export default function StepList({
  steps,
  editingStep,
  setEditingStep,
  autoDescribe,
  useLocalRecognition,
  updateStep,
  regenerateDescription,
  moveStep,
  deleteStep,
}) {
  const { t } = useI18n();

  if (steps.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-12 text-center">
        <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-600 mb-2">{t('empty.title')}</h2>
        <p className="text-gray-500 mb-4">{t('empty.subtitle')}</p>
        <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600">
          <li>{t('empty.list1')}</li>
          <li>{t('empty.list2')}</li>
          <li>{t('empty.list3')}</li>
          <li>{t('empty.list4')}</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <StepCard
          key={step.id}
          step={step}
          index={index}
          editingStep={editingStep}
          setEditingStep={setEditingStep}
          autoDescribe={autoDescribe}
          useLocalRecognition={useLocalRecognition}
          updateStep={updateStep}
          regenerateDescription={regenerateDescription}
          moveStep={(id, dir) => moveStep(id, dir, steps.length)}
          isLast={index === steps.length - 1}
          deleteStep={deleteStep}
        />)
      )}
    </div>
  );
}
