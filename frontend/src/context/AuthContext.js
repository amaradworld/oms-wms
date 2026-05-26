import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed.user);
        setCompany(parsed.company);
        setTenantId(parsed.tenantId);
      } catch (e) { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = (userData, companyData, token) => {
    const tenant = companyData.tenantId || companyData.id;
    setUser(userData);
    setCompany(companyData);
    setTenantId(tenant);
    localStorage.setItem('token', token);
    localStorage.setItem('auth', JSON.stringify({ user: userData, company: companyData, tenantId: tenant }));
  };

  const logout = () => {
    setUser(null);
    setCompany(null);
    setTenantId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('auth');
  };

  const detectSubdomain = () => {
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'localhost') {
      return parts[0]; // e.g. "infi" from "infi.omswms.com"
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{ user, company, tenantId, loading, login, logout, detectSubdomain, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
