import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Check,
  ShieldCheck,
  Mail,
  ArrowRight,
  BookOpen,
  Plus,
  Search,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  Trash2,
  KeyRound,
  Copy,
  Clock,
  Sparkles,
} from 'lucide-react';
import { SubjectConfig, AdminUser, SubjectTeacherAssignment, SubjectInvitation } from '../../data/adminData';
import {
  subscribeToCurriculumSubjects,
  revokeSubjectTeacher,
  keepSubjectTeacherActive,
  subscribeToSubjectTeacherAssignment,
} from '../../lib/subjectService';
import {
  generateTeacherInvitation,
  getSubjectInvitation,
  subscribeToSubjectInvitation,
  revokeTeacherInvitation,
} from '../../lib/teacherInvitationService';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface TeacherAssignmentsViewProps {
  users?: AdminUser[];
  adminEmail?: string;
  onNavigateToSubjects?: () => void;
  initialSelectedSubjectId?: string | null;
}

export const TeacherAssignmentsView: React.FC<TeacherAssignmentsViewProps> = ({
  adminEmail = 'hasnainbuilds724656@gmail.com',
  onNavigateToSubjects,
  initialSelectedSubjectId = null,
}) => {
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSelectedSubjectId);
  const [activeAssignment, setActiveAssignment] = useState<SubjectTeacherAssignment | null>(null);
  const [activeInvitation, setActiveInvitation] = useState<SubjectInvitation | null>(null);

  // Search and filter for Step 1
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Controlled newly generated credentials display
  const [newlyGeneratedCredentials, setNewlyGeneratedCredentials] = useState<{
    code: string;
    password: string;
    subjectName: string;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedFullBundle, setCopiedFullBundle] = useState(false);

  // Revocation modal states
  const [showRevokeTeacherModal, setShowRevokeTeacherModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  // Status and feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subject resource preservation counts
  const [resourceCounts, setResourceCounts] = useState<{ docs: number; asgs: number }>({ docs: 0, asgs: 0 });

  // 1. Subscribe to curriculum subjects in real time
  useEffect(() => {
    const unsub = subscribeToCurriculumSubjects((liveList) => {
      setSubjects(liveList);
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to active assignment & invitation for the selected subject
  useEffect(() => {
    if (!selectedSubjectId) {
      setActiveAssignment(null);
      setActiveInvitation(null);
      setNewlyGeneratedCredentials(null);
      return;
    }

    const unsubAssignment = subscribeToSubjectTeacherAssignment(selectedSubjectId, (assignment) => {
      setActiveAssignment(assignment);
    });

    const unsubInvitation = subscribeToSubjectInvitation(selectedSubjectId, (invitation) => {
      if (invitation) {
        setActiveInvitation(invitation);
      }
    });

    // Direct REST lookup fallback for instant loading resilience
    getSubjectInvitation(selectedSubjectId).then((inv) => {
      if (inv) {
        setActiveInvitation(inv);
      }
    });

    // Fetch preserved resource counts for this subject
    if (db) {
      const fetchCounts = async () => {
        try {
          const docSnap = await getDocs(
            query(collection(db, 'documents'), where('subjectId', '==', selectedSubjectId))
          );
          const asgSnap = await getDocs(
            query(collection(db, 'assignments'), where('subjectId', '==', selectedSubjectId))
          );
          setResourceCounts({ docs: docSnap.size, asgs: asgSnap.size });
        } catch {
          // Non-blocking
        }
      };
      fetchCounts();
    }

    return () => {
      unsubAssignment();
      unsubInvitation();
    };
  }, [selectedSubjectId]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Filter subjects for Step 1
  const filteredSubjects = subjects.filter((subj) => {
    const matchesSearch =
      subj.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
      subj.code.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
      (subj.assignedClass && subj.assignedClass.toLowerCase().includes(subjectSearchQuery.toLowerCase())) ||
      (subj.assignedTeacher && subj.assignedTeacher.toLowerCase().includes(subjectSearchQuery.toLowerCase())) ||
      (subj.invitationCode && subj.invitationCode.toLowerCase().includes(subjectSearchQuery.toLowerCase()));

    const isAssigned = Boolean(subj.assignedTeacher || subj.status === 'Assigned');

    if (statusFilter === 'assigned') return matchesSearch && isAssigned;
    if (statusFilter === 'unassigned') return matchesSearch && !isAssigned;
    return matchesSearch;
  });

  const totalAssignedCount = subjects.filter((s) => s.assignedTeacher || s.status === 'Assigned').length;
  const totalUnassignedCount = subjects.length - totalAssignedCount;

  // Action: Generate or Regenerate Subject Invitation Credentials
  const handleGenerateInvitation = async () => {
    if (!selectedSubject) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await generateTeacherInvitation({
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        subjectCode: selectedSubject.code,
        creditHours: selectedSubject.creditHours,
        assignedClass: selectedSubject.assignedClass,
        adminEmail,
      });

      setIsSubmitting(false);

      if (!res.success || !res.invitationCode || !res.invitationPassword) {
        setErrorMessage(res.error || 'Failed to generate teacher invitation credentials.');
        return;
      }

      const freshInv: SubjectInvitation = {
        id: `inv_${selectedSubject.id}_${Date.now()}`,
        subjectId: selectedSubject.id,
        subjectName: res.subjectName || selectedSubject.name,
        subjectCode: res.subjectCode || selectedSubject.code,
        assignedClass: selectedSubject.assignedClass || '',
        creditHours: selectedSubject.creditHours || 3,
        invitationCode: res.invitationCode,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: adminEmail,
      };

      setActiveInvitation(freshInv);

      setNewlyGeneratedCredentials({
        code: res.invitationCode,
        password: res.invitationPassword,
        subjectName: res.subjectName || selectedSubject.name,
      });

      setSuccessToast(
        `Unique invitation credentials generated for ${selectedSubject.name} (${selectedSubject.code})!`
      );
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Server error generating invitation credentials.');
    }
  };

  // Action: Keep Current Teacher Active
  const handleKeepActive = async () => {
    if (!selectedSubject) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await keepSubjectTeacherActive({
        subjectId: selectedSubject.id,
        adminEmail,
      });

      setIsSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to confirm active status.');
        return;
      }

      setSuccessToast(
        `Active teacher status confirmed for ${selectedSubject.assignedTeacher || 'Faculty'} on ${selectedSubject.name}.`
      );
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Failed to confirm active status.');
    }
  };

  // Action: Revoke Subject Teacher Access
  const handleConfirmRevokeTeacher = async () => {
    if (!selectedSubject) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await revokeSubjectTeacher({
        subjectId: selectedSubject.id,
        adminEmail,
        reason: revokeReason || 'Course instructor reassigned by Master Administrator',
      });

      setIsSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to revoke subject teacher access.');
        return;
      }

      setSuccessToast(
        `Teacher access for ${selectedSubject.name} (${selectedSubject.code}) revoked. All course materials, documents, and student submissions have been preserved.`
      );
      setShowRevokeTeacherModal(false);
      setRevokeReason('');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Server error while revoking teacher access.');
    }
  };

  // Action: Revoke Active Invitation
  const handleRevokeInvitation = async () => {
    if (!selectedSubject) return;
    if (!window.confirm(`Revoke the active invitation for ${selectedSubject.name}? Unclaimed credentials will immediately become invalid.`)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await revokeTeacherInvitation({
        subjectId: selectedSubject.id,
        adminEmail,
        reason: 'Revoked by Master Administrator',
      });

      setIsSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to revoke invitation.');
        return;
      }

      setNewlyGeneratedCredentials(null);
      setSuccessToast(`Active invitation revoked for ${selectedSubject.name}.`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Server error revoking invitation.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successToast && (
        <div className="p-4 bg-[#EAF2E9] border border-[#668064]/30 rounded-2xl text-xs text-[#4A5B49] flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#668064] shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-[#668064] hover:text-[#4A5B49] p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 1: STEP 1 — SELECT A SUBJECT FOR INVITATION MANAGEMENT          */}
      {/* ========================================================================= */}
      {!selectedSubjectId ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFE3D3] text-[#493222] uppercase tracking-wider">
                  Teacher Invitation System
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">
                  Faculty Subject Invitations
                </h1>
              </div>
              <p className="text-xs text-[#806A56] mt-0.5">
                Generate secure subject invitation credentials, manage active faculty teachers, and monitor course claims
              </p>
            </div>
            {onNavigateToSubjects && (
              <button
                type="button"
                onClick={onNavigateToSubjects}
                className="px-3.5 py-2 bg-[#F8F0E5] hover:bg-[#EFE3D3] border border-[#E6D8C7] rounded-xl text-xs font-bold text-[#493222] flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Subject</span>
              </button>
            )}
          </div>

          {/* Quick Metrics & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider">
                Total Curriculum Subjects
              </span>
              <p className="text-2xl font-bold text-[#38271C] mt-1">{subjects.length}</p>
            </div>
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-[#668064] uppercase tracking-wider">
                Active Teachers Assigned
              </span>
              <p className="text-2xl font-bold text-[#668064] mt-1">{totalAssignedCount}</p>
            </div>
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                Awaiting Teacher Claim
              </span>
              <p className="text-2xl font-bold text-amber-800 mt-1">{totalUnassignedCount}</p>
            </div>
          </div>

          {/* Search & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFF9F1] border border-[#E6D8C7] p-3 rounded-2xl shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={subjectSearchQuery}
                onChange={(e) => setSubjectSearchQuery(e.target.value)}
                placeholder="Search by subject name, course code, class, or code..."
                className="w-full pl-9 pr-3.5 py-2 bg-[#F8F0E5]/60 hover:bg-[#F8F0E5] border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#EFE3D3] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-[#493222] text-[#FFF9F1] shadow-2xs'
                    : 'text-[#806A56] hover:text-[#38271C]'
                }`}
              >
                All ({subjects.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('assigned')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'assigned'
                    ? 'bg-[#493222] text-[#FFF9F1] shadow-2xs'
                    : 'text-[#806A56] hover:text-[#38271C]'
                }`}
              >
                Active ({totalAssignedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unassigned')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'unassigned'
                    ? 'bg-[#493222] text-[#FFF9F1] shadow-2xs'
                    : 'text-[#806A56] hover:text-[#38271C]'
                }`}
              >
                Awaiting ({totalUnassignedCount})
              </button>
            </div>
          </div>

          {/* Grid of Subjects */}
          {filteredSubjects.length === 0 ? (
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-8 sm:p-12 text-center shadow-2xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F8F0E5] border border-[#E6D8C7] text-[#493222] flex items-center justify-center mx-auto shadow-2xs">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-bold text-[#38271C]">
                  {subjects.length === 0 ? 'No Curriculum Subjects Configured' : 'No Matching Subjects Found'}
                </h3>
                <p className="text-xs text-[#806A56] leading-relaxed">
                  {subjects.length === 0
                    ? 'Create custom academic subjects first to generate teacher invitation credentials.'
                    : 'Try adjusting your search query or clear the active filter.'}
                </p>
              </div>
              {subjects.length === 0 && onNavigateToSubjects && (
                <button
                  type="button"
                  onClick={onNavigateToSubjects}
                  className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Configure Custom Subjects</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubjects.map((subj) => {
                const isAssigned = Boolean(subj.assignedTeacher || subj.status === 'Assigned');

                return (
                  <div
                    key={subj.id}
                    onClick={() => {
                      setSelectedSubjectId(subj.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-[#FFF9F1] hover:bg-[#FFFDF9] border border-[#E6D8C7] hover:border-[#493222]/50 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Code & Status */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 bg-[#EFE3D3] text-[#493222] font-mono text-[10px] font-bold rounded-md">
                          {subj.code}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                            isAssigned
                              ? 'bg-[#EAF2E9] text-[#668064] border border-[#C5DCC3]'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isAssigned ? 'Active Teacher' : 'Awaiting Teacher'}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-[#38271C] group-hover:text-[#493222] transition-colors leading-tight">
                        {subj.name}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-[#806A56] mt-1.5 flex-wrap">
                        <span className="font-medium">{subj.creditHours} Credit Hours</span>
                        {subj.assignedClass && (
                          <>
                            <span>•</span>
                            <span className="font-bold text-[#493222] bg-[#EFE3D3] px-2 py-0.5 rounded-md text-[10px]">
                              {subj.assignedClass}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bottom Status / Credentials Strip */}
                    <div className="mt-4 pt-3 border-t border-[#E6D8C7] flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        {isAssigned ? (
                          <div>
                            <p className="font-bold text-xs text-[#38271C] truncate">
                              {subj.assignedTeacher}
                            </p>
                            <p className="text-[10px] text-[#806A56] font-mono truncate">
                              {subj.teacherEmail}
                            </p>
                          </div>
                        ) : (
                          <div>
                            {subj.invitationCode ? (
                              <div className="flex items-center gap-1.5">
                                <KeyRound className="w-3.5 h-3.5 text-[#493222] shrink-0" />
                                <span className="font-mono text-xs font-bold text-[#493222] bg-[#F6EDE4] px-1.5 py-0.5 rounded border border-[#E6D8C7]">
                                  {subj.invitationCode}
                                </span>
                              </div>
                            ) : (
                              <p className="text-[11px] text-[#806A56] italic">
                                Tap to generate invitation
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <span className="p-1.5 rounded-lg bg-[#F8F0E5] group-hover:bg-[#493222] text-[#493222] group-hover:text-white transition-colors shrink-0">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW MODE 2: STEP 2 — DEDICATED SUBJECT INVITATION & ASSIGNMENT WORKSPACE */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Top Breadcrumb & Back Action */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setSelectedSubjectId(null);
                setNewlyGeneratedCredentials(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#493222] hover:text-[#2E1F14] bg-[#FFF9F1] hover:bg-[#EFE3D3] px-3 py-1.5 rounded-xl border border-[#E6D8C7] transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Subjects</span>
            </button>

            <span className="text-[11px] font-semibold text-[#806A56]">
              Subject ID: <code className="font-mono text-[#38271C]">{selectedSubject?.id}</code>
            </span>
          </div>

          {/* Subject Overview Banner */}
          {selectedSubject && (
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] font-mono text-xs font-bold rounded-lg">
                      {selectedSubject.code}
                    </span>
                    {selectedSubject.assignedClass && (
                      <span className="px-2.5 py-0.5 bg-[#EADBCC] text-[#493222] text-xs font-bold rounded-lg">
                        Class: {selectedSubject.assignedClass}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 bg-[#EFE3D3] text-[#806A56] text-xs font-semibold rounded-lg">
                      {selectedSubject.creditHours} Credit Hours
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-[#38271C] mt-2">
                    {selectedSubject.name}
                  </h1>
                  <p className="text-xs text-[#806A56] mt-1 max-w-xl">
                    {selectedSubject.description ||
                      'Official accredited course registered under Department of Software Engineering / Computer Science.'}
                  </p>
                </div>

                {/* Preserved resources snapshot */}
                <div className="flex items-center gap-3 bg-[#F8F0E5] border border-[#E6D8C7] p-3 rounded-2xl shrink-0">
                  <div className="text-center px-2">
                    <span className="text-[10px] uppercase font-bold text-[#806A56] block">Materials</span>
                    <span className="text-base font-bold text-[#38271C]">{resourceCounts.docs} Docs</span>
                  </div>
                  <div className="w-px h-8 bg-[#E6D8C7]" />
                  <div className="text-center px-2">
                    <span className="text-[10px] uppercase font-bold text-[#806A56] block">Tasks</span>
                    <span className="text-base font-bold text-[#38271C]">{resourceCounts.asgs} Tasks</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TEACHER ASSIGNMENT STATUS / INVITATION STATUS PANEL                       */}
          {/* ========================================================================= */}
          {selectedSubject && (
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6D8C7]">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#EFE3D3] rounded-xl text-[#493222]">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-[#38271C]">
                    Subject Teacher Authority & Credentials
                  </h2>
                </div>

                {selectedSubject.assignedTeacher ? (
                  <span className="px-3 py-1 bg-[#EAF2E9] text-[#668064] border border-[#C5DCC3] rounded-full text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#668064] animate-pulse" />
                    <span>Active Teacher Authorized</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Awaiting Teacher Claim</span>
                  </span>
                )}
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* CASE 1: TEACHER IS ALREADY CLAIMED & ACTIVE                      */}
              {/* ----------------------------------------------------------------- */}
              {selectedSubject.assignedTeacher ? (
                <div className="space-y-4">
                  <div className="p-5 bg-white border border-[#E6D8C7] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#493222] text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                        {selectedSubject.assignedTeacher.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-[#38271C]">
                            {selectedSubject.assignedTeacher}
                          </h3>
                          <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-md">
                            Verified Faculty Account
                          </span>
                        </div>
                        <p className="text-xs text-[#806A56] font-mono mt-0.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#806A56]" />
                          <span>{selectedSubject.teacherEmail}</span>
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-[#806A56] mt-2 flex-wrap">
                          {selectedSubject.teacherUid && (
                            <span className="font-mono bg-[#F8F0E5] px-2 py-0.5 rounded border border-[#E6D8C7]">
                              UID: {selectedSubject.teacherUid.slice(0, 12)}...
                            </span>
                          )}
                          {selectedSubject.teacherAssignedAt && (
                            <span>
                              Assigned on: {new Date(selectedSubject.teacherAssignedAt).toLocaleDateString()}
                            </span>
                          )}
                          {selectedSubject.lastConfirmedActiveAt && (
                            <span>
                              Confirmed active: {new Date(selectedSubject.lastConfirmedActiveAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Active Teacher Actions */}
                    <div className="flex items-center gap-2 flex-wrap self-start md:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={handleKeepActive}
                        disabled={isSubmitting}
                        className="px-3.5 py-2 bg-[#EAF2E9] hover:bg-[#D8E8D6] text-[#4A5B49] text-xs font-bold rounded-xl border border-[#C5DCC3] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 text-[#668064]" />
                        <span>Keep Active</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowRevokeTeacherModal(true)}
                        className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>Revoke Teacher Access</span>
                      </button>
                    </div>
                  </div>

                  {/* Consumed Invitation Notice */}
                  <div className="p-3 bg-[#F8F0E5] border border-[#E6D8C7] rounded-xl text-[11px] text-[#806A56] flex items-center justify-between">
                    <span>
                      Original invitation for this subject has been successfully <strong>claimed & consumed</strong>. Plaintext credentials are retired.
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateInvitation}
                      disabled={isSubmitting}
                      className="px-2.5 py-1 text-xs font-bold text-[#493222] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Generate Replacement Invitation
                    </button>
                  </div>
                </div>
              ) : (
                /* ----------------------------------------------------------------- */
                /* CASE 2: AWAITING TEACHER (INVITATION ACTIVE OR NEEDED)           */
                /* ----------------------------------------------------------------- */
                <div className="space-y-4">
                  {/* Current Active Invitation Details */}
                  {(activeInvitation && activeInvitation.status !== 'revoked') || newlyGeneratedCredentials ? (
                    <div className="p-5 bg-white border border-[#E6D8C7] rounded-2xl space-y-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6D8C7]">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                          <h3 className="font-bold text-sm text-[#38271C]">
                            {activeInvitation?.status === 'reserved'
                              ? 'Registration Started — Awaiting Email Verification'
                              : activeInvitation?.status === 'claimed'
                              ? 'Invitation Claimed & Active'
                              : 'Active Invitation Awaiting Teacher Claim'}
                          </h3>
                        </div>

                        <span className="text-[11px] text-[#806A56]">
                          Created on {activeInvitation ? new Date(activeInvitation.createdAt).toLocaleDateString() : new Date().toLocaleDateString()} by{' '}
                          <span className="font-mono">{activeInvitation?.createdBy || adminEmail}</span>
                        </span>
                      </div>

                      {/* Code display card */}
                      <div className="p-4 bg-[#F8F0E5] border border-[#E6D8C7] rounded-2xl space-y-2">
                        <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
                          Subject Invitation Code
                        </span>
                        <div className="flex items-center justify-between gap-3">
                          <code className="font-mono text-xl sm:text-2xl font-extrabold text-[#493222] tracking-wider select-all">
                            {newlyGeneratedCredentials?.code || activeInvitation?.invitationCode || 'INV-PENDING'}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              const codeToCopy = newlyGeneratedCredentials?.code || activeInvitation?.invitationCode || '';
                              if (codeToCopy) {
                                navigator.clipboard.writeText(codeToCopy);
                                setCopiedCode(true);
                                setTimeout(() => setCopiedCode(false), 2500);
                              }
                            }}
                            className="px-3.5 py-2 bg-[#493222] hover:bg-[#38271C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Controlled Newly Generated Password Box (if just generated) */}
                      {newlyGeneratedCredentials && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in">
                          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                            <Sparkles className="w-4 h-4 text-emerald-700" />
                            <span>Fresh Credentials Generated — Deliver to Faculty Instructor</span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-200">
                              <span className="text-[#806A56]">Invitation Code:</span>
                              <code className="font-mono font-bold text-sm text-[#493222]">
                                {newlyGeneratedCredentials.code}
                              </code>
                            </div>
                            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-200">
                              <span className="text-[#806A56]">One-Time Password:</span>
                              <div className="flex items-center gap-2">
                                <code className="font-mono font-bold text-sm text-[#493222] select-all">
                                  {newlyGeneratedCredentials.password}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(newlyGeneratedCredentials.password);
                                    setCopiedPassword(true);
                                    setTimeout(() => setCopiedPassword(false), 2500);
                                  }}
                                  className="px-2.5 py-1 bg-[#493222] text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
                                >
                                  {copiedPassword ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedPassword ? 'Copied' : 'Copy Password'}</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const msg = `AWKUM ClassHub Subject Teacher Invitation\nCourse: ${newlyGeneratedCredentials.subjectName}\nSubject Invitation Code: ${newlyGeneratedCredentials.code}\nInvitation Password: ${newlyGeneratedCredentials.password}\n\nInstructions:\n1. Open AWKUM ClassHub universal login screen.\n2. Enter the Code in Email/ID and Password in Password field.\n3. Complete registration to claim your teacher workspace.`;
                              navigator.clipboard.writeText(msg);
                              setCopiedFullBundle(true);
                              setTimeout(() => setCopiedFullBundle(false), 3000);
                            }}
                            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                          >
                            {copiedFullBundle ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedFullBundle ? 'Full Invitation Bundle Copied!' : 'Copy Full Invitation Message for Teacher'}</span>
                          </button>
                        </div>
                      )}

                      {/* Instructions & Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <p className="text-[11px] text-[#806A56] max-w-md leading-relaxed">
                          The teacher enters this <strong>Invitation Code</strong> and <strong>Invitation Password</strong> directly on the universal login screen to register and claim this course.
                        </p>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleGenerateInvitation}
                            disabled={isSubmitting}
                            className="px-3.5 py-2 bg-[#EFE3D3] hover:bg-[#E6D8C7] text-[#493222] text-xs font-bold rounded-xl border border-[#D8C7B4] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                            <span>Regenerate Credentials</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRevokeInvitation}
                            disabled={isSubmitting}
                            className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 text-xs font-bold rounded-xl border border-red-200 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revoke Invitation</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* No active invitation exists yet */
                    <div className="p-8 bg-white border border-dashed border-[#E6D8C7] rounded-3xl text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
                        <KeyRound className="w-7 h-7" />
                      </div>
                      <div className="max-w-md mx-auto space-y-1">
                        <h3 className="text-base font-bold text-[#38271C]">
                          No Active Teacher Invitation for this Subject
                        </h3>
                        <p className="text-xs text-[#806A56] leading-relaxed">
                          Generate secure invitation credentials for {selectedSubject.name} ({selectedSubject.code}). You will receive an invitation code and high-entropy password to share with the intended teacher.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateInvitation}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Generating Credentials...</span>
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-4 h-4" />
                            <span>Generate Teacher Invitation Credentials</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVOKE TEACHER ACCESS CONFIRMATION MODAL                                  */}
      {/* ========================================================================= */}
      {showRevokeTeacherModal && selectedSubject && (
        <div className="fixed inset-0 z-50 bg-[#2E1F14]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8C7]">
              <div className="flex items-center gap-2 text-red-700">
                <div className="p-2 bg-red-100 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#38271C]">
                    Revoke Subject Teacher Access
                  </h3>
                  <p className="text-xs text-[#806A56]">
                    Course: {selectedSubject.name} ({selectedSubject.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRevokeTeacherModal(false)}
                className="p-1.5 rounded-full hover:bg-[#EFE3D3] text-[#806A56] hover:text-[#38271C] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#38271C]">
              <p>
                Are you sure you want to revoke teacher management access from{' '}
                <strong>{selectedSubject.assignedTeacher}</strong> (
                <span className="font-mono">{selectedSubject.teacherEmail}</span>)?
              </p>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 text-emerald-900">
                <span className="font-bold flex items-center gap-1.5 text-xs text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Preservation Guarantee:
                </span>
                <p className="text-[11px] leading-relaxed">
                  • All <strong>{resourceCounts.docs} course documents</strong> and{' '}
                  <strong>{resourceCounts.asgs} student assignments</strong> remain permanently intact.
                </p>
                <p className="text-[11px] leading-relaxed">
                  • Student submission records, grades, feedback, and attendance history are fully preserved.
                </p>
                <p className="text-[11px] leading-relaxed">
                  • The teacher's Firebase account remains safe. You can generate a new invitation for this subject at any time.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#38271C] block">
                  Revocation Reason (Optional):
                </label>
                <input
                  type="text"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Semester faculty reassignment, sabbatical..."
                  className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6D8C7]">
              <button
                type="button"
                onClick={() => setShowRevokeTeacherModal(false)}
                className="px-4 py-2 bg-[#EFE3D3] hover:bg-[#E6D8C7] text-[#493222] text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevokeTeacher}
                disabled={isSubmitting}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Revocation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
