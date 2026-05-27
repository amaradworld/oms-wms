import React from 'react';
import { FileDown } from 'lucide-react';

const SAMPLES = {
  orders: 'orderNumber,customerName,shippingAddress,source,skuId,quantity,price,total\nORD-2001,Rajesh Kumar,42 MG Road Bangalore 560001,Shopify,TSH-BLU-M,2,899,1798\nORD-2002,Sunita Patel,15 Linking Road Mumbai 400050,Amazon,JNS-BLK-32,1,2499,2499',
  inventory: 'skuCode,name,styleName,size,color,brand,category,material,gender,unitType,mrp,hsnCode,binLocation,quantityOnHand\nTSH-BLU-L,Blue Cotton T-Shirt (L),Classic Fit T-Shirt,L,Blue,NoName,Apparel,Cotton,Male,Pieces,999,6109,BIN-01,50\nSHK-BLK-10,Black Running Shoes (10),Air Run 2000,10,Black,SportWear,Footwear, Mesh,Male,Pair,4499,6403,BIN-15,30',
  returns: 'orderId,skuId,quantity,reason\nORD-ORD-1001,TSH-BLU-M,1,Wrong size delivered\nORD-ORD-1002,JNS-BLK-32,1,Defective product',
};

const SampleCSVButton = ({ type = 'orders' }) => {
  const download = () => {
    const content = SAMPLES[type] || SAMPLES.orders;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample-${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={download}
      title="Download sample CSV"
      className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
    >
      <FileDown size={14} /> Sample CSV
    </button>
  );
};

export default SampleCSVButton;
