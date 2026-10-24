import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  UserCheck,
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
  FileText,
  Clock,
  Layers,
  Sparkles,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { SubjectConfig, AdminUser, SubjectTeacherAssignment } from '../../data/adminData';
import {
  subscribeToCurriculumSubjects,
  assignSubjectTeacher,
  revokeSubjectTeacher,
  keepSubjectTeacherActive,
  subscribeToSubjectTeacherAssignment,
} from '../../lib/subjectService';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { searchUsersInFirestoreOrServer, mergeUsers } from '../../lib/authService';

interface TeacherAssignmentsViewProps {
  users: AdminUser[];
  adminEmail?: string;
  onOpenRoleAssignment?: (user: AdminUser | null, preselectedSubject?: string) => void;
  onNavigateToSubjects?: () => void;
  initialSelectedSubjectId?: string | null;
}

export const TeacherAssignmentsView: React.FC<TeacherAssignmentsViewProps> = ({
  users,
  adminEmail = 'hasnainbuilds724656@gmail.com',
  onOpenRoleAssignment,
  onNavigateToSubjects,
  initialSelectedSubjectId = null,
}) => {
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSelectedSubjectId);
  const [activeAssignment, setActiveAssignment] = useState<SubjectTeacherAssignment | null>(null);

  // Search and filter for Step 1
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Search and selection for Step 3
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [selectedTeacherUser, setSelectedTeacherUser] = useState<AdminUser | null>(null);
  const [showAssignSection, setShowAssignSection] = useState(false);
  const [searchedCandidates, setSearchedCandidates] = useState<AdminUser[]>([]);

  // Live search for teacher candidates from Firestore and Firebase Auth
  useEffect(() => {
    const q = teacherSearchQuery.trim();
    if (!q || q.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const found = await searchUsersInFirestoreOrServer(q);
        if (Array.isArray(found) && found.length > 0) {
          setSearchedCandidates((prev) => mergeUsers(prev, found));
        }
      } catch (e) {}
    }, 250);

    return () => clearTimeout(timer);
  }, [teacherSearchQuery]);

  // Revocation modal state
  const [showRevokeModal, setShowRevokeModal] = useState(false);
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

  // 2. Subscribe to active assignment for the selected subject
  useEffect(() => {
    if (!selectedSubjectId) {
      setActiveAssignment(null);
      return;
    }

    const unsub = subscribeToSubjectTeacherAssignment(selectedSubjectId, (assignment) => {
      setActiveAssignment(assignment);
    });

    // Also fetch preserved resource counts for this subject
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
        } catch (e) {
          // Non-blocking
        }
      };
      fetchCounts();
    }

    return () => unsub();
  }, [selectedSubjectId]);

  // Clean, verified users from Firebase
  const safeUsers = Array.isArray(users)
    ? users.filter((u): u is AdminUser => Boolean(u && typeof u === 'object' && u.id && u.email))
    : [];

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Filter subjects for Step 1
  const filteredSubjects = subjects.filter((subj) => {
    const matchesSearch =
      subj.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
      subj.code.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
      (subj.assignedClass && subj.assignedClass.toLowerCase().includes(subjectSearchQuery.toLowerCase())) ||
      (subj.assignedTeacher && subj.assignedTeacher.toLowerCase().includes(subjectSearchQuery.toLowerCase()));

    const isAssigned = Boolean(subj.assignedTeacher || subj.status === 'Assigned');

    if (statusFilter === 'assigned') return matchesSearch && isAssigned;
    if (statusFilter === 'unassigned') return matchesSearch && !isAssigned;
    return matchesSearch;
  });

  const totalAssignedCount = subjects.filter((s) => s.assignedTeacher || s.status === 'Assigned').length;
  const totalUnassignedCount = subjects.length - totalAssignedCount;

  // Filter registered eligible teachers for Step 3 (merging all loaded and newly discovered users)
  const allEligibleUsers = mergeUsers(safeUsers, searchedCandidates);
  const eligibleTeachers = allEligibleUsers.filter((u) => {
    const cleanSearch = teacherSearchQuery.trim().toLowerCase();
    if (!cleanSearch) return false;

    const matchesName = u.name.toLowerCase().includes(cleanSearch);
    const matchesEmail = u.email.toLowerCase().includes(cleanSearch);
    const matchesStudentId = u.studentId && u.studentId.toLowerCase().includes(cleanSearch);

    // Exclude if already the active teacher on this exact subject
    const isAlreadyAssigned =
      selectedSubject &&
      (selectedSubject.teacherEmail?.toLowerCase() === u.email.toLowerCase() ||
        (selectedSubject.teacherUid && u.uid && selectedSubject.teacherUid === u.uid));

    return (matchesName || matchesEmail || matchesStudentId) && !isAlreadyAssigned;
  });

  // Action: Confirm & Grant Subject-Specific Teacher Access (Step 4)
  const handleConfirmAssignment = async () => {
    if (!selectedSubject || !selectedTeacherUser) {
      setErrorMessage('Please explicitly select a verified teacher account.');
      return;
    }

    // Validation: ensure teacher has authentic Firebase UID
    const targetUid = selectedTeacherUser.uid;
    if (!targetUid || targetUid.startsWith('uid_')) {
      setErrorMessage(
        `Account ${selectedTeacherUser.email} is missing a verified Firebase Authentication UID. Only authentic registered accounts can be assigned.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await assignSubjectTeacher({
        subjectId: selectedSubject.id,
        teacher: {
          name: selectedTeacherUser.name,
          email: selectedTeacherUser.email,
          uid: targetUid,
          department: selectedTeacherUser.department,
          studentId: selectedTeacherUser.studentId,
        },
        adminEmail,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to assign teacher to subject.');
        setIsSubmitting(false);
        return;
      }

      setSuccessToast(
        `Faculty member ${selectedTeacherUser.name} (${selectedTeacherUser.email}) successfully assigned to ${selectedSubject.name} (${selectedSubject.code})!`
      );
      setSelectedTeacherUser(null);
      setTeacherSearchQuery('');
      setShowAssignSection(false);
      setIsSubmitting(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Server error while assigning subject teacher.');
      setIsSubmitting(false);
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

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to confirm active status.');
        setIsSubmitting(false);
        return;
      }

      setSuccessToast(
        `Active status for ${selectedSubject.assignedTeacher || 'Faculty'} on ${selectedSubject.name} confirmed and renewed.`
      );
      setIsSubmitting(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to confirm active status.');
      setIsSubmitting(false);
    }
  };

  // Action: Revoke Subject Teacher Access
  const handleConfirmRevoke = async () => {
    if (!selectedSubject) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await revokeSubjectTeacher({
        subjectId: selectedSubject.id,
        adminEmail,
        reason: revokeReason || 'Course instructor reassigned by Master Administrator',
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to revoke subject teacher access.');
        setIsSubmitting(false);
        return;
      }

      setSuccessToast(
        `Teacher access for ${selectedSubject.name} (${selectedSubject.code}) revoked. All course materials, student assignments, and history have been preserved.`
      );
      setShowRevokeModal(false);
      setRevokeReason('');
      setShowAssignSection(false);
      setIsSubmitting(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Server error while revoking teacher access.');
      setIsSubmitting(false);
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
      {/* VIEW MODE 1: STEP 1 — SELECT A SUBJECT */}
      {/* ========================================================================= */}
      {!selectedSubjectId ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFE3D3] text-[#493222] uppercase tracking-wider">
                  Step 1 of 4
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">
                  Teacher & Faculty Subject Mapping
                </h1>
              </div>
              <p className="text-xs text-[#806A56] mt-0.5">
                Select a configured curriculum subject to inspect, assign, keep active, or revoke its faculty teacher
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
                Total Configured Subjects
              </span>
              <p className="text-2xl font-bold text-[#38271C] mt-1">{subjects.length}</p>
            </div>
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-[#668064] uppercase tracking-wider">
                Subjects with Active Teacher
              </span>
              <p className="text-2xl font-bold text-[#668064] mt-1">{totalAssignedCount}</p>
            </div>
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                Unassigned Subjects
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
                placeholder="Search by subject name, course code, class (e.g. BSSE)..."
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
                Assigned ({totalAssignedCount})
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
                Unassigned ({totalUnassignedCount})
              </button>
            </div>
          </div>

          {/* Grid of Subjects (Step 1 Selection) */}
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
                    ? 'Create custom academic subjects first to assign faculty teachers.'
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
                      setShowAssignSection(false);
                      setSelectedTeacherUser(null);
                      setTeacherSearchQuery('');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-[#FFF9F1] hover:bg-[#FFFDF9] border border-[#E6D8C7] hover:border-[#493222]/50 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Code & Class Row */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 bg-[#EFE3D3] text-[#493222] font-mono text-[10px] font-bold rounded-md">
                          {subj.code}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                            isAssigned
                              ? 'bg-[#EAF2E9] text-[#668064] border border-[#C5DCC3]'
                              : 'bg-amber-100/70 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isAssigned ? 'Active Teacher' : 'No Active Teacher'}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-[#38271C] group-hover:text-[#493222] transition-colors leading-tight">
                        {subj.name}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-[#806A56] mt-1.5">
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

                    {/* Teacher preview strip */}
                    <div className="mt-4 pt-3 border-t border-[#E6D8C7] flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            isAssigned ? 'bg-[#668064] text-white' : 'bg-[#EFE3D3] text-[#806A56]'
                          }`}
                        >
                          {isAssigned && subj.assignedTeacher ? subj.assignedTeacher.charAt(0) : '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#38271C] truncate">
                            {subj.assignedTeacher || 'Unassigned'}
                          </p>
                          <p className="text-[10px] text-[#806A56] font-mono truncate">
                            {subj.teacherEmail || 'Tap to assign faculty'}
                          </p>
                        </div>
                      </div>

                      <span className="p-1.5 rounded-lg bg-[#F8F0E5] group-hover:bg-[#493222] text-[#493222] group-hover:text-white transition-colors shrink-0 ml-2">
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
        /* VIEW MODE 2: STEP 2 — DEDICATED SUBJECT MANAGEMENT PAGE                   */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Top Breadcrumb & Back Action */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setSelectedSubjectId(null);
                setShowAssignSection(false);
                setSelectedTeacherUser(null);
                setTeacherSearchQuery('');
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
          {/* STEP 5 & 6: ACTIVE TEACHER SECTION                                        */}
          {/* ========================================================================= */}
          {selectedSubject && (
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6D8C7]">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#EFE3D3] rounded-xl text-[#493222]">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-[#38271C]">
                    Current Teacher Assignment Status
                  </h2>
                </div>

                {selectedSubject.assignedTeacher ? (
                  <span className="px-2.5 py-1 bg-[#EAF2E9] text-[#668064] border border-[#C5DCC3] rounded-full text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#668064] animate-pulse" />
                    <span>Active Teacher Authorized</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-amber-100/80 text-amber-800 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>No Active Teacher</span>
                  </span>
                )}
              </div>

              {/* A. If Teacher is Assigned */}
              {selectedSubject.assignedTeacher ? (
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-[#E6D8C7] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#493222] text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                        {selectedSubject.assignedTeacher.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-[#38271C]">
                            {selectedSubject.assignedTeacher}
                          </h3>
                          <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-md">
                            Verified Faculty
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

                    {/* Available Actions: Keep Active, Replace, Revoke */}
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
                        onClick={() => {
                          setShowAssignSection(!showAssignSection);
                          setSelectedTeacherUser(null);
                          setTeacherSearchQuery('');
                        }}
                        className="px-3.5 py-2 bg-[#EFE3D3] hover:bg-[#E6D8C7] text-[#493222] text-xs font-bold rounded-xl border border-[#D8C7B4] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{showAssignSection ? 'Cancel Replace' : 'Assign / Replace Teacher'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowRevokeModal(true)}
                        className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>Revoke Access</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* B. If No Teacher Assigned */
                <div className="bg-white border border-dashed border-[#E6D8C7] rounded-2xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-sm font-bold text-[#38271C]">
                      No Active Teacher Assigned for this Subject
                    </h3>
                    <p className="text-xs text-[#806A56] mt-1 leading-relaxed">
                      This course currently does not have an active faculty instructor. Search by verified Gmail below to authorize a teacher to manage documents, assignments, and grades for this subject.
                    </p>
                  </div>
                  {!showAssignSection && (
                    <button
                      type="button"
                      onClick={() => setShowAssignSection(true)}
                      className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Assign Teacher to This Subject</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3 & 4: FIND TEACHER BY GMAIL & CONFIRM ASSIGNMENT                    */}
          {/* ========================================================================= */}
          {selectedSubject && (showAssignSection || !selectedSubject.assignedTeacher) && (
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6D8C7]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#493222] text-[#FFF9F1] text-[10px] font-bold rounded-full">
                    Step 3 & 4
                  </span>
                  <h3 className="text-sm font-bold text-[#38271C]">
                    Find Faculty Teacher by Registered Gmail
                  </h3>
                </div>
                {selectedSubject.assignedTeacher && (
                  <button
                    type="button"
                    onClick={() => setShowAssignSection(false)}
                    className="text-xs text-[#806A56] hover:text-[#38271C] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Informational Scope Note */}
              <div className="p-3 bg-[#EAF2E9] border border-[#C5DCC3] rounded-2xl text-xs text-[#4A5B49] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#668064] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Subject-Scoped Authority:</strong> The assigned teacher will strictly receive management access for <strong>{selectedSubject.name} ({selectedSubject.code})</strong>. If they already teach other courses or have a Student profile, all previous roles and course permissions remain independent and intact.
                </p>
              </div>

              {/* Search input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#38271C] block">
                  Search Registered Teacher Gmail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={teacherSearchQuery}
                    onChange={(e) => {
                      setTeacherSearchQuery(e.target.value);
                      setSelectedTeacherUser(null);
                    }}
                    placeholder="Enter teacher's registered Gmail (e.g., teacher@gmail.com)..."
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                  />
                </div>
                <p className="text-[10px] text-[#806A56]">
                  Searches verified accounts in Firebase Authentication and Firestore registry.
                </p>
              </div>

              {/* Search Results list */}
              {teacherSearchQuery.trim().length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#38271C]">
                    Eligible Accounts Found ({eligibleTeachers.length})
                  </h4>

                  {eligibleTeachers.length === 0 ? (
                    <div className="p-4 bg-white border border-[#E6D8C7] rounded-xl text-center text-xs text-[#806A56]">
                      No eligible registered accounts matching "{teacherSearchQuery}". Please ensure the teacher has registered their account in Firebase Authentication.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {eligibleTeachers.map((account) => {
                        const isSelected = selectedTeacherUser?.id === account.id;

                        return (
                          <div
                            key={account.id}
                            onClick={() => setSelectedTeacherUser(account)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-[#FFFDF9] border-[#493222] ring-2 ring-[#493222]/30 shadow-xs'
                                : 'bg-white border-[#E6D8C7] hover:border-[#806A56]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isSelected ? 'bg-[#493222] text-white' : 'bg-[#EFE3D3] text-[#493222]'
                                }`}
                              >
                                {account.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-[#38271C]">{account.name}</span>
                                  {account.emailVerified ? (
                                    <span className="px-1.5 py-0.2 bg-[#EAF2E9] text-[#668064] text-[9px] font-bold rounded">
                                      Email Verified
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                                      Unverified
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.2 bg-[#EFE3D3] text-[#493222] text-[9px] font-mono rounded uppercase">
                                    {account.role}
                                  </span>
                                </div>
                                <span className="text-[11px] text-[#806A56] font-mono block truncate mt-0.5">
                                  {account.email}
                                </span>
                                <span className="text-[10px] text-[#806A56] block truncate">
                                  UID: {account.uid ? `${account.uid.slice(0, 16)}...` : 'No Auth UID'}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-[#493222] bg-[#493222] text-white' : 'border-[#D8C7B4]'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4 Confirmation Panel */}
              {selectedTeacherUser && (
                <div className="p-4 bg-[#F8F0E5] border border-[#D8C7B4] rounded-2xl space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#668064]" />
                    <h4 className="text-xs font-bold text-[#38271C]">
                      Confirm Subject-Wise Teacher Assignment
                    </h4>
                  </div>

                  <div className="text-xs text-[#38271C] space-y-1 bg-white/70 p-3 rounded-xl border border-[#E6D8C7]">
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#806A56]">Target Subject:</span>
                      <strong className="font-bold">{selectedSubject.name} ({selectedSubject.code})</strong>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#806A56]">Assigned Class:</span>
                      <span className="font-semibold">{selectedSubject.assignedClass || 'Garden Campus All'}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#806A56]">Teacher Name:</span>
                      <strong className="font-bold">{selectedTeacherUser.name}</strong>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#806A56]">Teacher Gmail:</span>
                      <span className="font-mono text-[11px]">{selectedTeacherUser.email}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#806A56]">Firebase UID:</span>
                      <span className="font-mono text-[10px] text-[#668064]">{selectedTeacherUser.uid}</span>
                    </div>
                  </div>

                  {selectedSubject.assignedTeacher && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Replacement Notice:</strong> Assigning {selectedTeacherUser.name} will replace current teacher {selectedSubject.assignedTeacher}. All existing subject files and assignments will remain intact.
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTeacherUser(null)}
                      className="px-4 py-2 bg-white hover:bg-[#EFE3D3] text-[#806A56] hover:text-[#38271C] text-xs font-bold rounded-xl border border-[#E6D8C7] transition-all cursor-pointer"
                    >
                      Deselect
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAssignment}
                      disabled={isSubmitting}
                      className="px-5 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Authorizing...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Confirm & Grant Subject Access</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVOCATION CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      {showRevokeModal && selectedSubject && (
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
                onClick={() => setShowRevokeModal(false)}
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

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 text-emerald-900">
                <span className="font-bold flex items-center gap-1.5 text-xs text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Preservation Guarantee:
                </span>
                <p className="text-[11px] leading-relaxed">
                  • All <strong>{resourceCounts.docs} subject documents</strong> and{' '}
                  <strong>{resourceCounts.asgs} student assignments</strong> remain permanently intact.
                </p>
                <p className="text-[11px] leading-relaxed">
                  • Student submission records, grades, feedback, and attendance history are fully preserved.
                </p>
                <p className="text-[11px] leading-relaxed">
                  • The teacher's Firebase account and any other assigned subjects remain untouched.
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
                onClick={() => setShowRevokeModal(false)}
                className="px-4 py-2 bg-[#EFE3D3] hover:bg-[#E6D8C7] text-[#493222] text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
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
