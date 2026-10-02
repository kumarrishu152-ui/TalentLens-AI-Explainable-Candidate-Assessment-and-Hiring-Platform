import React, { createContext, useState, useEffect, useContext } from 'react';
import { userAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const rawToken = localStorage.getItem('token');
      // Guard against garbage values ('null', 'undefined', whitespace) left by older sessions.
      const storedToken = rawToken && !['null', 'undefined'].includes(rawToken.trim()) ? rawToken.trim() : null;
      if (storedToken !== rawToken) {
        if (storedToken) localStorage.setItem('token', storedToken);
        else localStorage.removeItem('token');
      }

      if (!storedToken) {
        setUser(null);
        setShowKeyModal(false);
        setLoading(false);
        return;
      }

      try {
        const userData = await userAPI.me();
        const normalizedUser = {
          ...(userData || {}),
          role: (userData && userData.role) ? userData.role : 'recruiter'
        };
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        setUser(normalizedUser || null);
        setShowKeyModal(Boolean(userData && userData.hasApiKey === false));
      } catch (err) {
        console.error('Auth check failed', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setShowKeyModal(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (newToken, userData) => {
    if (!newToken) {
      throw new Error('Missing authentication token');
    }

    const normalizedUser = {
      ...(userData || {}),
      role: (userData && userData.role) ? userData.role : 'recruiter'
    };
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setToken(newToken);
    setUser(normalizedUser);
    setShowKeyModal(normalizedUser.hasApiKey === false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setShowKeyModal(false);
  };

  const updateApiKeyStatus = () => {
    if (user) {
      const updatedUser = { ...user, hasApiKey: true };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setShowKeyModal(false);
    }
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      showKeyModal, 
      setShowKeyModal,
      updateApiKeyStatus,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
