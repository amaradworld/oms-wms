import React, { useState, useEffect } from 'react';
import { Building2, Lock, Mail, ArrowRight, Globe, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { track, setUserProperties } from '../utils/analytics';

const LoginPage = () => {
  const { login, companies } = useAuth();
  const showPlatformLogin = process.env.REACT_APP_SHOW_PLATFORM_LOGIN === 'true';
  const [step, setStep] = useState('company');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaStep, setMfaStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [platformMode, setPlatformMode] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const getSubdomainCompany = () => {
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'localhost') {
      return companies.find(c => c.slug === parts[0]) || null;
    }
    return null;
  };

  useEffect(() => {
    const company = getSubdomainCompany();
    if (company) {
      setSelectedCompany(company);
      setStep('credentials');
    }
  }, [companies]);

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setStep('credentials');
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await API.post('/auth/login', {
        email,
        password,
        ...(platformMode ? {} : { tenantId: selectedCompany.id }),
      });

      if (res.data.mfaRequired) {
        setMfaToken(res.data.mfaToken);
        setMfaStep(true);
        setSubmitting(false);
        return;
      }

      const companyData = platformMode
        ? { id: '__platform__', name: 'Platform', slug: 'platform' }
        : { id: selectedCompany.id, name: selectedCompany.name, slug: selectedCompany.slug };
      login(
        { email, role: res.data.role, name: res.data.name, warehouseId: res.data.warehouseId, id: res.data.userId },
        companyData,
        res.data.token
      );
      track('login_completed', { method: 'credentials', mfa: false, role: res.data.role });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
      track('login_failed', { error_message: err.response?.data?.message || 'invalid_credentials' });
    } finally { setSubmitting(false); }
  };

  const handleMfaChallenge = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await API.post('/auth/mfa-challenge', {
        mfaToken,
        token: totpCode,
      });

      const companyData = platformMode
        ? { id: '__platform__', name: 'Platform', slug: 'platform' }
        : { id: selectedCompany.id, name: selectedCompany.name, slug: selectedCompany.slug };
      login(
        { email, role: res.data.role, name: res.data.name, warehouseId: res.data.warehouseId, id: res.data.userId },
        companyData,
        res.data.token
      );
      track('login_completed', { method: 'credentials', mfa: true, role: res.data.role });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code');
      track('login_failed', { stage: 'mfa', error_message: err.response?.data?.message || 'invalid_mfa' });
    } finally { setSubmitting(false); }
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!email) return setError('Enter your email address');
    setSubmitting(true);
    setError('');
    try {
      const res = await API.post('/auth/forgot-password', { email });
      setResetSent(true);
      toast.success('Reset code sent to your email');
      track('password_reset_requested');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code');
    } finally { setSubmitting(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetCode || !resetNewPassword) return setError('Code and new password are required');
    if (resetNewPassword.length < 4) return setError('Password must be at least 4 characters');
    if (resetNewPassword !== resetConfirmPassword) return setError('Passwords do not match');
    setSubmitting(true);
    setError('');
    try {
      await API.post('/auth/reset-password', { email, code: resetCode, newPassword: resetNewPassword });
      toast.success('Password reset successfully. Sign in with your new password.');
      track('password_reset_completed');
      setStep('credentials');
      setResetCode('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setResetToken('');
      setResetSent(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally { setSubmitting(false); }
  };

  const baseDomain = window.location.hostname.includes('globalsupply.in')
    ? 'globalsupply.in'
    : 'localhost:3000';

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Global Supply" className="h-12 mx-auto mb-4" onError={(e) => { e.target.style.display = 'none'; }} />
          <h1 className="text-4xl font-bold text-white tracking-tight">SupplyHub</h1>
          <p className="text-slate-400 mt-2">Warehouse Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === 'forgot' ? (
            <form onSubmit={resetSent ? handleResetPassword : handleForgotRequest}>
              <div className="text-center mb-6">
                <Lock size={28} className="mx-auto text-blue-600 mb-2" />
                <h2 className="text-xl font-bold">{resetSent ? 'Enter Reset Code' : 'Reset Password'}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {resetSent ? 'Enter the code sent to your email and choose a new password' : 'Enter your email to receive a reset code'}
                </p>
                {selectedCompany && <p className="text-xs text-slate-400 mt-1">{selectedCompany.name}</p>}
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="space-y-4">
                {!resetSent ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="admin@company.com" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Reset Code</label>
                      <input type="text" required value={resetCode} onChange={e => setResetCode(e.target.value)} className="w-full text-center text-lg tracking-[0.3em] px-4 py-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none" placeholder="000000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                      <input type="password" required minLength={4} value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Min 4 characters" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                      <input type="password" required minLength={4} value={resetConfirmPassword} onChange={e => setResetConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Repeat password" />
                    </div>
                  </>
                )}
                <button type="submit" disabled={submitting} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50">
                  {submitting ? 'Please wait...' : resetSent ? 'Reset Password' : 'Send Reset Code'}
                </button>
                <button type="button" onClick={() => { setStep('credentials'); setError(''); setResetSent(false); setResetCode(''); }} className="w-full text-xs text-slate-500 hover:underline">
                  Back to login
                </button>
              </div>
            </form>
          ) : step === 'company' ? (
            <>
              <div className="text-center mb-6">
                <Globe size={32} className="mx-auto text-blue-600 mb-2" />
                <h2 className="text-xl font-bold">Select Your Company</h2>
                <p className="text-sm text-slate-500 mt-1">Choose your organization to continue</p>
              </div>
              <nav aria-label="Company selection" className="space-y-3">
                {companies.filter(c => c.isActive !== false).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCompanySelect(c)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all group"
                  >
                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-violet-100">
                      <Building2 size={20} className="text-slate-600 group-hover:text-violet-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-slate-600">{c.slug}.{baseDomain}</p>
                    </div>
                    <ArrowRight size={18} className="text-slate-500 group-hover:text-violet-600" />
                  </button>
                ))}
              </nav>
              {!platformMode && showPlatformLogin && (
                <button onClick={() => { setPlatformMode(true); setStep('credentials'); setEmail(''); setPassword(''); }} className="w-full mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 hover:text-violet-600 text-center">
                  Platform Owner Login
                </button>
              )}
            </>
          ) : mfaStep ? (
            <form onSubmit={handleMfaChallenge}>
              <div className="text-center mb-6">
                <div className="p-3 bg-violet-100 rounded-xl inline-block mb-3">
                  <Shield size={28} className="text-violet-600" />
                </div>
                <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
                <p className="text-sm text-slate-500 mt-1">Enter the code from your authenticator app</p>
                <p className="text-xs text-slate-400 mt-1">{email}</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Authenticator Code</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-center text-2xl tracking-[0.5em] px-4 py-3 border rounded-lg font-mono focus:ring-2 focus:ring-violet-500 outline-none"
                    placeholder="000000"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || totpCode.length < 6}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Verifying...' : <><Shield size={18} /> Verify & Sign In</>}
                </button>
                <button
                  type="button"
                  onClick={() => { setMfaStep(false); setTotpCode(''); setError(''); }}
                  className="w-full text-xs text-slate-500 hover:underline"
                >
                  Back to login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <div className="text-center mb-6">
                <div className={`p-2 rounded-xl inline-block mb-2 ${platformMode ? 'bg-amber-100' : 'bg-violet-100'}`}>
                  {platformMode ? <Shield size={24} className="text-amber-600" /> : <Building2 size={24} className="text-violet-600" />}
                </div>
                <h2 className="text-xl font-bold">{platformMode ? 'Platform Owner' : selectedCompany.name}</h2>
                {platformMode ? (
                  <button type="button" onClick={() => { setPlatformMode(false); setStep('company'); }} className="text-xs text-amber-600 hover:underline mt-1">
                    Back to company login
                  </button>
                ) : !getSubdomainCompany() && (
                  <button type="button" onClick={() => setStep('company')} className="text-xs text-violet-600 hover:underline mt-1">
                    Change company
                  </button>
                )}
                {!platformMode && <p className="text-xs text-slate-600 mt-1">{selectedCompany.slug}.{baseDomain}</p>}
                {platformMode && <p className="text-xs text-slate-500 mt-1">Manage all companies</p>}
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
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
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
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                        placeholder="••••••••"
                      />
                  </div>
                </div>
                <div className="text-right">
                  <button type="button" onClick={() => setStep('forgot')} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    Forgot Password?
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Signing In...' : <>{platformMode ? 'Sign In as Platform Owner' : <>Sign In to {selectedCompany.name}</>} <ArrowRight size={18} /></>}
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
