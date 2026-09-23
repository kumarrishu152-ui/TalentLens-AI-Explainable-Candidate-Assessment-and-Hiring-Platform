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
      const storedToken = localStorage.getItem('token');

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

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      showKeyModal, 
      setShowKeyModal,
      updateApiKeyStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);