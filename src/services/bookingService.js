import api from './api';

export const bookingService = {
  create: (data) => api.post('/bookings', data),
  lookup: (booking_number, phone) => api.get('/bookings/lookup', { params: { booking_number, phone } }),
  cancel: (bookingNumber, data) => api.post(`/bookings/${bookingNumber}/cancel`, data),
  getMyBookings: () => api.get('/bookings/my'),
  getMyBooking: (bookingNumber) => api.get(`/bookings/my/${bookingNumber}`),
};

export const tripService = {
  search: (params) => api.get('/trips/search', { params }),
  get: (id) => api.get(`/trips/${id}`),
  fare: (id, params) => api.get(`/trips/${id}/fare`, { params }),
  seats: (id, lockToken) => api.get(`/trips/${id}/seats`, { params: lockToken ? { lock_token: lockToken } : {} }),
  lock: (id, seat_ids, lock_token) => api.post(`/trips/${id}/seats/lock`, { seat_ids, lock_token }),
  release: (id, lock_token) => api.post(`/trips/${id}/seats/release`, { lock_token }),
};

export const paymentOptionsService = {
  getActive: () => api.get('/payment-settings'),
};
