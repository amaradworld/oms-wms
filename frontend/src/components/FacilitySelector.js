import React, { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, X } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const FacilitySelector = () => {
  const { selectedFacility, setSelectedFacility, clearSelectedFacility } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await API.get('/warehouses');
        setWarehouses(Array.isArray(res.data) ? res.data : []);
      } catch {}
    };
    fetch();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const flatList = warehouses.reduce((acc, w) => {
    acc.push(w);
    if (w.children?.length) w.children.forEach(c => acc.push({ ...c, parentName: w.name }));
    return acc;
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white border border-slate-600 transition-colors min-w-[160px]"
      >
        <Building2 size={14} className="text-blue-400 shrink-0" />
        <span className="truncate flex-1 text-left">
          {selectedFacility ? selectedFacility.name : 'All Facilities'}
        </span>
        {selectedFacility && (
          <span
            onClick={(e) => { e.stopPropagation(); clearSelectedFacility(); setOpen(false); }}
            className="p-0.5 hover:bg-slate-600 rounded"
          >
            <X size={12} />
          </span>
        )}
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-80 overflow-y-auto">
          <div className="p-2 border-b border-slate-100">
            <button
              onClick={() => { clearSelectedFacility(); setOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedFacility ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              <Building2 size={14} className="inline mr-2" />All Facilities
            </button>
          </div>
          <div className="p-1">
            {flatList.map(w => (
              <button
                key={w.id}
                onClick={() => { setSelectedFacility({ id: w.id, name: w.parentName ? `${w.parentName} › ${w.name}` : w.name }); setOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  selectedFacility?.id === w.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Building2 size={14} className={`shrink-0 ${w.parentName ? 'text-slate-400' : 'text-blue-500'}`} />
                <span className="truncate">{w.parentName ? `↳ ${w.name}` : w.name}</span>
                {!w.isActive && <span className="text-[10px] text-slate-400 ml-auto">Disabled</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilitySelector;
