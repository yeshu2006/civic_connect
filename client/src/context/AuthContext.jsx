import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('civicconnect_token'));
  const [loading, setLoading] = useState(true);

  // Load user on mount or token change
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const storedToken = localStorage.getItem('civicconnect_token');
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success && res.data.user) {
          setUser(res.data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Failed to restore session:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('civicconnect_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const signup = async (userData) => {
    const res = await api.post('/auth/signup', userData);
    if (res.data.success) {
      localStorage.setItem('civicconnect_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data.message || 'Signup failed');
  };

  const logout = () => {
    localStorage.removeItem('civicconnect_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isDeptAdmin = user?.role === 'department_admin';
  const isCitizen = user?.role === 'citizen';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        isSuperAdmin,
        isDeptAdmin,
        isCitizen,
        login,
        signup,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
