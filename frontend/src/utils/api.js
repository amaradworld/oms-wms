import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const API = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Add tenant header from auth context
  const auth = localStorage.getItem('auth');
  if (auth) {
    try {
      const { tenantId } = JSON.parse(auth);
      if (tenantId) config.headers['X-Tenant-Id'] = tenantId;
    } catch (e) { /* ignore */ }
  }
  return config;
});

export default API;
