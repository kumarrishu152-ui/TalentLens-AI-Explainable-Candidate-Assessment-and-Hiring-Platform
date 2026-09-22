import React, { createContext, useState, useEffect, useContext } from 'react';
import { userAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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
        setUser(userData || null);
        setShowKeyModal(Boolean(userData && userData.hasApiKey === false));
      } catch (err) {
        console.error('Auth check failed', err);
        localStorage.removeItem('token');
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

    const normalizedUser = userData || {};
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(normalizedUser);
    setShowKeyModal(normalizedUser.hasApiKey === false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setShowKeyModal(false);
  };

  const updateApiKeyStatus = () => {
    if (user) {
      setUser({ ...user, hasApiKey: true });
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