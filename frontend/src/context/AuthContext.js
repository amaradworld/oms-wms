import React, { createContext, useContext, useState, useEffect } from 'react';

const COMPANIES = [
  { id: 'tenant-1', name: 'InfiStyles', slug: 'infi' },
  { id: 'tenant-2', name: 'Aria Fashion', slug: 'aria' },
  { id: 'tenant-3', name: 'ZenCart', slug: 'zencart' },
  { id: 'tenant-4', name: 'PrimeWear', slug: 'primewear' },
  { id: 'tenant-5', name: 'EcoThreads', slug: 'ecothreads' },
];

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export { COMPANIES };

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
    return COMPANIES.find(c => c.slug === subdomain) || null;
  };

  return (
    <AuthContext.Provider value={{
      user, company, tenantId, loading, login, logout,
      detectSubdomain, findCompanyBySubdomain, COMPANIES,
      selectedFacility, setSelectedFacility: handleSetFacility, clearSelectedFacility,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
