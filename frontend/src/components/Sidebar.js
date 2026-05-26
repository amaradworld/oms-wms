import React from 'react';
import { LayoutDashboard, Package, ShoppingCart, Warehouse, Barcode, ClipboardList, PackageCheck, RotateCcw, BarChart3, Settings, LogOut, Building2, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
      active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </div>
);

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { company, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'warehouse', label: 'Warehouse', icon: Warehouse },
    { id: 'picklist', label: 'Picklist', icon: ClipboardList },
    { id: 'packing', label: 'Packing', icon: PackageCheck },
    { id: 'scanning', label: 'Barcode Scan', icon: Barcode },
    { id: 'returns', label: 'Returns/RTO', icon: RotateCcw },
    { id: 'marketplace', label: 'Marketplace', icon: Globe },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen bg-slate-900 text-white flex flex-col sticky top-0">
      <div className="p-6 border-b border-slate-800">
        <div className="text-2xl font-bold tracking-tight">
          OMS<span className="text-blue-500">WMS</span>
        </div>
        {company && (
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <Building2 size={12} />
            <span>{company.name}</span>
          </div>
        )}
      </div>
      <nav className="flex-1 mt-4">
        {menuItems.map(item => (
          <SidebarItem 
            key={item.id} 
            {...item} 
            active={activeTab === item.id} 
            onClick={() => setActiveTab(item.id)}
          />
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <SidebarItem icon={LogOut} label="Logout" onClick={() => { logout(); window.location.reload(); }} />
      </div>
    </aside>
  );
};

export default Sidebar;
