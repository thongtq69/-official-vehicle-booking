import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Car, X } from 'lucide-react';

const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) => fetch(url, {
  ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...opts.headers }
});

export default function VehiclesView({ vehicles: initialVehicles, drivers }) {
  const [vehicles, setVehicles] = useState(initialVehicles || []);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ plate: '', model: '', type: '', year: '', driverId: '', status: 'available', currentKm: '' });

  useEffect(() => { setVehicles(initialVehicles); }, [initialVehicles]);

  const refresh = () => fetch(`${API}/vehicles`).then(r => r.json()).then(setVehicles);

  const filtered = vehicles.filter(v => {
    const matchSearch = v.plate.toLowerCase().includes(search.toLowerCase()) || v.model.toLowerCase().includes(search.toLowerCase()) || (v.driverId?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openEdit = (v) => {
    setEditId(v._id);
    setForm({ plate: v.plate, model: v.model, type: v.type, year: v.year || '', driverId: v.driverId?._id || '', status: v.status, currentKm: v.currentKm || '' });
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm({ plate: '', model: '', type: '', year: '', driverId: '', status: 'available', currentKm: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = { ...form, year: form.year ? Number(form.year) : undefined, currentKm: form.currentKm ? Number(form.currentKm) : undefined, driverId: form.driverId || undefined };
    if (editId) {
      await authFetch(`${API}/vehicles/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await authFetch(`${API}/vehicles`, { method: 'POST', body: JSON.stringify(body) });
    }
    setIsModalOpen(false);
    refresh();
  };

  const inputStyle = { width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', fontSize: '0.9rem' };
  const labelStyle = { display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', fontWeight: 500 };

  return (
    <div className="page-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '0 16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Quản lý Đội xe</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '4px', fontSize: '0.85rem' }}>{vehicles.length} phương tiện đang quản lý.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={20} /> Thêm xe mới</button>
      </header>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', padding: '0 16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input type="text" placeholder="Tìm biển số, model, tài xế..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '40px' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'available', 'in-use', 'maintenance'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)',
              background: filterStatus === s ? 'rgba(16,185,129,0.15)' : 'transparent',
              color: filterStatus === s ? 'var(--primary)' : 'var(--text-dim)',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
            }}>
              {s === 'all' ? 'Tất cả' : s === 'available' ? 'Sẵn sàng' : s === 'in-use' ? 'Đang đi' : 'Bảo trì'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="responsive-grid">
        {filtered.map(v => (
          <div key={v._id} className="glass" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {v.imageUrl ? (
              <img src={v.imageUrl} alt={v.plate} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'var(--surface)', display: 'grid', placeItems: 'center' }}>
                <Car size={32} color="var(--text-dim)" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>{v.plate}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{v.model} ({v.year || '?'})</p>
                </div>
                <span className={`badge badge-${v.status}`}>{v.status === 'available' ? 'Sẵn sàng' : v.status === 'in-use' ? 'Đang đi' : 'Bảo trì'}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '6px' }}>{v.type}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  👤 {v.driverId?.name || 'Chưa phân'} {v.currentKm ? `· ${v.currentKm.toLocaleString()} km` : ''}
                </span>
                <button onClick={() => openEdit(v)} style={{ background: 'rgba(59,130,246,0.15)', border: 'none', color: '#3b82f6', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                  <Edit2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass" style={{ width: '100%', maxWidth: '500px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{editId ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><label style={labelStyle}>Biển số *</label><input required style={inputStyle} value={form.plate} onChange={e => setForm({...form, plate: e.target.value})} /></div>
                <div><label style={labelStyle}>Model</label><input style={inputStyle} value={form.model} onChange={e => setForm({...form, model: e.target.value})} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div><label style={labelStyle}>Loại xe</label><input style={inputStyle} value={form.type} onChange={e => setForm({...form, type: e.target.value})} placeholder="Xe con, Xe bán tải..." /></div>
                <div><label style={labelStyle}>Năm SX</label><input type="number" style={inputStyle} value={form.year} onChange={e => setForm({...form, year: e.target.value})} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Tài xế phụ trách</label>
                  <select style={inputStyle} value={form.driverId} onChange={e => setForm({...form, driverId: e.target.value})}>
                    <option value="">-- Chưa phân --</option>
                    {(drivers || []).map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Trạng thái</label>
                  <select style={inputStyle} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="available">Sẵn sàng</option>
                    <option value="in-use">Đang đi</option>
                    <option value="maintenance">Bảo trì</option>
                  </select>
                </div>
              </div>
              <div><label style={labelStyle}>Số Km hiện tại</label><input type="number" style={inputStyle} value={form.currentKm} onChange={e => setForm({...form, currentKm: e.target.value})} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-dim)', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>{editId ? 'Cập nhật' : 'Thêm xe'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
