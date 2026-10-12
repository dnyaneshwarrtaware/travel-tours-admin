import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Uploaded files (QR images etc.) are served by the backend at /uploads
export const assetUrl = (p) => {
  if (!p) return '';
  if (/^https?:\/\//.test(p)) return p;
  const origin = import.meta.env.VITE_ASSET_URL || (API_BASE.startsWith('http') ? new URL(API_BASE).origin : '');
  return `${origin}${p}`;
};

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

const clearSession = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
};

const loginPath = () => (window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login');

// Response interceptor - unwrap data, refresh expired tokens, normalise errors
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config || {};

    if (error.response?.status === 401 && !original._retry && localStorage.getItem('auth_token')) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const data = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          const newToken = data.data?.data?.token;
          if (newToken) {
            localStorage.setItem('auth_token', newToken);
            localStorage.setItem('refresh_token', data.data?.data?.refreshToken);
            original.headers.Authorization = `Bearer ${newToken}`;
            return api(original);
          }
        } catch {
          clearSession();
          window.location.href = loginPath();
        }
      } else {
        clearSession();
      }
    }

    const message = error.response?.data?.message
      || (error.code === 'ECONNABORTED' ? 'The server took too long to respond. Please try again.' : null)
      || (!error.response ? 'Unable to reach the server. Please check your connection.' : 'Something went wrong');
    const err = new Error(message);
    err.status = error.response?.status;
    err.data = error.response?.data?.data;
    err.errors = error.response?.data?.errors;
    return Promise.reject(err);
  }
);

export default api;
