import { useState } from 'react';
import { ArrowLeft, Save, Key, User } from 'lucide-react';
import { api } from '../api';
import { useI18n } from '../i18n';

export default function Profile({ user, onBack, onUserUpdate }) {
  const { t, locale, setLocale } = useI18n();

  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await api.updateMe({ first_name: firstName, last_name: lastName, locale });
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

        {/* Change password */}
        <div className="bg-white rounded-xl shadow-md p-6">
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
      </div>
    </div>
  );
}
