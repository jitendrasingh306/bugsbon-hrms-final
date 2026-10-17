// import { createContext, useContext, useEffect, useState, useCallback } from 'react';
// import { api, getToken, setToken } from './api.js';

// const AuthContext = createContext(null);
// export const useAuth = () => useContext(AuthContext);

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(!!getToken());

//   const logout = useCallback(() => { setToken(null); setUser(null); }, []);

//   useEffect(() => {
//     if (!getToken()) return;
//     api.get('/auth/me').then((r) => setUser(r.user)).catch(logout).finally(() => setLoading(false));
//   }, [logout]);

//   useEffect(() => {
//     window.addEventListener('auth:logout', logout);
//     return () => window.removeEventListener('auth:logout', logout);
//   }, [logout]);

//   const login = async (email, password) => {
//     const r = await api.post('/auth/login', { email, password });
//     setToken(r.token);
//     setUser(r.user);
//   };

//   const value = { user, loading, login, logout, isSuper: user?.system_role === 'super_admin' };
//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// }


import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then((r) => setUser(r.user))
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    window.addEventListener('auth:logout', logout);

    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });

    setToken(r.token);
    setUser(r.user);

    return r.user;
  };

  const homePath =
    user?.system_role === 'employee'
      ? '/employee'
      : '/';

  const value = {
    user,
    loading,
    login,
    logout,
    homePath,
    isSuper: user?.system_role === 'super_admin',
    isSubAdmin: user?.system_role === 'sub_admin',
    isEmployee: user?.system_role === 'employee',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}