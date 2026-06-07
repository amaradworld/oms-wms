import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/Toast';
import ConfirmProvider from './components/ConfirmDialog';
import OfflineIndicator from './components/OfflineIndicator';

const App = lazy(() => import(/* webpackChunkName: "app" */ './App'));

if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const Fallback = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="animate-pulse text-slate-500 text-lg">Loading GlobalSupply…</div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConfirmProvider>
        <AuthProvider>
          <OfflineIndicator />
          <Suspense fallback={<Fallback />}>
            <App />
          </Suspense>
          <ToastContainer />
        </AuthProvider>
      </ConfirmProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
