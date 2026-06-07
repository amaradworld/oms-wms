import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Menu, Search } from 'lucide-react';
import axios from 'axios';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { trackPageView } from './utils/analytics';
import { toast } from './components/Toast';
import Sidebar from './components/Sidebar';
import FacilitySelector from './components/FacilitySelector';
import GlobalSearch from './components/GlobalSearch';
import OnboardingWizard from './components/OnboardingWizard';
import Welcome from './components/Welcome';
import AssistantBot from './components/AssistantBot';
import HelpButton from './components/HelpButton';
import { useGPrefix } from './hooks/useKeyboardShortcuts';
import { useAuth } from './context/AuthContext';

const Dashboard = lazy(() => import(/* webpackChunkName: "page-dashboard" */ './pages/Dashboard'));
const Orders = lazy(() => import(/* webpackChunkName: "page-orders" */ './pages/Orders'));
const Inventory = lazy(() => import(/* webpackChunkName: "page-inventory" */ './pages/Inventory'));
const ScanningScreen = lazy(() => import(/* webpackChunkName: "page-scanning" */ './pages/ScanningScreen'));
const Picklist = lazy(() => import(/* webpackChunkName: "page-picklist" */ './pages/Picklist'));
const PackingScreen = lazy(() => import(/* webpackChunkName: "page-packing" */ './pages/PackingScreen'));
const Returns = lazy(() => import(/* webpackChunkName: "page-returns" */ './pages/Returns'));
const Warehouse = lazy(() => import(/* webpackChunkName: "page-warehouse" */ './pages/Warehouse'));
const CycleCount = lazy(() => import(/* webpackChunkName: "page-cyclecount" */ './pages/CycleCount'));
const Analytics = lazy(() => import(/* webpackChunkName: "page-analytics" */ './pages/Analytics'));
const MarketplaceSettings = lazy(() => import(/* webpackChunkName: "page-marketplace" */ './pages/MarketplaceSettings'));
const Manifests = lazy(() => import(/* webpackChunkName: "page-manifests" */ './pages/Manifests'));
const PurchaseOrders = lazy(() => import(/* webpackChunkName: "page-purchaseorders" */ './pages/PurchaseOrders'));
const StockTransfer = lazy(() => import(/* webpackChunkName: "page-stocktransfer" */ './pages/StockTransfer'));
const WavePicking = lazy(() => import(/* webpackChunkName: "page-wavepicking" */ './pages/WavePicking'));
const NdrDashboard = lazy(() => import(/* webpackChunkName: "page-ndr" */ './pages/NdrDashboard'));
const CourierRouting = lazy(() => import(/* webpackChunkName: "page-courier" */ './pages/CourierRouting'));
const InventoryAlerts = lazy(() => import(/* webpackChunkName: "page-inventoryalerts" */ './pages/InventoryAlerts'));
const Gatepasses = lazy(() => import(/* webpackChunkName: "page-gatepasses" */ './pages/Gatepasses'));
const GatepassOrder = lazy(() => import(/* webpackChunkName: "page-gatepassorder" */ './pages/GatepassOrder'));
const Integrations = lazy(() => import(/* webpackChunkName: "page-integrations" */ './pages/Integrations'));
const TrackingPage = lazy(() => import(/* webpackChunkName: "page-tracking" */ './pages/TrackingPage'));
const Settings = lazy(() => import(/* webpackChunkName: "page-settings" */ './pages/Settings'));
const Grn = lazy(() => import(/* webpackChunkName: "page-grn" */ './pages/Grn'));
const Putaway = lazy(() => import(/* webpackChunkName: "page-putaway" */ './pages/Putaway'));
const BinManager = lazy(() => import(/* webpackChunkName: "page-binmanager" */ './pages/BinManager'));
const SkuHistory = lazy(() => import(/* webpackChunkName: "page-skuhistory" */ './pages/SkuHistory'));
const Parties = lazy(() => import(/* webpackChunkName: "page-parties" */ './pages/Parties'));
const Companies = lazy(() => import(/* webpackChunkName: "page-companies" */ './pages/Companies'));
const AuditLogs = lazy(() => import(/* webpackChunkName: "page-auditlogs" */ './pages/AuditLogs'));
const StockExpiry = lazy(() => import(/* webpackChunkName: "page-stockexpiry" */ './pages/StockExpiry'));
const Replenishment = lazy(() => import(/* webpackChunkName: "page-replenishment" */ './pages/Replenishment'));
const BatchTrace = lazy(() => import(/* webpackChunkName: "page-batchtrace" */ './pages/BatchTrace'));
const MobileScan = lazy(() => import(/* webpackChunkName: "page-mobilescan" */ './pages/MobileScan'));
const AsnPage = lazy(() => import(/* webpackChunkName: "page-asn" */ './pages/AsnPage'));
const Productivity = lazy(() => import(/* webpackChunkName: "page-productivity" */ './pages/Productivity'));
const LoginPage = lazy(() => import(/* webpackChunkName: "page-login" */ './pages/LoginPage'));

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
  SUPER_ADMIN: ['dashboard','orders','inventory','warehouse','cyclecount','picklist','packing','scanning','returns','marketplace','purchaseorders','stocktransfer','waves','manifests','ndr','courier-routing','inventory-alerts','analytics','settings','gatepass','integrations','grn','gatepass-order','putaway','bins','sku-history','parties','stock-expiry','replenishment','asn','productivity','batch-trace','mobile-scan'],
  WAREHOUSE_MGR: ['dashboard','orders','inventory','warehouse','cyclecount','picklist','packing','scanning','returns','gatepass','grn','putaway','bins','stocktransfer','manifests','ndr','courier-routing','inventory-alerts','settings','parties','stock-expiry','replenishment','asn','batch-trace','mobile-scan'],
  PICKER: ['dashboard','picklist','scanning'],
  PACKER: ['dashboard','packing','scanning'],
};

const TAB_TO_PATH = {
  dashboard:'dashboard', orders:'orders', inventory:'inventory', scanning:'scanning', 'audit-logs':'audit-logs',
  picklist:'picklist', packing:'packing', returns:'returns', warehouse:'warehouse',
  cyclecount:'cycle-count', analytics:'analytics', marketplace:'marketplace',
  purchaseorders:'purchase-orders', stocktransfer:'stock-transfer', waves:'wave-picking',
  manifests:'manifests', ndr:'ndr', 'courier-routing':'courier-routing',
  'inventory-alerts':'inventory-alerts', gatepass:'gatepass', 'gatepass-order':'gatepass-order',
  integrations:'integrations', grn:'grn', putaway:'putaway', bins:'bin-locations',
  'sku-history':'sku-history', parties:'parties', companies:'companies', settings:'settings',
  'stock-expiry':'stock-expiry', replenishment:'replenishment', asn:'asn', productivity:'productivity', 'batch-trace':'batch-trace', 'mobile-scan':'mobile-scan',
};

const PATH_TO_TAB = Object.fromEntries(Object.entries(TAB_TO_PATH).map(([k, v]) => [v, k]));

const APP_PREFIX = '/app';

const parsePath = () => {
  const full = window.location.pathname || '/';
  const stripped = full.startsWith(APP_PREFIX) ? full.slice(APP_PREFIX.length) : full;
  const clean = stripped.replace(/^\/+/, '');
  const [tabPath, ...rest] = clean.split('?');
  const params = new URLSearchParams(rest.join('?'));
  return { tab: PATH_TO_TAB[tabPath] || 'dashboard', detailId: params.get('id') || '' };
};

const buildAppUrl = (tabPath, id) => {
  const base = `${APP_PREFIX}/${tabPath}`;
  return id ? `${base}?id=${encodeURIComponent(id)}` : base;
};

const App = () => {
  const { user, company, isAuthenticated, loading, getToken, selectedFacility, clearSelectedFacility } = useAuth();
  const role = user?.role || '';
  const initial = parsePath();
  const [activeTab, setActiveTabState] = useState(initial.tab);
  const [detailId, setDetailIdState] = useState(initial.detailId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useGPrefix({
    d: () => setActiveTab('dashboard'),
    o: () => setActiveTab('orders'),
    i: () => setActiveTab('inventory'),
    s: () => setActiveTab('scanning'),
    p: () => setActiveTab('packing'),
    w: () => setActiveTab('waves'),
    r: () => setActiveTab('returns'),
    ',': () => setActiveTab('settings'),
  });

  const setActiveTab = (tab, entityId) => {
    setActiveTabState(tab);
    setDetailIdState(entityId || '');
    const path = TAB_TO_PATH[tab];
    if (path) {
      const url = buildAppUrl(path, entityId);
      if (window.location.pathname + window.location.search !== url) {
        window.history.pushState({}, '', url);
      }
    }
  };

  const setDetailId = (id) => {
    setDetailIdState(id || '');
    const path = TAB_TO_PATH[activeTab];
    if (path) {
      const url = buildAppUrl(path, id);
      if (window.location.pathname + window.location.search !== url) {
        window.history.replaceState({}, '', url);
      }
    }
  };

  useEffect(() => {
    const msg = sessionStorage.getItem('logoutMsg');
    if (msg) { sessionStorage.removeItem('logoutMsg'); toast.success(msg); }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const { tab, detailId: id } = parsePath();
      if (tab) { setActiveTabState(tab); setDetailIdState(id); }
      trackPageView(window.location.pathname || '/app/dashboard', tab);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    trackPageView(window.location.pathname || '/app/dashboard', activeTab);
  }, [activeTab]);

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
    if (window.location.pathname.startsWith('/track/') || window.location.pathname === '/track') {
      return <TrackingPage />;
    }
    return <LoginPage />;
  }

  if (window.location.pathname.startsWith('/track/') || window.location.pathname === '/track') {
    return <TrackingPage />;
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
      case 'stock-expiry': return <StockExpiry {...pageProps} />;
      case 'replenishment': return <Replenishment {...pageProps} />;
      case 'asn': return <AsnPage {...pageProps} />;
      case 'productivity': return <Productivity {...pageProps} />;
      case 'batch-trace': return <BatchTrace {...pageProps} />;
      case 'mobile-scan': return <MobileScan {...pageProps} />;
      case 'settings': return <Settings {...pageProps} />;
      default: return <FallbackPage />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="flex-1 min-w-0 overflow-y-auto bg-slate-50">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold tracking-tight text-slate-900">SupplyHub</h1>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            aria-label="Open search"
          >
            <Search size={14} />
            <span>Search…</span>
            <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-white text-slate-400 rounded border border-slate-200">Ctrl K</kbd>
          </button>
          {company?.name && (
            <span className="hidden lg:inline-block px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-md" title={company.name}>
              {company.name}
            </span>
          )}
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2 mr-2 text-xs text-slate-600" title={user?.email || ''}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
              {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden xl:block">
              <div className="font-medium text-slate-800 leading-tight">{user?.name || user?.email}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">{user?.role}</div>
            </div>
          </div>
          <FacilitySelector />
          <HelpButton onNavigate={setActiveTab} />
        </header>
        <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading…</div>}>
          {renderContent()}
        </Suspense>
      </main>
      <VercelAnalytics />
      <GlobalSearch onNavigate={setActiveTab} />
      <AssistantBot onNavigate={setActiveTab} />
      <Welcome onNavigate={setActiveTab} />
    </div>
  );
};

export default App;
