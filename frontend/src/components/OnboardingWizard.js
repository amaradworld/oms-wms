import React, { useState } from 'react';
import { Building2, Package, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { track, trackFirst } from '../utils/analytics';

const STEPS = ['Company', 'Warehouse', 'Products', 'Done'];

const OnboardingWizard = ({ onComplete, getToken }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [company, setCompany] = useState({ name: '', email: '', phone: '' });
  const [warehouse, setWarehouse] = useState({ name: '', address: '', city: '' });
  const [products, setProducts] = useState([{ skuCode: '', epcCode: '', name: '', qty: 0 }]);

  const API = process.env.REACT_APP_API_URL;
  const headers = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

  const addProduct = () => setProducts([...products, { skuCode: '', epcCode: '', name: '', qty: 0 }]);
  const updateProduct = (i, field, value) => {
    const copy = [...products];
    copy[i][field] = value;
    setProducts(copy);
  };

  const save = async () => {
    setLoading(true);
    try {
      if (warehouse.name) {
        const { data: wh } = await axios.post(`${API}/api/warehouses`, warehouse, headers());
        trackFirst('warehouse', 'warehouse_created', { source: 'onboarding_wizard', city: warehouse.city });
        for (const p of products) {
          if (!p.skuCode) continue;
          const payload = { skuCode: p.skuCode, name: p.name };
          if (p.epcCode) payload.epcCode = p.epcCode;
          const { data: sku } = await axios.post(`${API}/api/skus`, payload, headers());
          trackFirst('sku', 'sku_created', { source: 'onboarding_wizard' });
          await axios.post(`${API}/api/inventory`, { skuId: sku.id, warehouseId: wh.id, quantityAvailable: Number(p.qty) }, headers());
        }
        track('onboarding_completed', {
          warehouse_count: 1,
          sku_count: products.filter(p => p.skuCode).length,
        });
      }
      onComplete();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const canNext = () => {
    if (step === 0) return company.name;
    if (step === 1) return warehouse.name;
    if (step === 2) return products.some(p => p.skuCode);
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-violet-900/20 max-w-lg w-full p-8">
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= step ? 'gradient-primary text-white shadow-md shadow-indigo-200' : 'bg-slate-200 text-slate-400'
              }`}>{i + 1}</div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 mx-1 ${i < step ? 'gradient-primary' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={20} className="text-violet-600" />
              <h2 className="text-lg font-bold text-slate-900">Company Details</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">Tell us about your business</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input value={company.name} onChange={e => setCompany({...company, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none" placeholder="Your Company Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input value={company.email} onChange={e => setCompany({...company, email: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none" placeholder="contact@company.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input value={company.phone} onChange={e => setCompany({...company, phone: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none" placeholder="+91 98765 43210" />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={20} className="text-violet-600" />
              <h2 className="text-lg font-bold text-slate-900">Set Up Warehouse</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">Create your first warehouse or facility</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse Name</label>
                <input value={warehouse.name} onChange={e => setWarehouse({...warehouse, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none" placeholder="e.g. Mumbai Main Warehouse" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input value={warehouse.address} onChange={e => setWarehouse({...warehouse, address: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none" placeholder="123, Industrial Area" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input value={warehouse.city} onChange={e => setWarehouse({...warehouse, city: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none" placeholder="Mumbai" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Package size={20} className="text-violet-600" />
              <h2 className="text-lg font-bold text-slate-900">Add Products</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">Add your initial inventory items</p>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {products.map((p, i) => (
                <div key={i} className="flex gap-2 items-start bg-slate-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <input value={p.skuCode} onChange={e => updateProduct(i, 'skuCode', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none mb-1" placeholder="SKU Code (e.g. TSH-BLU-M)" />
                    <input value={p.epcCode} onChange={e => updateProduct(i, 'epcCode', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none mb-1" placeholder="EPC Code (11 digits, optional)" maxLength={11} />
                    <input value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none mb-1" placeholder="Product Name" />
                    <input type="number" value={p.qty} onChange={e => updateProduct(i, 'qty', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none" placeholder="Quantity" />
                  </div>
                </div>
              ))}
              <button onClick={addProduct} className="text-sm text-violet-600 hover:text-violet-700 font-medium">+ Add another product</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-6">
            <CheckCircle size={56} className="mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-bold text-slate-900">You're All Set!</h2>
            <p className="text-sm text-slate-500 mt-2 mb-6">Your company, warehouse, and products have been configured. You can now start using OMS-WMS.</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 disabled:opacity-30">
            <ChevronLeft size={16} /> Back
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canNext()} className="btn-primary flex items-center gap-1">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={save} disabled={loading} className="gradient-accent text-white px-5 py-2 rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md shadow-emerald-200 text-sm font-medium disabled:opacity-50">
              {loading ? 'Saving...' : 'Go to Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
