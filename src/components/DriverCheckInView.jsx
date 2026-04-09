import React, { useState, useEffect } from 'react';
import { ScanLine, Camera, CheckCircle, Clock, MapPin, ChevronRight, LogOut } from 'lucide-react';

const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) => fetch(url, {
  ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...opts.headers }
});

export default function DriverCheckInView({ vehicles, user }) {
  const [myBookings, setMyBookings] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [step, setStep] = useState('list'); // list, checkin, checkout, success
  const [metrics, setMetrics] = useState({ startKm: '', endKm: '', craneHours: '', endPhoto: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('assigned'); // assigned, ongoing, completed

  const fetchMyBookings = () => {
    authFetch(`${API}/bookings/my`)
      .then(r => r.json())
      .then(data => { setMyBookings(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchMyBookings(); }, []);

  const filtered = myBookings.filter(b => {
    if (tab === 'assigned') return b.status === 'assigned';
    if (tab === 'ongoing') return b.status === 'ongoing';
    return b.status === 'completed';
  });

  const handleCheckin = async () => {
    await authFetch(`${API}/bookings/${activeBooking._id}/checkin`, {
      method: 'PUT',
      body: JSON.stringify({ startKm: Number(metrics.startKm), checkinLocation: 'GPS tự động' })
    });
    setStep('success');
    setTimeout(() => { setStep('list'); setActiveBooking(null); setMetrics({ startKm: '', endKm: '', craneHours: '', endPhoto: '' }); fetchMyBookings(); }, 2000);
  };

  const handleCheckout = async () => {
    await authFetch(`${API}/bookings/${activeBooking._id}/checkout`, {
      method: 'PUT',
      body: JSON.stringify({
        endKm: Number(metrics.endKm),
        craneHours: metrics.craneHours ? Number(metrics.craneHours) : undefined,
        endPhoto: metrics.endPhoto,
        checkoutLocation: 'GPS tự động'
      })
    });
    setStep('success');
    setTimeout(() => { setStep('list'); setActiveBooking(null); setMetrics({ startKm: '', endKm: '', craneHours: '', endPhoto: '' }); fetchMyBookings(); }, 2000);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      setMetrics({ ...metrics, endPhoto: data.url });
    } catch (err) {
      console.error('Lỗi tải ảnh:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const isCrane = (booking) => {
    const type = (booking.vehicleId?.type || '').toLowerCase();
    return type.includes('nâng') || type.includes('cẩu') || type.includes('thang');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const inputStyle = { width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--primary)', borderRadius: '10px', color: 'white', fontSize: '1.2rem', textAlign: 'center' };
  const tabStyle = (active) => ({
    flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
    background: active ? 'rgba(16,185,129,0.2)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--text-dim)',
    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
  });

  return (
    <div style={{ flex: 1, padding: '20px', maxWidth: '520px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>CỔNG LÁI XE</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Xin chào, {user?.fullName || 'Lái xe'}</p>
        </div>
        <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
          <LogOut size={16} /> Thoát
        </button>
      </header>

      {step === 'list' && (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '20px' }}>
            <button style={tabStyle(tab === 'assigned')} onClick={() => setTab('assigned')}>Chờ nhận ({myBookings.filter(b => b.status === 'assigned').length})</button>
            <button style={tabStyle(tab === 'ongoing')} onClick={() => setTab('ongoing')}>Đang chạy ({myBookings.filter(b => b.status === 'ongoing').length})</button>
            <button style={tabStyle(tab === 'completed')} onClick={() => setTab('completed')}>Đã xong ({myBookings.filter(b => b.status === 'completed').length})</button>
          </div>

          {/* Booking Cards */}
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px' }}>Đang tải...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <ScanLine size={48} color="var(--text-dim)" style={{ marginBottom: '16px' }} />
              <p style={{ color: 'var(--text-dim)' }}>Không có lệnh nào.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map(b => (
                <div key={b._id} className="glass" style={{ padding: '18px', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{b.destination}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>{b.purpose}</p>
                    </div>
                    {b.vehicleId && (
                      <span style={{ padding: '4px 10px', background: 'rgba(16,185,129,0.15)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {b.vehicleId.plate}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} /> {new Date(b.startTime).toLocaleDateString('vi-VN')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} /> {b.requestor}
                    </div>
                  </div>

                  {b.status === 'assigned' && (
                    <button onClick={() => { setActiveBooking(b); setStep('checkin'); }} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                      Nhận lệnh & Check-in <ChevronRight size={18} />
                    </button>
                  )}
                  {b.status === 'ongoing' && (
                    <button onClick={() => { setActiveBooking(b); setStep('checkout'); setMetrics({ ...metrics, startKm: String(b.startKm || '') }); }} style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: 'black', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Chốt hành trình <ChevronRight size={18} />
                    </button>
                  )}
                  {b.status === 'completed' && b.startKm && b.endKm && (
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Km đi: <b>{b.startKm.toLocaleString()}</b></span>
                      <span style={{ color: 'var(--text-dim)' }}>Km về: <b>{b.endKm.toLocaleString()}</b></span>
                      <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Tổng: {(b.endKm - b.startKm).toLocaleString()} km</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Check-in Form */}
      {step === 'checkin' && activeBooking && (
        <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '44px', height: '44px', background: 'var(--primary)', borderRadius: '12px', display: 'grid', placeItems: 'center' }}>
              <CheckCircle size={22} color="white" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700 }}>{activeBooking.vehicleId?.plate}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{activeBooking.destination}</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px' }}>Chỉ số công tơ mét HIỆN TẠI (Km)</label>
              <input type="number" value={metrics.startKm} onChange={e => setMetrics({ ...metrics, startKm: e.target.value })} style={inputStyle} placeholder="VD: 154954" />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStep('list'); setActiveBooking(null); }} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>Quay lại</button>
              <button onClick={handleCheckin} disabled={!metrics.startKm} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '14px', opacity: metrics.startKm ? 1 : 0.5 }}>
                Bắt Đầu Hành Trình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-out Form */}
      {step === 'checkout' && activeBooking && (
        <div className="glass" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--accent)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '20px', color: 'var(--accent)' }}>Chốt Hành Trình — {activeBooking.vehicleId?.plate}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px' }}>Chỉ số Km LÚC VỀ</label>
              <input type="number" value={metrics.endKm} onChange={e => setMetrics({ ...metrics, endKm: e.target.value })} style={{ ...inputStyle, borderColor: 'var(--accent)' }} placeholder={`> ${activeBooking.startKm || '?'}`} />
            </div>
            {isCrane(activeBooking) && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px' }}>Số giờ cẩu thực tế</label>
                <input type="number" value={metrics.craneHours} onChange={e => setMetrics({ ...metrics, craneHours: e.target.value })} style={inputStyle} placeholder="VD: 5" />
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', cursor: 'pointer', border: '1px dashed var(--accent)' }}>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              <Camera size={20} color="var(--accent)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', flex: 1 }}>
                {uploadingPhoto ? 'Đang tải lên...' : metrics.endPhoto ? 'Đã tải lên (Nhấn để đổi ảnh)' : 'Chụp ảnh đồng hồ xác nhận'}
              </span>
            </label>
            {metrics.endPhoto && (
              <img src={metrics.endPhoto} alt="Đồng hồ công tơ mét" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }} />
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStep('list'); setActiveBooking(null); }} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>Quay lại</button>
              <button onClick={handleCheckout} disabled={!metrics.endKm} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: 'black', fontWeight: 700, cursor: 'pointer', opacity: metrics.endKm ? 1 : 0.5 }}>
                Chốt Sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {step === 'success' && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={40} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Thành Công!</h2>
          <p style={{ color: 'var(--text-dim)' }}>Dữ liệu đã được đồng bộ lên hệ thống.</p>
        </div>
      )}
    </div>
  );
}
