import { useState, useEffect } from 'react';
import { api } from '../api';
import { useI18n } from '../i18n';

export default function SharedView({ token }) {
  const { t } = useI18n();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSharedProject(token)
      .then((data) => {
        if (data && data.title) {
          setProject(data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-pulse text-indigo-600 dark:text-indigo-400 text-lg">
          {t('projects.loading')}
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 text-center max-w-md mx-4">
          <div className="text-6xl mb-4">404</div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('shared.title')} not found</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
          >
            {t('shared.createOwn')}
          </a>
        </div>
      </div>
    );
  }

  const steps = project.steps || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-lg flex-shrink-0">
              S
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">
              {project.title}
            </h1>
          </div>
          <span className="text-sm text-gray-400 dark:text-gray-500 font-medium hidden sm:block">Scribe</span>
        </div>
      </header>

      {/* Steps */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {steps.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-16">
            {t('projects.empty')}
          </p>
        )}

        <div className="space-y-6 sm:space-y-8">
          {steps.map((step, index) => (
            <article
              key={step.id || index}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-md dark:shadow-gray-900/30 overflow-hidden transition-shadow hover:shadow-lg"
            >
              {/* Step media */}
              {step.media_url && step.media_type === 'image' && (
                <img
                  src={step.media_url}
                  alt={step.title || `${t('step.step')} ${index + 1}`}
                  className="w-full object-cover"
                  loading="lazy"
                />
              )}
              {step.media_url && step.media_type === 'video' && (
                <video
                  src={step.media_url}
                  controls
                  className="w-full"
                />
              )}

              {/* Step content */}
              <div className="p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-sm flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1.5">
                      {step.title || `${t('step.step')} ${index + 1}`}
                    </h2>
                    {step.description && (
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('shared.createdWith')} <span className="font-semibold text-indigo-600 dark:text-indigo-400">Scribe</span>
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            {t('shared.createOwn')}
          </a>
        </div>
      </footer>
    </div>
  );
}
