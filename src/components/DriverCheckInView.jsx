import { useState, useEffect, useRef } from 'react';
import { ScanLine, Camera, CheckCircle, Clock, MapPin, ChevronRight, Navigation } from 'lucide-react';

const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) => fetch(url, {
  ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...opts.headers }
});

export default function DriverCheckInView() {
  const [myBookings, setMyBookings] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [step, setStep] = useState('list');
  const [metrics, setMetrics] = useState({ startKm: '', endKm: '', craneHours: '', endPhoto: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('assigned');
  const [gpsStatus, setGpsStatus] = useState(null); // 'tracking' | 'error' | null
  const lastGpsSend = useRef(0);

  const fetchMyBookings = () => {
    authFetch(`${API}/bookings/my`)
      .then(r => r.json())
      .then(data => { setMyBookings(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchMyBookings(); }, []);

  // GPS tracking for ongoing bookings
  useEffect(() => {
    const ongoingBooking = myBookings.find(b => b.status === 'ongoing');
    if (!ongoingBooking || !ongoingBooking.vehicleId?._id) {
      setGpsStatus(null);
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    setGpsStatus('tracking');
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        // Throttle: send at most every 15 seconds
        if (now - lastGpsSend.current < 15000) return;
        lastGpsSend.current = now;

        const { latitude, longitude, speed } = pos.coords;
        authFetch(`${API}/vehicles/${ongoingBooking.vehicleId._id}/gps`, {
          method: 'PUT',
          body: JSON.stringify({
            lat: latitude,
            lng: longitude,
            speed: speed || 0,
            bookingId: ongoingBooking._id
          })
        }).catch(console.error);
      },
      (err) => {
        console.error('GPS error:', err);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setGpsStatus(null);
    };
  }, [myBookings]);

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
    return type.includes('nang') || type.includes('cau') || type.includes('thang');
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px', minHeight: 'calc(100vh - 56px)' }}>
      {step === 'list' && (
        <div className="animate-in">
          {/* Tabs */}
          <div className="filter-tabs" style={{ marginBottom: 20 }}>
            <button className={`filter-tab ${tab === 'assigned' ? 'active' : ''}`} onClick={() => setTab('assigned')} style={{ flex: 1, textAlign: 'center' }}>
              Chờ nhận ({myBookings.filter(b => b.status === 'assigned').length})
            </button>
            <button className={`filter-tab ${tab === 'ongoing' ? 'active' : ''}`} onClick={() => setTab('ongoing')} style={{ flex: 1, textAlign: 'center' }}>
              Đang chạy ({myBookings.filter(b => b.status === 'ongoing').length})
            </button>
            <button className={`filter-tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')} style={{ flex: 1, textAlign: 'center' }}>
              Đã xong ({myBookings.filter(b => b.status === 'completed').length})
            </button>
          </div>

          {/* GPS Status */}
          {gpsStatus && (
            <div className={`alert-card ${gpsStatus === 'tracking' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 12 }}>
              <Navigation size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.85rem' }}>
                {gpsStatus === 'tracking' ? 'GPS đang theo dõi vị trí của bạn.' : 'Không thể truy cập GPS. Hãy bật định vị trên điện thoại.'}
              </div>
            </div>
          )}

          {/* Booking Cards */}
          {loading ? (
            <div className="empty-state"><p>Đang tải...</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <ScanLine size={48} />
              <p>Không có lệnh nào.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(b => (
                <div key={b._id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{b.destination}</h3>
                      <p className="text-sm text-dim" style={{ marginTop: 2 }}>{b.purpose}</p>
                    </div>
                    {b.vehicleId && (
                      <span className="badge badge-success" style={{ fontWeight: 700 }}>{b.vehicleId.plate}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', marginBottom: 12 }} className="text-dim">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> {new Date(b.startTime).toLocaleDateString('vi-VN')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} /> {b.requestor}
                    </div>
                  </div>

                  {b.status === 'assigned' && (
                    <button onClick={() => { setActiveBooking(b); setStep('checkin'); }} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                      Nhận lệnh & Check-in <ChevronRight size={18} />
                    </button>
                  )}
                  {b.status === 'ongoing' && (
                    <button onClick={() => { setActiveBooking(b); setStep('checkout'); setMetrics({ ...metrics, startKm: String(b.startKm || '') }); }}
                      className="btn" style={{ width: '100%', justifyContent: 'center', padding: 12, background: 'var(--accent)', color: 'white', border: 'none', fontWeight: 700 }}>
                      Chốt hành trình <ChevronRight size={18} />
                    </button>
                  )}
                  {b.status === 'completed' && b.startKm && b.endKm && (
                    <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem' }}>
                      <span className="text-dim">Km đi: <b>{b.startKm.toLocaleString()}</b></span>
                      <span className="text-dim">Km về: <b>{b.endKm.toLocaleString()}</b></span>
                      <span style={{ color: 'var(--primary-600)', fontWeight: 700 }}>Tổng: {(b.endKm - b.startKm).toLocaleString()} km</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Check-in Form */}
      {step === 'checkin' && activeBooking && (
        <div className="card animate-in" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, background: 'var(--primary-100)', borderRadius: 12, display: 'grid', placeItems: 'center' }}>
              <CheckCircle size={22} color="var(--primary-600)" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700 }}>{activeBooking.vehicleId?.plate}</h3>
              <p className="text-sm text-dim">{activeBooking.destination}</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Chỉ số công tơ mét HIỆN TẠI (Km)</label>
              <input type="number" value={metrics.startKm} onChange={e => setMetrics({ ...metrics, startKm: e.target.value })}
                className="form-input" style={{ fontSize: '1.2rem', textAlign: 'center', padding: 14 }} placeholder="VD: 154954" />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setStep('list'); setActiveBooking(null); }} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: 14 }}>Quay lại</button>
              <button onClick={handleCheckin} disabled={!metrics.startKm} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: 14, opacity: metrics.startKm ? 1 : 0.5 }}>
                Bắt Đầu Hành Trình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-out Form */}
      {step === 'checkout' && activeBooking && (
        <div className="card animate-in" style={{ padding: 24, borderColor: 'var(--accent)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20, color: '#b45309' }}>Chốt Hành Trình — {activeBooking.vehicleId?.plate}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Chỉ số Km LÚC VỀ</label>
              <input type="number" value={metrics.endKm} onChange={e => setMetrics({ ...metrics, endKm: e.target.value })}
                className="form-input" style={{ fontSize: '1.2rem', textAlign: 'center', padding: 14, borderColor: 'var(--accent)' }}
                placeholder={`> ${activeBooking.startKm || '?'}`} />
            </div>
            {isCrane(activeBooking) && (
              <div className="form-group">
                <label className="form-label">Số giờ cẩu thực tế</label>
                <input type="number" value={metrics.craneHours} onChange={e => setMetrics({ ...metrics, craneHours: e.target.value })}
                  className="form-input" style={{ textAlign: 'center' }} placeholder="VD: 5" />
              </div>
            )}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: 14, background: 'var(--gray-50)', borderRadius: 'var(--radius)',
              cursor: 'pointer', border: '1px dashed var(--accent)'
            }}>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              <Camera size={20} color="var(--accent)" />
              <span className="text-sm text-dim" style={{ flex: 1 }}>
                {uploadingPhoto ? 'Đang tải lên...' : metrics.endPhoto ? 'Đã tải lên (Nhấn để đổi ảnh)' : 'Chụp ảnh đồng hồ xác nhận'}
              </span>
            </label>
            {metrics.endPhoto && (
              <img src={metrics.endPhoto} alt="Đồng hồ" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }} />
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setStep('list'); setActiveBooking(null); }} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: 14 }}>Quay lại</button>
              <button onClick={handleCheckout} disabled={!metrics.endKm}
                className="btn" style={{ flex: 1, justifyContent: 'center', padding: 14, background: 'var(--accent)', color: 'white', border: 'none', fontWeight: 700, opacity: metrics.endKm ? 1 : 0.5 }}>
                Chốt Sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {step === 'success' && (
        <div className="animate-in" style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 80, height: 80, background: 'var(--primary-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={40} color="var(--primary-600)" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>Thành Công!</h2>
          <p className="text-dim">Dữ liệu đã được đồng bộ lên hệ thống.</p>
        </div>
      )}
    </div>
  );
}
