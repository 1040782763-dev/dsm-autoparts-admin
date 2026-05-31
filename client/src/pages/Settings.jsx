import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';

export default function Settings() {
  const { user } = useAuth();
  const { t } = useT();
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);

  if (user?.role !== 'admin') return <div className="p-8 text-center text-gray-500">Admin only</div>;

  useEffect(() => { api.settings().then(setSettings); }, []);
  const handleSave = async () => { await api.updateSettings(settings); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">{t('settingsTitle')}</h1>
      <div className="bg-white rounded-lg shadow p-4 space-y-4 max-w-lg">
        {[{k:'company_name',l:t('companyName')},{k:'morning_cutoff',l:t('morningCutoff'),type:'time'},{k:'afternoon_cutoff',l:t('afternoonCutoff'),type:'time'},{k:'credit_threshold_orders',l:t('creditThreshold'),type:'number'},{k:'churn_warning_days',l:t('churnWarningDays'),type:'number'},{k:'profit_margin_target',l:t('profitMarginTarget'),type:'number'}].map(f => (
          <div key={f.k}><label className="block text-sm font-medium mb-1">{f.l}</label><input type={f.type||'text'} value={settings[f.k]||''} onChange={e => setSettings({...settings,[f.k]:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
        ))}
        <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium">{saved ? t('saved') : t('saveSettings')}</button>
      </div>
    </div>
  );
}
