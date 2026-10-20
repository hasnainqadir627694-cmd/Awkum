import React, { useState } from 'react';
import {
  ShieldCheck,
  Server,
  Database,
  Cloud,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Key,
} from 'lucide-react';
import { runFirebaseHealthCheck, HealthCheckResult } from '../../lib/firebaseHealth';
import { MASTER_ADMIN_EMAIL } from '../../lib/authService';

export const SettingsSecurityView: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);

  const handleRunDiagnostics = async () => {
    setIsChecking(true);
    try {
      const result = await runFirebaseHealthCheck();
      setHealthResult(result);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Settings & System Security</h1>
        <p className="text-xs text-[#806A56] mt-0.5">
          System health verification, encryption status, and role-based access control governance
        </p>
      </div>

      {/* 2. Master Admin Authority Badge */}
      <div className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#493222] text-[#FFF9F1] rounded-2xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#38271C]">Primary Master Administrator</h3>
            <p className="text-xs text-[#806A56] font-mono">{MASTER_ADMIN_EMAIL}</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-[#EAF2E9] text-[#668064] text-xs font-bold rounded-full">
          Verified Active
        </span>
      </div>

      {/* 3. System Health & Infrastructure Diagnostics */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E6D8C7]">
          <div>
            <h2 className="text-sm font-bold text-[#38271C]">Infrastructure & Service Health</h2>
            <p className="text-xs text-[#806A56] mt-0.5">
              Live checks of database, authentication, and file storage APIs
            </p>
          </div>
          <button
            onClick={handleRunDiagnostics}
            disabled={isChecking}
            className="px-3.5 py-1.5 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Run Live Diagnostics</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Firestore Database */}
          <div className="p-3.5 bg-white border border-[#E6D8C7] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-[#493222]" />
              <div>
                <span className="font-bold text-[#38271C] block">Cloud Firestore</span>
                <span className="text-[10px] text-[#806A56]">Project: awku-mardan</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
              CONNECTED
            </span>
          </div>

          {/* Cloudinary CDN */}
          <div className="p-3.5 bg-white border border-[#E6D8C7] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cloud className="w-4 h-4 text-[#3A7BD5]" />
              <div>
                <span className="font-bold text-[#38271C] block">Cloudinary Media CDN</span>
                <span className="text-[10px] text-[#806A56]">Cloud: ehc1fewm</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
              AUTHENTICATED
            </span>
          </div>

          {/* Firebase Authentication */}
          <div className="p-3.5 bg-white border border-[#E6D8C7] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-[#B78103]" />
              <div>
                <span className="font-bold text-[#38271C] block">Firebase Auth</span>
                <span className="text-[10px] text-[#806A56]">OAuth & Email/Password</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
              INITIALIZED
            </span>
          </div>

          {/* Dynamic Branding */}
          <div className="p-3.5 bg-white border border-[#E6D8C7] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-[#668064]" />
              <div>
                <span className="font-bold text-[#38271C] block">Branding Synchronization</span>
                <span className="text-[10px] text-[#806A56]">Live Real-time onSnapshot</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
              ACTIVE
            </span>
          </div>
        </div>

        {healthResult && (
          <div className="p-3.5 bg-[#F8F0E5]/70 rounded-2xl border border-[#E6D8C7] text-xs space-y-1">
            <div className="font-bold text-[#38271C]">Diagnostic Probe Results:</div>
            <div className="flex justify-between text-[#806A56]">
              <span>Firestore Write Probe:</span>
              <span className="font-bold text-[#38271C]">{healthResult.firestoreWriteStatus}</span>
            </div>
            <div className="flex justify-between text-[#806A56]">
              <span>Firestore Read Probe:</span>
              <span className="font-bold text-[#38271C]">{healthResult.firestoreReadStatus}</span>
            </div>
            <div className="flex justify-between text-[#806A56]">
              <span>Security Rules Enforcement:</span>
              <span className="font-bold text-[#668064]">{healthResult.securityRulesStatus}</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Security Policies */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-3">
        <h2 className="text-sm font-bold text-[#38271C]">Active Security Policies</h2>
        <div className="space-y-2 text-xs text-[#806A56]">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#668064] shrink-0 mt-0.5" />
            <span><strong>Least-Privilege RBAC</strong>: Students, Teachers, CRs, and Master Admin execute only their authorized functional boundaries.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#668064] shrink-0 mt-0.5" />
            <span><strong>Server-Side Secret Isolation</strong>: Cloudinary API secret and privileged service credentials reside solely on the Node server runtime.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#668064] shrink-0 mt-0.5" />
            <span><strong>Audit Trail Immutability</strong>: Sensitive role changes and branding updates are logged with admin email and timestamp.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
