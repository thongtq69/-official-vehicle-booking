import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Car, X } from 'lucide-react';
import { API } from '../api';
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

  const statusLabel = (s) => s === 'available' ? 'Sẵn sàng' : s === 'in-use' ? 'Đang đi' : 'Bảo trì';

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Quản lý Đội xe</h1>
          <p>{vehicles.length} phương tiện đang quản lý.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={18} /> Thêm xe mới</button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input">
          <Search size={18} />
          <input className="form-input" placeholder="Tìm biển số, model, tài xế..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-tabs">
          {[
            { v: 'all', l: 'Tất cả' },
            { v: 'available', l: 'Sẵn sàng' },
            { v: 'in-use', l: 'Đang đi' },
            { v: 'maintenance', l: 'Bảo trì' }
          ].map(s => (
            <button key={s.v} className={`filter-tab ${filterStatus === s.v ? 'active' : ''}`} onClick={() => setFilterStatus(s.v)}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="responsive-grid">
        {filtered.map(v => (
          <div key={v._id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {v.imageUrl ? (
                <img src={v.imageUrl} alt={v.plate} style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: 10, background: 'var(--gray-100)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Car size={28} color="var(--gray-400)" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{v.plate}</h3>
                    <p className="text-sm text-dim">{v.model} ({v.year || '?'})</p>
                  </div>
                  <span className={`badge badge-${v.status}`}><span className="badge-dot" />{statusLabel(v.status)}</span>
                </div>
                <p className="text-sm text-dim" style={{ marginTop: 4 }}>{v.type}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span className="text-sm text-dim">
                    {v.driverId?.name || 'Chưa phân'} {v.currentKm ? ` · ${v.currentKm.toLocaleString()} km` : ''}
                  </span>
                  <button onClick={() => openEdit(v)} className="btn btn-icon btn-secondary" style={{ width: 28, height: 28 }}>
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>{editId ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Biển số *</label><input required className="form-input" value={form.plate} onChange={e => setForm({...form, plate: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Model</label><input className="form-input" value={form.model} onChange={e => setForm({...form, model: e.target.value})} /></div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Loại xe</label><input className="form-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})} placeholder="Xe con, Xe bán tải..." /></div>
                  <div className="form-group"><label className="form-label">Năm SX</label><input type="number" className="form-input" value={form.year} onChange={e => setForm({...form, year: e.target.value})} /></div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Tài xế phụ trách</label>
                    <select className="form-input" value={form.driverId} onChange={e => setForm({...form, driverId: e.target.value})}>
                      <option value="">-- Chưa phân --</option>
                      {(drivers || []).map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trạng thái</label>
                    <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                      <option value="available">Sẵn sàng</option>
                      <option value="in-use">Đang đi</option>
                      <option value="maintenance">Bảo trì</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Số Km hiện tại</label><input type="number" className="form-input" value={form.currentKm} onChange={e => setForm({...form, currentKm: e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Huỷ</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Cập nhật' : 'Thêm xe'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
