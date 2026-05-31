import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';
import { Phone, MapPin, ShoppingCart, Edit2 } from 'lucide-react';

export default function CustomerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [tab, setTab] = useState('info');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => { api.customer(id).then(setCustomer); }, [id]);

  const handleSave = async () => { await api.updateCustomer(id, form); setEditing(false); api.customer(id).then(setCustomer); };
  const fm = (v) => Number(v || 0).toLocaleString() + ' TZS';
  if (!customer) return <div className="p-8 text-center">{t('loading')}</div>;

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-lg font-bold">{customer.garage_name}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            {customer.phone && <span className="flex items-center gap-1"><Phone size={12} /> {customer.phone}</span>}
            {customer.address && <span className="flex items-center gap-1"><MapPin size={12} /> {customer.address}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/orders/new?customer=${id}`)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><ShoppingCart size={14} /> {t('order')}</button>
          {user?.role !== 'customer' && <button onClick={() => { setEditing(!editing); setForm(customer); }} className="bg-gray-200 px-3 py-1.5 rounded text-sm flex items-center gap-1"><Edit2 size={14} /> {t('edit')}</button>}
        </div>
      </div>

      {editing && (
        <div className="bg-white border rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={form.garage_name || ''} onChange={e => setForm({...form, garage_name: e.target.value})} className="border rounded px-3 py-1.5 text-sm" placeholder={t('garageName')} />
            <input type="text" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} className="border rounded px-3 py-1.5 text-sm" placeholder={t('phone')} />
            <input type="text" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} className="border rounded px-3 py-1.5 text-sm" placeholder={t('address')} />
            <select value={form.tier || 'C'} onChange={e => setForm({...form, tier: e.target.value})} className="border rounded px-2 py-1.5 text-sm"><option>A</option><option>B</option><option>C</option></select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">{t('save')}</button>
            <button onClick={() => setEditing(false)} className="bg-gray-200 px-4 py-1.5 rounded text-sm">{t('cancel')}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[{l:t('totalOrders'),v:customer.total_orders},{l:t('totalSpent'),v:fm(customer.total_spent)},{l:t('lastOrder'),v:customer.last_order_date||'-'}].map((s,i)=>(
          <div key={i} className="bg-white rounded-lg p-3 text-center shadow"><p className="text-xs text-gray-500">{s.l}</p><p className="font-bold text-sm">{s.v}</p></div>
        ))}
      </div>

      <div className="flex gap-2 mb-3 border-b">
        {['info','orders','visits','issues'].map(tb=>(
          <button key={tb} onClick={()=>setTab(tb)} className={`px-3 py-2 text-sm font-medium capitalize ${tab===tb?'border-b-2 border-blue-600 text-blue-600':'text-gray-500'}`}>{t(tb)}</button>
        ))}
      </div>

      {tab==='info' && <div className="bg-white rounded-lg shadow p-4 space-y-2 text-sm">
        {[{l:t('tier'),v:customer.tier},{l:t('creditEligible'),v:customer.credit_eligible?t('yes'):t('no')},{l:t('source'),v:t(customer.source||'manual')},{l:t('salesperson'),v:customer.salesperson_name||'-'},{l:t('notes'),v:customer.notes||'-'}].map((r,i)=>(
          <div key={i} className="flex justify-between"><span className="text-gray-500">{r.l}</span><span className="font-medium">{r.v}</span></div>
        ))}
        {customer.maps_url && <a href={customer.maps_url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline block">{t('viewOnMaps')}</a>}
      </div>}

      {tab==='orders' && <div className="bg-white rounded-lg shadow overflow-hidden">
        {customer.recentOrders?.length?customer.recentOrders.map(o=>(
          <div key={o.id} className="p-3 border-b hover:bg-gray-50 cursor-pointer flex justify-between" onClick={()=>navigate(`/orders/${o.id}`)}>
            <div><div className="text-sm font-medium">{o.order_number}</div><div className="text-xs text-gray-500">{o.order_date}</div></div>
            <div className="text-right"><div className="text-sm font-semibold">{fm(o.total_amount)}</div><span className={`badge-${o.status}`}>{t(`status.${o.status}`)}</span></div>
          </div>
        )):<p className="p-4 text-center text-gray-400">{t('noOrders')}</p>}
      </div>}

      {tab==='visits' && <div className="bg-white rounded-lg shadow overflow-hidden">
        {customer.visits?.length?customer.visits.map(v=>(
          <div key={v.id} className="p-3 border-b"><div className="flex justify-between text-sm"><span className="font-medium">{v.salesperson_name}</span><span className="text-xs text-gray-500">{v.visit_date}</span></div><p className="text-xs text-gray-600 mt-1">{v.notes||'-'}</p><span className="text-xs capitalize bg-gray-100 px-1.5 py-0.5 rounded">{t(`outcome_${v.outcome}`)}</span></div>
        )):<p className="p-4 text-center text-gray-400">{t('noVisits')}</p>}
      </div>}

      {tab==='issues' && <div className="bg-white rounded-lg shadow overflow-hidden">
        {customer.issues?.length?customer.issues.map(i=>(
          <div key={i.id} className="p-3 border-b"><div className="flex justify-between text-sm"><span className="font-medium">{t(`issue.${i.issue_type}`)}</span><span className={`badge-${i.status==='open'?'pending':i.status==='resolved'?'paid':'confirmed'}`}>{t(`status.${i.status}`)}</span></div><p className="text-xs text-gray-600 mt-1">{i.description}</p>{i.resolution&&<p className="text-xs text-green-600 mt-1">{t('resolution')}: {i.resolution}</p>}</div>
        )):<p className="p-4 text-center text-gray-400">{t('noIssues')}</p>}
      </div>}
    </div>
  );
}
