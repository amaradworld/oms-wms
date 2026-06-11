import React from 'react';

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[PageErrorBoundary]', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/app/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-6">
              {this.state.error?.message || 'An unexpected error occurred while loading this page.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;
