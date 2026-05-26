import React, { useState } from 'react';
import { PackageCheck, QrCode, CheckCircle2, XCircle, Truck, Box } from 'lucide-react';

const PackingScreen = () => {
  const [scanInput, setScanInput] = useState('');
  const [packedItems, setPackedItems] = useState([]);

  const handleScan = (e) => {
    e.preventDefault();
    if (!scanInput) return;
    setPackedItems([...packedItems, {
      id: Date.now(),
      sku: scanInput,
      time: new Date().toLocaleTimeString(),
      verified: Math.random() > 0.1
    }]);
    setScanInput('');
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Packing Station</h1>
          <p className="text-xs md:text-sm text-slate-500">Order #ORD-1042 • Customer: Priya Sharma</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 w-full sm:w-auto justify-center">
          <Truck size={16} /> Mark as Shipped
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Box size={18} className="text-slate-500" />
              <span className="font-semibold text-sm">Order Items</span>
            </div>
            <div className="divide-y">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PackageCheck size={16} className="text-green-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">TSH-BLU-M • Blue T-Shirt (M)</p>
                    <p className="text-xs text-slate-400">Bin: BIN-42 • Qty: 2</p>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex-shrink-0 ml-2">Packed</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PackageCheck size={16} className="text-green-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">JNS-BLK-32 • Black Jeans (32)</p>
                    <p className="text-xs text-slate-400">Bin: BIN-15 • Qty: 1</p>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex-shrink-0 ml-2">Packed</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 size={16} className="text-amber-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">ACC-WLT-BRW • Brown Wallet</p>
                    <p className="text-xs text-slate-400">Bin: BIN-08 • Qty: 1</p>
                  </div>
                </div>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex-shrink-0 ml-2">Pending</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <form onSubmit={handleScan} className="flex gap-2 md:gap-3">
              <input
                autoFocus
                className="flex-1 px-4 py-2.5 md:py-3 border-2 rounded-xl font-mono text-sm outline-none focus:ring-4 focus:ring-blue-200"
                placeholder="Scan SKU..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
              />
              <button className="px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
                <QrCode size={18} />
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b font-bold text-sm">Packing Log</div>
            {packedItems.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No scans yet</div>
            ) : (
              packedItems.map(item => (
                <div key={item.id} className="px-4 py-3 flex items-center justify-between border-b last:border-0">
                  <span className="font-mono text-sm font-medium truncate mr-2">{item.sku}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400">{item.time}</span>
                    {item.verified 
                      ? <CheckCircle2 size={16} className="text-green-500" />
                      : <XCircle size={16} className="text-red-500" />
                    }
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h3 className="font-bold text-sm md:text-base mb-4">Packing Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Items</span>
              <span className="font-medium">4</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Packed</span>
              <span className="font-medium text-green-600">3</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Pending</span>
              <span className="font-medium text-amber-600">1</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Weight</span>
                <span className="font-medium">1.2 kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Box Size</span>
                <span className="font-medium">S</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingScreen;
