import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb = ({ items = [] }) => {
  if (!items.length) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center text-sm text-slate-500 mb-3 flex-wrap gap-y-1"
    >
      <a
        href="/app/dashboard"
        className="flex items-center gap-1 hover:text-slate-700 transition"
        aria-label="Dashboard"
      >
        <Home size={14} />
      </a>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            <ChevronRight size={14} className="mx-1 text-slate-300" aria-hidden="true" />
            {isLast || !item.onClick ? (
              <span
                className={isLast ? 'text-slate-900 font-medium' : ''}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="hover:text-slate-700 transition"
                aria-label={item.ariaLabel || item.label}
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
