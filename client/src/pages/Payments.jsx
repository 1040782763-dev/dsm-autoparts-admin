import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';
import { DollarSign } from 'lucide-react';

export default function Payments() {
  const { user } = useAuth();
  const { t } = useT();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { api.payments({ payment_date: date }).then(setPayments); api.dailySummary(date).then(setSummary); }, [date]);
  const fm = (v) => Number(v || 0).toLocaleString() + ' TZS';

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">{t('payments')}</h1>
      <div className="mb-4"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" /></div>
      {summary.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-semibold text-sm mb-2 flex items-center gap-1"><DollarSign size={14} /> {t('dailySummary')}</h2>
          {summary.map(s => <div key={s.id} className="flex justify-between text-sm py-1 border-b"><span>{s.full_name}</span><span className="font-medium">{fm(s.total_collected)} ({s.payment_count} {t('payments_count')})</span></div>)}
        </div>
      )}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {payments.map(p => (
          <div key={p.id} className="p-3 border-b flex justify-between items-center">
            <div><div className="text-sm font-medium">{p.customer_name}</div><div className="text-xs text-gray-500">{p.order_number} | {p.payment_method} | {p.collector_name}</div></div>
            <div className="text-right"><div className="font-bold text-sm">{fm(p.amount)}</div><div className="text-xs text-gray-400">{p.payment_date}</div></div>
          </div>
        ))}
        {payments.length === 0 && <div className="p-8 text-center text-gray-400">{t('noPayments')}</div>}
      </div>
    </div>
  );
}
