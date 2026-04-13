import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Clock, Layers, LogOut, User, Copy, Share2, Search, X, CheckSquare, Square, Tag } from 'lucide-react';
import { api } from '../api';
import { useI18n } from '../i18n';
import Modal from './Modal';
import Toast from './Toast';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function ProjectList({ onSelectProject, onNewProject, onOpenProfile, user, onLogout }) {
  const { t } = useI18n();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  // Search, tags, bulk selection
  const [searchQuery, setSearchQuery] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchTags = async () => {
    try {
      const res = await api.listTags();
      if (res.ok) {
        const data = await res.json();
        setTags(data.results || data);
      }
    } catch (e) {
      console.error('Failed to load tags:', e);
    }
  };

  const fetchProjects = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.listProjects(params);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.results || data);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTags(); }, []);

  useEffect(() => {
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (selectedTag) params.tag = selectedTag;
    fetchProjects(params);
  }, [debouncedSearch, selectedTag, fetchProjects]);

  // Clear selection when filters change
  useEffect(() => { setSelectedIds([]); }, [debouncedSearch, selectedTag]);

  const toggleSelect = (e, id) => {
    e.stopPropagation();
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const selectAll = () => setSelectedIds(projects.map((p) => p.id));
  const deselectAll = () => setSelectedIds([]);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.bulkDeleteProjects(selectedIds);
      setProjects((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
      setSelectedIds([]);
    } catch (e) {
      console.error('Failed to bulk delete:', e);
    }
    setShowBulkConfirm(false);
  };

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
        const params = {};
        if (debouncedSearch) params.search = debouncedSearch;
        if (selectedTag) params.tag = selectedTag;
        await fetchProjects(params);
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

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-indigo-600 dark:text-indigo-400 text-lg" aria-live="polite">{t('projects.loading')}</div>
      </div>
    );
  }

  const showBulkActions = selectedIds.length > 0;

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

        {/* Search bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tag filter chips */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                !selectedTag
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('bulk.deselectAll').split(' ')[0] || 'All'}
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  selectedTag === tag.id
                    ? 'ring-2 ring-offset-1 ring-indigo-500'
                    : ''
                }`}
                style={{
                  backgroundColor: selectedTag === tag.id ? tag.color : tag.color + '20',
                  color: selectedTag === tag.id ? '#fff' : tag.color,
                }}
              >
                <Tag className="w-3 h-3" />
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {/* Bulk actions bar */}
        {showBulkActions && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              {t('bulk.selected')}: {selectedIds.length}
            </span>
            <button
              onClick={selectAll}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {t('bulk.selectAll')}
            </button>
            <button
              onClick={deselectAll}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {t('bulk.deselectAll')}
            </button>
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('bulk.deleteSelected')}
            </button>
          </div>
        )}

        {projects.length === 0 && !loading ? (
          <div className="text-center py-20">
            {debouncedSearch || selectedTag ? (
              <>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('search.noResults')}</h2>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">📝</div>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('projects.empty')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{t('projects.emptyHint')}</p>
                <button
                  onClick={handleNew}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  {t('projects.createFirst')}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/20 hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all cursor-pointer group overflow-hidden ${
                  selectedIds.includes(project.id) ? 'ring-2 ring-indigo-500' : ''
                }`}
                tabIndex={0}
                role="button"
                aria-label={project.title}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectProject(project); } }}
              >
                {/* Thumbnail */}
                <div className="h-40 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center relative">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Layers className="w-12 h-12 text-indigo-300 dark:text-indigo-600" />
                  )}
                  {/* Checkbox */}
                  <button
                    onClick={(e) => toggleSelect(e, project.id)}
                    className="absolute top-2 left-2 p-1 bg-white/80 dark:bg-gray-800/80 rounded-md hover:bg-white dark:hover:bg-gray-800 transition-colors"
                    aria-label="Select"
                  >
                    {selectedIds.includes(project.id) ? (
                      <CheckSquare className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                    )}
                  </button>
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

                  {/* Tags on card */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: tag.color + '20', color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

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

      <Modal
        open={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleBulkDelete}
        variant="confirm"
        title={t('bulk.deleteSelected')}
        message={`${t('bulk.selected')}: ${selectedIds.length}. ${t('projects.confirmDelete')}`}
        confirmText={t('bulk.deleteSelected')}
      />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
