import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';
import { Search, Plus, MapPin, Phone } from 'lucide-react';

export default function Customers() {
  const { user } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ garage_name: '', phone: '', address: '', tier: 'C', notes: '' });

  useEffect(() => {
    api.customers({ search: search || undefined, tier: tierFilter || undefined }).then(setCustomers);
  }, [search, tierFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.createCustomer(form);
    setShowForm(false);
    setForm({ garage_name: '', phone: '', address: '', tier: 'C', notes: '' });
    api.customers().then(setCustomers);
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setForm(f => ({ ...f, address: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` }));
      });
    }
  };

  const tierBadge = (t) => {
    const c = { A: 'bg-green-100 text-green-800', B: 'bg-blue-100 text-blue-800', C: 'bg-gray-100 text-gray-600' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c[t] || c.C}`}>{t}</span>;
  };

  const fm = (v) => Number(v || 0).toLocaleString();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">{t('customers')} ({customers.length})</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/map')} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><MapPin size={14} /> {t('map')}</button>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Plus size={14} /> {t('addCustomer')}</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input type="text" placeholder={t('searchGarages')} value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
          <option value="">{t('allTiers')}</option>
          <option value="A">A</option><option value="B">B</option><option value="C">C</option>
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-lg p-4 mb-4 space-y-3">
          <input type="text" placeholder={`${t('garageName')} *`} value={form.garage_name} onChange={e => setForm({...form, garage_name: e.target.value})}
            className="w-full border rounded px-3 py-2 text-sm" required />
          <div className="flex gap-2">
            <input type="text" placeholder={t('phone')} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              className="flex-1 border rounded px-3 py-2 text-sm" />
            <select value={form.tier} onChange={e => setForm({...form, tier: e.target.value})} className="border rounded px-2 py-2 text-sm w-20">
              <option>A</option><option>B</option><option>C</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder={t('address')} value={form.address} onChange={e => setForm({...form, address: e.target.value})}
              className="flex-1 border rounded px-3 py-2 text-sm" />
            <button type="button" onClick={getLocation} className="bg-gray-100 px-2 py-1 rounded text-xs">{t('gps')}</button>
          </div>
          <textarea placeholder={t('notes')} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
            className="w-full border rounded px-3 py-2 text-sm" rows={2} />
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">{t('save')}</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-1.5 rounded text-sm">{t('cancel')}</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {customers.map(c => (
          <div key={c.id} className="flex items-center justify-between p-3 border-b hover:bg-gray-50 cursor-pointer"
            onClick={() => navigate(`/customers/${c.id}`)}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{c.garage_name}</span>
                {tierBadge(c.tier)}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                {c.phone && <span className="flex items-center gap-0.5"><Phone size={10} /> {c.phone}</span>}
                {c.salesperson_name && <span>{c.salesperson_name}</span>}
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div>{c.total_orders} {t('orders_suffix')}</div>
              <div>{fm(c.total_spent)} {t('TZS')}</div>
            </div>
          </div>
        ))}
        {customers.length === 0 && <div className="p-8 text-center text-gray-400">{t('noCustomers')}</div>}
      </div>
    </div>
  );
}
