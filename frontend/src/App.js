import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import ScanningScreen from './pages/ScanningScreen';
import Picklist from './pages/Picklist';
import PackingScreen from './pages/PackingScreen';
import Returns from './pages/Returns';
import MarketplaceSettings from './pages/MarketplaceSettings';
import LoginPage from './pages/LoginPage';
import { useAuth } from './context/AuthContext';

const App = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-white text-lg">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'orders': return <Orders />;
      case 'inventory': return <Inventory />;
      case 'scanning': return <ScanningScreen />;
      case 'picklist': return <Picklist />;
      case 'packing': return <PackingScreen />;
      case 'returns': return <Returns />;
      case 'marketplace': return <MarketplaceSettings />;
      default: return <div className="p-4 md:p-8 text-slate-500">Module {activeTab} is under development...</div>;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <Menu size={22} />
          </button>
          <div className="text-lg font-bold tracking-tight">
            OMS<span className="text-blue-500">WMS</span>
          </div>
        </div>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
