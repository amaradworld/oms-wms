import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

const FALLBACK_COMPANIES = [
  { id: 'tenant-1', name: 'InfiStyles', slug: 'infi' },
  { id: 'tenant-2', name: 'Aria Fashion', slug: 'aria' },
  { id: 'tenant-3', name: 'ZenCart', slug: 'zencart' },
  { id: 'tenant-4', name: 'PrimeWear', slug: 'primewear' },
  { id: 'tenant-5', name: 'EcoThreads', slug: 'ecothreads' },
];

export const COMPANIES = FALLBACK_COMPANIES;

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState(FALLBACK_COMPANIES);

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

    axios.get(`${API}/api/tenants`).then(res => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        setCompanies(res.data.map(t => ({ id: t.id, name: t.name, slug: t.slug, isActive: t.isActive })));
      }
    }).catch(() => { /* use fallback */ });
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

  const [selectedFacility, setSelectedFacility] = useState(() => {
    const saved = localStorage.getItem('selectedFacility');
    return saved ? JSON.parse(saved) : null;
  });

  const handleSetFacility = (facility) => {
    setSelectedFacility(facility);
    localStorage.setItem('selectedFacility', JSON.stringify(facility));
  };

  const clearSelectedFacility = () => {
    setSelectedFacility(null);
    localStorage.removeItem('selectedFacility');
  };

  const detectSubdomain = () => {
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'localhost') {
      return parts[0];
    }
    return null;
  };

  const findCompanyBySubdomain = (subdomain) => {
    if (!subdomain) return null;
    return companies.find(c => c.slug === subdomain) || null;
  };

  return (
    <AuthContext.Provider value={{
      user, company, tenantId, loading, login, logout,
      detectSubdomain, findCompanyBySubdomain, companies,
      selectedFacility, setSelectedFacility: handleSetFacility, clearSelectedFacility,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
