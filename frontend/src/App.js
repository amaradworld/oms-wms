import React, { useState } from 'react';
import { Menu, X, Building2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import ScanningScreen from './pages/ScanningScreen';
import Picklist from './pages/Picklist';
import PackingScreen from './pages/PackingScreen';
import Returns from './pages/Returns';
import Warehouse from './pages/Warehouse';
import Analytics from './pages/Analytics';
import MarketplaceSettings from './pages/MarketplaceSettings';
import LoginPage from './pages/LoginPage';
import ToastContainer from './components/Toast';
import { useAuth } from './context/AuthContext';

const FallbackPage = () => (
  <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
    <div className="text-center text-slate-400">
      <div className="text-6xl mb-4">⚙️</div>
      <p className="text-lg font-medium">Coming Soon</p>
      <p className="text-sm mt-1">This module is under development</p>
    </div>
  </div>
);

const App = () => {
  const { isAuthenticated, loading, selectedFacility, clearSelectedFacility } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'orders': return <Orders />;
      case 'inventory': return <Inventory />;
      case 'scanning': return <ScanningScreen />;
      case 'picklist': return <Picklist />;
      case 'packing': return <PackingScreen />;
      case 'returns': return <Returns />;
      case 'warehouse': return <Warehouse />;
      case 'analytics': return <Analytics />;
      case 'marketplace': return <MarketplaceSettings />;
      default: return <FallbackPage />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="sticky top-0 z-30 md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <Menu size={22} />
          </button>
          <div className="text-lg font-bold tracking-tight">OMS<span className="text-blue-500">WMS</span></div>
        </div>
        {selectedFacility && (
          <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Building2 size={14} />
              <span className="font-medium">{selectedFacility.name}</span>
              <span className="text-indigo-200 text-xs ml-1">(filtered view)</span>
            </div>
            <button onClick={clearSelectedFacility} className="flex items-center gap-1 text-indigo-200 hover:text-white transition-colors">
              <X size={14} /> Show All
            </button>
          </div>
        )}
        {renderContent()}
      </main>
      <ToastContainer />
    </div>
  );
};

export default App;
