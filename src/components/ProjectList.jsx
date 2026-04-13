import { useEffect, useState } from 'react';
import { Plus, Trash2, Clock, Layers, LogOut, User, Copy, Share2 } from 'lucide-react';
import { api } from '../api';
import { useI18n } from '../i18n';
import Modal from './Modal';
import Toast from './Toast';

export default function ProjectList({ onSelectProject, onNewProject, onOpenProfile, user, onLogout }) {
  const { t } = useI18n();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.listProjects();
      if (res.ok) {
        const data = await res.json();
        setProjects(data.results || data);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteProject(deleteTarget);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget));
    } catch (e) {
      console.error('Failed to delete project:', e);
    }
    setDeleteTarget(null);
  };

  const handleDuplicate = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await api.duplicateProject(id);
      if (res.ok) {
        await fetchProjects();
      }
    } catch (e) {
      console.error('Failed to duplicate project:', e);
    }
  };

  const handleShare = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await api.shareProject(id);
      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(data.share_url);
        setToast(t('share.copied'));
      }
    } catch (e) {
      console.error('Failed to share project:', e);
    }
  };

  const handleNew = async () => {
    try {
      const res = await api.createProject({ title: t('app.defaultTitle') });
      if (res.ok) {
        const project = await res.json();
        onNewProject(project);
      }
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-indigo-600 dark:text-indigo-400 text-lg" aria-live="polite">{t('projects.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xl">S</span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{t('projects.title')}</h1>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleNew}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium min-h-[44px] w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              {t('projects.new')}
            </button>

            {user && (
              <div className="flex items-center gap-2 ml-2 pl-3 border-l border-gray-300 dark:border-gray-600">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
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
                </button>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                  title={t('header.logout')}
                  aria-label={t('header.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('projects.empty')}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{t('projects.emptyHint')}</p>
            <button
              onClick={handleNew}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {t('projects.createFirst')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/20 hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all cursor-pointer group overflow-hidden"
                tabIndex={0}
                role="button"
                aria-label={project.title}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectProject(project); } }}
              >
                {/* Thumbnail */}
                <div className="h-40 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Layers className="w-12 h-12 text-indigo-300 dark:text-indigo-600" />
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDuplicate(e, project.id)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                        title={t('templates.duplicate')}
                        aria-label={t('templates.duplicate')}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleShare(e, project.id)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors"
                        title={t('share.share')}
                        aria-label={t('share.share')}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        title={t('projects.delete')}
                        aria-label={t('projects.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {project.step_count ?? 0} {t('projects.steps')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(project.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        variant="confirm"
        title={t('projects.delete')}
        message={t('projects.confirmDelete')}
        confirmText={t('projects.delete')}
      />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
