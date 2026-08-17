import React, { createContext, useContext, useEffect, useState } from 'react';
import api from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gs_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('gs_token');
    if (!token) {
      setReady(true);
      return;
    }
    api.get('/auth/me')
      .then(res => {
        setUser(res.data.user);
        localStorage.setItem('gs_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem('gs_token');
        localStorage.removeItem('gs_user');
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  function login(token, user) {
    localStorage.setItem('gs_token', token);
    localStorage.setItem('gs_user', JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('gs_token');
    localStorage.removeItem('gs_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
