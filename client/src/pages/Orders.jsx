import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';
import { Plus, Zap } from 'lucide-react';

export default function Orders() {
  const { user } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [showQuick, setShowQuick] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [quickCust, setQuickCust] = useState('');
  const [customers, setCustomers] = useState([]);

  useEffect(() => { api.orders({ status: status || undefined }).then(setOrders); api.customers({ active: '1' }).then(setCustomers); }, [status]);
  const fm = (v) => Number(v || 0).toLocaleString() + ' TZS';
  const handleQuick = async () => { if (!quickCust || !quickText) return; try { await api.quickOrder({ customer_id: parseInt(quickCust), text: quickText }); setShowQuick(false); setQuickText(''); api.orders({ status: status || undefined }).then(setOrders); } catch (e) { alert(e.message); } };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">{t('orders')} ({orders.length})</h1>
        <div className="flex gap-2">
          {(user?.role === 'admin' || user?.role === 'salesperson') && <button onClick={() => setShowQuick(!showQuick)} className="bg-orange-500 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Zap size={14} /> {t('quickOrder')}</button>}
          <button onClick={() => navigate('/orders/new')} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Plus size={14} /> {t('newOrder')}</button>
        </div>
      </div>

      {showQuick && (
        <div className="bg-white border rounded-lg p-4 mb-4 space-y-3 shadow">
          <h3 className="font-semibold text-sm">{t('quickOrder')}</h3>
          <select value={quickCust} onChange={e => setQuickCust(e.target.value)} className="w-full border rounded px-3 py-2 text-sm"><option value="">{t('selectCustomer')}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.garage_name}</option>)}</select>
          <textarea value={quickText} onChange={e => setQuickText(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" rows={3} placeholder={t('quickOrderHint')} />
          <div className="flex gap-2"><button onClick={handleQuick} className="bg-orange-500 text-white px-4 py-1.5 rounded text-sm">{t('submitQuickOrder')}</button><button onClick={() => setShowQuick(false)} className="bg-gray-200 px-4 py-1.5 rounded text-sm">{t('cancel')}</button></div>
        </div>
      )}

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['', 'pending', 'confirmed', 'picked_up', 'out_for_delivery', 'delivered', 'paid', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{s ? t(`status.${s}`) : t('all')}</button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {orders.map(o => (
          <div key={o.id} className="p-3 border-b hover:bg-gray-50 cursor-pointer flex justify-between items-center" onClick={() => navigate(`/orders/${o.id}`)}>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-medium text-sm truncate">{o.garage_name || o.customer_name}</span><span className={`badge-${o.status} text-xs`}>{t(`status.${o.status}`)}</span></div><div className="text-xs text-gray-500 mt-0.5">{o.order_number} | {o.order_date} | {t(`batch.${o.delivery_batch || 'next_day'}`)}</div></div>
            <div className="text-right ml-3"><div className="font-semibold text-sm">{fm(o.total_amount)}</div><span className={`text-xs ${o.payment_status === 'paid' ? 'text-green-600' : o.payment_status === 'partial' ? 'text-orange-500' : 'text-red-500'}`}>{t(`payment.${o.payment_status}`)}</span></div>
          </div>
        ))}
        {orders.length === 0 && <div className="p-8 text-center text-gray-400">{t('noOrders')}</div>}
      </div>
    </div>
  );
}
