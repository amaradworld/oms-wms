import React from 'react';

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-3">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const StatsSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-6 w-16" />
      </div>
    ))}
  </div>
);

export default Skeleton;
