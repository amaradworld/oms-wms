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
import Manifests from './pages/Manifests';
import PurchaseOrders from './pages/PurchaseOrders';
import StockTransfer from './pages/StockTransfer';
import WavePicking from './pages/WavePicking';
import NdrDashboard from './pages/NdrDashboard';
import CourierRouting from './pages/CourierRouting';
import InventoryAlerts from './pages/InventoryAlerts';
import Gatepasses from './pages/Gatepasses';
import Integrations from './pages/Integrations';
import TrackingPage from './pages/TrackingPage';
import Settings from './pages/Settings';
import Grn from './pages/Grn';
import Putaway from './pages/Putaway';
import BinManager from './pages/BinManager';
import SkuHistory from './pages/SkuHistory';
import AssistantBot from './components/AssistantBot';
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
  SUPER_ADMIN: ['dashboard','orders','inventory','warehouse','cyclecount','picklist','packing','scanning','returns','marketplace','purchaseorders','stocktransfer','waves','manifests','ndr','courier-routing','inventory-alerts','analytics','settings','gatepass','integrations','grn','gatepass-order','putaway','bins','sku-history'],
  WAREHOUSE_MGR: ['dashboard','orders','inventory','warehouse','cyclecount','picklist','packing','scanning','returns','marketplace','purchaseorders','stocktransfer','waves','manifests','ndr','courier-routing','inventory-alerts','analytics','settings','gatepass','integrations','grn','gatepass-order','putaway','bins','sku-history'],
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
  }, [isAuthenticated, API, getToken, role, showOnboarding]);

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
      case 'manifests': return <Manifests />;
      case 'ndr': return <NdrDashboard />;
      case 'courier-routing': return <CourierRouting />;
      case 'inventory-alerts': return <InventoryAlerts />;
      case 'gatepass': return <Gatepasses />;
      case 'integrations': return <Integrations />;
      case 'grn': return <Grn />;
      case 'putaway': return <Putaway />;
      case 'bins': return <BinManager />;
      case 'sku-history': return <SkuHistory />;
      case 'settings': return <Settings />;
      default: return <FallbackPage />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="flex-1 min-w-0 overflow-y-auto bg-slate-50">
        <div className="sticky top-0 z-30 md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <Menu size={22} />
          </button>
          <div className="text-base font-bold tracking-tight text-slate-900">SupplyHub</div>
        </div>
        {selectedFacility && (
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Building2 size={14} />
              <span className="font-medium">{selectedFacility.name}</span>
              <span className="text-blue-200 text-xs ml-1">(filtered view)</span>
            </div>
            <button onClick={clearSelectedFacility} className="flex items-center gap-1 text-blue-200 hover:text-white transition-colors">
              <X size={14} /> Show All
            </button>
          </div>
        )}
        {renderContent()}
      </main>
      <ToastContainer />
      <AssistantBot onNavigate={setActiveTab} />
    </div>
  );
};

export default App;
