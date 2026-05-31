import React, { useState } from 'react';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import { User, Lock } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const { t } = useT();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [message, setMessage] = useState('');

  const handlePassword = async (e) => {
    e.preventDefault();
    try {
      const r = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ current, newPassword: newPass }) });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setMessage(t('passwordChanged'));
      setCurrent(''); setNewPass('');
    } catch (err) { setMessage(err.message); }
  };

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">{t('profileTitle')}</h1>
      <div className="bg-white rounded-lg shadow p-4 max-w-md space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="bg-blue-100 p-3 rounded-full"><User size={24} className="text-blue-600" /></div>
          <div><p className="font-bold">{user?.full_name}</p><p className="text-sm text-gray-500 capitalize">{user?.role}</p><p className="text-xs text-gray-400">{user?.username}</p></div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2"><Lock size={14} /> <span className="font-medium text-sm">{t('changePassword')}</span></div>
          {message && <div className="text-sm text-blue-600 mb-2">{message}</div>}
          <form onSubmit={handlePassword} className="space-y-2">
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder={t('currentPassword')} required />
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder={t('newPassword')} required />
            <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">{t('updatePassword')}</button>
          </form>
        </div>
        <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded text-sm w-full mt-4">{t('logout')}</button>
      </div>
    </div>
  );
}
