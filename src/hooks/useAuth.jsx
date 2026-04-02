import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setToken } from '../api/client';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate from stored JWT on every page load
  useEffect(() => {
    const token = localStorage.getItem('cd_token');
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then(r => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const r = await authApi.login(username, password);
    setToken(r.token); setUser(r.user); return r.user;
  }, []);

  const register = useCallback(async (username, password) => {
    const r = await authApi.register(username, password);
    setToken(r.token); setUser(r.user); return r.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null); setUser(null);
  }, []);

  // Non-explicit deny: false unless permission is explicitly true (or admin)
  const can = useCallback((perm) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions?.[perm] === true;
  }, [user]);

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, can, isAdmin: user?.role === 'admin' }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
