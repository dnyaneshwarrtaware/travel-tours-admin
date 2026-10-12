import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import './styles/globals.css';
import './styles/ui.css';
import './styles/site.css';
import './styles/admin.css';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLocations from './pages/admin/AdminLocations';
import AdminRoutes from './pages/admin/AdminRoutes';
import AdminRouteDetail, { RoutePickerPage } from './pages/admin/AdminRouteDetail';
import AdminOperators from './pages/admin/AdminOperators';
import AdminVehicles from './pages/admin/AdminVehicles';
import AdminSeatLayouts from './pages/admin/AdminSeatLayouts';
import AdminTrips from './pages/admin/AdminTrips';
import AdminTripDetail from './pages/admin/AdminTripDetail';
import AdminSchedules from './pages/admin/AdminSchedules';
import AdminBookings, { AdminCancellations } from './pages/admin/AdminBookings';
import AdminBookingCreate from './pages/admin/AdminBookingCreate';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminPayments from './pages/admin/AdminPayments';
import AdminQrSettings from './pages/admin/AdminQrSettings';
import AdminReports from './pages/admin/AdminReports';
import { AdminUsers, AdminRoles, AdminNotifications, AdminAuditLogs, AdminSettings } from './pages/admin/AdminSystem';
import AdminPackages from './pages/admin/AdminPackages';
import AdminOffers from './pages/admin/AdminOffers';
import AdminEnquiries from './pages/admin/AdminEnquiries';
import AdminBlogs from './pages/admin/AdminBlogs';
import { RequirePerm } from './components/admin/AdminUI';
import AdminLayout, { NAV } from './layouts/AdminLayout';

// Customer sessions are not valid here; only admin tokens get into the panel
const RequireAdmin = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated || !isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
};

const RedirectIfAdmin = ({ children }) => {
  const { isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  return children;
};

// First admin page the user may open (dashboard for most roles)
const AdminHome = () => {
  const { can } = useAuth();
  const first = NAV.flatMap(g => g.items).find(i => can(...i.perm));
  return <Navigate to={first ? first.to : '/admin/notifications'} replace />;
};

const P = (perm, el) => <RequirePerm perm={perm}>{el}</RequirePerm>;

const AppRoutes = () => (
  <Routes>
    <Route index element={<Navigate to="/admin" replace />} />
    <Route path="admin/login" element={<RedirectIfAdmin><AdminLogin /></RedirectIfAdmin>} />
    <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
      <Route index element={<AdminHome />} />
      <Route path="dashboard" element={P('dashboard.view', <AdminDashboard />)} />
      <Route path="locations" element={P('locations.manage', <AdminLocations />)} />
      <Route path="routes" element={P('routes.manage', <AdminRoutes />)} />
      <Route path="routes/:id" element={P(['routes.manage', 'fares.manage'], <AdminRouteDetail />)} />
      <Route path="route-stops" element={P('routes.manage', <RoutePickerPage tab="stops" />)} />
      <Route path="fares" element={P('fares.manage', <RoutePickerPage tab="fares" />)} />
      <Route path="operators" element={P('operators.manage', <AdminOperators />)} />
      <Route path="vehicles" element={P('vehicles.manage', <AdminVehicles />)} />
      <Route path="seat-layouts" element={P('seat_layouts.manage', <AdminSeatLayouts />)} />
      <Route path="trips" element={P('trips.manage', <AdminTrips />)} />
      <Route path="trips/:id" element={P(['trips.manage', 'bookings.view'], <AdminTripDetail />)} />
      <Route path="schedules" element={P('schedules.manage', <AdminSchedules />)} />
      <Route path="bookings" element={P(['bookings.view', 'bookings.manage'], <AdminBookings />)} />
      <Route path="bookings/new" element={P('bookings.manage', <AdminBookingCreate />)} />
      <Route path="customers" element={P('customers.view', <AdminCustomers />)} />
      <Route path="cancellations" element={P(['bookings.view', 'bookings.manage'], <AdminCancellations />)} />
      <Route path="payments" element={P(['payments.view', 'payments.verify'], <AdminPayments />)} />
      <Route path="qr-settings" element={P('payment_settings.manage', <AdminQrSettings />)} />
      <Route path="reports" element={<Navigate to="bookings" replace />} />
      <Route path="reports/:type" element={P('reports.view', <AdminReports />)} />
      <Route path="users" element={P('users.manage', <AdminUsers />)} />
      <Route path="roles" element={P(['roles.manage', 'users.manage'], <AdminRoles />)} />
      <Route path="notifications" element={P('notifications.view', <AdminNotifications />)} />
      <Route path="audit-logs" element={P('audit_logs.view', <AdminAuditLogs />)} />
      <Route path="settings" element={P('settings.manage', <AdminSettings />)} />
      <Route path="packages" element={P('content.manage', <AdminPackages />)} />
      <Route path="offers" element={P('content.manage', <AdminOffers />)} />
      <Route path="enquiries" element={P('content.manage', <AdminEnquiries />)} />
      <Route path="blogs" element={P('content.manage', <AdminBlogs />)} />
    </Route>
    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', borderRadius: '0.625rem', boxShadow: 'var(--shadow-lg)' },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
