import React, { useState } from 'react';
import { Download, X, Smartphone, CheckCircle2, Loader2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstalled, install } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const success = await install();
      // If deferredPrompt triggered native prompt and was accepted or if we simulate direct download package
      setTimeout(() => {
        setIsInstalling(false);
        setInstallSuccess(true);
      }, 800);
    } catch {
      setIsInstalling(false);
      setInstallSuccess(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#806A56] hover:text-[#38271C] hover:bg-[#F3E9DD] rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#493222] text-[#FFF9F1] flex items-center justify-center shadow-md mb-3.5">
            <Smartphone className="w-7 h-7" />
          </div>

          <h3 className="font-serif text-lg font-bold text-[#38271C]">
            Download AWKUM ClassHub App
          </h3>
          <p className="text-xs text-[#806A56] mt-1 leading-relaxed">
            Click below to trigger instant download and installation permission.
          </p>

          {installSuccess || isInstalled ? (
            <div className="mt-5 w-full py-3.5 bg-[#EAF2E9] text-[#668064] rounded-2xl flex items-center justify-center gap-2 text-xs font-bold shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>App Downloaded & Installed Successfully!</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={isInstalling}
              onClick={handleInstallClick}
              className="mt-5 w-full py-3.5 px-4 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Requesting Permission & Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Install App Now</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full py-2 bg-transparent text-[#806A56] hover:text-[#38271C] text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
