import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  Briefcase,
  UserCheck,
  Clock,
  BookOpen,
  Image as ImageIcon,
  Shield,
  Database,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { AdminUser, AuditLogItem, SubjectConfig, ClassSection, UserAggregateStats } from '../../data/adminData';
import { subscribeToCurriculumSubjects, getAllSubjectsFromFirestore } from '../../lib/subjectService';
import { subscribeToClasses } from '../../lib/classService';
import { subscribeToUserAggregateStats } from '../../lib/authService';
import { executeUserMigration, MigrationAuditResult } from '../../lib/userMigrationService';
import { ShieldCheck, RefreshCw, Archive, Check, Sparkles, X } from 'lucide-react';

interface AdminDashboardOverviewProps {
  users: AdminUser[];
  auditLogs: AuditLogItem[];
  onNavigate: (viewId: string) => void;
}

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({
  users,
  auditLogs,
  onNavigate,
}) => {
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [aggregateStats, setAggregateStats] = useState<UserAggregateStats | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<MigrationAuditResult | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [reconcileSuccess, setReconcileSuccess] = useState<string | null>(null);

  useEffect(() => {
    // 1. One-shot direct Firestore fetch for immediate consistency
    getAllSubjectsFromFirestore()
      .then((liveList) => {
        if (Array.isArray(liveList)) {
          setSubjects(liveList);
        }
      })
      .catch((err) => {
        console.info('[Admin Dashboard] Subjects fetch notice:', err);
      });

    // 2. Real-time Firestore subscriptions
    const unsubSubj = subscribeToCurriculumSubjects((liveList) => {
      setSubjects(liveList);
    });
    const unsubCls = subscribeToClasses((liveClasses) => {
      setClasses(liveClasses);
    });
    const unsubAgg = subscribeToUserAggregateStats((stats) => {
      setAggregateStats(stats);
    });

    // 3. Intra-session custom event synchronization
    const handleSubjectsChanged = (e: any) => {
      if (Array.isArray(e.detail)) {
        setSubjects(e.detail);
      }
    };
    window.addEventListener('classhub_subjects_changed', handleSubjectsChanged);

    return () => {
      unsubSubj();
      unsubCls();
      unsubAgg();
      window.removeEventListener('classhub_subjects_changed', handleSubjectsChanged);
    };
  }, []);

  // Ensure safe, validated user records
  const safeUsers = Array.isArray(users)
    ? users.filter((u): u is AdminUser => Boolean(u && typeof u === 'object' && u.id && u.role))
    : [];

  // 100% REAL dynamic metrics - absolutely zero fake offsets
  const totalUsers = safeUsers.length;
  const studentCount = safeUsers.filter(
    (u) => (u.role === 'student' || (Array.isArray(u.roles) && u.roles.includes('student'))) && u.status !== 'suspended'
  ).length;
  const teacherCount = safeUsers.filter(
    (u) => (u.role === 'teacher' || (Array.isArray(u.roles) && u.roles.includes('teacher'))) && u.teacherStatus !== 'revoked' && u.status !== 'suspended'
  ).length;
  const crCount = safeUsers.filter(
    (u) => (u.isCR || u.role === 'cr' || (Array.isArray(u.roles) && u.roles.includes('cr'))) && u.crStatus !== 'revoked' && u.status !== 'suspended'
  ).length;
  const pendingCount = safeUsers.filter((u) => u.status === 'pending').length;
  const firebaseUserCount = safeUsers.filter(
    (u) => (u.isFirebaseUser || (u.studentId && u.studentId.startsWith('26SE'))) && u.status !== 'suspended'
  ).length;

  // Dynamic verification & aggregate counts
  const verifiedCount = aggregateStats?.verifiedAccounts ?? safeUsers.filter((u) => u.emailVerified || u.role === 'master_admin').length;
  const unverifiedCount = aggregateStats?.unverifiedAccounts ?? Math.max(0, totalUsers - verifiedCount);

  const handleRunAudit = async (dryRun: boolean) => {
    setIsAuditing(true);
    setReconcileSuccess(null);
    try {
      const res = await executeUserMigration(dryRun);
      setAuditResult(res);
      setShowAuditModal(true);
      if (!dryRun) {
        setReconcileSuccess(`Successfully reconciled user registry! Safely archived ${res.backedUpCount} orphaned documents into users_backup_archive.`);
      }
    } catch (err: any) {
      console.error('[Admin Dashboard] Audit notice:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  // Real-time percentages
  const studentPct = totalUsers > 0 ? (studentCount / totalUsers) * 100 : 0;
  const teacherPct = totalUsers > 0 ? (teacherCount / totalUsers) * 100 : 0;
  const crPct = totalUsers > 0 ? (crCount / totalUsers) * 100 : 0;
  const pendingPct = totalUsers > 0 ? (pendingCount / totalUsers) * 100 : 0;

  // Subject enrollment counts dynamically based on REAL configured subjects in Firestore
  const subjectColors = ['#493222', '#668064', '#806A56', '#C84B31', '#38271C', '#4A5B49', '#3A7BD5', '#7B68EE'];
  const subjectBarData = subjects.map((subj, idx) => {
    // If subject is tied to a specific class, count students in that class; else count total active students
    let count = studentCount;
    if (subj.assignedClass) {
      const classKey = subj.assignedClass.toLowerCase();
      count = safeUsers.filter(
        (u) =>
          (u.role === 'student' || (Array.isArray(u.roles) && u.roles.includes('student'))) &&
          (u.assignedClass?.toLowerCase() === classKey ||
            u.assignedClass?.toLowerCase().replace(/\s+/g, '') === classKey.replace(/\s+/g, ''))
      ).length;
    }

    return {
      name: subj.name,
      code: subj.code,
      count,
      teacher: subj.assignedTeacher || 'Unassigned',
      color: subjectColors[idx % subjectColors.length],
    };
  });

  const maxSubjectCount = Math.max(...subjectBarData.map((b) => b.count), 1);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">
              Welcome back, Master Admin
            </h1>
            <span className="text-amber-600 text-lg">👑</span>
          </div>
          <p className="text-xs text-[#806A56] mt-0.5">
            Admin-controlled academic governance over AWKUM ClassHub (Garden Campus Mardan)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EAF2E9] text-[#668064] text-xs font-bold rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#668064] animate-pulse" />
            <Database className="w-3.5 h-3.5" />
            Live Firestore Connected ({totalUsers} {totalUsers === 1 ? 'Account' : 'Accounts'})
          </span>
        </div>
      </div>

      {/* 1b. Registry Integrity & Email Verification Health Banner */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-[#EAF2E9] rounded-xl text-[#668064] shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[#38271C]">
                Firebase Authentication & User Registry Integrity
              </h2>
              <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                Real-Time Aggregates
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#806A56] mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#668064]" />
                <strong className="text-[#38271C] font-bold">{verifiedCount}</strong> Email Verified
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <strong className="text-[#38271C] font-bold">{unverifiedCount}</strong> Pending Verification
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#493222]" />
                <strong className="text-[#38271C] font-bold">{totalUsers}</strong> Active in Registry
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => handleRunAudit(true)}
            disabled={isAuditing}
            className="px-3 py-1.5 bg-[#EFE3D3] hover:bg-[#E6D8C7] text-[#493222] text-xs font-bold rounded-xl border border-[#D8C7B4] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>Audit Registry</span>
          </button>
          <button
            type="button"
            onClick={() => handleRunAudit(false)}
            disabled={isAuditing}
            className="px-3 py-1.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Reconcile & Archive</span>
          </button>
        </div>
      </div>

      {reconcileSuccess && (
        <div className="p-3 bg-[#EAF2E9] border border-[#668064]/30 rounded-xl text-xs text-[#4A5B49] flex items-center justify-between">
          <span>{reconcileSuccess}</span>
          <button onClick={() => setReconcileSuccess(null)} className="text-[#668064] font-bold cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Top Metric Cards (Real Database Counts) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Users */}
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806A56]">Total Users</span>
            <div className="p-2 bg-[#F8F0E5] rounded-xl text-[#493222]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#38271C]">{totalUsers}</span>
            <span className="text-[10px] font-bold text-[#668064] flex items-center gap-1 bg-[#EAF2E9] px-1.5 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3" />
              Live
            </span>
          </div>
        </div>

        {/* Students */}
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806A56]">Students</span>
            <div className="p-2 bg-[#EAF2E9] rounded-xl text-[#668064]">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#38271C]">{studentCount}</span>
            <span className="text-[10px] font-semibold text-[#806A56]">
              {firebaseUserCount} Verified
            </span>
          </div>
        </div>

        {/* Teachers */}
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806A56]">Faculty</span>
            <div className="p-2 bg-[#F3E9DD] rounded-xl text-[#806A56]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#38271C]">{teacherCount}</span>
            <span className="text-[10px] font-semibold text-[#668064]">
              {teacherCount > 0 ? `${teacherCount} Active` : 'Awaiting Map'}
            </span>
          </div>
        </div>

        {/* Class CRs */}
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806A56]">Class CRs</span>
            <div className="p-2 bg-[#F0F5FA] rounded-xl text-[#3A7BD5]">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#38271C]">{crCount}</span>
            <span className="text-[10px] font-semibold text-[#3A7BD5]">
              {crCount > 0 ? 'Appointed' : 'None yet'}
            </span>
          </div>
        </div>

        {/* Configured Subjects */}
        <div
          onClick={() => onNavigate('subjects')}
          className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806A56] group-hover:text-[#493222]">Subjects</span>
            <div className="p-2 bg-[#F8F0E5] rounded-xl text-[#493222] group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#38271C]">{subjects.length}</span>
            <span className="text-[10px] font-bold text-[#493222] underline">
              Manage
            </span>
          </div>
        </div>

        {/* Active Classes */}
        <div
          onClick={() => onNavigate('classes')}
          className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806A56] group-hover:text-[#493222]">Classes</span>
            <div className="p-2 bg-[#F8F0E5] rounded-xl text-[#493222] group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#38271C]">{classes.length}</span>
            <span className="text-[10px] font-bold text-[#493222] underline">
              Manage
            </span>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Charts & Operational Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* User Distribution Chart */}
        <div className="lg:col-span-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#38271C]">User Distribution</h2>
                <p className="text-[10px] text-[#806A56]">Live breakdown by role</p>
              </div>
              <span className="text-[10px] font-bold text-[#668064] bg-[#EAF2E9] px-2 py-0.5 rounded-full">
                Real Database
              </span>
            </div>

            {/* Donut Visualization */}
            <div className="relative h-36 flex items-center justify-center my-3">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#E6D8C7"
                  strokeWidth="3.5"
                  opacity="0.3"
                />
                {totalUsers > 0 && (
                  <>
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#493222"
                      strokeWidth="3.5"
                      strokeDasharray={`${studentPct} 100`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    {teacherPct > 0 && (
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#668064"
                        strokeWidth="3.5"
                        strokeDasharray={`${teacherPct} 100`}
                        strokeDashoffset={`${-studentPct}`}
                        strokeLinecap="round"
                      />
                    )}
                    {crPct > 0 && (
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#3A7BD5"
                        strokeWidth="3.5"
                        strokeDasharray={`${crPct} 100`}
                        strokeDashoffset={`${-(studentPct + teacherPct)}`}
                        strokeLinecap="round"
                      />
                    )}
                    {pendingPct > 0 && (
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#E2A03F"
                        strokeWidth="3.5"
                        strokeDasharray={`${pendingPct} 100`}
                        strokeDashoffset={`${-(studentPct + teacherPct + crPct)}`}
                        strokeLinecap="round"
                      />
                    )}
                  </>
                )}
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-bold text-[#38271C]">{totalUsers}</span>
                <span className="text-[10px] text-[#806A56]">Total Users</span>
              </div>
            </div>

            {/* Dynamic Legend */}
            <div className="space-y-2 text-xs w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#493222]" />
                  <span className="text-[#38271C] font-medium">Students</span>
                </div>
                <span className="font-semibold text-[#38271C]">
                  {studentCount}{' '}
                  <span className="text-[10px] text-[#806A56]">
                    ({studentPct.toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#668064]" />
                  <span className="text-[#38271C] font-medium">Faculty</span>
                </div>
                <span className="font-semibold text-[#38271C]">
                  {teacherCount}{' '}
                  <span className="text-[10px] text-[#806A56]">
                    ({teacherPct.toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3A7BD5]" />
                  <span className="text-[#38271C] font-medium">Class CRs</span>
                </div>
                <span className="font-semibold text-[#38271C]">
                  {crCount}{' '}
                  <span className="text-[10px] text-[#806A56]">
                    ({crPct.toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E2A03F]" />
                  <span className="text-[#38271C] font-medium">Pending</span>
                </div>
                <span className="font-semibold text-[#38271C]">
                  {pendingCount}{' '}
                  <span className="text-[10px] text-[#806A56]">
                    ({pendingPct.toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects Overview (Bar Chart from Real Configured Subjects) */}
        <div className="lg:col-span-5 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#38271C]">Curriculum Subjects Overview</h2>
                <p className="text-[10px] text-[#806A56]">Configured Academic Courses</p>
              </div>
              <button
                onClick={() => onNavigate('subjects')}
                className="text-[11px] font-semibold text-[#493222] bg-[#F8F0E5] px-2.5 py-1 rounded-lg border border-[#E6D8C7] hover:bg-[#EFE3D3] cursor-pointer"
              >
                + Add Subject
              </button>
            </div>

            {subjects.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <BookOpen className="w-8 h-8 text-[#806A56] mx-auto opacity-60" />
                <p className="text-xs font-bold text-[#38271C]">No subjects configured yet</p>
                <p className="text-[11px] text-[#806A56] max-w-xs mx-auto">
                  Master Admin creates courses intentionally. Click "+ Add Subject" to start building your curriculum.
                </p>
              </div>
            ) : (
              <div className="pt-2 pb-1">
                <div className="h-44 flex items-end justify-between gap-2 px-2 border-b border-[#E6D8C7]/80 pb-2">
                  {subjectBarData.map((bar) => {
                    const heightPercent =
                      studentCount > 0 ? Math.max((bar.count / maxSubjectCount) * 85, 12) : 10;
                    return (
                      <div
                        key={bar.code || bar.name}
                        className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                        title={`${bar.name} (${bar.code}) - Teacher: ${bar.teacher}`}
                      >
                        <span className="text-[10px] font-bold text-[#38271C] group-hover:scale-110 transition-transform">
                          {bar.count}
                        </span>
                        <div
                          style={{ height: `${heightPercent}%`, backgroundColor: bar.color }}
                          className="w-full max-w-[28px] rounded-t-lg transition-all duration-300 hover:brightness-110"
                        />
                      </div>
                    );
                  })}
                </div>
                {/* Axis labels */}
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-semibold text-[#806A56] mt-2 px-1">
                  {subjectBarData.map((b) => (
                    <span key={b.code || b.name} className="flex-1 text-center truncate" title={b.name}>
                      {b.code || b.name}
                    </span>
                  ))}
                </div>

                {/* Active subjects list */}
                <div className="mt-3.5 pt-3 border-t border-[#E6D8C7] space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {subjects.slice(0, 5).map((subj) => (
                    <div
                      key={subj.id}
                      onClick={() => onNavigate('subjects')}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/70 hover:bg-white border border-[#E6D8C7] text-xs transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[10px] font-bold text-[#493222] bg-[#F8F0E5] px-1.5 py-0.5 rounded border border-[#E6D8C7] shrink-0">
                          {subj.code}
                        </span>
                        <div className="truncate">
                          <p className="font-bold text-[#38271C] group-hover:text-[#493222] transition-colors leading-tight truncate">
                            {subj.name}
                          </p>
                          <p className="text-[10px] text-[#806A56] truncate">
                            {subj.assignedTeacher ? `Faculty: ${subj.assignedTeacher}` : 'Unassigned'}
                            {subj.assignedClass ? ` · ${subj.assignedClass}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-[#806A56] bg-[#EFE3D3] px-2 py-0.5 rounded-full shrink-0 ml-2">
                        {subj.creditHours} CH
                      </span>
                    </div>
                  ))}
                  {subjects.length > 5 && (
                    <button
                      onClick={() => onNavigate('subjects')}
                      className="w-full text-center text-[10px] font-bold text-[#493222] hover:underline pt-1 cursor-pointer"
                    >
                      + {subjects.length - 5} more subjects in catalog
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities (Real Audit Logs) */}
        <div className="lg:col-span-3 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#38271C]">Recent Activities</h2>
              <button
                onClick={() => onNavigate('logs')}
                className="text-[11px] font-semibold text-[#493222] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#806A56] italic">
                  No activity logs recorded yet.
                </div>
              ) : (
                auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-2.5 bg-white border border-[#E6D8C7] rounded-xl text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#38271C] truncate">{log.action}</span>
                      <span className="text-[10px] text-[#806A56] shrink-0">{log.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#806A56] line-clamp-1">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Migration & Registry Audit Modal */}
      {showAuditModal && auditResult && (
        <div className="fixed inset-0 z-50 bg-[#2E1F14]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8C7]">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#EAF2E9] rounded-xl text-[#668064]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#38271C]">
                    {auditResult.dryRun ? 'User Registry Inspection (Dry Run)' : 'Reconciliation & Archive Report'}
                  </h3>
                  <p className="text-xs text-[#806A56]">
                    Timestamp: {new Date(auditResult.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="p-1.5 rounded-full hover:bg-[#EFE3D3] text-[#806A56] hover:text-[#38271C] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="p-3 bg-[#F8F0E5] rounded-xl border border-[#E6D8C7]">
                <span className="text-[10px] text-[#806A56] font-semibold">Total Scanned</span>
                <p className="text-lg font-bold text-[#38271C]">{auditResult.totalScanned}</p>
              </div>
              <div className="p-3 bg-[#EAF2E9] rounded-xl border border-[#C5DCC3]">
                <span className="text-[10px] text-[#668064] font-semibold">Valid Auth Users</span>
                <p className="text-lg font-bold text-[#668064]">{auditResult.validCount}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-700 font-semibold">Duplicate & Orphaned</span>
                <p className="text-lg font-bold text-amber-800">{auditResult.orphanedCount}</p>
              </div>
              <div className="p-3 bg-[#EFE3D3] rounded-xl border border-[#D8C7B4]">
                <span className="text-[10px] text-[#493222] font-semibold">
                  {auditResult.dryRun ? 'Archive Ready' : 'Safely Archived'}
                </span>
                <p className="text-lg font-bold text-[#493222]">
                  {auditResult.dryRun ? auditResult.orphanedCount : auditResult.backedUpCount}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div>
                <h4 className="font-bold text-[#38271C] mb-1.5 flex items-center justify-between">
                  <span>Verified Accounts (UID Confirmed)</span>
                  <span className="text-[10px] text-[#668064]">{auditResult.validAccounts.length} Verified</span>
                </h4>
                <div className="space-y-1 max-h-36 overflow-y-auto bg-white/70 p-2 rounded-xl border border-[#E6D8C7]">
                  {auditResult.validAccounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between py-1 border-b border-[#E6D8C7]/50 last:border-b-0">
                      <div className="truncate mr-2">
                        <span className="font-semibold text-[#38271C]">{acc.email}</span>
                        <span className="ml-2 font-mono text-[10px] text-[#806A56]">{acc.uid ? `UID: ${acc.uid.slice(0, 10)}...` : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EADBCC] text-[#493222] uppercase">
                          {acc.role}
                        </span>
                        {acc.emailVerified && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EAF2E9] text-[#668064]">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {auditResult.orphanedAccounts.length > 0 && (
                <div>
                  <h4 className="font-bold text-amber-800 mb-1.5 flex items-center justify-between">
                    <span>Duplicate Secondary & Orphan Records ({auditResult.dryRun ? 'Ready to Archive' : 'Archived'})</span>
                    <span className="text-[10px] text-amber-700">{auditResult.orphanedAccounts.length} Flagged</span>
                  </h4>
                  <div className="space-y-1 max-h-36 overflow-y-auto bg-amber-50/50 p-2 rounded-xl border border-amber-200">
                    {auditResult.orphanedAccounts.map((acc) => (
                      <div key={acc.id} className="flex items-center justify-between py-1 border-b border-amber-200/50 last:border-b-0">
                        <div className="truncate mr-2">
                          <span className="font-semibold text-[#38271C]">{acc.email}</span>
                          <p className="text-[10px] text-amber-700 truncate">{acc.reason}</p>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono shrink-0">
                          {acc.id}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-[#E6D8C7] flex items-center justify-between">
              <span className="text-[11px] text-[#806A56]">
                Archive collection: <code className="font-mono font-bold text-[#493222]">{auditResult.backupArchiveCollection}</code>
              </span>
              <div className="flex items-center gap-2">
                {auditResult.dryRun && auditResult.orphanedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRunAudit(false)}
                    disabled={isAuditing}
                    className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Execute Reconcile & Archive
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 bg-[#EFE3D3] hover:bg-[#E6D8C7] text-[#493222] text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
