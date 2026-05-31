import React, { useState } from 'react';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import { Wrench, Languages } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { t, lang, toggleLang } = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await login(username, password); }
    catch (err) { setError(err.message || 'Login failed'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        {/* Language toggle */}
        <div className="flex justify-end mb-2">
          <button onClick={toggleLang} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 border rounded px-2 py-1">
            <Languages size={14} />
            {lang === 'zh' ? 'English' : '中文'}
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-600 p-3 rounded-full mb-3">
            <Wrench size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t('appName')}</h1>
          <p className="text-gray-500 text-sm">{t('appSubtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('username')}</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? t('loginLoading') : t('login')}
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">{t('loginHint')}</p>
      </div>
    </div>
  );
}
