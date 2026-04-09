import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Phone, X, Car, CreditCard } from 'lucide-react';

const API = 'http://localhost:5000/api';
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

  const inputStyle = { width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', fontSize: '0.9rem' };
  const labelStyle = { display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', fontWeight: 500 };

  const statusLabel = (s) => s === 'available' ? 'Sẵn sàng' : s === 'on-trip' ? 'Đang chạy' : 'Nghỉ phép';
  const statusColor = (s) => s === 'available' ? 'available' : s === 'on-trip' ? 'in-use' : 'maintenance';

  return (
    <div className="page-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '0 16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Quản lý Tài xế</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '4px', fontSize: '0.85rem' }}>{drivers.length} tài xế đang quản lý.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ name: '', phone: '', licenseType: '', status: 'available' }); setIsModalOpen(true); }}>
          <Plus size={20} /> Thêm tài xế
        </button>
      </header>

      {/* Driver Cards */}
      <div className="responsive-grid">
        {drivers.map(d => (
          <div key={d._id} className="glass" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{ width: '52px', height: '52px', minWidth: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #059669)', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
                  {d.name.charAt(d.name.lastIndexOf(' ') + 1)}
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{d.name}</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <Phone size={13} color="var(--text-dim)" />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{d.phone}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <span className={`badge badge-${statusColor(d.status)}`} style={{ whiteSpace: 'nowrap' }}>{statusLabel(d.status)}</span>
                <button onClick={() => openEdit(d)} style={{ background: 'rgba(59,130,246,0.15)', border: 'none', color: '#3b82f6', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                  <Edit2 size={14} />
                </button>
              </div>
            </div>

            {/* License */}
            {d.licenseType && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '12px' }}>
                <CreditCard size={14} color="var(--text-dim)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Bằng lái hạng {d.licenseType}</span>
              </div>
            )}

            {/* Vehicles managed */}
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Xe phụ trách ({d.vehicles?.length || 0})</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(d.vehicles || []).map(v => (
                  <div key={v._id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <Car size={13} color="var(--primary)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{v.plate}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>({v.type})</span>
                  </div>
                ))}
                {(!d.vehicles || d.vehicles.length === 0) && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Chưa có xe phụ trách</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass" style={{ width: '100%', maxWidth: '450px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{editId ? 'Chỉnh sửa tài xế' : 'Thêm tài xế'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><label style={labelStyle}>Họ và tên *</label><input required style={inputStyle} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><label style={labelStyle}>SĐT *</label><input required style={inputStyle} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div>
                  <label style={labelStyle}>Hạng bằng lái</label>
                  <select style={inputStyle} value={form.licenseType} onChange={e => setForm({...form, licenseType: e.target.value})}>
                    <option value="">--</option>
                    <option value="B2">B2</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Trạng thái</label>
                <select style={inputStyle} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="available">Sẵn sàng</option>
                  <option value="on-trip">Đang chạy</option>
                  <option value="off-duty">Nghỉ phép</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-dim)', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>{editId ? 'Cập nhật' : 'Thêm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
