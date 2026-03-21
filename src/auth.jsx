import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!api.getAccessToken()) { setIsLoading(false); return; }
    try {
      const res = await api.getMe();
      if (res.ok) {
        setUser(await res.json());
      } else {
        api.clearTokens();
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  // Handle OAuth callback tokens from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get('access');
    const refresh = params.get('refresh');
    if (access && refresh) {
      api.setTokens(access, refresh);
      window.history.replaceState({}, '', window.location.pathname);
      fetchUser();
    }
  }, [fetchUser]);

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password);
    if (res.ok) await fetchUser();
    return res;
  }, [fetchUser]);

  const register = useCallback(async (email, password) => {
    const res = await api.register(email, password);
    return res;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
