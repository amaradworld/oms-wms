import React, { useState, useEffect } from 'react';
import { Building2, Lock, Mail, ArrowRight, Globe, AlertCircle } from 'lucide-react';
import { useAuth, COMPANIES } from '../context/AuthContext';
import API from '../utils/api';

const LoginPage = () => {
  const { login } = useAuth();
  const [step, setStep] = useState('company');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const getSubdomainCompany = () => {
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'localhost') {
      return COMPANIES.find(c => c.slug === parts[0]) || null;
    }
    return null;
  };

  useEffect(() => {
    const company = getSubdomainCompany();
    if (company) {
      setSelectedCompany(company);
      setStep('credentials');
    }
  }, []);

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setStep('credentials');
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await API.post('/auth/login', {
        email,
        password,
        tenantId: selectedCompany.id,
      });
      login(
        { email, role: res.data.role, name: res.data.name },
        { id: selectedCompany.id, name: selectedCompany.name, slug: selectedCompany.slug },
        res.data.token
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    }
  };

  const baseDomain = window.location.hostname.includes('globalsupply.in')
    ? 'globalsupply.in'
    : 'localhost:3000';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            OMS<span className="text-blue-400">WMS</span>
          </h1>
          <p className="text-slate-300 mt-2">Multi-Tenant Warehouse Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === 'company' ? (
            <>
              <div className="text-center mb-6">
                <Globe size={32} className="mx-auto text-blue-600 mb-2" />
                <h2 className="text-xl font-bold">Select Your Company</h2>
                <p className="text-sm text-slate-500 mt-1">Choose your organization to continue</p>
              </div>
              <nav aria-label="Company selection" className="space-y-3">
                {COMPANIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCompanySelect(c)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-100">
                      <Building2 size={20} className="text-slate-600 group-hover:text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-slate-600">{c.slug}.{baseDomain}</p>
                    </div>
                    <ArrowRight size={18} className="text-slate-500 group-hover:text-blue-600" />
                  </button>
                ))}
              </nav>
            </>
          ) : (
            <form onSubmit={handleLogin}>
              <div className="text-center mb-6">
                <div className="p-2 bg-blue-100 rounded-xl inline-block mb-2">
                  <Building2 size={24} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-bold">{selectedCompany.name}</h2>
                {!getSubdomainCompany() && (
                  <button
                    type="button"
                    onClick={() => setStep('company')}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    Change company
                  </button>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  {selectedCompany.slug}.{baseDomain}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="admin@company.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Sign In to {selectedCompany.name} <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}
        </div>

        <footer className="text-center text-xs text-slate-400 mt-6">
          Access your company directly via <span className="text-slate-300 font-mono">yourcompany.{baseDomain}</span>
        </footer>
      </div>
    </main>
  );
};

export default LoginPage;
