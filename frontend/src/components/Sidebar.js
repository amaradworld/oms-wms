import React from 'react';
import { LayoutDashboard, Package, ShoppingCart, Warehouse, ClipboardCheck, Barcode, ClipboardList, PackageCheck, RotateCcw, BarChart3, Settings, LogOut, Building2, Globe, X, Truck, ShoppingBag } from 'lucide-react';
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

const Sidebar = ({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) => {
  const { user, company, logout } = useAuth();
  const role = user?.role || '';

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'warehouse', label: 'Warehouse', icon: Warehouse },
    { id: 'cyclecount', label: 'Cycle Count', icon: ClipboardCheck },
    { id: 'picklist', label: 'Picklist', icon: ClipboardList },
    { id: 'packing', label: 'Packing', icon: PackageCheck },
    { id: 'scanning', label: 'Barcode Scan', icon: Barcode },
    { id: 'returns', label: 'Returns/RTO', icon: RotateCcw },
    { id: 'marketplace', label: 'Marketplace', icon: Globe },
    { id: 'purchaseorders', label: 'Purchase Orders', icon: ShoppingBag },
    { id: 'stocktransfer', label: 'Stock Transfer', icon: Truck },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const roleMenuMap = {
    SUPER_ADMIN: allMenuItems,
    WAREHOUSE_MGR: allMenuItems,
    PICKER: allMenuItems.filter(i => ['picklist', 'scanning', 'dashboard'].includes(i.id)),
    PACKER: allMenuItems.filter(i => ['packing', 'scanning', 'dashboard'].includes(i.id)),
  };
  const menuItems = roleMenuMap[role] || allMenuItems;

  const handleClick = (id) => {
    setActiveTab(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const nav = (
    <>
      <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight">
            OMS<span className="text-blue-500">WMS</span>
          </div>
          {company && (
            <div className="flex items-center gap-2 mt-1 md:mt-2 text-xs text-slate-400">
              <Building2 size={12} />
              <span className="truncate max-w-[140px]">{company.name}</span>
            </div>
          )}
        </div>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 hover:bg-slate-800 rounded-lg">
          <X size={20} />
        </button>
      </div>
      <nav aria-label="Main navigation" className="flex-1 mt-2 md:mt-4 overflow-y-auto">
        {menuItems.map(item => (
          <SidebarItem 
            key={item.id} 
            {...item} 
            active={activeTab === item.id} 
            onClick={() => handleClick(item.id)}
          />
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <SidebarItem icon={LogOut} label="Logout" onClick={() => { logout(); window.location.reload(); }} />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar — only visible on mobile when toggled */}
      <aside className={`fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 md:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {nav}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 h-screen bg-slate-900 text-white flex-col sticky top-0 flex-shrink-0">
        {nav}
      </aside>
    </>
  );
};

export default Sidebar;
