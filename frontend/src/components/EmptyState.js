import React from 'react';
import { Package, ShoppingCart, ClipboardList, RotateCcw, Building2, BarChart3, Search, Plus, Inbox } from 'lucide-react';

const icons = {
  orders: ShoppingCart,
  inventory: Package,
  picklist: ClipboardList,
  returns: RotateCcw,
  warehouse: Building2,
  analytics: BarChart3,
  search: Search,
  default: Inbox,
};

const EmptyState = ({
  icon = 'default',
  title = 'No data found',
  description = 'There are no items to display.',
  action,
  primaryAction,
  secondaryAction,
  className = '',
}) => {
  const Icon = icons[icon] || icons.default;
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="p-4 bg-slate-100 rounded-full mb-4">
        <Icon size={32} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1 text-center">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mb-4 text-center max-w-sm">{description}</p>
      )}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {primaryAction.icon || <Plus size={16} />}
            {primaryAction.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition"
          >
            {secondaryAction.icon}
            {secondaryAction.label}
          </button>
        )}
        {action && action}
      </div>
    </div>
  );
};

export default EmptyState;
