import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Users, Clock, Package, TrendingUp, RefreshCw } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/Skeleton';

const Productivity = () => {
  const { selectedFacility } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const params = { days };
    if (selectedFacility) params.warehouseId = selectedFacility.id;
    try {
      const res = await API.get('/productivity', { params });
      setStats(res.data);
    } catch { setStats(null); } finally { setLoading(false); }
  }, [days, selectedFacility]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><BarChart3 size={20} /> Productivity</h1>
          <p className="text-sm text-slate-500">Team performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="text-sm border rounded-lg px-3 py-2">
            <option value={1}>Today</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
          <button onClick={fetchStats} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border rounded-lg hover:bg-slate-50"><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} /> : !stats ? (
        <div className="bg-white border rounded-xl p-12 text-center text-slate-400">No data</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Activities</p>
              <p className="text-2xl font-bold mt-1">{stats.summary?.totalLogs || 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase"><Package size={12} className="inline" /> Total Qty Handled</p>
              <p className="text-2xl font-bold mt-1">{stats.summary?.totalQty || 0}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase"><Clock size={12} className="inline" /> Total Time</p>
              <p className="text-2xl font-bold mt-1">{Math.round((stats.summary?.totalMin || 0) / 60)}h</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase"><TrendingUp size={12} className="inline" /> Items/Hour</p>
              <p className="text-2xl font-bold mt-1">
                {stats.summary?.totalMin > 0 ? Math.round((stats.summary.totalQty / stats.summary.totalMin) * 60) : '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><BarChart3 size={16} /> By Activity</h3>
              {Object.keys(stats.byActivity || {}).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No activity data</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.byActivity).map(([activity, s]) => (
                    <div key={activity} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium">{activity.replace(/_/g, ' ')}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold">{s.totalQty} units</span>
                        <span className="text-xs text-slate-400 ml-2">{s.count} ops</span>
                        {s.totalMin > 0 && <span className="text-xs text-slate-400 ml-2">({Math.round(s.totalQty / s.totalMin * 60)}/hr)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Users size={16} /> By User</h3>
              {stats.byUser?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No user data</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {stats.byUser?.map(u => (
                    <div key={u.userId} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium">{u.name}</span>
                        {u.role && <span className="text-xs text-slate-400 ml-2">({u.role})</span>}
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <span>{u.totalQty} units</span>
                        {u.itemsPerHour > 0 && <span className="ml-2">{u.itemsPerHour}/hr</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {stats.daily?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-sm mb-4">Daily Trend</h3>
              <div className="space-y-2">
                {stats.daily.map(d => (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-24">{d.date}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (d.totalQty / Math.max(...stats.daily.map(x => x.totalQty))) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium w-16 text-right">{d.totalQty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Productivity;
