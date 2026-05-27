import React, { useState, useEffect } from 'react';
import { Menu, X, Building2 } from 'lucide-react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import ScanningScreen from './pages/ScanningScreen';
import Picklist from './pages/Picklist';
import PackingScreen from './pages/PackingScreen';
import Returns from './pages/Returns';
import Warehouse from './pages/Warehouse';
import CycleCount from './pages/CycleCount';
import Analytics from './pages/Analytics';
import MarketplaceSettings from './pages/MarketplaceSettings';
import PurchaseOrders from './pages/PurchaseOrders';
import StockTransfer from './pages/StockTransfer';
import WavePicking from './pages/WavePicking';
import TrackingPage from './pages/TrackingPage';
import Settings from './pages/Settings';
import LoginPage from './pages/LoginPage';
import OnboardingWizard from './components/OnboardingWizard';
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

const UNAUTHORIZED = () => (
  <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
    <div className="text-center text-slate-400">
      <div className="text-5xl mb-4">🔒</div>
      <p className="text-lg font-medium">Access Denied</p>
      <p className="text-sm mt-1">You don't have permission to view this page.</p>
    </div>
  </div>
);

const roleAccess = {
  SUPER_ADMIN: ['dashboard','orders','inventory','warehouse','cyclecount','picklist','packing','scanning','returns','marketplace','purchaseorders','stocktransfer','waves','analytics','settings'],
  WAREHOUSE_MGR: ['dashboard','orders','inventory','warehouse','cyclecount','picklist','packing','scanning','returns','marketplace','purchaseorders','stocktransfer','waves','analytics','settings'],
  PICKER: ['dashboard','picklist','scanning'],
  PACKER: ['dashboard','packing','scanning'],
};

const App = () => {
  const { user, isAuthenticated, loading, getToken, selectedFacility, clearSelectedFacility } = useAuth();
  const role = user?.role || '';
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const API = process.env.REACT_APP_API_URL;

  useEffect(() => {
    if (isAuthenticated && !showOnboarding) {
      const checkOnboarding = async () => {
        try {
          const { data } = await axios.get(`${API}/api/warehouses`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (data.length === 0 && (role === 'SUPER_ADMIN' || role === 'WAREHOUSE_MGR')) {
            setShowOnboarding(true);
          }
        } catch {}
      };
      checkOnboarding();
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const isTrackPage = window.location.hash === '#/track' || window.location.pathname.startsWith('/track');
    if (isTrackPage) return <TrackingPage />;
    return <LoginPage />;
  }

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} getToken={getToken} />;
  }

  const renderContent = () => {
    const allowed = roleAccess[role] || ['dashboard'];
    if (!allowed.includes(activeTab)) return <UNAUTHORIZED />;
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'orders': return <Orders />;
      case 'inventory': return <Inventory />;
      case 'scanning': return <ScanningScreen />;
      case 'picklist': return <Picklist />;
      case 'packing': return <PackingScreen />;
      case 'returns': return <Returns />;
      case 'warehouse': return <Warehouse />;
      case 'cyclecount': return <CycleCount />;
      case 'analytics': return <Analytics />;
      case 'marketplace': return <MarketplaceSettings />;
      case 'purchaseorders': return <PurchaseOrders />;
      case 'stocktransfer': return <StockTransfer />;
      case 'waves': return <WavePicking />;
      case 'settings': return <Settings />;
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
