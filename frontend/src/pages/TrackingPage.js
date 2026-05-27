import React, { useState } from 'react';
import { Search, Package, MapPin, Calendar, Truck } from 'lucide-react';
import axios from 'axios';

const TrackingPage = () => {
  const [awb, setAwb] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API = process.env.REACT_APP_API_URL;

  const track = async (e) => {
    e.preventDefault();
    if (!awb.trim()) return;
    setLoading(true); setError(''); setData(null);
    try {
      const { data: result } = await axios.get(`${API}/api/tracking/${awb.trim()}`);
      setData(result);
    } catch {
      setError('No shipment found with this AWB number. Please check and try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Truck size={32} className="text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Track Your Shipment</h1>
          </div>
          <p className="text-slate-400">Enter your AWB number to track your order in real-time</p>
        </div>

        <form onSubmit={track} className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={awb} onChange={e => setAwb(e.target.value)}
                placeholder="Enter AWB number (e.g. SR-A1B2C3D4)"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-colors">
              {loading ? 'Searching...' : 'Track'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </form>

        {data && (
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">AWB Number</p>
                <p className="text-xl font-bold text-slate-900 font-mono">{data.awbNumber}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                data.shipmentStatus === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                data.shipmentStatus === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{data.shipmentStatus}</span>
            </div>

            {data.order && (
              <>
                <div className="flex items-start gap-3">
                  <Package size={18} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{data.order.orderNumber}</p>
                    <p className="text-xs text-slate-400">{data.order.customerName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Shipping Address</p>
                    <p className="text-sm text-slate-700">{data.order.shippingAddress}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Order Date</p>
                    <p className="text-sm text-slate-700">{new Date(data.order.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </>
            )}

            <div className="pt-4 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-400">Powered by <span className="text-blue-600 font-medium">OMS-WMS</span></p>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">Need help? Contact your seller with your AWB number</p>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
