import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import LoginPage from './components/LoginPage';
import BookingsView from './components/BookingsView';
import ReportView from './components/ReportView';
import DriverCheckInView from './components/DriverCheckInView';
import VehiclesView from './components/VehiclesView';
import DriversView from './components/DriversView';
import {
  LayoutDashboard,
  Car,
  Users,
  FileText,
  Search,
  Plus,
  Calendar,
  Fuel,
  Wrench,
  FileSpreadsheet,
  QrCode,
  LogOut,
  Bell,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

// ========== API HELPER ==========
const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) => fetch(url, {
  ...opts,
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...opts.headers }
});

// ========== SIDEBAR ==========
const Sidebar = ({ activeTab, setActiveTab, user, onLogout }) => {
  const allMenuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tổng quan', roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'vehicles', icon: Car, label: 'Đội xe', roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'drivers', icon: Users, label: 'Tài xế', roles: ['admin', 'team-lead'] },
    { id: 'bookings', icon: FileText, label: 'Lệnh điều xe', roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'reports', icon: FileSpreadsheet, label: 'Báo cáo tháng', roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'driver-portal', icon: QrCode, label: 'Cổng lái xe', roles: ['driver'] },
  ];
  const menuItems = allMenuItems.filter(m => m.roles.includes(user.role));

  return (
    <div className="glass hidden-mobile" style={{ width: '280px', margin: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '10px', display: 'grid', placeItems: 'center' }}>
          <Car size={24} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.5px' }}>OFFICE CAR</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>DIGITAL SYSTEM</span>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              padding: '12px 16px', borderRadius: '12px', border: 'none',
              background: activeTab === item.id ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
              color: activeTab === item.id ? 'var(--primary)' : 'var(--text-dim)',
              display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
              transition: 'all 0.2s ease', textAlign: 'left'
            }}
            className={activeTab === item.id ? '' : 'nav-hover'}
          >
            <item.icon size={20} />
            <span style={{ fontWeight: 600 }}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <div style={{
          padding: '16px', borderRadius: '16px', border: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.03)', marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
              {user.fullName?.charAt(0) || 'U'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.fullName}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{user.role === 'team-lead' ? 'Tổ trưởng' : user.role === 'cvp' ? 'Chánh VP' : user.role === 'driver' ? 'Lái xe' : 'Admin'}</p>
            </div>
          </div>
        </div>
        <button onClick={onLogout} style={{
          width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)',
          background: 'rgba(239,68,68,0.05)', color: '#ef4444', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600
        }}>
          <LogOut size={18} /> Đăng xuất
        </button>
      </div>
    </div>
  );
};

// ========== BOTTOM NAV (Mobile) ==========
const BottomNav = ({ activeTab, setActiveTab, user }) => {
  const allItems = [
    { id: 'dashboard', icon: LayoutDashboard, roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'vehicles', icon: Car, roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'bookings', icon: FileText, roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'reports', icon: FileSpreadsheet, roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'driver-portal', icon: QrCode, roles: ['driver'] },
  ];
  const items = allItems.filter(m => m.roles.includes(user.role));

  return (
    <div className="glass show-mobile" style={{
      position: 'fixed', bottom: '16px', left: '16px', right: '16px',
      padding: '12px', display: 'flex', justifyContent: 'space-around', zIndex: 1000
    }}>
      {items.map(item => (
        <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
          background: 'transparent', border: 'none',
          color: activeTab === item.id ? 'var(--primary)' : 'var(--text-dim)',
          padding: '8px', transition: '0.2s'
        }}>
          <item.icon size={24} />
        </button>
      ))}
    </div>
  );
};

// ========== DASHBOARD ==========
const Dashboard = ({ vehicles, stats, alerts, todayBookings }) => {
  const statCards = [
    { label: 'Tổng số xe', value: stats.totalVehicles || 0, color: 'var(--secondary)', icon: Car },
    { label: 'Đang hoạt động', value: stats.inUse || 0, color: 'var(--primary)', icon: TrendingUp },
    { label: 'Đang bảo trì', value: stats.maintenance || 0, color: 'var(--accent)', icon: Wrench },
    { label: 'Lệnh chờ duyệt', value: stats.pendingBookings || 0, color: '#f43f5e', icon: AlertTriangle },
  ];

  return (
    <div className="page-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '0 16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Bảng Điều Khiển</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '4px', fontSize: '0.85rem' }}>
            Tổng quan tình hình đội xe hôm nay.
          </p>
        </div>
      </header>

      <div className="stat-grid" style={{ marginBottom: '40px', padding: '0 16px' }}>
        {statCards.map((stat, i) => (
          <motion.div key={i} className="glass" whileHover={{ y: -5 }} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 500 }}>{stat.label}</p>
              <stat.icon size={20} color={stat.color} />
            </div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: 700, margin: '8px 0', color: stat.color }}>{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="main-grid" style={{ padding: '0 16px' }}>
        <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tình trạng đội xe ({vehicles.length} xe)</h3>
          </div>

          {/* Desktop Table */}
          <div className="hidden-mobile">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 8px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>BIỂN SỐ</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>LOẠI XE</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>TÀI XẾ</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>KM HIỆN TẠI</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((car) => (
                  <tr key={car._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {car.imageUrl ? (
                          <img src={car.imageUrl} alt={car.plate} style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'var(--surface)', display: 'grid', placeItems: 'center' }}>
                            <Car size={20} color="var(--text-dim)" />
                          </div>
                        )}
                        <div>
                          <p style={{ fontWeight: 600 }}>{car.plate}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{car.model}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>{car.type}</td>
                    <td style={{ padding: '14px 8px', fontSize: '0.85rem' }}>{car.driverId?.name || '—'}</td>
                    <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>{car.currentKm?.toLocaleString() || '—'}</td>
                    <td style={{ padding: '14px 8px' }}>
                      <span className={`badge badge-${car.status}`}>{car.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="show-mobile mobile-card-list">
            {vehicles.map(car => (
              <div key={car._id} className="mobile-card" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {car.imageUrl ? (
                  <img src={car.imageUrl} alt={car.plate} style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: 'var(--surface)', display: 'grid', placeItems: 'center' }}>
                    <Car size={24} color="var(--text-dim)" />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <h4 style={{ fontWeight: 700 }}>{car.plate}</h4>
                    <span className={`badge badge-${car.status}`}>{car.status}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{car.model} - {car.type}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Tài xế: {car.driverId?.name || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px' }}>Phân bổ theo loại</h3>
            {(() => {
              const types = {};
              vehicles.forEach(v => { types[v.type] = (types[v.type] || 0) + 1; });
              return Object.entries(types).map(([type, count], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{type}</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{count}</span>
                </div>
              ));
            })()}
          </div>

          <div className="glass" style={{ padding: '24px', border: alerts?.length > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color={alerts?.length > 0 ? '#ef4444' : 'var(--text-dim)'} />
              Cảnh báo hạn kiểm định / bảo hiểm
            </h3>
            {alerts && alerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alerts.map(a => (
                  <div key={a._id} style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ef4444' }}>Xe {a.plate}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>Sáp hết hạn kiểm định/bảo hiểm.</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Không có cảnh báo nào.</p>
            )}
          </div>

          <div className="glass" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--primary)" />
              Lịch trình trong ngày
            </h3>
            {todayBookings && todayBookings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {todayBookings.map(b => (
                  <div key={b._id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.destination}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>{new Date(b.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • Xe: {b.vehicleId?.plate || 'Chưa xếp'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Hôm nay không có lịch trình chuyến đi nào.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== PLACEHOLDER (for unbuilt views) ==========
const PlaceholderView = ({ title }) => (
  <div style={{ flex: 1, padding: '40px', display: 'grid', placeItems: 'center' }}>
    <div style={{ textAlign: 'center' }}>
      <Wrench size={48} color="var(--text-dim)" style={{ marginBottom: '16px' }} />
      <h2 style={{ color: 'var(--text-dim)', marginBottom: '8px' }}>{title}</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Tính năng đang phát triển...</p>
    </div>
  </div>
);

// ========== MAIN APP ==========
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check existing login
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      if (u.role === 'driver') setActiveTab('driver-portal');
    }
    setLoading(false);
  }, []);

  // Fetch data when logged in
  useEffect(() => {
    if (!user) return;
    fetch(`${API}/vehicles`).then(r => r.json()).then(setVehicles).catch(console.error);
    fetch(`${API}/drivers`).then(r => r.json()).then(setDrivers).catch(console.error);
    fetch(`${API}/dashboard/stats`).then(r => r.json()).then(setStats).catch(console.error);
    fetch(`${API}/dashboard/alerts`).then(r => r.json()).then(setAlerts).catch(console.error);
    fetch(`${API}/dashboard/today`).then(r => r.json()).then(setTodayBookings).catch(console.error);
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    if (userData.role === 'driver') setActiveTab('driver-portal');
    else setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setActiveTab('dashboard');
  };

  if (loading) return null;
  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', gap: '20px', paddingBottom: '80px' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />

      {activeTab === 'dashboard' && <Dashboard vehicles={vehicles} stats={stats} alerts={alerts} todayBookings={todayBookings} />}
      {activeTab === 'vehicles' && <VehiclesView vehicles={vehicles} drivers={drivers} />}
      {activeTab === 'drivers' && <DriversView drivers={drivers} />}
      {activeTab === 'bookings' && <BookingsView vehicles={vehicles} drivers={drivers} user={user} />}
      {activeTab === 'reports' && <ReportView vehicles={vehicles} />}
      {activeTab === 'driver-portal' && <DriverCheckInView vehicles={vehicles} user={user} />}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
    </div>
  );
}
