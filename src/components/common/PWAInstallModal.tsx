import React, { useState } from 'react';
import { Download, X, Smartphone, CheckCircle2, Loader2, Share, MoreVertical } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

import { AwkumEmblem } from './AwkumLogo';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const success = await install();
      setIsInstalling(false);
      if (success) {
        setInstallSuccess(true);
      }
    } catch {
      setIsInstalling(false);
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
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3.5">
            <AwkumEmblem size={52} />
          </div>

          <h3 className="font-serif text-lg font-bold text-[#38271C]">
            Download AWKUM ClassHub App
          </h3>
          <p className="text-xs text-[#806A56] mt-1 leading-relaxed">
            Install AWKUM ClassHub on your device for instant offline access and app-like navigation.
          </p>

          {installSuccess || isInstalled ? (
            <div className="mt-5 w-full py-3.5 bg-[#EAF2E9] text-[#668064] rounded-2xl flex items-center justify-center gap-2 text-xs font-bold shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>App Installed Successfully!</span>
            </div>
          ) : isInstallable ? (
            <button
              type="button"
              disabled={isInstalling}
              onClick={handleInstallClick}
              className="mt-5 w-full py-3.5 px-4 bg-[#493222] hover:bg-[#342217] text-[#FFF9F1] text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Installing App...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Install App Now</span>
                </>
              )}
            </button>
          ) : isIOS ? (
            <div className="mt-5 p-4 bg-white border border-[#E6D8C7] rounded-2xl text-left space-y-2 text-xs text-[#38271C]">
              <div className="font-bold flex items-center gap-1.5 text-[#493222]">
                <Share className="w-4 h-4 text-amber-600" />
                <span>iPhone / iPad Installation:</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[#806A56]">
                <li>Tap the <strong>Share</strong> button in Safari toolbar.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                <li>Tap <strong>Add</strong> to confirm installation.</li>
              </ol>
            </div>
          ) : isAndroid ? (
            <div className="mt-5 p-4 bg-white border border-[#E6D8C7] rounded-2xl text-left space-y-2 text-xs text-[#38271C]">
              <div className="font-bold flex items-center gap-1.5 text-[#493222]">
                <MoreVertical className="w-4 h-4 text-amber-600" />
                <span>Android Chrome Installation:</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[#806A56]">
                <li>Tap the <strong>browser menu (3 vertical dots)</strong>.</li>
                <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>Confirm to add AWKUM ClassHub to your home screen.</li>
              </ol>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                alert('To install AWKUM ClassHub, open your browser menu and select "Install App" or "Add to Home Screen".');
              }}
              className="mt-5 w-full py-3.5 px-4 bg-[#493222] hover:bg-[#342217] text-[#FFF9F1] text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>How to Install</span>
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
