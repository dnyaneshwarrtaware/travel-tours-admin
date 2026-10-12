import api from './api';

// Thin wrappers over /api/admin/*. Every value shown in the admin panel comes from these.
const crud = (base) => ({
  list: (params) => api.get(base, { params }),
  get: (id) => api.get(`${base}/${id}`),
  create: (data) => api.post(base, data),
  update: (id, data) => api.put(`${base}/${id}`, data),
});

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getEnquiries: (params) => api.get('/enquiries', { params }),
  updateEnquiry: (id, data) => api.put(`/enquiries/${id}`, data),
  getSettings: (group) => api.get('/settings', { params: { group } }),
  saveSettings: (settings) => api.put('/settings', { settings }),
  uploadImage: (formData) => api.post('/uploads/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const locationsApi = {
  ...crud('/admin/locations'),
  setStatus: (id, is_active) => api.patch(`/admin/locations/${id}/status`, { is_active }),
};

export const routesApi = {
  ...crud('/admin/routes'),
  remove: (id) => api.delete(`/admin/routes/${id}`),
  saveStops: (id, stops) => api.put(`/admin/routes/${id}/stops`, { stops }),
  saveFares: (id, fares) => api.put(`/admin/routes/${id}/fares`, { fares }),
};

export const operatorsApi = crud('/admin/operators');
export const vehiclesApi = crud('/admin/vehicles');

export const seatLayoutsApi = {
  ...crud('/admin/seat-layouts'),
  setSeat: (id, seatId, is_active) => api.patch(`/admin/seat-layouts/${id}/seats/${seatId}`, { is_active }),
};

export const tripsApi = {
  ...crud('/admin/trips'),
  setStatus: (id, status, reason) => api.patch(`/admin/trips/${id}/status`, { status, reason }),
  blockSeats: (id, seat_ids, blocked) => api.post(`/admin/trips/${id}/seats/block`, { seat_ids, blocked }),
};

export const schedulesApi = {
  ...crud('/admin/schedules'),
  generate: (id, from_date, to_date) => api.post(`/admin/schedules/${id}/generate`, { from_date, to_date }),
};

export const bookingsApi = {
  ...crud('/admin/bookings'),
  cancel: (id, reason) => api.post(`/admin/bookings/${id}/cancel`, { reason }),
  setStatus: (id, status) => api.patch(`/admin/bookings/${id}/status`, { status }),
};

export const customersApi = crud('/admin/customers');

export const paymentsApi = {
  list: (params) => api.get('/admin/payments', { params }),
  get: (id) => api.get(`/admin/payments/${id}`),
  verify: (id, data) => api.post(`/admin/payments/${id}/verify`, data),
  markPaid: (id, data) => api.post(`/admin/payments/${id}/mark-paid`, data),
  reject: (id, data) => api.post(`/admin/payments/${id}/reject`, data),
  refund: (id, data) => api.post(`/admin/payments/${id}/refund`, data),
  update: (id, data) => api.put(`/admin/payments/${id}`, data),
};

export const paymentSettingsApi = {
  list: () => api.get('/admin/payment-settings'),
  update: (method, data) => api.put(`/admin/payment-settings/${method}`, data),
  uploadQr: (file) => {
    const fd = new FormData();
    fd.append('qr', file);
    return api.post('/admin/payment-settings/UPI_QR/qr', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const reportsApi = { get: (type, params) => api.get(`/admin/reports/${type}`, { params }) };
export const usersApi = crud('/admin/users');
export const rolesApi = {
  list: () => api.get('/admin/roles'),
  savePermissions: (id, permissions) => api.put(`/admin/roles/${id}/permissions`, { permissions }),
};
export const notificationsApi = {
  list: (params) => api.get('/admin/notifications', { params }),
  unreadCount: () => api.get('/admin/notifications/unread-count'),
  read: (id) => api.post(`/admin/notifications/${id}/read`),
  readAll: () => api.post('/admin/notifications/read-all'),
};
export const auditLogsApi = { list: (params) => api.get('/admin/audit-logs', { params }) };
