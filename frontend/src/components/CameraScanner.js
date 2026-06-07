import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Scan, AlertCircle } from 'lucide-react';

const supportsBarcodeDetector = () =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window;

const formats = ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'itf'];

const CameraScanner = ({ onScan, onClose, label = 'Scan a barcode' }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let mounted = true;

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    const tick = async () => {
      if (!mounted || scannedRef.current) return;
      const video = videoRef.current;
      if (video && detectorRef.current && video.readyState >= 2) {
        try {
          const codes = await detectorRef.current.detect(video);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            scannedRef.current = true;
            onScan?.(codes[0].rawValue);
            stop();
            return;
          }
        } catch (e) {}
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = async () => {
      if (!supportsBarcodeDetector()) {
        setError('Your browser does not support camera scanning. Please use Chrome on Android or iOS 17+ for camera scanning, or enter the barcode manually.');
        return;
      }
      try {
        setScanning(true);
        const Detector = window.BarcodeDetector;
        detectorRef.current = new Detector({ formats });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        if (e.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permission in your browser settings, or enter the barcode manually.');
        } else if (e.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError(`Camera error: ${e.message || 'unknown'}. Use manual entry.`);
        }
        setScanning(false);
      }
    };

    start();
    return () => {
      mounted = false;
      stop();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label="Camera scanner">
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 text-white">
        <div className="flex items-center gap-2">
          <Scan size={18} />
          <span className="font-medium text-sm">{label}</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close scanner">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 relative flex items-center justify-center bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
        {!scanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Camera size={48} className="animate-pulse" />
            <p className="absolute mt-24 text-sm">Starting camera…</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-4 flex items-center justify-center">
            <div className="bg-red-600/90 text-white p-4 rounded-lg text-center text-sm max-w-sm">
              <AlertCircle size={24} className="mx-auto mb-2" />
              {error}
            </div>
          </div>
        )}
        {!error && (
          <>
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-32 border-2 border-red-500/50 rounded-lg pointer-events-none" />
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] pointer-events-none" />
          </>
        )}
      </div>
      <div className="px-4 py-3 bg-black/50 text-white text-center text-xs">
        Point camera at barcode. Scans automatically.
      </div>
    </div>
  );
};

export default CameraScanner;
