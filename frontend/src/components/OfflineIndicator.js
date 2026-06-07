import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { toast } from './Toast';

const OfflineIndicator = () => {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOfflineRef = React.useRef(false);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      if (wasOfflineRef.current) {
        setShowReconnected(true);
        toast.success('Back online', { duration: 3000 });
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };
    const onOffline = () => {
      setOnline(false);
      wasOfflineRef.current = true;
      toast.error('You are offline. Changes will not save until connection returns.', { duration: 6000 });
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`fixed top-0 left-0 right-0 z-[150] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white shadow-md ${
        online ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {online ? <Wifi size={16} /> : <WifiOff size={16} />}
      <span>
        {online ? 'Connection restored' : 'No internet connection'}
      </span>
    </div>
  );
};

export default OfflineIndicator;
