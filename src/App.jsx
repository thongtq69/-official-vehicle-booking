import { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import BookingsView from './components/BookingsView';
import ReportView from './components/ReportView';
import DriverCheckInView from './components/DriverCheckInView';
import VehiclesView from './components/VehiclesView';
import DriversView from './components/DriversView';
import MapView from './components/MapView';
import ViolationsView from './components/ViolationsView';
import MaintenanceView from './components/MaintenanceView';
import {
  LayoutDashboard, Car, Users, FileText, FileSpreadsheet, QrCode,
  LogOut, Bell, TrendingUp, Wrench, AlertTriangle, Calendar, Menu,
  Clock, MapPin, ShieldAlert
} from 'lucide-react';

// ========== HEADER ==========
const AppHeader = ({ user, onLogout, onToggleSidebar, alerts }) => (
  <header className="app-header">
    <div className="brand">
      <button className="hamburger" onClick={onToggleSidebar}>
        <Menu size={22} />
      </button>
      <div className="brand-icon"><Car size={20} color="white" /></div>
      <div>
        <h1>OFFICE CAR</h1>
        <span>CÔNG TY ĐIỆN LỰC HÀ TĨNH</span>
      </div>
    </div>
    <div className="app-header-right">
      <button className="header-btn" title="Thông báo">
        <Bell size={18} />
        {alerts?.length > 0 && <span className="badge-dot" />}
      </button>
      <div className="header-user" onClick={onLogout}>
        <div className="avatar">{user.fullName?.charAt(0) || 'U'}</div>
        <span className="hidden-mobile">{user.fullName}</span>
        <span className="hidden-mobile" style={{ opacity: 0.7, fontSize: '0.72rem' }}>
          ({user.role === 'team-lead' ? 'Tổ trưởng' : user.role === 'cvp' ? 'Chánh VP' : user.role === 'driver' ? 'Lái xe' : 'Admin'})
        </span>
      </div>
    </div>
  </header>
);

// ========== SIDEBAR ==========
const AppSidebar = ({ activeTab, setActiveTab, user, onLogout, isOpen, onClose }) => {
  const allMenuItems = [
    { section: 'ĐIỀU HÀNH' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tổng quan', roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'map', icon: MapPin, label: 'Bản đồ', roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'bookings', icon: FileText, label: 'Lệnh điều xe', roles: ['admin', 'team-lead', 'cvp'] },
    { section: 'QUẢN LÝ' },
    { id: 'vehicles', icon: Car, label: 'Đội xe', roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'drivers', icon: Users, label: 'Tài xế', roles: ['admin', 'team-lead'] },
    { id: 'violations', icon: ShieldAlert, label: 'Phạt nguội', roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'maintenance', icon: Wrench, label: 'Bảo dưỡng', roles: ['admin', 'team-lead', 'cvp'] },
    { section: 'BÁO CÁO' },
    { id: 'reports', icon: FileSpreadsheet, label: 'Báo cáo tháng', roles: ['admin', 'team-lead', 'cvp'] },
    { section: 'LÁI XE' },
    { id: 'driver-portal', icon: QrCode, label: 'Cổng lái xe', roles: ['driver'] },
  ];

  const handleClick = (id) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          {allMenuItems.filter(m => !m.section || !m.roles || m.roles.includes(user.role)).map((item, i) => {
            if (item.section) {
              return <div key={i} className="sidebar-section-label">{item.section}</div>;
            }
            if (!item.roles.includes(user.role)) return null;
            return (
              <button key={item.id} className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => handleClick(item.id)}>
                <item.icon size={20} className="sidebar-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={onLogout}>
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
};

// ========== BOTTOM NAV (Mobile) ==========
const MobileBottomNav = ({ activeTab, setActiveTab, user }) => {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tổng quan', roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'map', icon: MapPin, label: 'Bản đồ', roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'bookings', icon: FileText, label: 'Lệnh xe', roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'vehicles', icon: Car, label: 'Đội xe', roles: ['admin', 'team-lead', 'cvp'] },
    { id: 'driver-portal', icon: QrCode, label: 'Cổng LX', roles: ['driver'] },
  ].filter(m => m.roles.includes(user.role));

  return (
    <div className="mobile-bottom-nav">
      {items.map(item => (
        <button key={item.id} className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
          <item.icon size={20} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

// ========== DASHBOARD ==========
const Dashboard = ({ vehicles, stats, alerts, todayBookings }) => {
  const statCards = [
    { label: 'Tổng số xe', value: stats.totalVehicles || 0, color: '#3b82f6', bg: '#dbeafe', icon: Car },
    { label: 'Đang hoạt động', value: stats.inUse || 0, color: '#059669', bg: '#d1fae5', icon: TrendingUp },
    { label: 'Đang bảo trì', value: stats.maintenance || 0, color: '#f59e0b', bg: '#fef3c7', icon: Wrench },
    { label: 'Lệnh chờ duyệt', value: stats.pendingBookings || 0, color: '#ef4444', bg: '#fee2e2', icon: AlertTriangle },
  ];

  const statusLabel = (s) => s === 'available' ? 'Sẵn sàng' : s === 'in-use' ? 'Đang đi' : 'Bảo trì';

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Bảng Điều Khiển</h1>
          <p>Tổng quan tình hình đội xe hôm nay.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {statCards.map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: stat.bg }}>
              <stat.icon size={20} color={stat.color} />
            </div>
            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }} className="main-grid-layout">
        {/* Vehicle Table */}
        <div className="card">
          <div className="card-header">
            <h3>Tình trạng đội xe ({vehicles.length} xe)</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Biển số</th>
                    <th>Loại xe</th>
                    <th>Tài xế</th>
                    <th>Km hiện tại</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(car => (
                    <tr key={car._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {car.imageUrl ? (
                            <img src={car.imageUrl} alt={car.plate} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--gray-100)', display: 'grid', placeItems: 'center' }}>
                              <Car size={18} color="var(--gray-400)" />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{car.plate}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{car.model}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--gray-500)' }}>{car.type}</td>
                      <td>{car.driverId?.name || <span style={{ color: 'var(--gray-400)' }}>—</span>}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{car.currentKm?.toLocaleString() || '—'}</td>
                      <td><span className={`badge badge-${car.status}`}><span className="badge-dot" />{statusLabel(car.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Alerts */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} color={alerts?.length > 0 ? '#ef4444' : 'var(--gray-400)'} />
                Cảnh báo
              </h3>
            </div>
            <div className="card-body">
              {alerts && alerts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alerts.map(a => (
                    <div key={a._id} className="alert-card alert-danger">
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Xe {a.plate}</div>
                        <div style={{ fontSize: '0.78rem', marginTop: 2 }}>Sắp hết hạn đăng kiểm / bảo hiểm.</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dim text-sm">Không có cảnh báo nào.</p>
              )}
            </div>
          </div>

          {/* Today Bookings */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} color="var(--primary-600)" />
                Lịch trình hôm nay
              </h3>
            </div>
            <div className="card-body">
              {todayBookings && todayBookings.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {todayBookings.map(b => (
                    <div key={b._id} className="alert-card alert-info">
                      <Clock size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.destination}</div>
                        <div style={{ fontSize: '0.78rem', marginTop: 2 }}>
                          {new Date(b.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} — Xe: {b.vehicleId?.plate || 'Chưa xếp'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dim text-sm">Hôm nay không có lịch trình nào.</p>
              )}
            </div>
          </div>

          {/* Vehicle Types */}
          <div className="card">
            <div className="card-header"><h3>Phân bổ theo loại</h3></div>
            <div className="card-body">
              {(() => {
                const types = {};
                vehicles.forEach(v => { types[v.type] = (types[v.type] || 0) + 1; });
                return Object.entries(types).map(([type, count], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < Object.entries(types).length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                    <span className="text-sm text-dim">{type}</span>
                    <span className="font-bold text-primary">{count}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .main-grid-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      if (u.role === 'driver') setActiveTab('driver-portal');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const base = 'http://localhost:5000/api';
    fetch(`${base}/vehicles`).then(r => r.json()).then(setVehicles).catch(console.error);
    fetch(`${base}/drivers`).then(r => r.json()).then(setDrivers).catch(console.error);
    fetch(`${base}/dashboard/stats`).then(r => r.json()).then(setStats).catch(console.error);
    fetch(`${base}/dashboard/alerts`).then(r => r.json()).then(setAlerts).catch(console.error);
    fetch(`${base}/dashboard/today`).then(r => r.json()).then(setTodayBookings).catch(console.error);
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

  // Driver has simplified layout
  if (user.role === 'driver') {
    return (
      <div>
        <AppHeader user={user} onLogout={handleLogout} onToggleSidebar={() => {}} alerts={[]} />
        <div style={{ marginTop: 'var(--header-height)' }}>
          <DriverCheckInView />
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppHeader user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} alerts={alerts} />
      <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard vehicles={vehicles} stats={stats} alerts={alerts} todayBookings={todayBookings} />}
        {activeTab === 'map' && <MapView />}
        {activeTab === 'vehicles' && <VehiclesView vehicles={vehicles} drivers={drivers} />}
        {activeTab === 'drivers' && <DriversView drivers={drivers} />}
        {activeTab === 'bookings' && <BookingsView vehicles={vehicles} drivers={drivers} user={user} />}
        {activeTab === 'violations' && <ViolationsView vehicles={vehicles} user={user} />}
        {activeTab === 'maintenance' && <MaintenanceView />}
        {activeTab === 'reports' && <ReportView vehicles={vehicles} />}
      </main>

      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
    </div>
  );
}
