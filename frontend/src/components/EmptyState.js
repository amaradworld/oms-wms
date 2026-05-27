import React from 'react';
import { Package, ShoppingCart, ClipboardList, RotateCcw, Building2, BarChart3, Search } from 'lucide-react';

const icons = {
  orders: ShoppingCart,
  inventory: Package,
  picklist: ClipboardList,
  returns: RotateCcw,
  warehouse: Building2,
  analytics: BarChart3,
  search: Search,
};

const EmptyState = ({ icon = 'search', title = 'No data found', description = 'There are no items to display.', action }) => {
  const Icon = icons[icon] || Search;
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="p-4 bg-slate-100 rounded-full mb-4">
        <Icon size={32} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-4 text-center max-w-sm">{description}</p>
      {action && action}
    </div>
  );
};

export default EmptyState;
