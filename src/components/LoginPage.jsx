import React, { useState } from 'react';
import { Car, Eye, EyeOff, LogIn } from 'lucide-react';

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
      const res = await fetch('http://localhost:5000/api/auth/login', {
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
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--background)', padding: '20px'
    }}>
      <div className="glass" style={{
        width: '100%', maxWidth: '420px', padding: '48px 36px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px', background: 'linear-gradient(135deg, var(--primary), #059669)',
            borderRadius: '16px', display: 'grid', placeItems: 'center', margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
          }}>
            <Car size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>OFFICE CAR</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '4px' }}>Hệ thống Quản lý Xe Công vụ</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 500 }}>
              Tên đăng nhập
            </label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="admin / totruong / cvp / SĐT lái xe"
              required
              style={{
                width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)', borderRadius: '12px', color: 'white',
                fontSize: '0.95rem', outline: 'none', transition: 'border 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 500 }}>
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                style={{
                  width: '100%', padding: '14px 48px 14px 16px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)', borderRadius: '12px', color: 'white',
                  fontSize: '0.95rem', outline: 'none', transition: 'border 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px'
              }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px',
              border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%', padding: '14px', justifyContent: 'center', fontSize: '1rem',
              opacity: loading ? 0.7 : 1, marginTop: '8px'
            }}
          >
            {loading ? 'Đang đăng nhập...' : <><LogIn size={20} /> Đăng nhập</>}
          </button>
        </form>

        {/* Hint */}
        <div style={{
          width: '100%', padding: '16px', background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>
            Tài khoản mặc định:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <span>Admin:</span><span style={{ color: 'var(--primary)' }}>admin / 123456</span>
            <span>Tổ trưởng:</span><span style={{ color: 'var(--primary)' }}>totruong / 123456</span>
            <span>CVP:</span><span style={{ color: 'var(--primary)' }}>cvp / 123456</span>
            <span>Lái xe:</span><span style={{ color: 'var(--primary)' }}>SĐT / 123456</span>
          </div>
        </div>
      </div>
    </div>
  );
}
