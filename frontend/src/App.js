import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import ScanningScreen from './pages/ScanningScreen';
import Picklist from './pages/Picklist';
import PackingScreen from './pages/PackingScreen';
import Returns from './pages/Returns';
import LoginPage from './pages/LoginPage';
import { useAuth } from './context/AuthContext';

const App = () => {
  const { isAuthenticated, loading, company } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

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
      default: return <div className="p-8 text-slate-500">Module {activeTab} is under development...</div>;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
