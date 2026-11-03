import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, setAuthToken, getAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize authentication on app mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await api.getCurrentUser();
        setUser(profile.user);
        setToken(storedToken);
      } catch (err) {
        console.warn('Sesión expirada o token inválido:', err);
        setAuthToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.login(email, password);
    setAuthToken(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const switchRole = async (role: UserRole): Promise<User> => {
    let email = 'admin@apolodigital.lat';
    if (role === 'superadmin') email = 'superadmin@apolodigital.lat';
    if (role === 'owner') email = 'dueno@apolodigital.lat';
    if (role === 'barber') email = 'alex@apolodigital.lat';
    if (role === 'client') email = 'cliente@apolodigital.lat';

    const res = await api.login(email, 'Apolo2026!');
    setAuthToken(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
