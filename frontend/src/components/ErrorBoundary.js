import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (typeof window !== 'undefined' && window.console) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
    try {
      const API = process.env.REACT_APP_API_URL;
      if (API && navigator.onLine) {
        fetch(`${API}/api/client-errors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: String(error?.message || error),
            stack: String(error?.stack || '').slice(0, 4000),
            componentStack: String(errorInfo?.componentStack || '').slice(0, 4000),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ts: new Date().toISOString(),
          }),
        }).catch(() => {});
      }
    } catch {}
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/app';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex p-4 bg-red-100 rounded-full mb-4">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-600 mb-6">
              The page hit an unexpected error. Your work is safe. Try reloading, or head back to the dashboard.
            </p>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="text-left bg-slate-50 rounded-lg p-3 mb-4 text-xs">
                <summary className="cursor-pointer font-medium text-slate-700 mb-1">Technical details</summary>
                <pre className="whitespace-pre-wrap break-all text-slate-600 mt-2 max-h-40 overflow-auto">
{String(this.state.error?.message || '')}
{'\n\n'}
{String(this.state.error?.stack || '').slice(0, 800)}
                </pre>
              </details>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
              >
                <RefreshCw size={16} /> Try again
              </button>
              <button
                onClick={this.handleHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                <Home size={16} /> Dashboard
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-medium"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
