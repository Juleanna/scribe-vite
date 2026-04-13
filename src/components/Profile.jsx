import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Key, User, Plus, Trash2, Globe } from 'lucide-react';
import { api } from '../api';
import { useI18n } from '../i18n';

const WEBHOOK_EVENTS = ['project.created', 'project.updated', 'step.created'];

export default function Profile({ user, onBack, onUserUpdate }) {
  const { t, locale, setLocale } = useI18n();

  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [brandName, setBrandName] = useState(user.brand_name || '');
  const [brandLogoUrl, setBrandLogoUrl] = useState(user.brand_logo_url || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState([]);

  const isPaidPlan = user.plan === 'pro' || user.plan === 'team';

  useEffect(() => {
    if (isPaidPlan) {
      loadWebhooks();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWebhooks = async () => {
    setWebhooksLoading(true);
    try {
      const res = await api.listWebhooks();
      if (res.ok) {
        const data = await res.json();
        setWebhooks(Array.isArray(data) ? data : data.results || []);
      }
    } catch {} finally {
      setWebhooksLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await api.updateMe({
        first_name: firstName,
        last_name: lastName,
        locale,
        brand_name: brandName,
        brand_logo_url: brandLogoUrl,
      });
      if (res.ok) {
        const updated = await res.json();
        onUserUpdate(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    setPwLoading(true);
    try {
      const res = await api.changePassword(oldPassword, newPassword);
      if (res.ok) {
        setPwSuccess(true);
        setOldPassword('');
        setNewPassword('');
        setTimeout(() => setPwSuccess(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setPwError(data.old_password || data.new_password?.[0] || t('profile.pwError'));
      }
    } catch {
      setPwError(t('auth.networkError'));
    } finally {
      setPwLoading(false);
    }
  };

  const handleAddWebhook = async () => {
    if (!newWebhookUrl) return;
    try {
      const res = await api.createWebhook({ url: newWebhookUrl, events: newWebhookEvents });
      if (res.ok) {
        const wh = await res.json();
        setWebhooks(prev => [...prev, wh]);
        setShowWebhookModal(false);
        setNewWebhookUrl('');
        setNewWebhookEvents([]);
      }
    } catch {}
  };

  const handleDeleteWebhook = async (id) => {
    try {
      const res = await api.deleteWebhook(id);
      if (res.ok || res.status === 204) {
        setWebhooks(prev => prev.filter(w => w.id !== id));
      }
    } catch {}
  };

  const toggleWebhookEvent = (event) => {
    setNewWebhookEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  const planLimits = { free: 5, pro: 100, team: 1000 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{t('profile.title')}</h1>
        </div>

        {/* Profile info */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-bold">
                {(user.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-gray-800">
                {firstName || lastName ? `${firstName} ${lastName}`.trim() : user.email}
              </p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.firstName')}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                  placeholder={t('profile.firstName')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.lastName')}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                  placeholder={t('profile.lastName')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.language')}</label>
              <div className="inline-flex items-center rounded-full bg-gray-100 p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setLocale('uk')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${locale === 'uk' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:text-gray-900'}`}
                >
                  Українська
                </button>
                <button
                  type="button"
                  onClick={() => setLocale('en')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${locale === 'en' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:text-gray-900'}`}
                >
                  English
                </button>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saved ? t('profile.saved') : t('profile.save')}
            </button>
          </div>
        </div>

        {/* Plan info */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('plan.current')}</h2>
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              user.plan === 'team' ? 'bg-purple-100 text-purple-700' :
              user.plan === 'pro' ? 'bg-indigo-100 text-indigo-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {t(`plan.${user.plan || 'free'}`)}
            </span>
            {user.plan_expires_at && (
              <span className="text-xs text-gray-500">
                {new Date(user.plan_expires_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {t('plan.limit')}: {planLimits[user.plan || 'free']}
          </p>
        </div>

        {/* Custom branding */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('brand.name')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('brand.name')}</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                placeholder={t('brand.name')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('brand.logo')}</label>
              <input
                type="url"
                value={brandLogoUrl}
                onChange={(e) => setBrandLogoUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Key className="w-5 h-5" />
            {t('profile.changePassword')}
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.oldPassword')}</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              />
            </div>

            {pwError && <p className="text-red-600 text-sm">{pwError}</p>}
            {pwSuccess && <p className="text-green-600 text-sm">{t('profile.pwChanged')}</p>}

            <button
              type="submit"
              disabled={pwLoading}
              className="flex items-center gap-2 bg-gray-800 text-white px-5 py-2 rounded-lg hover:bg-gray-900 transition-colors font-medium text-sm disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              {t('profile.changePassword')}
            </button>
          </form>
        </div>

        {/* Webhooks — only for pro/team */}
        {isPaidPlan && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t('webhooks.title')}
              </h2>
              <button
                onClick={() => setShowWebhookModal(true)}
                className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                {t('webhooks.add')}
              </button>
            </div>

            {webhooksLoading ? (
              <p className="text-sm text-gray-500">{t('projects.loading')}</p>
            ) : webhooks.length === 0 ? (
              <p className="text-sm text-gray-500">{t('webhooks.noWebhooks')}</p>
            ) : (
              <div className="space-y-3">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{wh.url}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(wh.events || []).map((ev) => (
                            <span key={ev} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                              {ev}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>{t('webhooks.active')}: {wh.is_active ? 'Yes' : 'No'}</span>
                          <span>{t('webhooks.secret')}: {wh.secret?.slice(0, 8)}...</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteWebhook(wh.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add webhook modal */}
            {showWebhookModal && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('webhooks.add')}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('webhooks.url')}</label>
                      <input
                        type="url"
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                        placeholder="https://example.com/webhook"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('webhooks.events')}</label>
                      <div className="space-y-2">
                        {WEBHOOK_EVENTS.map((ev) => (
                          <label key={ev} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={newWebhookEvents.includes(ev)}
                              onChange={() => toggleWebhookEvent(ev)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            {ev}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => { setShowWebhookModal(false); setNewWebhookUrl(''); setNewWebhookEvents([]); }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        {t('ext.close')}
                      </button>
                      <button
                        onClick={handleAddWebhook}
                        disabled={!newWebhookUrl}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {t('webhooks.add')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
