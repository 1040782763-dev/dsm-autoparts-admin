import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Analytics() {
  const { user } = useAuth();
  const { t } = useT();
  const [revenue, setRevenue] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [profit, setProfit] = useState([]);
  const [tab, setTab] = useState('revenue');

  if (user?.role !== 'admin') return <div className="p-8 text-center text-gray-500">Admin only</div>;

  useEffect(() => { api.revenue({ period: 'daily' }).then(setRevenue); api.salespersonRankings().then(setRankings); api.profitMargin().then(setProfit); }, []);

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">{t('analyticsTitle')}</h1>
      <div className="flex gap-2 mb-4 border-b">
        {['revenue', 'salespersons', 'profit'].map(tabKey => <button key={tabKey} onClick={() => setTab(tabKey)} className={`px-3 py-2 text-sm capitalize ${tab === tabKey ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}>{t(tabKey)}</button>)}
      </div>

      {tab === 'revenue' && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-sm mb-3">{t('dailyRevenue')}</h2>
          <ResponsiveContainer width="100%" height={300}><BarChart data={revenue}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v/1000000).toFixed(0)+'M'} /><Tooltip formatter={(v) => [Number(v).toLocaleString() + ' TZS']} /><Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
        </div>
      )}

      {tab === 'salespersons' && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-sm mb-3">{t('salespersonRankings')}</h2>
          <div className="space-y-2">{rankings.map((r, i) => <div key={r.id} className="flex justify-between items-center p-2 border rounded"><div className="flex items-center gap-2"><span className="font-bold text-sm text-gray-400">#{i+1}</span><span className="font-medium text-sm">{r.full_name}</span></div><div className="text-right text-sm"><div>{Number(r.total_revenue).toLocaleString()} TZS</div><div className="text-xs text-gray-500">{r.total_orders} {t('orders_suffix')} | {r.customers_served} {t('customers')}</div></div></div>)}</div>
        </div>
      )}

      {tab === 'profit' && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-sm mb-3">{t('monthlyProfit')}</h2>
          <ResponsiveContainer width="100%" height={300}><LineChart data={profit}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v/1000000).toFixed(0)+'M'} /><Tooltip formatter={(v) => [Number(v).toLocaleString() + ' TZS']} /><Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue" /><Line type="monotone" dataKey="gross_profit" stroke="#16a34a" name={t('grossProfit')} /></LineChart></ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
