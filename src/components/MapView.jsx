import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Car, Clock, User, Navigation } from 'lucide-react';

import { API } from '../api';

// Custom colored marker using divIcon
const createMarkerIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;border-radius:50%;
    background:${color};border:3px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);
    display:flex;align-items:center;justify-content:center;
  ">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const markerIcons = {
  available: createMarkerIcon('#059669'),
  'in-use': createMarkerIcon('#3b82f6'),
  maintenance: createMarkerIcon('#f59e0b'),
  noSignal: createMarkerIcon('#ef4444'),
  noGps: createMarkerIcon('#94a3b8'),
};

function getMarkerIcon(vehicle) {
  if (!vehicle.gpsLat || !vehicle.gpsLng) return markerIcons.noGps;
  if (vehicle.status === 'maintenance') return markerIcons.maintenance;
  if (vehicle.status === 'in-use') {
    const lastUpdate = vehicle.lastGpsUpdate ? new Date(vehicle.lastGpsUpdate) : null;
    const fiveMinAgo = new Date(Date.now() - 5 * 60000);
    return lastUpdate && lastUpdate > fiveMinAgo ? markerIcons['in-use'] : markerIcons.noSignal;
  }
  return markerIcons.available;
}

function formatTimeAgo(date) {
  if (!date) return 'Không có dữ liệu';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

// Auto-refresh map data
function MapUpdater({ setVehicles }) {
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API}/vehicles`)
        .then(r => r.json())
        .then(setVehicles)
        .catch(console.error);
    }, 15000);
    return () => clearInterval(interval);
  }, [setVehicles]);
  return null;
}

export default function MapView() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetch(`${API}/vehicles`)
      .then(r => r.json())
      .then(data => { setVehicles(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const withGps = vehicles.filter(v => v.gpsLat && v.gpsLng);
  const filtered = selectedStatus === 'all' ? withGps : withGps.filter(v => v.status === selectedStatus);

  const statusCounts = {
    total: vehicles.length,
    withGps: withGps.length,
    available: withGps.filter(v => v.status === 'available').length,
    inUse: withGps.filter(v => v.status === 'in-use').length,
    maintenance: withGps.filter(v => v.status === 'maintenance').length,
  };

  if (loading) return <div className="empty-state"><p>Đang tải bản đồ...</p></div>;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Bản đồ Giám sát</h1>
          <p>{statusCounts.withGps}/{statusCounts.total} xe có dữ liệu GPS.</p>
        </div>
      </div>

      {/* Status Legend */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { v: 'all', l: `Tất cả (${statusCounts.withGps})`, c: '#334155' },
          { v: 'available', l: `Sẵn sàng (${statusCounts.available})`, c: '#059669' },
          { v: 'in-use', l: `Đang đi (${statusCounts.inUse})`, c: '#3b82f6' },
          { v: 'maintenance', l: `Bảo trì (${statusCounts.maintenance})`, c: '#f59e0b' },
        ].map(s => (
          <button key={s.v} onClick={() => setSelectedStatus(s.v)}
            className={`filter-tab ${selectedStatus === s.v ? 'active' : ''}`}
            style={selectedStatus === s.v ? { borderLeft: `3px solid ${s.c}` } : {}}>
            {s.l}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <MapContainer
          center={[18.34, 105.91]}
          zoom={13}
          style={{ height: 'calc(100vh - 250px)', minHeight: 400, width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater setVehicles={setVehicles} />
          {filtered.map(v => (
            <Marker
              key={v._id}
              position={[v.gpsLat, v.gpsLng]}
              icon={getMarkerIcon(v)}
            >
              <Popup>
                <div style={{ minWidth: 200, fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {v.imageUrl ? (
                      <img src={v.imageUrl} alt={v.plate} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f1f5f9', display: 'grid', placeItems: 'center' }}>
                        <Car size={20} color="#94a3b8" />
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{v.plate}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{v.model} - {v.type}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={12} /> {v.driverId?.name || 'Chưa phân công tài xế'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Navigation size={12} /> {v.currentKm?.toLocaleString() || '—'} km
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {formatTimeAgo(v.lastGpsUpdate)}
                    </div>
                  </div>
                  <div style={{ marginTop: 8, padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, textAlign: 'center',
                    background: v.status === 'available' ? '#d1fae5' : v.status === 'in-use' ? '#dbeafe' : '#fef3c7',
                    color: v.status === 'available' ? '#047857' : v.status === 'in-use' ? '#1d4ed8' : '#b45309'
                  }}>
                    {v.status === 'available' ? 'Sẵn sàng' : v.status === 'in-use' ? 'Đang đi' : 'Bảo trì'}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
