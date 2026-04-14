import { useState, useEffect } from 'react';
import { Plus, X, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) => fetch(url, {
  ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...opts.headers }
});

const statusMap = {
  unpaid: { label: 'Chưa nộp', badge: 'badge-danger' },
  paid: { label: 'Đã nộp', badge: 'badge-success' },
  disputed: { label: 'Khiếu nại', badge: 'badge-warning' }
};

export default function ViolationsView({ vehicles, user }) {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    vehicleId: '', plate: '', violationDate: '', description: '', amount: '', location: '', status: 'unpaid'
  });

  const fetchViolations = () => {
    const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
    fetch(`${API}/violations${params}`)
      .then(r => r.json())
      .then(data => { setViolations(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchViolations(); }, [filterStatus]);

  const handleVehicleSelect = (vehicleId) => {
    const v = vehicles.find(x => x._id === vehicleId);
    setForm({ ...form, vehicleId, plate: v?.plate || '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      await authFetch(`${API}/violations/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
    } else {
      await authFetch(`${API}/violations`, { method: 'POST', body: JSON.stringify(form) });
    }
    setIsModalOpen(false);
    setEditId(null);
    fetchViolations();
  };

  const handlePay = async (id) => {
    await authFetch(`${API}/violations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'paid', paidDate: new Date() })
    });
    fetchViolations();
  };

  const openEdit = (v) => {
    setEditId(v._id);
    setForm({
      vehicleId: v.vehicleId?._id || '', plate: v.plate,
      violationDate: v.violationDate ? format(new Date(v.violationDate), 'yyyy-MM-dd') : '',
      description: v.description, amount: v.amount, location: v.location || '', status: v.status
    });
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm({ vehicleId: '', plate: '', violationDate: '', description: '', amount: '', location: '', status: 'unpaid' });
    setIsModalOpen(true);
  };

  const unpaidTotal = violations.filter(v => v.status === 'unpaid').reduce((s, v) => s + (v.amount || 0), 0);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Phạt Nguội</h1>
          <p>Quản lý thông tin phạt nguội theo xe.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={18} /> Thêm vi phạm</button>
      </div>

      {/* Summary */}
      <div className="stat-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2' }}><AlertTriangle size={20} color="#ef4444" /></div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{violations.filter(v => v.status === 'unpaid').length}</div>
          <div className="stat-label">Chưa nộp phạt</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}><DollarSign size={20} color="#f59e0b" /></div>
          <div className="stat-value" style={{ color: '#f59e0b', fontSize: '1.3rem' }}>{unpaidTotal.toLocaleString('vi-VN')}</div>
          <div className="stat-label">Tổng tiền chưa nộp (VND)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}><CheckCircle size={20} color="#059669" /></div>
          <div className="stat-value" style={{ color: '#059669' }}>{violations.filter(v => v.status === 'paid').length}</div>
          <div className="stat-label">Đã nộp phạt</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-tabs">
          {[{ v: 'all', l: 'Tất cả' }, { v: 'unpaid', l: 'Chưa nộp' }, { v: 'paid', l: 'Đã nộp' }, { v: 'disputed', l: 'Khiếu nại' }].map(f => (
            <button key={f.v} className={`filter-tab ${filterStatus === f.v ? 'active' : ''}`} onClick={() => setFilterStatus(f.v)}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Biển số</th>
                  <th>Ngày vi phạm</th>
                  <th>Nội dung</th>
                  <th>Địa điểm</th>
                  <th style={{ textAlign: 'right' }}>Số tiền</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="empty-state"><p>Đang tải...</p></td></tr>
                ) : violations.length === 0 ? (
                  <tr><td colSpan="7" className="empty-state"><p>Không có vi phạm nào.</p></td></tr>
                ) : (
                  violations.map(v => (
                    <tr key={v._id}>
                      <td style={{ fontWeight: 700 }}>{v.plate}</td>
                      <td>{format(new Date(v.violationDate), 'dd/MM/yyyy')}</td>
                      <td style={{ maxWidth: 250 }}>{v.description}</td>
                      <td className="text-dim">{v.location || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>{v.amount?.toLocaleString('vi-VN')} d</td>
                      <td>
                        <span className={`badge ${statusMap[v.status]?.badge}`}>
                          <span className="badge-dot" />
                          {statusMap[v.status]?.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {v.status === 'unpaid' && (
                            <button onClick={() => handlePay(v._id)} className="btn btn-sm" title="Đánh dấu đã nộp"
                              style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', border: '1px solid var(--primary-100)' }}>
                              <CheckCircle size={14} /> Nộp
                            </button>
                          )}
                          <button onClick={() => openEdit(v)} className="btn btn-sm btn-secondary">Sửa</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>{editId ? 'Sửa vi phạm' : 'Thêm vi phạm mới'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Xe vi phạm *</label>
                    <select required className="form-input" value={form.vehicleId} onChange={e => handleVehicleSelect(e.target.value)}>
                      <option value="">-- Chọn xe --</option>
                      {(vehicles || []).map(v => <option key={v._id} value={v._id}>{v.plate} — {v.model}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày vi phạm *</label>
                    <input required type="date" className="form-input" value={form.violationDate} onChange={e => setForm({...form, violationDate: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Nội dung vi phạm *</label>
                  <input required className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Mô tả lỗi vi phạm..." />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Số tiền phạt (VND) *</label>
                    <input required type="number" className="form-input" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="VD: 3000000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Địa điểm</label>
                    <input className="form-input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="TP Hà Tĩnh, QL1A..." />
                  </div>
                </div>
                {editId && (
                  <div className="form-group">
                    <label className="form-label">Trạng thái</label>
                    <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                      <option value="unpaid">Chưa nộp</option>
                      <option value="paid">Đã nộp</option>
                      <option value="disputed">Khiếu nại</option>
                    </select>
                  </div>
                )}
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
