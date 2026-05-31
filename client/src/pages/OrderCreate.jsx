import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';
import { Search, Trash2 } from 'lucide-react';

export default function OrderCreate() {
  const { user } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefill = searchParams.get('customer');

  const [customers, setCustomers] = useState([]);
  const [parts, setParts] = useState([]);
  const [customerId, setCustomerId] = useState(prefill || '');
  const [deliveryBatch, setDeliveryBatch] = useState('next_day');
  const [notes, setNotes] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.customers({ active: '1' }).then(setCustomers); api.parts({ active: '1' }).then(setParts); }, []);

  const filteredParts = partSearch ? parts.filter(p => p.name_en.toLowerCase().includes(partSearch.toLowerCase()) || p.name_sw?.toLowerCase().includes(partSearch.toLowerCase()) || p.part_number.toLowerCase().includes(partSearch.toLowerCase())) : parts.slice(0, 20);

  const addItem = (part) => {
    const ex = items.find(i => i.part_id === part.id);
    if (ex) setItems(items.map(i => i.part_id === part.id ? { ...i, quantity: i.quantity + 1 } : i));
    else setItems([...items, { part_id: part.id, part_name: part.name_en, part_number: part.part_number, quantity: 1, unit_price: part.selling_price }]);
  };
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const handleSubmit = async () => {
    if (!customerId || items.length === 0) return alert(t('selectCustomer'));
    setLoading(true);
    try { const r = await api.createOrder({ customer_id: parseInt(customerId), items: items.map(i => ({ part_id: i.part_id, quantity: i.quantity })), delivery_batch: deliveryBatch, notes }); navigate(`/orders/${r.id}`); } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const fm = (v) => Number(v).toLocaleString();

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">{t('newOrderPage')}</h1>
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div><label className="block text-sm font-medium mb-1">{t('selectCustomer')}</label><select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">{t('selectCustomer')}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.garage_name} ({c.tier})</option>)}</select></div>
        <div><label className="block text-sm font-medium mb-1">{t('delivery')}</label><select value={deliveryBatch} onChange={e => setDeliveryBatch(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="morning">{t('morning')}</option><option value="afternoon">{t('afternoon')}</option><option value="next_day">{t('nextDay')}</option></select></div>
        <div><label className="block text-sm font-medium mb-1">{t('addParts')}</label><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-gray-400" /><input type="text" placeholder={t('searchPartHint')} value={partSearch} onChange={e => setPartSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm" /></div>
          {partSearch && <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto">{filteredParts.map(p => <button key={p.id} onClick={() => { addItem(p); setPartSearch(''); }} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between border-b"><span>{p.part_number} - {p.name_en}</span><span className="font-medium">{fm(p.selling_price)}</span></button>)}</div>}
        </div>

        {items.length > 0 && (
          <div><label className="block text-sm font-medium mb-1">{t('orderItems')}</label>
            <div className="border rounded-lg overflow-hidden"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">{t('partNumber')}</th><th className="text-center px-1 py-2 w-16">{t('qty')}</th><th className="text-right px-3 py-2">{t('price')}</th><th className="text-right px-3 py-2">{t('subtotal')}</th><th className="w-8"></th></tr></thead><tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-t"><td className="px-3 py-2"><span className="text-xs font-medium">{item.part_number}</span><br /><span className="text-xs text-gray-500">{item.part_name}</span></td><td className="px-1 py-2"><input type="number" min="1" value={item.quantity} onChange={e => { const n = [...items]; n[idx].quantity = parseInt(e.target.value) || 1; setItems(n); }} className="w-14 border rounded px-1 py-1 text-xs text-center" /></td><td className="px-3 py-2 text-right text-xs">{fm(item.unit_price)}</td><td className="px-3 py-2 text-right font-medium text-xs">{fm(item.quantity * item.unit_price)}</td><td className="pr-2"><button onClick={() => removeItem(idx)} className="text-red-500"><Trash2 size={14} /></button></td></tr>
              ))}
            </tbody></table></div>
          </div>
        )}

        <div><label className="block text-sm font-medium mb-1">{t('notes')}</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder={t('orderNotes')} /></div>
        <div className="flex justify-between items-center pt-3 border-t">
          <div><span className="text-sm text-gray-500">{t('total')}: </span><span className="font-bold text-lg">{fm(total)} TZS</span><span className="text-xs text-gray-400 ml-2">({items.length} {t('itemsCount')})</span></div>
          <button onClick={handleSubmit} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50">{loading ? t('creating') : t('placeOrderBtn')}</button>
        </div>
      </div>
    </div>
  );
}
