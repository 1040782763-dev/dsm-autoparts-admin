import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';
import { ShoppingCart, DollarSign, Users, AlertTriangle, TrendingUp, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useT();
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      if (user?.role === 'admin') {
        const dash = await api.dashboard();
        setData({ dash, type: 'admin' });
      } else if (user?.role === 'salesperson') {
        const today = new Date().toISOString().slice(0, 10);
        const [cust, orders, summary] = await Promise.all([
          api.customers({ active: '1' }),
          api.ordersDaily(today),
          api.dailySummary(today),
        ]);
        setData({ customers: cust, orders, summary, type: 'sales' });
      } else {
        const orders = await api.orders({});
        setData({ orders, type: 'customer' });
      }
    }
    load();
  }, [user]);

  const fm = (v) => Number(v || 0).toLocaleString() + ' TZS';

  if (!data) return <div className="p-8 text-center text-gray-500">{t('loading')}</div>;

  if (data.type === 'admin') {
    const d = data.dash;
    return (
      <div>
        <h1 className="text-lg font-bold mb-4">{t('dashboard')}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={DollarSign} label={t('todayRevenue')} value={fm(d.todayRevenue)} color="bg-green-500" />
          <StatCard icon={ShoppingCart} label={t('todayOrders')} value={d.todayOrders} color="bg-blue-500" />
          <StatCard icon={CreditCard} label={t('collected')} value={fm(d.todayCollections)} color="bg-emerald-500" />
          <StatCard icon={Users} label={t('totalCustomers')} value={d.totalCustomers} color="bg-purple-500" />
          <StatCard icon={AlertTriangle} label={t('pendingOrders')} value={d.pendingOrders} color="bg-orange-500" />
          <StatCard icon={TrendingUp} label={t('monthRevenue')} value={fm(d.monthRevenue)} color="bg-indigo-500" />
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">{t('todaysOrders')}</h2>
            <button onClick={() => navigate('/orders/new')} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">+ {t('newOrder')}</button>
          </div>
          {/* Orders table rendered by a sub-component or inline */}
        </div>
      </div>
    );
  }

  if (data.type === 'sales') {
    const myCollected = data.summary?.find(s => s.id === user.id);
    return (
      <div>
        <h1 className="text-lg font-bold mb-4">{t('dashboard')} - {user.full_name}</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <StatCard icon={Users} label={t('myCustomers')} value={data.customers?.length || 0} color="bg-blue-500" />
          <StatCard icon={ShoppingCart} label={t('todayOrders')} value={data.orders?.length || 0} color="bg-green-500" />
          <StatCard icon={DollarSign} label={t('collectedToday')} value={fm(myCollected?.total_collected)} color="bg-emerald-500" />
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">{t('todaysDeliveries')}</h2>
          {data.orders?.length ? data.orders.map(o => (
            <div key={o.id} className="flex justify-between items-center p-2 border rounded mb-1 cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
              <div><span className="font-medium text-sm">{o.garage_name || o.customer_name}</span><span className="text-xs text-gray-500 ml-2">{t(`batch.${o.delivery_batch || 'next_day'}`)}</span></div>
              <div className="text-right"><span className="text-sm font-semibold">{fm(o.total_amount)}</span><br /><span className={`badge-${o.status} text-xs`}>{t(`status.${o.status}`)}</span></div>
            </div>
          )) : <p className="text-gray-400 text-center py-4">{t('noDeliveries')}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">{t('dashboard')}</h1>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between mb-3">
          <h2 className="font-semibold">{t('recentOrders')}</h2>
          <button onClick={() => navigate('/orders/new')} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">{t('placeOrder')}</button>
        </div>
        {data.orders?.slice(0, 10).map(o => (
          <div key={o.id} className="flex justify-between p-2 border rounded mb-2 cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
            <span className="text-sm">{o.order_number}</span>
            <span className="text-sm font-medium">{fm(o.total_amount)}</span>
            <span className={`badge-${o.status}`}>{t(`status.${o.status}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-3 flex items-center gap-3">
      <div className={`${color} p-2 rounded-lg text-white`}><Icon size={18} /></div>
      <div><p className="text-xs text-gray-500">{label}</p><p className="font-bold text-sm">{value}</p></div>
    </div>
  );
}
