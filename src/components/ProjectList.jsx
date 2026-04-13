import { useEffect, useState } from 'react';
import { Plus, Trash2, Clock, Layers, LogOut, User } from 'lucide-react';
import { api } from '../api';
import { useI18n } from '../i18n';

export default function ProjectList({ onSelectProject, onNewProject, onOpenProfile, user, onLogout }) {
  const { t } = useI18n();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

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
    if (!confirm(t('projects.confirmDelete'))) return;
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('Failed to delete project:', e);
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-pulse text-indigo-600 text-lg">{t('projects.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xl">S</span>
            <h1 className="text-3xl font-bold text-gray-800">{t('projects.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleNew}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              {t('projects.new')}
            </button>

            {user && (
              <div className="flex items-center gap-2 ml-2 pl-3 border-l border-gray-300">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  title={t('profile.title')}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                      {(user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                </button>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title={t('header.logout')}
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
            <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('projects.empty')}</h2>
            <p className="text-gray-500 mb-6">{t('projects.emptyHint')}</p>
            <button
              onClick={handleNew}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {t('projects.createFirst')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="h-40 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Layers className="w-12 h-12 text-indigo-300" />
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {project.title}
                    </h3>
                    <button
                      onClick={(e) => handleDelete(e, project.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title={t('projects.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
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
    </div>
  );
}
