import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  user_name?: string;
  name?: string;
  email: string;
  type?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Don't load from localStorage on mount - reloads should log users out
    // Only load from localStorage if it was set during the current session (via login)
    // This is handled by the login() function being called after successful login
    
    // Listen for storage changes (e.g., from other tabs)
    // But only update if the storage event is from another tab (not from our own clear)
    const handleStorageChange = (e: StorageEvent) => {
      // Only handle storage events from other tabs/windows
      // If newValue is null, it means it was cleared (likely by us), so ignore
      if (e.newValue && (e.key === 'accessToken' || e.key === 'auth_token' || e.key === 'user')) {
        if (e.key === 'accessToken' || e.key === 'auth_token') {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              setToken(e.newValue);
              setUser(userData);
              apiClient.setToken(e.newValue);
            } catch (e) {
              // Invalid data
              setToken(null);
              setUser(null);
              apiClient.setToken(null);
            }
          }
        } else if (e.key === 'user') {
          const storedToken = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
          if (storedToken) {
            try {
              const userData = JSON.parse(e.newValue);
              setToken(storedToken);
              setUser(userData);
              apiClient.setToken(storedToken);
            } catch (e) {
              // Invalid data
              setToken(null);
              setUser(null);
              apiClient.setToken(null);
            }
          }
        }
      } else if (e.newValue === null && (e.key === 'accessToken' || e.key === 'auth_token' || e.key === 'user')) {
        // Storage was cleared - log out
        setToken(null);
        setUser(null);
        apiClient.setToken(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    apiClient.setToken(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    apiClient.setToken(null);
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

