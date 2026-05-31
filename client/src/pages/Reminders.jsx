import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';
import { Bell, Plus, Check, Trash2 } from 'lucide-react';

export default function Reminders() {
  const { user } = useAuth();
  const { t } = useT();
  const [reminders, setReminders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: '', reminder_type: 'follow_up', message: '', scheduled_date: '' });

  useEffect(() => { api.reminders({}).then(setReminders); api.customers({ active: '1' }).then(setCustomers); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === parseInt(form.customer_id));
    await api.createReminder({ ...form, whatsapp_number: cust?.phone || null });
    setShowForm(false); setForm({ customer_id: '', reminder_type: 'follow_up', message: '', scheduled_date: '' }); api.reminders({}).then(setReminders);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4"><h1 className="text-lg font-bold flex items-center gap-2"><Bell size={18} /> {t('remindersTitle')}</h1><button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Plus size={14} /> {t('addReminder')}</button></div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 mb-4 space-y-3">
          <select value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" required><option value="">{t('selectCustomer')}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.garage_name}</option>)}</select>
          <select value={form.reminder_type} onChange={e => setForm({...form, reminder_type: e.target.value})} className="w-full border rounded px-3 py-2 text-sm"><option value="follow_up">{t('reminder.follow_up')}</option><option value="payment_due">{t('reminder.payment_due')}</option><option value="reorder">{t('reminder.reorder')}</option><option value="churn_risk">{t('reminder.churn_risk')}</option><option value="visit_scheduled">{t('reminder.visit_scheduled')}</option></select>
          <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" rows={2} placeholder={t('message')} />
          <input type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" required />
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">{t('save')}</button>
        </form>
      )}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {reminders.map(r => (
          <div key={r.id} className={`p-3 border-b flex justify-between items-center ${r.sent ? 'opacity-50' : ''}`}>
            <div><div className="flex items-center gap-2"><span className="font-medium text-sm">{r.customer_name}</span><span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{t(`reminder.${r.reminder_type}`)}</span></div><p className="text-xs text-gray-500 mt-0.5">{r.message || '-'}</p><p className="text-xs text-gray-400">Due: {r.scheduled_date}</p></div>
            <div className="flex gap-1">{!r.sent && <button onClick={async () => { await api.markReminderSent(r.id); api.reminders({}).then(setReminders); }} className="text-green-600 p-1"><Check size={16} /></button>}<button onClick={async () => { if (!confirm('Delete?')) return; await api.deleteReminder(r.id); api.reminders({}).then(setReminders); }} className="text-red-400 p-1"><Trash2 size={16} /></button></div>
          </div>
        ))}
        {reminders.length === 0 && <div className="p-8 text-center text-gray-400">{t('noReminders')}</div>}
      </div>
    </div>
  );
}
