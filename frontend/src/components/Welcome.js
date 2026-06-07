import React, { useState, useEffect } from 'react';
import { Package, Warehouse, Sparkles, X, ArrowRight, ShoppingBag, BarChart3 } from 'lucide-react';
import API from '../utils/api';

const STEPS = [
  {
    title: 'Welcome to GlobalSupply Technologies',
    subtitle: 'Your warehouse, simplified',
    body: 'GlobalSupply Technologies unifies your orders, inventory, picking, and shipping across every Indian marketplace — so you can stop tab-switching and start scaling.',
    icon: Sparkles,
    cta: 'Get started',
  },
  {
    title: 'Step 1: Set up your warehouses',
    subtitle: 'Where will you store inventory?',
    body: 'Add a warehouse (or "facility") to organize your inventory. Most teams start with one — you can add more as you grow to multiple cities.',
    icon: Warehouse,
    link: { label: 'Add your first warehouse', page: 'warehouse' },
  },
  {
    title: 'Step 2: Add SKUs and inventory',
    subtitle: 'Track what you have',
    body: 'Each product you sell is a SKU. Add them individually or import a CSV. GlobalSupply Technologies tracks stock by SKU + warehouse, so you always know what is available.',
    icon: Package,
    link: { label: 'Open inventory', page: 'inventory' },
  },
  {
    title: 'Step 3: Connect a marketplace',
    subtitle: 'Orders flow in automatically',
    body: 'Link Shopify, Amazon, Flipkart, Nykaa, Myntra, or TataCliq. Once connected, orders sync every 15 minutes and stock updates push back automatically.',
    icon: ShoppingBag,
    link: { label: 'Connect a marketplace', page: 'integrations' },
  },
  {
    title: 'You are all set',
    subtitle: 'You can always revisit this from Settings',
    body: 'Tip: press Ctrl+K (or Cmd+K) anywhere to jump to any page instantly. Need help? Use the chat bubble in the bottom-right.',
    icon: BarChart3,
    cta: 'Open dashboard',
  },
];

const Welcome = ({ onClose, onNavigate }) => {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('welcome-dismissed') === 'true';
  });
  const [counts, setCounts] = useState({ warehouses: 0, skus: 0, integrations: 0 });

  useEffect(() => {
    if (dismissed) return;
    API.get('/dashboard/stats').then(r => {
      setCounts({
        warehouses: r.data.warehousesCount || 0,
        skus: r.data.activeSkus || 0,
        integrations: 0,
      });
    }).catch(() => {});
  }, [dismissed]);

  if (dismissed) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const handleDismiss = (markSeen = true) => {
    if (markSeen) {
      localStorage.setItem('welcome-dismissed', 'true');
      setDismissed(true);
    } else {
      onClose && onClose();
    }
  };

  const handleNext = () => {
    if (isLast) {
      handleDismiss();
      onNavigate && onNavigate('dashboard');
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    handleDismiss();
  };

  const smartHint = (() => {
    if (step === 1 && counts.warehouses > 0) return `✓ You have ${counts.warehouses} warehouse${counts.warehouses === 1 ? '' : 's'} set up.`;
    if (step === 2 && counts.skus > 0) return `✓ You have ${counts.skus} active SKU${counts.skus === 1 ? '' : 's'}.`;
    return null;
  })();

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/60 flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white relative">
          <button onClick={handleSkip} className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-lg" aria-label="Close welcome">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/15 rounded-xl">
              <Icon size={22} />
            </div>
            <span className="text-xs uppercase tracking-wider opacity-80">Step {step + 1} of {STEPS.length}</span>
          </div>
          <h2 id="welcome-title" className="text-2xl font-bold">{current.title}</h2>
          <p className="text-sm text-indigo-100 mt-1">{current.subtitle}</p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{current.body}</p>
          {smartHint && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
              <span className="font-semibold">{smartHint}</span>
            </div>
          )}

          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            {!isFirst ? (
              <button onClick={() => setStep(step - 1)} className="text-sm text-slate-500 hover:text-slate-700">Back</button>
            ) : <span />}
            <div className="flex gap-2">
              {!isLast && (
                <button onClick={handleSkip} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">Skip tour</button>
              )}
              {current.link && !isLast ? (
                <button
                  onClick={() => { handleDismiss(); onNavigate && onNavigate(current.link.page); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  {current.link.label} <ArrowRight size={14} />
                </button>
              ) : (
                <button onClick={handleNext} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                  {current.cta || 'Next'} <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
