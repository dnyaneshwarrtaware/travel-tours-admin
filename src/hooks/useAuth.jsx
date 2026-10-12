import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (data, isAdmin = false) => {
    setLoading(true);
    try {
      const res = isAdmin
        ? await authService.adminLogin(data)
        : await authService.customerLogin(data);
      const { token, refreshToken, user: userData } = res.data;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('auth_user', JSON.stringify({ ...userData, type: isAdmin ? 'admin' : 'customer' }));
      setUser({ ...userData, type: isAdmin ? 'admin' : 'customer' });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data) => {
    setLoading(true);
    try {
      const res = await authService.register(data);
      const { token, refreshToken, user: userData } = res.data;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('auth_user', JSON.stringify({ ...userData, type: 'customer' }));
      setUser({ ...userData, type: 'customer' });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const isAdmin = user?.type === 'admin';
  const isCustomer = user?.type === 'customer';
  const isAuthenticated = !!user;

  // UI-only permission check (the API enforces permissions independently)
  const can = useCallback((...perms) => {
    if (!isAdmin) return false;
    const granted = user?.permissions || [];
    return granted.includes('*') || perms.some(p => granted.includes(p));
  }, [isAdmin, user]);

  // Refresh admin permissions on load (role changes take effect without re-login)
  useEffect(() => {
    if (!isAdmin) return;
    authService.getProfile()
      .then(res => {
        const next = { ...user, name: res.data.name, role: res.data.role, permissions: res.data.permissions };
        localStorage.setItem('auth_user', JSON.stringify(next));
        setUser(next);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isCustomer, isAuthenticated, can }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
