import React, { useState } from 'react';
import { LayoutDashboard, Package, ShoppingCart, Warehouse, ClipboardCheck, Barcode, PackageCheck, RotateCcw, BarChart3, Settings, LogOut, Building2, Globe, X, Truck, ShoppingBag, Layers, ChevronDown, ChevronRight, Menu, FileText, AlertTriangle, MapPin, ScanLine, Search, Clock, UserPlus, Mail } from 'lucide-react';
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
    {
      id: 'order-management', label: 'Order Management', icon: ShoppingCart, group: true,
      children: [
        { id: 'orders', label: 'Orders', icon: ShoppingCart },
        { id: 'returns', label: 'Returns/RTO', icon: RotateCcw },
        { id: 'waves', label: 'Wave Picking', icon: Layers },
        { id: 'packing', label: 'Packing', icon: PackageCheck },
        { id: 'manifests', label: 'Manifests', icon: FileText },
        { id: 'ndr', label: 'NDR', icon: AlertTriangle },
      ],
    },
    {
      id: 'warehouse-ops', label: 'Warehouse Operations', icon: Warehouse, group: true,
      children: [
        { id: 'warehouse', label: 'Warehouse', icon: Warehouse },
        { id: 'scanning', label: 'Barcode Scan', icon: Barcode },
        { id: 'mobile-scan', label: 'Mobile Scan', icon: ScanLine },
      ],
    },
    {
      id: 'inventory-stock', label: 'Inventory & Stock Control', icon: Package, group: true,
      children: [
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'cyclecount', label: 'Cycle Count', icon: ClipboardCheck },
        { id: 'inventory-alerts', label: 'Inventory Alerts', icon: AlertTriangle },
        { id: 'sku-history', label: 'SKU History', icon: Search },
        { id: 'stock-expiry', label: 'Stock Expiry', icon: Clock },
        { id: 'replenishment', label: 'Replenishment', icon: Layers },
        { id: 'batch-trace', label: 'Batch Trace', icon: Search },
      ],
    },
    {
      id: 'inbound-supply', label: 'Inbound & Supply Chain', icon: Truck, group: true,
      children: [
        { id: 'purchaseorders', label: 'Purchase Orders', icon: ShoppingBag },
        { id: 'asn', label: 'ASN', icon: Truck },
        { id: 'grn', label: 'GRN', icon: ClipboardCheck },
        { id: 'putaway', label: 'Putaway', icon: ScanLine },
      ],
    },
    {
      id: 'outbound', label: 'Outbound', icon: Settings, group: true,
      children: [
        { id: 'gatepass', label: 'Gatepass', icon: FileText },
        { id: 'stocktransfer', label: 'Stock Transfer', icon: Truck },
        { id: 'gatepass-order', label: 'Gatepass Order', icon: FileText },
      ],
    },
    {
      id: 'administration', label: 'Administration', icon: Settings, group: true,
      children: [
        {
          id: 'master-data', label: 'Master Data', icon: Package, group: true,
          children: [
            { id: 'sku-master', label: 'SKU Master', icon: Package },
          ],
        },
        { id: 'integrations', label: 'Integrations', icon: Globe },
        { id: 'parties', label: 'Parties', icon: Building2 },
        { id: 'companies', label: 'Companies', icon: Globe },
        { id: 'leads', label: 'Leads', icon: UserPlus },
        { id: 'courier-routing', label: 'Courier Routing', icon: Truck },
        { id: 'marketplace', label: 'Marketplace', icon: Globe },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'productivity', label: 'Productivity', icon: BarChart3 },
        { id: 'bins', label: 'Bin Locations', icon: MapPin },
        { id: 'audit-logs', label: 'Audit Logs', icon: Clock },
        { id: 'reports-ftp', label: 'Reports (FTP)', icon: FileText },
        { id: 'invitation-mail', label: 'Invitation Mail', icon: Mail },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const filterTree = (items, allowed) =>
    items
      .map(item => {
        if (!item.children) return allowed.has(item.id) ? item : null;
        const filteredChildren = item.children
          .map(c => {
            if (!c.children) return allowed.has(c.id) ? c : null;
            const gc = c.children?.filter(g => allowed.has(g.id));
            return gc?.length ? { ...c, children: gc } : null;
          })
          .filter(Boolean);
        return filteredChildren.length ? { ...item, children: filteredChildren } : null;
      })
      .filter(Boolean);

  const filterByMenuAccess = (items, allowedIds) => {
    if (!allowedIds) return items; // null = all menus allowed
    const allowed = new Set(allowedIds);
    return filterTree(items, allowed);
  };

  const isChildActive = (item) => {
    if (activeTab === item.id) return true;
    if (item.children) return item.children.some(c => isChildActive(c));
    return false;
  };

  const roleMenuMap = {
    PLATFORM_ADMIN: filterTree(allMenuItems, new Set(['dashboard', 'companies', 'leads', 'audit-logs', 'reports-ftp', 'invitation-mail'])),
    SUPER_ADMIN: allMenuItems,
    WAREHOUSE_MGR: allMenuItems,
    PICKER: filterTree(allMenuItems, new Set(['dashboard', 'scanning', 'waves'])),
    PACKER: filterTree(allMenuItems, new Set(['dashboard', 'packing', 'scanning'])),
  };
  const roleFiltered = roleMenuMap[role] || allMenuItems;
  const menuItems = role === 'PLATFORM_ADMIN' ? roleFiltered : filterByMenuAccess(roleFiltered, company?.menuAccess);

  const handleClick = (id) => {
    setActiveTab(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const collectChildIds = (items) => {
    items.forEach(item => {
      if (item.children) {
        item.children.forEach(c => {
          childIds.add(c.id);
          collectChildIds([c]);
        });
      }
    });
  };
  const childIds = new Set();
  collectChildIds(menuItems);

  const nav = (
    <>
      <div className="p-4 md:p-5 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <img src="/logo.png" alt="Logo" className="h-7 w-auto flex-shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-base font-bold tracking-tight">GlobalSupply</div>
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
            <Menu size={16} />
          </button>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 hover:bg-slate-800 rounded-lg">
            <X size={18} />
          </button>
        </div>
      </div>
      <nav aria-label="Main navigation" className="flex-1 mt-2 md:mt-4 overflow-y-auto">
        {menuItems.map(item => {
          if (item.children) {
            const isOrgGroup = item.group;
            return (
              <SidebarGroup
                key={item.id}
                icon={item.icon}
                label={item.label}
                defaultOpen={isChildActive(item)}
                collapsed={collapsed}
              >
                {!isOrgGroup && (
                  <div onClick={() => handleClick(item.id)} className={`flex items-center gap-3 px-4 py-2.5 pl-10 cursor-pointer transition-colors ${
                    activeTab === item.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                )}
                {item.children.map(child => {
                  if (child.children) {
                    const childIsOrg = child.group;
                    return (
                      <div key={child.id}>
                        {!childIsOrg && (
                          <div onClick={() => handleClick(child.id)} className={`flex items-center gap-3 px-4 py-2.5 pl-10 cursor-pointer transition-colors ${
                            activeTab === child.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}>
                            <span className="font-medium text-sm">{child.label}</span>
                          </div>
                        )}
                        {childIsOrg && (
                          <div className="flex items-center gap-3 px-4 py-2 pl-10">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{child.label}</span>
                          </div>
                        )}
                        {child.children.map(grandchild => (
                          <SidebarItem
                            key={grandchild.id}
                            {...grandchild}
                            active={activeTab === grandchild.id}
                            onClick={() => handleClick(grandchild.id)}
                            indent={true}
                            collapsed={collapsed}
                          />
                        ))}
                      </div>
                    );
                  }
                  return (
                    <SidebarItem
                      key={child.id}
                      {...child}
                      active={activeTab === child.id}
                      onClick={() => handleClick(child.id)}
                      indent={true}
                      collapsed={collapsed}
                    />
                  );
                })}
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
        <SidebarItem icon={LogOut} label="Logout" onClick={() => { logout(); sessionStorage.setItem('logoutMsg', 'Logged out successfully'); window.location.reload(); }} collapsed={collapsed} />
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
