import { useState, useEffect } from 'react';
import { Shield, FileCheck, Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const API = 'http://localhost:5000/api';

const statusConfig = {
  expired: { label: 'Hết hạn', badge: 'badge-danger', icon: AlertTriangle, color: '#ef4444' },
  expiring30: { label: 'Sắp hết (30 ngày)', badge: 'badge-warning', icon: Clock, color: '#f59e0b' },
  expiring60: { label: 'Sắp hết (60 ngày)', badge: 'badge-warning', icon: Clock, color: '#f59e0b' },
  ok: { label: 'Còn hạn', badge: 'badge-success', icon: CheckCircle, color: '#059669' },
  unknown: { label: 'Chưa nhập', badge: 'badge-info', icon: Clock, color: '#3b82f6' },
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN');
}

function daysUntil(d) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff;
}

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.unknown;
  return (
    <span className={`badge ${cfg.badge}`}>
      <span className="badge-dot" />
      {cfg.label}
    </span>
  );
}

export default function MaintenanceView() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('registration');

  useEffect(() => {
    fetch(`${API}/vehicles/maintenance-status`)
      .then(r => r.json())
      .then(data => { setVehicles(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const counts = {
    regExpired: vehicles.filter(v => v.registrationStatus === 'expired').length,
    regExpiring: vehicles.filter(v => v.registrationStatus === 'expiring30').length,
    insExpired: vehicles.filter(v => v.insuranceStatus === 'expired').length,
    insExpiring: vehicles.filter(v => v.insuranceStatus === 'expiring30').length,
    maintDue: vehicles.filter(v => v.maintenanceDue).length,
  };

  if (loading) return <div className="empty-state"><p>Đang tải...</p></div>;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Bảo dưỡng & Đăng kiểm</h1>
          <p>Quản lý hạn đăng kiểm, bảo hiểm, lịch bảo dưỡng.</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stat-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card" onClick={() => setTab('registration')} style={{ cursor: 'pointer', borderColor: tab === 'registration' ? 'var(--primary-500)' : undefined }}>
          <div className="stat-icon" style={{ background: counts.regExpired > 0 ? '#fee2e2' : '#d1fae5' }}>
            <FileCheck size={20} color={counts.regExpired > 0 ? '#ef4444' : '#059669'} />
          </div>
          <div className="stat-value" style={{ color: counts.regExpired > 0 ? '#ef4444' : '#059669' }}>
            {counts.regExpired > 0 ? counts.regExpired : counts.regExpiring > 0 ? counts.regExpiring : '0'}
          </div>
          <div className="stat-label">{counts.regExpired > 0 ? 'Đăng kiểm hết hạn' : counts.regExpiring > 0 ? 'Sắp hết hạn ĐK' : 'Đăng kiểm OK'}</div>
        </div>
        <div className="stat-card" onClick={() => setTab('insurance')} style={{ cursor: 'pointer', borderColor: tab === 'insurance' ? 'var(--primary-500)' : undefined }}>
          <div className="stat-icon" style={{ background: counts.insExpired > 0 ? '#fee2e2' : '#d1fae5' }}>
            <Shield size={20} color={counts.insExpired > 0 ? '#ef4444' : '#059669'} />
          </div>
          <div className="stat-value" style={{ color: counts.insExpired > 0 ? '#ef4444' : '#059669' }}>
            {counts.insExpired > 0 ? counts.insExpired : counts.insExpiring > 0 ? counts.insExpiring : '0'}
          </div>
          <div className="stat-label">{counts.insExpired > 0 ? 'Bảo hiểm hết hạn' : counts.insExpiring > 0 ? 'Sắp hết hạn BH' : 'Bảo hiểm OK'}</div>
        </div>
        <div className="stat-card" onClick={() => setTab('maintenance')} style={{ cursor: 'pointer', borderColor: tab === 'maintenance' ? 'var(--primary-500)' : undefined }}>
          <div className="stat-icon" style={{ background: counts.maintDue > 0 ? '#fef3c7' : '#d1fae5' }}>
            <Wrench size={20} color={counts.maintDue > 0 ? '#f59e0b' : '#059669'} />
          </div>
          <div className="stat-value" style={{ color: counts.maintDue > 0 ? '#f59e0b' : '#059669' }}>{counts.maintDue}</div>
          <div className="stat-label">Cần bảo dưỡng (&gt;5000km)</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="filter-bar">
        <div className="filter-tabs">
          <button className={`filter-tab ${tab === 'registration' ? 'active' : ''}`} onClick={() => setTab('registration')}>
            <FileCheck size={14} style={{ marginRight: 4 }} /> Đăng kiểm
          </button>
          <button className={`filter-tab ${tab === 'insurance' ? 'active' : ''}`} onClick={() => setTab('insurance')}>
            <Shield size={14} style={{ marginRight: 4 }} /> Bảo hiểm
          </button>
          <button className={`filter-tab ${tab === 'maintenance' ? 'active' : ''}`} onClick={() => setTab('maintenance')}>
            <Wrench size={14} style={{ marginRight: 4 }} /> Bảo dưỡng
          </button>
        </div>
      </div>

      {/* Registration Tab */}
      {tab === 'registration' && (
        <div className="card">
          <div className="card-header"><h3>Tình trạng đăng kiểm</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Biển số</th>
                    <th>Loại xe</th>
                    <th>Tài xế</th>
                    <th>Hạn đăng kiểm</th>
                    <th>Còn lại</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => {
                    const days = daysUntil(v.registrationExpiry);
                    return (
                      <tr key={v._id} style={v.registrationStatus === 'expired' ? { background: '#fef2f2' } : {}}>
                        <td style={{ fontWeight: 700 }}>{v.plate}</td>
                        <td className="text-dim">{v.type}</td>
                        <td>{v.driverId?.name || '—'}</td>
                        <td>{formatDate(v.registrationExpiry)}</td>
                        <td style={{ fontWeight: 600, color: days !== null && days < 0 ? '#ef4444' : days !== null && days < 30 ? '#f59e0b' : 'var(--gray-600)' }}>
                          {days !== null ? (days < 0 ? `Quá hạn ${Math.abs(days)} ngày` : `${days} ngày`) : '—'}
                        </td>
                        <td><StatusBadge status={v.registrationStatus} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Insurance Tab */}
      {tab === 'insurance' && (
        <div className="card">
          <div className="card-header"><h3>Tình trạng bảo hiểm</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Biển số</th>
                    <th>Loại xe</th>
                    <th>Tài xế</th>
                    <th>Hạn bảo hiểm</th>
                    <th>Còn lại</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.sort((a, b) => {
                    const p = { expired: 0, expiring30: 1, expiring60: 2, unknown: 3, ok: 4 };
                    return (p[a.insuranceStatus] || 4) - (p[b.insuranceStatus] || 4);
                  }).map(v => {
                    const days = daysUntil(v.insuranceExpiry);
                    return (
                      <tr key={v._id} style={v.insuranceStatus === 'expired' ? { background: '#fef2f2' } : {}}>
                        <td style={{ fontWeight: 700 }}>{v.plate}</td>
                        <td className="text-dim">{v.type}</td>
                        <td>{v.driverId?.name || '—'}</td>
                        <td>{formatDate(v.insuranceExpiry)}</td>
                        <td style={{ fontWeight: 600, color: days !== null && days < 0 ? '#ef4444' : days !== null && days < 30 ? '#f59e0b' : 'var(--gray-600)' }}>
                          {days !== null ? (days < 0 ? `Quá hạn ${Math.abs(days)} ngày` : `${days} ngày`) : '—'}
                        </td>
                        <td><StatusBadge status={v.insuranceStatus} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Tab */}
      {tab === 'maintenance' && (
        <div className="card">
          <div className="card-header"><h3>Tình trạng bảo dưỡng (chu kỳ 5.000 km)</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Biển số</th>
                    <th>Tài xế</th>
                    <th style={{ textAlign: 'right' }}>Km hiện tại</th>
                    <th style={{ textAlign: 'right' }}>Km bảo dưỡng gần nhất</th>
                    <th style={{ textAlign: 'right' }}>Km đã đi từ bảo dưỡng</th>
                    <th>Ngày bảo dưỡng</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.sort((a, b) => (b.kmSinceMaintenance || 0) - (a.kmSinceMaintenance || 0)).map(v => (
                    <tr key={v._id} style={v.maintenanceDue ? { background: '#fffbeb' } : {}}>
                      <td style={{ fontWeight: 700 }}>{v.plate}</td>
                      <td>{v.driverId?.name || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{v.currentKm?.toLocaleString() || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{v.lastMaintenanceKm?.toLocaleString() || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: v.maintenanceDue ? '#f59e0b' : 'var(--gray-600)' }}>
                        {v.kmSinceMaintenance !== null ? v.kmSinceMaintenance.toLocaleString() : '—'}
                      </td>
                      <td>{formatDate(v.lastMaintenanceDate)}</td>
                      <td>
                        {v.maintenanceDue ? (
                          <span className="badge badge-warning"><span className="badge-dot" />Cần bảo dưỡng</span>
                        ) : v.kmSinceMaintenance !== null ? (
                          <span className="badge badge-success"><span className="badge-dot" />Bình thường</span>
                        ) : (
                          <span className="badge badge-info"><span className="badge-dot" />Chưa có dữ liệu</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
