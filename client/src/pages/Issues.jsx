import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';

export default function Issues() {
  const { user } = useAuth();
  const { t } = useT();
  const [issues, setIssues] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: '', issue_type: 'other', description: '' });
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { api.issues({ status: statusFilter || undefined }).then(setIssues); api.customers({ active: '1' }).then(setCustomers); }, [statusFilter]);

  const handleSubmit = async (e) => { e.preventDefault(); await api.createIssue(form); setShowForm(false); setForm({ customer_id: '', issue_type: 'other', description: '' }); api.issues({ status: statusFilter || undefined }).then(setIssues); };
  const resolveIssue = async (id) => { await api.updateIssue(id, { status: 'resolved' }); api.issues({ status: statusFilter || undefined }).then(setIssues); };

  return (
    <div>
      <div className="flex justify-between items-center mb-4"><h1 className="text-lg font-bold">{t('issuesTitle')}</h1><button onClick={() => setShowForm(!showForm)} className="bg-orange-500 text-white px-3 py-1.5 rounded text-sm">+ {t('reportIssue')}</button></div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['', 'open', 'investigating', 'resolved', 'closed'].map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{s ? t(`status.${s}`) : t('all')}</button>)}
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 mb-4 space-y-3">
          <select value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" required><option value="">{t('selectCustomer')}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.garage_name}</option>)}</select>
          <select value={form.issue_type} onChange={e => setForm({...form, issue_type: e.target.value})} className="w-full border rounded px-3 py-2 text-sm"><option value="wrong_part">{t('issue.wrong_part')}</option><option value="defective">{t('issue.defective')}</option><option value="damaged_in_transit">{t('issue.damaged_in_transit')}</option><option value="quality">{t('issue.quality')}</option><option value="other">{t('issue.other')}</option></select>
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" rows={3} placeholder={t('description')} required />
          <button type="submit" className="bg-orange-500 text-white px-4 py-1.5 rounded text-sm">{t('submitReport')}</button>
        </form>
      )}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {issues.map(i => (
          <div key={i.id} className="p-3 border-b"><div className="flex justify-between"><span className="font-medium text-sm">{i.customer_name}</span><span className={`badge-${i.status === 'open' ? 'pending' : i.status === 'resolved' ? 'paid' : 'confirmed'}`}>{t(`status.${i.status}`)}</span></div><p className="text-sm text-gray-600 mt-1">{i.description}</p><div className="flex justify-between mt-1"><span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{t(`issue.${i.issue_type}`)}</span>{(user?.role === 'admin' || user?.role === 'salesperson') && i.status === 'open' && <button onClick={() => resolveIssue(i.id)} className="text-xs text-green-600 font-medium">{t('resolve')}</button>}</div></div>
        ))}
        {issues.length === 0 && <div className="p-8 text-center text-gray-400">{t('noIssues')}</div>}
      </div>
    </div>
  );
}
