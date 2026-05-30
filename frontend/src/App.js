import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import FacilitySelector from './components/FacilitySelector';
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
import GatepassOrder from './pages/GatepassOrder';
import Integrations from './pages/Integrations';
import TrackingPage from './pages/TrackingPage';
import Settings from './pages/Settings';
import Grn from './pages/Grn';
import Putaway from './pages/Putaway';
import BinManager from './pages/BinManager';
import SkuHistory from './pages/SkuHistory';
import Parties from './pages/Parties';
import Companies from './pages/Companies';
import AuditLogs from './pages/AuditLogs';
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
  PLATFORM_ADMIN: ['dashboard','companies','audit-logs'],
  SUPER_ADMIN: ['dashboard','orders','inventory','warehouse','cyclecount','picklist','packing','scanning','returns','marketplace','purchaseorders','stocktransfer','waves','manifests','ndr','courier-routing','inventory-alerts','analytics','settings','gatepass','integrations','grn','gatepass-order','putaway','bins','sku-history','parties','audit-logs'],
  WAREHOUSE_MGR: ['dashboard','orders','inventory','warehouse','cyclecount','picklist','packing','scanning','returns','marketplace','purchaseorders','stocktransfer','waves','manifests','ndr','courier-routing','inventory-alerts','analytics','settings','gatepass','integrations','grn','gatepass-order','putaway','bins','sku-history','parties','audit-logs'],
  PICKER: ['dashboard','picklist','scanning'],
  PACKER: ['dashboard','packing','scanning'],
};

const TAB_TO_HASH = {
  dashboard:'dashboard', orders:'orders', inventory:'inventory', scanning:'scanning', 'audit-logs':'audit-logs',
  picklist:'picklist', packing:'packing', returns:'returns', warehouse:'warehouse',
  cyclecount:'cycle-count', analytics:'analytics', marketplace:'marketplace',
  purchaseorders:'purchase-orders', stocktransfer:'stock-transfer', waves:'wave-picking',
  manifests:'manifests', ndr:'ndr', 'courier-routing':'courier-routing',
  'inventory-alerts':'inventory-alerts', gatepass:'gatepass', 'gatepass-order':'gatepass-order',
  integrations:'integrations', grn:'grn', putaway:'putaway', bins:'bin-locations',
  'sku-history':'sku-history', parties:'parties', companies:'companies', settings:'settings',
};

const HASH_TO_TAB = Object.fromEntries(Object.entries(TAB_TO_HASH).map(([k, v]) => [v, k]));

const parseHash = () => {
  const raw = window.location.hash.replace(/^#\//, '');
  const [tabPath, ...rest] = raw.split('?');
  const params = new URLSearchParams(rest.join('?'));
  return { tab: HASH_TO_TAB[tabPath] || 'dashboard', detailId: params.get('id') || '' };
};

const App = () => {
  const { user, isAuthenticated, loading, getToken, selectedFacility, clearSelectedFacility } = useAuth();
  const role = user?.role || '';
  const initial = parseHash();
  const [activeTab, setActiveTabState] = useState(initial.tab);
  const [detailId, setDetailIdState] = useState(initial.detailId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const setActiveTab = (tab, entityId) => {
    setActiveTabState(tab);
    setDetailIdState(entityId || '');
    const hash = TAB_TO_HASH[tab];
    if (hash) window.location.hash = entityId ? `#/${hash}?id=${entityId}` : `#/${hash}`;
  };

  const setDetailId = (id) => {
    setDetailIdState(id || '');
    const hash = TAB_TO_HASH[activeTab];
    if (hash) window.location.hash = id ? `#/${hash}?id=${id}` : `#/${hash}`;
  };

  useEffect(() => {
    const onHashChange = () => {
      const { tab, detailId: id } = parseHash();
      if (tab) { setActiveTabState(tab); setDetailIdState(id); }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (role === 'PLATFORM_ADMIN' && activeTab === 'dashboard') setActiveTab('companies');
  }, [role]);

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
    const hashTab = HASH_TO_TAB[window.location.hash.replace('#/', '')];
    if (hashTab) setActiveTab(hashTab);
    return <LoginPage />;
  }

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} getToken={getToken} />;
  }

  const pageProps = { detailId, setDetailId, onNavigate: setActiveTab, activeTab, setActiveTab };

  const renderContent = () => {
    const allowed = roleAccess[role] || ['dashboard'];
    if (!allowed.includes(activeTab)) return <UNAUTHORIZED />;
    switch (activeTab) {
      case 'dashboard': return <Dashboard {...pageProps} />;
      case 'orders': return <Orders {...pageProps} />;
      case 'inventory': return <Inventory {...pageProps} />;
      case 'scanning': return <ScanningScreen {...pageProps} />;
      case 'picklist': return <Picklist {...pageProps} />;
      case 'packing': return <PackingScreen {...pageProps} />;
      case 'returns': return <Returns {...pageProps} />;
      case 'warehouse': return <Warehouse {...pageProps} />;
      case 'cyclecount': return <CycleCount {...pageProps} />;
      case 'analytics': return <Analytics {...pageProps} />;
      case 'marketplace': return <MarketplaceSettings {...pageProps} />;
      case 'purchaseorders': return <PurchaseOrders {...pageProps} />;
      case 'stocktransfer': return <StockTransfer {...pageProps} />;
      case 'waves': return <WavePicking {...pageProps} />;
      case 'manifests': return <Manifests {...pageProps} />;
      case 'ndr': return <NdrDashboard {...pageProps} />;
      case 'courier-routing': return <CourierRouting {...pageProps} />;
      case 'inventory-alerts': return <InventoryAlerts {...pageProps} />;
      case 'gatepass': return <Gatepasses {...pageProps} />;
      case 'gatepass-order': return <GatepassOrder {...pageProps} />;
      case 'integrations': return <Integrations {...pageProps} />;
      case 'grn': return <Grn {...pageProps} />;
      case 'putaway': return <Putaway {...pageProps} />;
      case 'bins': return <BinManager {...pageProps} />;
      case 'sku-history': return <SkuHistory {...pageProps} />;
      case 'parties': return <Parties {...pageProps} />;
      case 'companies': return <Companies {...pageProps} />;
      case 'audit-logs': return <AuditLogs {...pageProps} />;
      case 'settings': return <Settings {...pageProps} />;
      default: return <FallbackPage />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="flex-1 min-w-0 overflow-y-auto bg-slate-50">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg">
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold tracking-tight text-slate-900 mr-auto md:mr-0">SupplyHub</h1>
          <div className="flex-1 md:flex-initial" />
          <FacilitySelector />
        </header>
        {renderContent()}
      </main>
      <ToastContainer />
      <AssistantBot onNavigate={setActiveTab} />
    </div>
  );
};

export default App;
