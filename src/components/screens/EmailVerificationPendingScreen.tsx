import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  LogOut,
  ShieldCheck,
  Send,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AwkumEmblem } from '../common/AwkumLogo';
import { auth } from '../../lib/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { AdminUser, UserRole } from '../../data/adminData';
import { checkEmailVerificationStatus } from '../../lib/authService';

interface EmailVerificationPendingScreenProps {
  email: string;
  onVerificationSuccess?: (user: AdminUser, role: UserRole) => void;
  onVerified?: () => void;
  onSignOut?: () => void;
  onBackToLogin?: () => void;
}

export const EmailVerificationPendingScreen: React.FC<EmailVerificationPendingScreenProps> = ({
  email,
  onVerificationSuccess,
  onVerified,
  onSignOut,
  onBackToLogin,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>({
    type: 'info',
    text: `An official verification link has been sent to ${email}.`,
  });

  // Cooldown countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Periodic polling: auto-detect if user verified in another browser tab
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!auth?.currentUser) return;
      try {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          const res = await checkEmailVerificationStatus();
          if (res.isVerified) {
            if (onVerified) onVerified();
            if (onVerificationSuccess && res.user && res.role) {
              onVerificationSuccess(res.user, res.role);
            }
          }
        }
      } catch (err) {
        // Silently continue polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [onVerificationSuccess, onVerified]);

  const handleCheckVerification = async () => {
    setIsChecking(true);
    setStatusMessage(null);

    try {
      if (!auth?.currentUser) {
        setStatusMessage({
          type: 'error',
          text: 'Authentication session expired. Please sign in again.',
        });
        setIsChecking(false);
        return;
      }

      await auth.currentUser.reload();

      if (auth.currentUser.emailVerified) {
        setStatusMessage({
          type: 'success',
          text: 'Email verified successfully! Initializing your portal access...',
        });

        const res = await checkEmailVerificationStatus();
        if (res.isVerified) {
          setTimeout(() => {
            if (onVerified) onVerified();
            if (onVerificationSuccess && res.user && res.role) {
              onVerificationSuccess(res.user, res.role);
            }
          }, 800);
        } else {
          setIsChecking(false);
        }
      } else {
        setIsChecking(false);
        setStatusMessage({
          type: 'error',
          text: "Verification not detected yet. Please open the email sent to your inbox, click the verification link, and click this button again.",
        });
      }
    } catch (err: any) {
      setIsChecking(false);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error checking verification status. Please try again.',
      });
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    setStatusMessage(null);

    try {
      if (!auth?.currentUser) {
        setStatusMessage({
          type: 'error',
          text: 'No active session found. Please sign in and try again.',
        });
        setIsResending(false);
        return;
      }

      await sendEmailVerification(auth.currentUser);
      setIsResending(false);
      setResendCooldown(60);
      setStatusMessage({
        type: 'success',
        text: `New verification link dispatched to ${email}. Please check your inbox.`,
      });
    } catch (err: any) {
      setIsResending(false);
      if (err?.code === 'auth/too-many-requests') {
        setStatusMessage({
          type: 'error',
          text: 'Too many requests sent. Please wait a moment before trying again.',
        });
        setResendCooldown(60);
      } else {
        setStatusMessage({
          type: 'error',
          text: err?.message || 'Unable to send verification email. Please check your network connection or Firebase configuration.',
        });
      }
    }
  };


  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth).catch(() => {});
    }
    if (onSignOut) onSignOut();
    if (onBackToLogin) onBackToLogin();
  };

  return (
    <div className="min-h-screen bg-[#F8F0E5] text-[#38271C] flex flex-col justify-between p-4 sm:p-6 selection:bg-[#493222] selection:text-[#FFF9F1]">
      {/* Top Header */}
      <header className="max-w-lg w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <AwkumEmblem className="w-9 h-9" />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#38271C]">AWKUM ClassHub</h1>
            <p className="text-[10px] text-[#806A56] font-medium">Security & Identity Gate</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6D8C7] bg-[#FFF9F1] hover:bg-[#EFE3D3] text-xs font-semibold text-[#806A56] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Card */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
          {/* Animated Mail / Shield Icon */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#EAF2E9] rounded-3xl animate-ping opacity-25" />
            <div className="w-20 h-20 bg-[#EAF2E9] border-2 border-[#668064]/30 rounded-3xl flex items-center justify-center shadow-inner text-[#668064]">
              <Mail className="w-9 h-9 animate-bounce" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#493222] text-[#FFF9F1] p-1.5 rounded-full border-2 border-[#FFF9F1] shadow">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-[#38271C]">
              Verify Your Email Address
            </h2>
            <p className="text-xs text-[#806A56] leading-relaxed max-w-sm mx-auto">
              To protect university academic records and ensure authentic student enrollment, access to AWKUM ClassHub is strictly restricted to verified email accounts.
            </p>
          </div>

          {/* Target Email Address Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#F8F0E5] border border-[#E6D8C7] rounded-2xl text-xs font-mono font-semibold text-[#38271C] max-w-full break-all">
            <Mail className="w-3.5 h-3.5 text-[#668064] shrink-0" />
            <span className="truncate">{email}</span>
          </div>

          {/* Status Message Banner */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 text-left transition-all ${
                statusMessage.type === 'success'
                  ? 'bg-[#EAF2E9] border border-[#668064]/30 text-[#4A5B49]'
                  : statusMessage.type === 'error'
                  ? 'bg-[#FDF0ED] border border-[#F5C2C1] text-[#C84B31]'
                  : 'bg-[#F0F5FA] border border-[#D0E0F0] text-[#2B6CB0]'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#668064] shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-[#C84B31] shrink-0 mt-0.5" />
              ) : (
                <Clock className="w-4 h-4 text-[#2B6CB0] shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{statusMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={handleCheckVerification}
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#493222] hover:bg-[#38271C] disabled:bg-[#806A56]/60 text-[#FFF9F1] text-xs font-bold rounded-2xl transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking Verification...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I've Verified My Email</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#F8F0E5] hover:bg-[#EFE3D3] disabled:opacity-60 border border-[#E6D8C7] text-xs font-semibold text-[#806A56] hover:text-[#38271C] rounded-2xl transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending email...</span>
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Resend link in {resendCooldown}s</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Resend Verification Email</span>
                </>
              )}
            </button>

          </div>

          {/* Quick Troubleshooting Guide */}
          <div className="border-t border-[#E6D8C7] pt-4 text-left space-y-2">
            <h3 className="text-[11px] font-bold text-[#38271C] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Next Steps:</span>
            </h3>
            <ul className="text-[11px] text-[#806A56] space-y-1 pl-4 list-disc">
              <li>Open your email inbox and search for <strong>Abdul Wali Khan University</strong> or <strong>Firebase</strong>.</li>
              <li>Check your <strong>Spam</strong> or <strong>Junk</strong> folder if it does not appear in your primary inbox.</li>
              <li>Click the activation link, then return to this page.</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-2 text-[10px] text-[#806A56]">
        Abdul Wali Khan University Mardan · Garden Campus · Department of Computer Science & Software Engineering
      </footer>
    </div>
  );
};
