import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';
import { ArrowLeft, Check, X, DollarSign } from 'lucide-react';

const STEPS = ['pending', 'confirmed', 'picked_up', 'out_for_delivery', 'delivered', 'paid'];

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [payAmt, setPayAmt] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [showPay, setShowPay] = useState(false);

  useEffect(() => { load(); }, [id]);
  const load = () => api.order(id).then(setOrder);
  const fm = (v) => Number(v || 0).toLocaleString() + ' TZS';
  const current = order ? STEPS.indexOf(order.status) : 0;
  const paidSoFar = order?.payments?.reduce((s, p) => s + p.amount, 0) || 0;

  const advance = async (s) => { if (s === 'paid') { setShowPay(true); return; } await api.updateOrderStatus(id, s); load(); };
  const handlePay = async () => { if (!payAmt) return; await api.createPayment({ order_id: parseInt(id), amount: parseFloat(payAmt), payment_method: payMethod }); setShowPay(false); setPayAmt(''); load(); };
  const cancel = async () => { if (!confirm(t('cancelOrder') + '?')) return; await api.cancelOrder(id); load(); };

  if (!order) return <div className="p-8 text-center">{t('loading')}</div>;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 mb-3"><ArrowLeft size={14} /> {t('back')}</button>
      <div className="flex justify-between items-start mb-4">
        <div><h1 className="text-lg font-bold">{order.order_number}</h1><p className="text-sm text-gray-500">{order.customer_name} | {order.order_date}</p></div>
        <div className="text-right"><span className={`badge-${order.status} text-sm`}>{t(`status.${order.status}`)}</span><p className="text-xs text-gray-500 mt-1">{t(`batch.${order.delivery_batch || 'next_day'}`)}</p></div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-center">
          {STEPS.map((step, i) => (
            <div key={step} className="flex flex-col items-center flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < current ? 'bg-green-500 text-white' : i === current ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{i < current ? '✓' : i + 1}</div>
              <span className="text-[10px] text-gray-500 mt-1 text-center">{t(`status.${step}`)}</span>
            </div>
          ))}
        </div>
      </div>

      {(user?.role === 'admin' || user?.role === 'salesperson') && order.status !== 'cancelled' && order.status !== 'paid' && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="text-sm font-medium mb-2">{t('advanceStatus')}</h3>
          <div className="flex flex-wrap gap-2">
            {order.status === 'pending' && <button onClick={() => advance('confirmed')} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Check size={14} /> {t('confirm')}</button>}
            {order.status === 'confirmed' && <button onClick={() => advance('picked_up')} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm">{t('pickedUp')}</button>}
            {order.status === 'picked_up' && <button onClick={() => advance('out_for_delivery')} className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm">{t('outForDelivery')}</button>}
            {order.status === 'out_for_delivery' && <button onClick={() => advance('delivered')} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm">{t('delivered')}</button>}
            {order.status === 'delivered' && <button onClick={() => advance('paid')} className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><DollarSign size={14} /> {t('markPaid')}</button>}
            {order.status !== 'cancelled' && order.status !== 'paid' && <button onClick={cancel} className="bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm flex items-center gap-1"><X size={14} /> {t('cancelOrder')}</button>}
          </div>
        </div>
      )}

      {showPay && (
        <div className="bg-white border-2 border-emerald-500 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-3">{t('recordPayment')}</h3>
          <p className="text-sm text-gray-500 mb-2">{t('total')}: {fm(order.total_amount)} | {t('paid')}: {fm(paidSoFar)}</p>
          <div className="space-y-2">
            <input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder={`${t('amount')} (TZS)`} defaultValue={order.total_amount - paidSoFar} />
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full border rounded px-3 py-2 text-sm"><option value="cash">{t('cash')}</option><option value="mpesa">{t('mpesa')}</option><option value="bank_transfer">{t('bankTransfer')}</option></select>
            <div className="flex gap-2"><button onClick={handlePay} className="bg-emerald-600 text-white px-4 py-2 rounded text-sm">{t('recordPayment')}</button><button onClick={() => setShowPay(false)} className="bg-gray-200 px-4 py-2 rounded text-sm">{t('cancel')}</button></div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="font-semibold text-sm mb-2">{t('orderItems')}</h3>
        <table className="w-full text-sm"><thead><tr className="text-left border-b text-xs text-gray-500"><th className="py-1">{t('partNumber')}</th><th className="text-center py-1">{t('qty')}</th><th className="text-right py-1">{t('price')}</th><th className="text-right py-1">{t('subtotal')}</th></tr></thead><tbody>
          {order.items?.map(i => <tr key={i.id} className="border-b"><td className="py-2"><span className="text-xs font-medium">{i.part_number || '-'}</span><br /><span className="text-xs text-gray-500">{i.part_name}</span></td><td className="text-center py-2 text-xs">{i.quantity}</td><td className="text-right py-2 text-xs">{fm(i.unit_price)}</td><td className="text-right py-2 text-xs font-medium">{fm(i.subtotal)}</td></tr>)}
        </tbody></table>
        <div className="text-right mt-2"><span className="text-sm font-bold">{t('total')}: {fm(order.total_amount)}</span></div>
      </div>

      {order.payments?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold text-sm mb-2">{t('payments')}</h3>
          {order.payments.map(p => <div key={p.id} className="flex justify-between text-sm border-b py-1"><span>{p.payment_date} - {p.payment_method}</span><span className="font-medium">{fm(p.amount)}</span></div>)}
          <div className="text-right mt-1 text-xs"><span className={paidSoFar >= order.total_amount ? 'text-green-600' : 'text-orange-500'}>{t('paid')}: {fm(paidSoFar)} / {fm(order.total_amount)}</span></div>
        </div>
      )}

      {order.notes && <div className="bg-white rounded-lg shadow p-4"><h3 className="font-semibold text-sm mb-1">{t('notes')}</h3><p className="text-sm text-gray-600">{order.notes}</p></div>}
    </div>
  );
}
