import React, { useState } from 'react';
import { LayoutDashboard, Package, ShoppingCart, Warehouse, ClipboardCheck, Barcode, ClipboardList, PackageCheck, RotateCcw, BarChart3, Settings, LogOut, Building2, Globe, X, Truck, ShoppingBag, Layers, ChevronDown, ChevronRight, ChevronLeft, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SidebarItem = ({ icon: Icon, label, active, onClick, indent, collapsed }) => (
  <div
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
      active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    } ${indent ? (collapsed ? 'justify-center' : 'pl-10') : collapsed ? 'justify-center' : ''}`}
  >
    <Icon size={18} className="flex-shrink-0" />
    {!collapsed && <span className="font-medium text-sm truncate">{label}</span>}
  </div>
);

const SidebarGroup = ({ icon: Icon, label, active, children, defaultOpen, collapsed }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div
        onClick={() => !collapsed && setOpen(!open)}
        title={collapsed ? label : undefined}
        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors text-slate-400 hover:bg-slate-800 hover:text-slate-200 ${collapsed ? 'justify-center' : ''}`}
      >
        <Icon size={18} className="flex-shrink-0" />
        {!collapsed && <span className="font-medium flex-1 text-sm truncate">{label}</span>}
        {!collapsed && (open ? <ChevronDown size={14} className="flex-shrink-0" /> : <ChevronRight size={14} className="flex-shrink-0" />)}
      </div>
      {!collapsed && open && <div>{children}</div>}
    </div>
  );
};

const Sidebar = ({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) => {
  const { user, company, logout } = useAuth();
  const role = user?.role || '';
  const [collapsed, setCollapsed] = useState(false);

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'warehouse', label: 'Warehouse', icon: Warehouse },
    { id: 'cyclecount', label: 'Cycle Count', icon: ClipboardCheck },
    {
      id: 'waves', label: 'Wave Picking', icon: Layers,
      children: [
        { id: 'picklist', label: 'Picklist', icon: ClipboardList },
      ],
    },
    { id: 'packing', label: 'Packing', icon: PackageCheck },
    { id: 'manifests', label: 'Manifests', icon: FileText },
    { id: 'ndr', label: 'NDR', icon: AlertTriangle },
    { id: 'courier-routing', label: 'Courier Routing', icon: Truck },
    { id: 'inventory-alerts', label: 'Inventory Alerts', icon: AlertTriangle },
    { id: 'scanning', label: 'Barcode Scan', icon: Barcode },
    { id: 'returns', label: 'Returns/RTO', icon: RotateCcw },
    { id: 'marketplace', label: 'Marketplace', icon: Globe },
    { id: 'purchaseorders', label: 'Purchase Orders', icon: ShoppingBag },
    { id: 'stocktransfer', label: 'Stock Transfer', icon: Truck },
    { id: 'gatepass', label: 'Gatepass', icon: FileText },
    { id: 'integrations', label: 'Integrations', icon: Globe },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const roleMenuMap = {
    SUPER_ADMIN: allMenuItems,
    WAREHOUSE_MGR: allMenuItems,
    PICKER: allMenuItems.filter(i => {
      if (i.id === 'waves') return true;
      return ['picklist', 'scanning', 'dashboard'].includes(i.id);
    }),
    PACKER: allMenuItems.filter(i => {
      return ['packing', 'scanning', 'dashboard'].includes(i.id);
    }),
  };
  const menuItems = roleMenuMap[role] || allMenuItems;

  const handleClick = (id) => {
    setActiveTab(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const childIds = new Set();
  menuItems.forEach(item => item.children?.forEach(c => childIds.add(c.id)));

  const nav = (
    <>
      <div className="p-4 md:p-5 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <img src="/logo.png" alt="Logo" className="h-7 w-auto flex-shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-base font-bold tracking-tight">SupplyHub</div>
              {company && (
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                  <Building2 size={10} />
                  <span className="truncate max-w-[140px]">{company.name}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed(!collapsed)} className="hidden md:flex p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors">
            <ChevronLeft size={16} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 hover:bg-slate-800 rounded-lg">
            <X size={18} />
          </button>
        </div>
      </div>
      <nav aria-label="Main navigation" className="flex-1 mt-2 md:mt-4 overflow-y-auto">
        {menuItems.map(item => {
          if (item.children) {
            return (
              <SidebarGroup
                key={item.id}
                icon={item.icon}
                label={item.label}
                defaultOpen={activeTab === item.id || item.children.some(c => c.id === activeTab)}
                collapsed={collapsed}
              >
                <div onClick={() => handleClick(item.id)} className={`flex items-center gap-3 px-4 py-2.5 pl-10 cursor-pointer transition-colors ${
                  activeTab === item.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}>
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                {item.children.map(child => (
                  <SidebarItem
                    key={child.id}
                    {...child}
                    active={activeTab === child.id}
                    onClick={() => handleClick(child.id)}
                    indent={true}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarGroup>
            );
          }
          if (childIds.has(item.id)) return null;
          return (
            <SidebarItem
              key={item.id}
              {...item}
              active={activeTab === item.id}
              onClick={() => handleClick(item.id)}
              collapsed={collapsed}
            />
          );
        })}
      </nav>
      <div className={collapsed ? 'p-4 border-t border-slate-700/50 flex justify-center' : 'p-4 border-t border-slate-700/50'}>
        <SidebarItem icon={LogOut} label="Logout" onClick={() => { logout(); window.location.reload(); }} collapsed={collapsed} />
      </div>
    </>
  );

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`fixed top-0 left-0 z-50 h-screen bg-slate-900 text-white flex flex-col transition-all duration-300 md:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${collapsed ? 'w-16' : 'w-64'}`}>
        {nav}
      </aside>
      <aside className={`hidden md:flex h-screen bg-slate-900 text-slate-300 flex-col sticky top-0 flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        {nav}
      </aside>
    </>
  );
};

export default Sidebar;
