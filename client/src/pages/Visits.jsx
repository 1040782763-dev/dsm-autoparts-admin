import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';
import { MapPin, Plus } from 'lucide-react';

export default function Visits() {
  const { user } = useAuth();
  const { t } = useT();
  const [visits, setVisits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: '', notes: '', outcome: 'follow_up' });

  useEffect(() => { api.visits({}).then(setVisits); api.customers({ active: '1' }).then(setCustomers); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let lat = null, lng = null;
    if (navigator.geolocation) { try { const pos = await new Promise((r, rej) => navigator.geolocation.getCurrentPosition(r, rej, { enableHighAccuracy: true })); lat = pos.coords.latitude; lng = pos.coords.longitude; } catch {} }
    await api.createVisit({ ...form, latitude: lat, longitude: lng });
    setShowForm(false); setForm({ customer_id: '', notes: '', outcome: 'follow_up' }); api.visits({}).then(setVisits);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4"><h1 className="text-lg font-bold">{t('visitsTitle')}</h1><button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Plus size={14} /> {t('logVisit')}</button></div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 mb-4 space-y-3">
          <select value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" required><option value="">{t('selectCustomer')}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.garage_name}</option>)}</select>
          <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" rows={3} placeholder={t('visitNotes')} required />
          <select value={form.outcome} onChange={e => setForm({...form, outcome: e.target.value})} className="w-full border rounded px-3 py-2 text-sm"><option value="follow_up">{t('outcome_follow_up')}</option><option value="ordered">{t('outcome_ordered')}</option><option value="no_order">{t('outcome_no_order')}</option><option value="closed_deal">{t('outcome_closed_deal')}</option><option value="new_customer">{t('outcome_new_customer')}</option></select>
          <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={12} /> {t('gpsHint')}</p>
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">{t('saveVisit')}</button>
        </form>
      )}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {visits.map(v => (
          <div key={v.id} className="p-3 border-b"><div className="flex justify-between"><span className="font-medium text-sm">{v.customer_name}</span><span className="text-xs text-gray-500">{v.visit_date}</span></div><p className="text-sm text-gray-600 mt-1">{v.notes || '-'}</p><div className="flex justify-between mt-1"><span className="text-xs capitalize bg-gray-100 px-1.5 py-0.5 rounded">{t(`outcome_${v.outcome}`)}</span><span className="text-xs text-gray-400">{v.salesperson_name}</span></div></div>
        ))}
        {visits.length === 0 && <div className="p-8 text-center text-gray-400">{t('noVisits')}</div>}
      </div>
    </div>
  );
}
