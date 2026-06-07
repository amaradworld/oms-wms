import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, ScanLine, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BottomNav = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const role = user?.role || '';

  const allItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, roles: ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MGR', 'PICKER', 'PACKER'] },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, roles: ['SUPER_ADMIN', 'WAREHOUSE_MGR'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['SUPER_ADMIN', 'WAREHOUSE_MGR', 'PICKER'] },
    { id: 'scanning', label: 'Scan', icon: ScanLine, roles: ['SUPER_ADMIN', 'WAREHOUSE_MGR', 'PICKER', 'PACKER'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MGR', 'PICKER', 'PACKER'] },
  ];

  const items = allItems.filter(i => i.roles.includes(role)).slice(0, 5);

  return (
    <nav
      aria-label="Bottom navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg"
    >
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-2 transition-colors ${
                isActive ? 'text-indigo-600' : 'text-slate-400'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
                {item.label}
              </span>
              {isActive && <span className="absolute top-0 h-0.5 w-8 bg-indigo-600 rounded-b-full" />}
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};

export default BottomNav;
