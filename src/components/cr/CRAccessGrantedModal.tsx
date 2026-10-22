import React from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2, BookOpen, FileSpreadsheet, BellRing } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AwkumEmblem } from '../common/AwkumLogo';

interface CRAccessGrantedModalProps {
  isOpen: boolean;
  assignedClass: string;
  onOpenCRPanel: () => void;
  onContinueStudentPortal: () => void;
}

export const CRAccessGrantedModal: React.FC<CRAccessGrantedModalProps> = ({
  isOpen,
  assignedClass,
  onOpenCRPanel,
  onContinueStudentPortal,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative overflow-hidden text-[#38271C]"
        >
          {/* Subtle university seal watermark */}
          <div className="flex flex-col items-center text-center">
            {/* Crown & Shield Badge */}
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-2xl bg-[#493222] text-[#FFF9F1] flex items-center justify-center shadow-md">
                <ShieldCheck className="w-8 h-8 text-[#E6D8C7]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#668064] text-white flex items-center justify-center ring-2 ring-[#FFF9F1]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <span className="px-3 py-1 bg-[#EFE3D3] text-[#493222] text-xs font-bold rounded-full uppercase tracking-wider mb-2">
              Official Appointment
            </span>

            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#38271C]">
              Class Representative Access Granted
            </h3>

            <p className="text-xs sm:text-sm text-[#806A56] mt-2 leading-relaxed">
              You have been officially appointed as the Class Representative (CR) for{' '}
              <strong className="text-[#38271C] font-bold">{assignedClass}</strong> by the Master Administrator.
            </p>

            {/* Feature Highlights Grid */}
            <div className="w-full mt-5 bg-[#F8F0E5] border border-[#E6D8C7] rounded-2xl p-4 text-left space-y-2.5 text-xs text-[#38271C]">
              <div className="flex items-center gap-2.5">
                <div className="p-1 rounded-md bg-[#EFE3D3] text-[#493222]">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span>Record single daily attendance for the entire class</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-1 rounded-md bg-[#EFE3D3] text-[#493222]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span>Download automated professional A4 PDF reports</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-1 rounded-md bg-[#EFE3D3] text-[#493222]">
                  <BellRing className="w-4 h-4" />
                </div>
                <span>Send direct class reminders to assigned faculty</span>
              </div>
            </div>

            <p className="text-[11px] text-[#806A56] mt-3">
              Your normal Student Portal remains fully active. You can switch between your student view and CR Panel at any time.
            </p>

            {/* Action Buttons */}
            <div className="w-full mt-6 space-y-2.5">
              <button
                type="button"
                onClick={onOpenCRPanel}
                className="w-full py-3 px-4 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Open CR Control Panel</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onContinueStudentPortal}
                className="w-full py-2.5 bg-transparent hover:bg-[#F3E9DD] text-[#806A56] hover:text-[#38271C] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Continue to Student Portal
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
