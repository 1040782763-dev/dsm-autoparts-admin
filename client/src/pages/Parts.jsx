import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';
import { Search, Plus, TrendingDown } from 'lucide-react';

export default function Parts() {
  const { user } = useAuth();
  const { t } = useT();
  const [parts, setParts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ part_number: '', name_en: '', name_sw: '', category: '', wholesale_cost: '', selling_price: '', retail_market_price: '', unit: 'piece' });

  useEffect(() => {
    api.parts({ search: search || undefined, category: category || undefined, page, limit: 50 }).then(data => {
      setParts(data.rows || data);
      setTotal(data.total || (Array.isArray(data) ? data.length : 0));
    });
    api.partCategories().then(setCategories);
  }, [search, category, page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.createPart(form);
    setShowForm(false);
    setForm({ part_number: '', name_en: '', name_sw: '', category: '', wholesale_cost: '', selling_price: '', retail_market_price: '', unit: 'piece' });
    api.parts().then(setParts);
  };

  const fm = (v) => Number(v).toLocaleString();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">{t('partsCatalog')} ({total})</h1>
        {user?.role === 'admin' && <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><Plus size={14} /> {t('addPart')}</button>}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1"><Search size={14} className="absolute left-3 top-2.5 text-gray-400" /><input type="text" placeholder={t('searchParts')} value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm" /></div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="border rounded-lg px-2 py-2 text-sm"><option value="">{t('allCategories')}</option>{categories.map(c => <option key={c.category} value={c.category}>{c.category}</option>)}</select>
      </div>

      {showForm && user?.role === 'admin' && (
        <form onSubmit={handleCreate} className="bg-white border rounded-lg p-4 mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder={`${t('partNumber')} *`} value={form.part_number} onChange={e => setForm({...form, part_number: e.target.value})} className="border rounded px-3 py-1.5 text-sm" required />
            <input type="text" placeholder={t('category')} value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border rounded px-3 py-1.5 text-sm" />
            <input type="text" placeholder={`${t('englishName')} *`} value={form.name_en} onChange={e => setForm({...form, name_en: e.target.value})} className="border rounded px-3 py-1.5 text-sm" required />
            <input type="text" placeholder={t('swahiliName')} value={form.name_sw} onChange={e => setForm({...form, name_sw: e.target.value})} className="border rounded px-3 py-1.5 text-sm" />
            <input type="number" placeholder={`${t('wholesaleCost')} *`} value={form.wholesale_cost} onChange={e => setForm({...form, wholesale_cost: e.target.value})} className="border rounded px-3 py-1.5 text-sm" required />
            <input type="number" placeholder={`${t('sellingPrice')} *`} value={form.selling_price} onChange={e => setForm({...form, selling_price: e.target.value})} className="border rounded px-3 py-1.5 text-sm" required />
            <input type="number" placeholder={t('retailMarketPrice')} value={form.retail_market_price} onChange={e => setForm({...form, retail_market_price: e.target.value})} className="border rounded px-3 py-1.5 text-sm" />
            <input type="text" placeholder={t('unit')} value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="border rounded px-3 py-1.5 text-sm" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">{t('save')}</button>
        </form>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mb-3">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-30">← Prev</button>
        <span className="px-3 py-1 text-sm text-gray-500">Page {page} ({total} parts)</span>
        <button disabled={parts.length < 50} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-30">Next →</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {parts.map(p => {
          const savings = p.retail_market_price ? Math.round((1 - p.selling_price / p.retail_market_price) * 100) : 0;
          return (
            <div key={p.id} className="bg-white rounded-lg shadow p-3">
              <div className="flex justify-between items-start">
                <div><p className="font-medium text-sm">{p.name_en}</p><p className="text-xs text-gray-500">{p.part_number}</p>{p.name_sw && <p className="text-xs text-gray-400">{p.name_sw}</p>}</div>
                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p.category || '-'}</span>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div><p className="font-bold text-sm">{fm(p.selling_price)} TZS</p>{p.retail_market_price > 0 && <p className="text-xs text-gray-400 line-through">{fm(p.retail_market_price)}</p>}</div>
                {savings > 0 && <span className="flex items-center gap-0.5 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded"><TrendingDown size={12} /> {t('savePercent')} {savings}%</span>}
              </div>
              {user?.role === 'admin' && <p className="text-xs text-gray-400 mt-1">{t('cost')}: {fm(p.wholesale_cost)} | {t('margin')}: {p.selling_price > 0 ? Math.round((1 - p.wholesale_cost / p.selling_price) * 100) : 0}%</p>}
            </div>
          );
        })}
        {parts.length === 0 && <div className="col-span-full p-8 text-center text-gray-400">{t('noParts')}</div>}
      </div>
    </div>
  );
}
