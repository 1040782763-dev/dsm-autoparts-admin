import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, CircleMarker } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import api from '../api';
import { Phone, Navigation } from 'lucide-react';

const CENTER = [-6.7924, 39.2083];
const L = window.L;

function LocationMarker({ onUpdate }) { useMapEvents({ locationfound(e) { onUpdate(e.latlng); } }); return null; }
function ClickHandler({ onAdd }) { useMapEvents({ click(e) { onAdd(e.latlng); } }); return null; }

export default function CustomerMap() {
  const { user } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const [newGarage, setNewGarage] = useState(null);
  const [form, setForm] = useState({ garage_name: '', phone: '' });

  useEffect(() => { api.customersMap().then(setCustomers); }, []);

  useEffect(() => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }), ()=>{}, { enableHighAccuracy: true });
  }, []);

  const handleMapClick = (latlng) => { if (!addMode) return; setNewGarage({ lat: latlng.lat, lng: latlng.lng }); setForm({ garage_name: '', phone: '' }); };
  const saveNewGarage = async () => {
    if (!form.garage_name) return;
    await api.createCustomer({ garage_name: form.garage_name, phone: form.phone, latitude: newGarage.lat, longitude: newGarage.lng });
    setAddMode(false); setNewGarage(null); api.customersMap().then(setCustomers);
  };

  const fm = (v) => Number(v || 0).toLocaleString();

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-lg font-bold">{t('garageMap')}</h1>
        <button onClick={() => setAddMode(!addMode)} className={`px-3 py-1.5 rounded text-sm font-medium ${addMode ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
          {addMode ? t('cancelAddMode') : t('addGarageOnMap')}
        </button>
      </div>

      {addMode && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-amber-800">{t('clickMapHint')}</div>}

      {newGarage && (
        <div className="bg-white border rounded-lg p-3 mb-3 shadow space-y-2">
          <h3 className="font-semibold text-sm">{t('newGarageAt')} {newGarage.lat.toFixed(5)}, {newGarage.lng.toFixed(5)}</h3>
          <input type="text" placeholder={`${t('garageName')} *`} value={form.garage_name} onChange={e => setForm({...form, garage_name: e.target.value})} className="w-full border rounded px-3 py-1.5 text-sm" />
          <div className="flex gap-2">
            <input type="text" placeholder={t('phone')} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="flex-1 border rounded px-3 py-1.5 text-sm" />
            <button onClick={saveNewGarage} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">{t('save')}</button>
            <button onClick={() => setNewGarage(null)} className="bg-gray-200 px-3 py-1.5 rounded text-sm">{t('cancel')}</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <MapContainer center={CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationMarker onUpdate={setUserLocation} />
          {addMode && <ClickHandler onAdd={handleMapClick} />}
          {userLocation && <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={8} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5 }} />}
          {newGarage && <Marker position={[newGarage.lat, newGarage.lng]} opacity={0.7}><Popup>{t('newGarageAt')}</Popup></Marker>}
          {customers.map(c => {
            if (!c.latitude || !c.longitude) return null;
            const color = c.tier === 'A' ? 'green' : c.tier === 'B' ? 'blue' : 'grey';
            return (
              <Marker key={c.id} position={[c.latitude, c.longitude]}
                icon={L ? new L.Icon({ iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`, shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowSize: [41,41] }) : undefined}>
                <Popup>
                  <div className="min-w-[180px]">
                    <h3 className="font-bold text-sm">{c.garage_name}</h3>
                    <div className="text-xs space-y-1 mt-1">
                      {c.phone && <p className="flex items-center gap-1"><Phone size={10} /> {c.phone}</p>}
                      {c.salesperson_name && <p>{t('salesperson')}: {c.salesperson_name}</p>}
                      {c.total_orders > 0 && <p>{c.total_orders} {t('orders_suffix')} | {fm(c.total_spent)}</p>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => navigate(`/customers/${c.id}`)} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">{t('details')}</button>
                      <button onClick={() => navigate(`/orders/new?customer=${c.id}`)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">{t('order')}</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-600 rounded-full inline-block"></span> {t('aTier')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-600 rounded-full inline-block"></span> {t('bTier')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-500 rounded-full inline-block"></span> {t('cTier')}</span>
      </div>
    </div>
  );
}
