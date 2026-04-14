import { useState } from 'react';
import { Car, Eye, EyeOff, LogIn, Info } from 'lucide-react';
import { API } from '../api';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 30%, #f0f9ff 100%)',
      overflow: 'hidden'
    }}>
      {/* Left - Branding */}
      <div className="hidden-mobile" style={{
        flex: 1,
        background: 'linear-gradient(135deg, #047857 0%, #059669 50%, #0d9488 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.1,
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 420 }}>
          <div style={{
            width: 80, height: 80,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 20,
            display: 'grid', placeItems: 'center',
            margin: '0 auto 24px',
            backdropFilter: 'blur(10px)'
          }}>
            <Car size={40} />
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 12, letterSpacing: '-0.5px' }}>
            OFFICE CAR
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, lineHeight: 1.6, marginBottom: 32 }}>
            Hệ thống quản lý xe công vụ
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            {[
              'Số hoá toàn bộ quy trình điều xe',
              'Theo dõi hành trình, Km tức thời',
              'Xuất lệnh, báo cáo tự động'
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.95rem', opacity: 0.9 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.7rem' }}>&#10003;</span>
                </div>
                {text}
              </div>
            ))}
          </div>
          <p style={{ marginTop: 40, fontSize: '0.8rem', opacity: 0.6 }}>
            CÔNG TY ĐIỆN LỰC HÀ TĨNH
          </p>
        </div>
      </div>

      {/* Right - Login Form */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px'
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Mobile Logo */}
          <div className="show-mobile" style={{
            textAlign: 'center', marginBottom: 32,
            flexDirection: 'column', alignItems: 'center'
          }}>
            <div style={{
              width: 56, height: 56,
              background: 'linear-gradient(135deg, #059669, #047857)',
              borderRadius: 14,
              display: 'grid', placeItems: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
            }}>
              <Car size={28} color="white" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-900)' }}>OFFICE CAR</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Hệ thống quản lý xe công vụ</p>
          </div>

          <div className="hidden-mobile">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>
              Đăng nhập
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginBottom: 28 }}>
              Nhập tài khoản để truy cập hệ thống.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Tên đăng nhập</label>
              <input
                className="form-input"
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Nhập tài khoản"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', padding: 6, borderRadius: 6
                }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert-card alert-danger" style={{ padding: '10px 14px' }}>
                <span style={{ fontWeight: 600 }}>{error}</span>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%', padding: '12px', justifyContent: 'center',
                fontSize: '0.95rem', opacity: loading ? 0.7 : 1,
                marginTop: 4
              }}
            >
              {loading ? 'Đang xác thực...' : <><LogIn size={18} /> Đăng nhập</>}
            </button>
          </form>

          {/* Demo Accounts */}
          <div style={{
            marginTop: 28, padding: 16,
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--gray-200)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Info size={14} color="var(--primary-600)" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tài khoản Demo
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--gray-500)' }}>Admin:</span>
              <span style={{ fontWeight: 600 }}>admin / 123456</span>
              <span style={{ color: 'var(--gray-500)' }}>CVP:</span>
              <span style={{ fontWeight: 600 }}>cvp / 123456</span>
              <span style={{ color: 'var(--gray-500)' }}>Lái xe:</span>
              <span style={{ fontWeight: 600 }}>SĐT / 123456</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
