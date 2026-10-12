import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, MapPin, Route, ListOrdered, IndianRupee, Building2, Bus, Armchair, CalendarClock, CalendarRange,
  Ticket, Users, XCircle, CreditCard, QrCode, BarChart3, TrendingUp, Map, Truck, UserCog, ShieldCheck, Bell,
  ScrollText, Settings, Package, Tag, MessageSquare, FileText, ChevronLeft, ChevronRight, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { notificationsApi } from '../services/adminService';
import styles from './AdminLayout.module.css';

export const NAV = [
  { items: [{ to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', perm: ['dashboard.view'] }] },
  {
    title: 'Travel Management', items: [
      { to: '/admin/locations', icon: MapPin, label: 'Locations', perm: ['locations.manage'] },
      { to: '/admin/routes', icon: Route, label: 'Routes', perm: ['routes.manage'] },
      { to: '/admin/route-stops', icon: ListOrdered, label: 'Route Stops', perm: ['routes.manage'] },
      { to: '/admin/fares', icon: IndianRupee, label: 'Fares', perm: ['fares.manage'] },
      { to: '/admin/operators', icon: Building2, label: 'Operators', perm: ['operators.manage'] },
      { to: '/admin/vehicles', icon: Bus, label: 'Vehicles', perm: ['vehicles.manage'] },
      { to: '/admin/seat-layouts', icon: Armchair, label: 'Seat Layouts', perm: ['seat_layouts.manage'] },
      { to: '/admin/trips', icon: CalendarClock, label: 'Trips', perm: ['trips.manage'] },
      { to: '/admin/schedules', icon: CalendarRange, label: 'Schedules', perm: ['schedules.manage'] },
    ],
  },
  {
    title: 'Booking Management', items: [
      { to: '/admin/bookings', icon: Ticket, label: 'Bookings', perm: ['bookings.view', 'bookings.manage'] },
      { to: '/admin/customers', icon: Users, label: 'Customers', perm: ['customers.view'] },
      { to: '/admin/cancellations', icon: XCircle, label: 'Cancellations', perm: ['bookings.view', 'bookings.manage'] },
    ],
  },
  {
    title: 'Payment Management', items: [
      { to: '/admin/payments', icon: CreditCard, label: 'Payments', perm: ['payments.view', 'payments.verify'] },
      { to: '/admin/qr-settings', icon: QrCode, label: 'QR Settings', perm: ['payment_settings.manage'] },
    ],
  },
  {
    title: 'Reports', items: [
      { to: '/admin/reports/bookings', icon: BarChart3, label: 'Booking Report', perm: ['reports.view'] },
      { to: '/admin/reports/revenue', icon: TrendingUp, label: 'Revenue Report', perm: ['reports.view'] },
      { to: '/admin/reports/routes', icon: Map, label: 'Route Report', perm: ['reports.view'] },
      { to: '/admin/reports/vehicles', icon: Truck, label: 'Vehicle Report', perm: ['reports.view'] },
    ],
  },
  {
    title: 'System', items: [
      { to: '/admin/users', icon: UserCog, label: 'Users', perm: ['users.manage'] },
      { to: '/admin/roles', icon: ShieldCheck, label: 'Roles & Permissions', perm: ['roles.manage', 'users.manage'] },
      { to: '/admin/notifications', icon: Bell, label: 'Notifications', perm: ['notifications.view'] },
      { to: '/admin/audit-logs', icon: ScrollText, label: 'Audit Logs', perm: ['audit_logs.view'] },
      { to: '/admin/settings', icon: Settings, label: 'Settings', perm: ['settings.manage'] },
    ],
  },
  {
    title: 'Content', items: [
      { to: '/admin/packages', icon: Package, label: 'Packages', perm: ['content.manage'] },
      { to: '/admin/offers', icon: Tag, label: 'Offers', perm: ['content.manage'] },
      { to: '/admin/enquiries', icon: MessageSquare, label: 'Enquiries', perm: ['content.manage'] },
      { to: '/admin/blogs', icon: FileText, label: 'Blog', perm: ['content.manage'] },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Notification badge (light polling; pauses when the tab is hidden)
  useEffect(() => {
    if (!can('notifications.view')) return undefined;
    const load = () => { if (!document.hidden) notificationsApi.unreadCount().then(r => setUnread(r.data.unread)).catch(() => {}); };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [can, location.pathname]);

  return (
    <div className={`${styles.layout} ${collapsed ? styles.collapsed : ''}`}>
      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link to="/admin/dashboard" className={styles.sidebarLogo}>
            <span className={styles.logoMark}>G</span>
            {!collapsed && <span>Ganraj Traveling <small>Admin</small></span>}
          </Link>
          <button className={styles.collapseBtn} onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className={styles.sidebarNav} aria-label="Admin">
          {NAV.map((group, gi) => {
            const items = group.items.filter(i => can(...i.perm));
            if (!items.length) return null;
            return (
              <div key={gi} className={styles.navGroup}>
                {group.title && !collapsed && <p className={styles.navGroupTitle}>{group.title}</p>}
                {items.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`} title={collapsed ? label : undefined}>
                    <Icon size={17} />
                    {!collapsed && <span>{label}</span>}
                    {to === '/admin/notifications' && unread > 0 && <span className={styles.navCount}>{unread}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminInfo}>
            <div className={styles.adminAvatar}>{user?.name?.[0] || 'A'}</div>
            {!collapsed && (
              <div className={styles.adminDetails}>
                <span className={styles.adminName}>{user?.name}</span>
                <span className={styles.adminRole}>{user?.role?.replace('_', ' ')}</span>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn} title="Sign Out">
            <LogOut size={16} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topBar}>
          <button className={styles.mobileMenuBtn} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className={styles.topBarRight}>
            <Link to="/" target="_blank" className={styles.viewSiteBtn}>View Site ↗</Link>
            {can('notifications.view') && (
              <Link to="/admin/notifications" className={styles.notifBtn} aria-label={`Notifications (${unread} unread)`}>
                <Bell size={18} />
                {unread > 0 && <span className={styles.notifDot}>{unread > 99 ? '99+' : unread}</span>}
              </Link>
            )}
          </div>
        </header>

        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
