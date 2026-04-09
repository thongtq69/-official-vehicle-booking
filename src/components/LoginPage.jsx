import React, { useState } from 'react';
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
      minHeight: '100dvh', // Use dynamic viewport height for mobile browsers
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)',
      padding: '16px',
      width: '100vw',
      overflow: 'hidden'
    }}>
      <div className="glass" style={{
        width: '100%', 
        maxWidth: '400px', 
        padding: '40px 24px',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '24px',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        {/* Logo Section */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px', 
            height: '60px', 
            background: 'linear-gradient(135deg, var(--primary), #059669)',
            borderRadius: '18px', 
            display: 'grid', 
            placeItems: 'center', 
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)',
            transform: 'rotate(-5deg)'
          }}>
            <Car size={32} color="white" />
          </div>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: 800, 
            letterSpacing: '-0.5px',
            background: 'linear-gradient(180deg, #fff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            OFFICE CAR
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '6px' }}>Hệ thống Quản lý Xe Công vụ</p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tên đăng nhập
            </label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Nhập tài khoản"
              required
              style={{
                width: '100%', 
                padding: '14px 16px', 
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid var(--border)', 
                borderRadius: '12px', 
                color: 'white',
                fontSize: '1rem', 
                outline: 'none', 
                transition: 'all 0.3s ease'
              }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.background = 'rgba(16, 185, 129, 0.05)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border)';
                e.target.style.background = 'rgba(15, 23, 42, 0.5)';
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                style={{
                  width: '100%', 
                  padding: '14px 48px 14px 16px', 
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid var(--border)', 
                  borderRadius: '12px', 
                  color: 'white',
                  fontSize: '1rem', 
                  outline: 'none', 
                  transition: 'all 0.3s ease'
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.background = 'rgba(16, 185, 129, 0.05)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border)';
                  e.target.style.background = 'rgba(15, 23, 42, 0.5)';
                }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '8px'
              }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              borderRadius: '10px',
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              color: '#f87171', 
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '1.2rem' }}>•</span> {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%', 
              padding: '16px', 
              justifyContent: 'center', 
              fontSize: '1rem',
              opacity: loading ? 0.7 : 1, 
              marginTop: '4px',
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
            }}
          >
            {loading ? 'Đang xác thực...' : <><LogIn size={20} /> Đăng nhập</>}
          </button>
        </form>

        {/* Demo Accounts Section */}
        <div style={{
          width: '100%', 
          padding: '20px', 
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '16px', 
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginTop: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Info size={14} color="var(--primary)" />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Tài khoản Demo
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 12px', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>Admin:</span>
            <span style={{ color: '#fff', fontWeight: 500 }}>admin / 123456</span>
            
            <span style={{ color: 'var(--text-dim)' }}>CVP:</span>
            <span style={{ color: '#fff', fontWeight: 500 }}>cvp / 123456</span>
            
            <span style={{ color: 'var(--text-dim)' }}>Lái xe:</span>
            <span style={{ color: '#fff', fontWeight: 500 }}>SĐT / 123456</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
