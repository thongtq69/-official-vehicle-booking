import { useState, useEffect } from 'react';
import { Plus, Edit2, Phone, X, Car, CreditCard } from 'lucide-react';

import { API } from '../api';
const getToken = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) => fetch(url, {
  ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...opts.headers }
});

export default function DriversView({ drivers: initialDrivers }) {
  const [drivers, setDrivers] = useState(initialDrivers || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', licenseType: '', status: 'available' });

  useEffect(() => { setDrivers(initialDrivers); }, [initialDrivers]);
  const refresh = () => fetch(`${API}/drivers`).then(r => r.json()).then(setDrivers);

  const openEdit = (d) => {
    setEditId(d._id);
    setForm({ name: d.name, phone: d.phone, licenseType: d.licenseType || '', status: d.status });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      await authFetch(`${API}/drivers/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
    } else {
      await authFetch(`${API}/drivers`, { method: 'POST', body: JSON.stringify(form) });
    }
    setIsModalOpen(false);
    refresh();
  };

  const statusLabel = (s) => s === 'available' ? 'Sẵn sàng' : s === 'on-trip' ? 'Đang chạy' : 'Nghỉ phép';
  const statusBadge = (s) => s === 'available' ? 'available' : s === 'on-trip' ? 'in-use' : 'maintenance';

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Quản lý Tài xế</h1>
          <p>{drivers.length} tài xế đang quản lý.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ name: '', phone: '', licenseType: '', status: 'available' }); setIsModalOpen(true); }}>
          <Plus size={18} /> Thêm tài xế
        </button>
      </div>

      <div className="responsive-grid">
        {drivers.map(d => (
          <div key={d._id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 8 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 48, height: 48, minWidth: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-600), #047857)',
                  display: 'grid', placeItems: 'center',
                  color: 'white', fontWeight: 700, fontSize: '1rem'
                }}>
                  {d.name.charAt(d.name.lastIndexOf(' ') + 1)}
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{d.name}</h3>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                    <Phone size={12} color="var(--gray-400)" />
                    <span className="text-sm text-dim">{d.phone}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <span className={`badge badge-${statusBadge(d.status)}`}><span className="badge-dot" />{statusLabel(d.status)}</span>
                <button onClick={() => openEdit(d)} className="btn btn-icon btn-secondary" style={{ width: 28, height: 28 }}>
                  <Edit2 size={14} />
                </button>
              </div>
            </div>

            {d.licenseType && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', marginBottom: 10 }}>
                <CreditCard size={13} color="var(--gray-400)" />
                <span className="text-sm text-dim">Bằng lái hạng {d.licenseType}</span>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-dim" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                Xe phụ trách ({d.vehicles?.length || 0})
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(d.vehicles || []).map(v => (
                  <div key={v._id} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 8px', background: 'var(--primary-50)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary-100)'
                  }}>
                    <Car size={12} color="var(--primary-600)" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary-700)' }}>{v.plate}</span>
                  </div>
                ))}
                {(!d.vehicles || d.vehicles.length === 0) && (
                  <span className="text-sm text-dim">Chưa có xe phụ trách</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2>{editId ? 'Chỉnh sửa tài xế' : 'Thêm tài xế'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group"><label className="form-label">Họ và tên *</label><input required className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">SĐT *</label><input required className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  <div className="form-group">
                    <label className="form-label">Hạng bằng lái</label>
                    <select className="form-input" value={form.licenseType} onChange={e => setForm({...form, licenseType: e.target.value})}>
                      <option value="">--</option>
                      <option value="B2">B2</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Trạng thái</label>
                  <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="available">Sẵn sàng</option>
                    <option value="on-trip">Đang chạy</option>
                    <option value="off-duty">Nghỉ phép</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Huỷ</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Cập nhật' : 'Thêm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
