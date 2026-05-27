import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const BarcodeCell = ({ value, width = 100, height = 30 }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: 1,
          height,
          displayValue: false,
          margin: 2,
          background: 'transparent',
        });
      } catch {}
    }
  }, [value, height]);

  if (!value) return <span className="text-slate-300 text-xs">—</span>;

  return (
    <div className="flex items-center gap-2">
      <svg ref={svgRef} style={{ width, height: height + 4 }} />
      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[80px]">{value}</span>
    </div>
  );
};

export default BarcodeCell;
