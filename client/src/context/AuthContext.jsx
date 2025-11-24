import React, { createContext, useState, useEffect, useContext } from 'react';
import { userAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          // Verify token and get user details (including if key exists)
          const userData = await userAPI.me(); 
          setUser(userData);
          
          // Trigger modal if key is missing (assuming backend sends hasApiKey boolean)
          if (userData && !userData.hasApiKey) {
            setShowKeyModal(true);
          }
        } catch (err) {
          console.error("Auth check failed", err);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    if (!userData.hasApiKey) setShowKeyModal(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateApiKeyStatus = () => {
    // Called after successful key save
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