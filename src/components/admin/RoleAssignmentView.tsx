import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Check,
  GraduationCap,
  Briefcase,
  UserCheck,
  Crown,
  AlertCircle,
  Save,
  Database,
  RefreshCw,
  Sparkles,
  Filter,
  ChevronRight,
  User,
  CheckCircle2,
} from 'lucide-react';
import { AdminUser, UserRole, OFFICIAL_SUBJECTS, INITIAL_CLASSES } from '../../data/adminData';

interface RoleAssignmentViewProps {
  users: AdminUser[];
  initialSelectedUser?: AdminUser | null;
  onSaveRole: (
    userId: string,
    newRole: UserRole,
    assignedSubjects?: string[],
    assignedClass?: string
  ) => void;
  onCancel: () => void;
  onRefreshFirebase?: () => Promise<void> | void;
  isFirebaseSyncing?: boolean;
  preselectedClass?: string;
}

export const RoleAssignmentView: React.FC<RoleAssignmentViewProps> = ({
  users,
  initialSelectedUser,
  onSaveRole,
  onCancel,
  onRefreshFirebase,
  isFirebaseSyncing = false,
  preselectedClass,
}) => {
  // Ensure users is safely guarded against undefined, null, or empty elements
  const safeUsers = Array.isArray(users)
    ? users.filter((u): u is AdminUser => Boolean(u && typeof u === 'object' && u.id && u.role))
    : [];

  // Initial selection is strictly initialSelectedUser or null (NEVER fallback to safeUsers[0] or random user)
  const defaultUser = initialSelectedUser && initialSelectedUser.role ? initialSelectedUser : null;

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(defaultUser);
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultUser?.role || 'student');
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>(
    defaultUser?.assignedSubjects || ['PF Theory']
  );
  const [assignedClass, setAssignedClass] = useState<string>(
    preselectedClass || defaultUser?.assignedClass || 'BSCS 3A'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'students' | 'firebase' | 'crs'>('all');
  const [showRosterBrowser, setShowRosterBrowser] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize strictly when initialSelectedUser or preselectedClass changes
  useEffect(() => {
    if (initialSelectedUser && initialSelectedUser.role) {
      setSelectedUser(initialSelectedUser);
      setSelectedRole(initialSelectedUser.role);
      setAssignedSubjects(initialSelectedUser.assignedSubjects || ['PF Theory']);
      setAssignedClass(preselectedClass || initialSelectedUser.assignedClass || 'BSCS 3A');
    } else {
      setSelectedUser(null);
      if (preselectedClass) {
        setAssignedClass(preselectedClass);
      }
    }
  }, [initialSelectedUser, preselectedClass]);

  const handleSelectUser = (user: AdminUser) => {
    if (!user || !user.email) return;
    setSelectedUser(user);
    setSelectedRole(user.role || 'student');
    setAssignedSubjects(user.assignedSubjects || ['PF Theory']);
    if (user.assignedClass && !preselectedClass) {
      setAssignedClass(user.assignedClass);
    }
    setErrorMessage(null);
    setShowRosterBrowser(false);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setErrorMessage(null);
  };

  const handleToggleSubject = (subject: string) => {
    setAssignedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSave = async () => {
    if (!selectedUser) {
      setErrorMessage('Please select a registered Gmail account before saving assignment.');
      return;
    }

    // Verify account existence in safeUsers pool
    const verifiedAccount = safeUsers.find(
      (u) =>
        u.email.toLowerCase() === selectedUser.email.toLowerCase() ||
        (selectedUser.uid && u.uid === selectedUser.uid)
    );

    if (!verifiedAccount) {
      setErrorMessage(
        `Selected account (${selectedUser.email}) could not be verified in the registered directory. Operation stopped.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSaveRole(
        verifiedAccount.id,
        selectedRole,
        selectedRole === 'teacher' ? assignedSubjects : undefined,
        selectedRole === 'cr' ? assignedClass : undefined
      );
      setSuccessToast(true);
      setTimeout(() => {
        setSuccessToast(false);
      }, 3500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save role assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualRefresh = async () => {
    if (onRefreshFirebase) {
      setIsRefreshing(true);
      try {
        await onRefreshFirebase();
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  // Group metrics
  const firebaseUsersCount = safeUsers.filter((u) => u.isFirebaseUser || u.studentId?.startsWith('26SE')).length;
  const studentsCount = safeUsers.filter((u) => u.role === 'student' || u.role === 'cr').length;
  const crCount = safeUsers.filter((u) => u.role === 'cr' || u.isCR).length;

  // Filtered users matching search and tab
  const filteredUsers = safeUsers.filter((u) => {
    if (!u) return false;

    // Role tab filter
    if (filterRole === 'students' && u.role !== 'student' && u.role !== 'cr') return false;
    if (filterRole === 'firebase' && !u.isFirebaseUser && !u.studentId?.startsWith('26SE')) return false;
    if (filterRole === 'crs' && u.role !== 'cr' && !u.isCR) return false;

    // Search query matching: name, email, student ID / roll number, father's name, department
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchId = (u.studentId || '').toLowerCase().includes(q);
      const matchFather = (u.fatherName || '').toLowerCase().includes(q);
      const matchDept = (u.department || '').toLowerCase().includes(q);
      const matchClass = (u.assignedClass || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchId || matchFather || matchDept || matchClass;
    }
    return true;
  });

  // Current CR of the selected class (if any)
  const currentClassCR = safeUsers.find(
    (u) =>
      u.assignedClass === assignedClass &&
      (u.role === 'cr' || u.isCR) &&
      u.email.toLowerCase() !== selectedUser?.email.toLowerCase()
  );

  return (
    <div className="space-y-6">
      {/* 1. Header with live Firebase synchronization status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">
            Assign or Change User Role
          </h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Search registered students and assign Class Representative (CR) or Faculty permissions
          </p>
        </div>

        {/* Live Firebase Sync Badge & Trigger */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 bg-[#EAF2E9] border border-[#C5DEC3] text-[#668064] text-xs font-semibold rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#668064] animate-pulse" />
            <Database className="w-3.5 h-3.5" />
            <span>Firebase Synced ({safeUsers.length} Users)</span>
          </div>

          {onRefreshFirebase && (
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing || isFirebaseSyncing}
              className="p-2 bg-white border border-[#E6D8C7] hover:bg-[#F8F0E5] text-[#493222] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh registered users from Firebase Firestore"
              aria-label="Refresh registered users"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isFirebaseSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {successToast && (
        <div className="p-3.5 bg-[#EAF2E9] border border-[#C5DEC3] text-[#668064] rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>Role updated successfully! User session permissions and audit logs synchronized.</span>
        </div>
      )}

      {/* 2. Registered Users Search & Directory Selector */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#38271C] flex items-center gap-2">
              <User className="w-4 h-4 text-[#493222]" />
              <span>Step 1: Select Registered Student or User</span>
            </h2>
            <p className="text-[11px] text-[#806A56]">
              Search by student name, roll number (e.g. 26SE1042), email, or father's name
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowRosterBrowser(!showRosterBrowser)}
            className="text-xs font-bold text-[#493222] hover:text-[#38271C] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>{showRosterBrowser ? 'Hide Directory List' : `Browse All Registered (${safeUsers.length})`}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showRosterBrowser ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#806A56] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowRosterBrowser(true)}
            placeholder="Search and select a registered Gmail account..."
            className="w-full pl-10 pr-16 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#806A56] hover:text-[#38271C]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterRole('all')}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
              filterRole === 'all'
                ? 'bg-[#493222] text-[#FFF9F1]'
                : 'bg-white text-[#806A56] hover:text-[#38271C] border border-[#E6D8C7]'
            }`}
          >
            All Users ({safeUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('students')}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
              filterRole === 'students'
                ? 'bg-[#493222] text-[#FFF9F1]'
                : 'bg-white text-[#806A56] hover:text-[#38271C] border border-[#E6D8C7]'
            }`}
          >
            Students ({studentsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('firebase')}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
              filterRole === 'firebase'
                ? 'bg-[#493222] text-[#FFF9F1]'
                : 'bg-white text-[#668064] hover:text-[#38271C] border border-[#C5DEC3]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#668064]" />
            <span>Firebase Registered ({firebaseUsersCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('crs')}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
              filterRole === 'crs'
                ? 'bg-[#493222] text-[#FFF9F1]'
                : 'bg-white text-[#806A56] hover:text-[#38271C] border border-[#E6D8C7]'
            }`}
          >
            Class CRs ({crCount})
          </button>
        </div>

        {/* Interactive Search / Directory List (Visible when searching or browsing) */}
        {(searchQuery.trim() || showRosterBrowser) && (
          <div className="bg-white border border-[#D8C7B4] rounded-2xl shadow-md max-h-60 overflow-y-auto divide-y divide-[#E6D8C7]">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#806A56]">
                No registered users matching <strong className="text-[#38271C]">"{searchQuery}"</strong> found in university directory.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`p-3 hover:bg-[#F8F0E5] cursor-pointer flex items-center justify-between text-xs transition-colors ${
                      isSelected ? 'bg-[#F3E9DD]/80 font-bold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#EFE3D3] text-[#493222] font-bold text-xs flex items-center justify-center shrink-0">
                        {u.name ? u.name.charAt(0) : 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#38271C] truncate">{u.name}</span>
                          {u.fatherName && (
                            <span className="text-[11px] text-[#806A56] font-normal truncate">
                              S/D of {u.fatherName}
                            </span>
                          )}
                          {u.studentId && (
                            <span className="px-1.5 py-0.2 bg-[#EFE3D3] text-[#493222] text-[10px] font-mono font-bold rounded">
                              {u.studentId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#806A56] mt-0.5 flex-wrap">
                          <span className="font-mono text-[#493222]">{u.email}</span>
                          {u.department && <span>· {u.department}</span>}
                          {u.semester && <span>({u.semester})</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {u.isFirebaseUser && (
                        <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[9px] font-bold rounded-full hidden sm:inline-block">
                          Firebase Verified
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                        u.role === 'cr'
                          ? 'bg-[#F0F5FA] text-[#3A7BD5]'
                          : u.role === 'teacher'
                          ? 'bg-[#EAF2E9] text-[#668064]'
                          : 'bg-[#F8F0E5] text-[#806A56]'
                      }`}>
                        {u.role}
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-[#668064]" />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectUser(u);
                          }}
                          className="px-2.5 py-1 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Selected User Highlight Card OR Empty Selection Placeholder */}
        {selectedUser ? (
          <div className="p-4 bg-white border border-[#493222]/30 rounded-2xl shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#493222] text-[#FFF9F1] font-bold text-lg flex items-center justify-center shrink-0">
                  {selectedUser.name ? selectedUser.name.charAt(0) : 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-[#38271C]">{selectedUser.name}</h3>
                    {selectedUser.fatherName && (
                      <span className="text-xs text-[#806A56]">
                        (S/D of {selectedUser.fatherName})
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                      {selectedUser.status}
                    </span>
                    {selectedUser.isFirebaseUser && (
                      <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Database className="w-2.5 h-2.5" />
                        <span>Firebase Verified</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#493222] font-mono font-bold mt-0.5">{selectedUser.email}</p>

                  <div className="flex items-center gap-3 text-[11px] text-[#806A56] mt-1 flex-wrap">
                    {selectedUser.studentId && (
                      <span>Roll No / ID: <strong className="text-[#38271C] font-mono">{selectedUser.studentId}</strong></span>
                    )}
                    {selectedUser.department && (
                      <span>Dept: <strong className="text-[#38271C]">{selectedUser.department}</strong></span>
                    )}
                    {selectedUser.semester && (
                      <span>Semester: <strong className="text-[#38271C]">{selectedUser.semester}</strong></span>
                    )}
                    <span>Current Role: <strong className="text-[#38271C] uppercase">{selectedUser.role}</strong></span>
                    <span className="font-mono text-[10px] text-[#806A56]">UID: {selectedUser.uid || 'Verified'}</span>
                  </div>
                </div>
              </div>

              <div className="self-end sm:self-center flex items-center gap-2">
                <span className="px-3 py-1 bg-[#EAF2E9] text-[#668064] text-xs font-bold rounded-xl border border-[#C5DEC3] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Account Selected</span>
                </span>
                <button
                  type="button"
                  onClick={handleClearUser}
                  className="px-3 py-1 bg-white hover:bg-[#F8F0E5] text-[#806A56] hover:text-[#38271C] text-xs font-bold rounded-xl border border-[#E6D8C7] cursor-pointer"
                >
                  Clear / Change
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-[#FFF3CD]/50 border border-[#F0D597] rounded-2xl text-xs text-[#856404] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#B78103]" />
            <div>
              <div className="font-bold">No Gmail account selected yet</div>
              <p className="text-[11px] text-[#856404]/90 mt-0.5">
                Search and select an exact registered Gmail account above. Assignment confirmation remains disabled until an account is chosen.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Two-Column Role & Permission Selection */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Column: Select Role */}
        <div className="md:col-span-7 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-[#38271C] mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#493222]" />
            <span>Step 2: Choose Role to Grant</span>
          </h2>

          {/* Class Representative (Prominent for CR assignment) */}
          <label
            onClick={() => setSelectedRole('cr')}
            className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedRole === 'cr'
                ? 'bg-white border-[#3A7BD5] shadow-xs ring-2 ring-[#3A7BD5]/30'
                : 'bg-white/60 border-[#E6D8C7] hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="role"
              checked={selectedRole === 'cr'}
              onChange={() => setSelectedRole('cr')}
              className="mt-1 accent-[#3A7BD5]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#3A7BD5]" />
                <span className="font-bold text-xs text-[#38271C]">Class Representative (CR)</span>
                <span className="px-2 py-0.2 bg-[#F0F5FA] text-[#3A7BD5] text-[10px] font-bold rounded-full">
                  Recommended for Student
                </span>
              </div>
              <p className="text-[11px] text-[#806A56] mt-0.5 leading-relaxed">
                Empowers this registered student to mark daily class attendance, notify subject teachers, and manage class roster while PRESERVING their full Student Portal access (One Account, Two Experiences).
              </p>
            </div>
          </label>

          {/* Student */}
          <label
            onClick={() => setSelectedRole('student')}
            className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedRole === 'student'
                ? 'bg-white border-[#493222] shadow-xs ring-1 ring-[#493222]'
                : 'bg-white/60 border-[#E6D8C7] hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="role"
              checked={selectedRole === 'student'}
              onChange={() => setSelectedRole('student')}
              className="mt-1 accent-[#493222]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#806A56]" />
                <span className="font-bold text-xs text-[#38271C]">Standard Student</span>
              </div>
              <p className="text-[11px] text-[#806A56] mt-0.5">
                Standard student portal access, attendance viewing, course syllabus, and assignment submissions.
              </p>
            </div>
          </label>

          {/* Subject Teacher */}
          <label
            onClick={() => setSelectedRole('teacher')}
            className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedRole === 'teacher'
                ? 'bg-white border-[#668064] shadow-xs ring-1 ring-[#668064]'
                : 'bg-white/60 border-[#E6D8C7] hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="role"
              checked={selectedRole === 'teacher'}
              onChange={() => setSelectedRole('teacher')}
              className="mt-1 accent-[#668064]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#668064]" />
                <span className="font-bold text-xs text-[#38271C]">Subject Teacher</span>
              </div>
              <p className="text-[11px] text-[#806A56] mt-0.5">
                Authorized faculty member with access to assigned class attendance records, syllabus management, and task grading.
              </p>
            </div>
          </label>

          {/* Master Admin */}
          <label
            onClick={() => setSelectedRole('master_admin')}
            className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedRole === 'master_admin'
                ? 'bg-white border-[#493222] shadow-xs ring-1 ring-[#493222]'
                : 'bg-white/60 border-[#E6D8C7] hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="role"
              checked={selectedRole === 'master_admin'}
              onChange={() => setSelectedRole('master_admin')}
              className="mt-1 accent-[#493222]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-[#493222]" />
                <span className="font-bold text-xs text-[#38271C]">Master Administrator</span>
              </div>
              <p className="text-[11px] text-[#806A56] mt-0.5">
                Full system control, live branding, user role governance, subject assignment, and audit logs.
              </p>
            </div>
          </label>
        </div>

        {/* Right Column: Assign Permissions & Class Section */}
        <div className="md:col-span-5 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#38271C] mb-2">Step 3: Configure Scope</h2>

            {selectedRole === 'cr' && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-[#38271C] block mb-1">
                    Select Class / Section for Class Representative:
                  </label>
                  <select
                    value={assignedClass}
                    onChange={(e) => setAssignedClass(e.target.value)}
                    className="w-full p-3 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                  >
                    {INITIAL_CLASSES.map((cls) => (
                      <option key={cls.id} value={`${cls.class} ${cls.section}`}>
                        {cls.class} Section {cls.section} ({cls.totalStudents} Students)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conflict Notice if Section Already Has a CR */}
                {currentClassCR && (
                  <div className="p-3 bg-[#FFF3CD]/70 border border-[#F0D597] rounded-xl text-xs text-[#856404] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Existing CR will be Replaced</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      <strong>{currentClassCR.name}</strong> ({currentClassCR.email}) is currently appointed as CR for {assignedClass}. Appointing {selectedUser?.name} will automatically revoke their CR privileges while keeping their student account active.
                    </p>
                  </div>
                )}

                <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#806A56] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#668064] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>One Account, Two Experiences</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    The student will immediately see the <strong>CR Panel</strong> button in their Student Portal without logging out. They can switch freely between student coursework and CR attendance duties.
                  </p>
                </div>
              </div>
            )}

            {selectedRole === 'teacher' && (
              <div className="space-y-3">
                <p className="text-xs text-[#806A56]">
                  Select the official university subject(s) this faculty member is authorized to teach:
                </p>
                <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-[#E6D8C7] max-h-48 overflow-y-auto">
                  {OFFICIAL_SUBJECTS.map((subj) => {
                    const isChecked = assignedSubjects.includes(subj);
                    return (
                      <label
                        key={subj}
                        className="flex items-center gap-2.5 text-xs text-[#38271C] font-semibold cursor-pointer py-1"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSubject(subj)}
                          className="w-4 h-4 accent-[#493222] rounded cursor-pointer"
                        />
                        <span>{subj}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedRole === 'student' && (
              <div className="p-4 bg-white border border-[#E6D8C7] rounded-2xl text-xs text-[#806A56] space-y-2">
                <p className="font-semibold text-[#38271C]">Standard Student Account</p>
                <p className="text-[11px]">
                  Enrolled in semester subjects according to academic curriculum. If previously a CR, CR privileges are deactivated.
                </p>
              </div>
            )}

            {selectedRole === 'master_admin' && (
              <div className="p-4 bg-[#FFF3CD]/50 border border-[#F0D597] rounded-2xl text-xs text-[#856404] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Root Authority Warning
                </p>
                <p className="text-[11px] leading-relaxed">
                  Grants unlimited administrative privileges to govern university records, live portal branding, and security policies.
                </p>
              </div>
            )}
          </div>

            {/* Confirmation Summary Card */}
            <div className="mt-4 p-3.5 bg-white border border-[#E6D8C7] rounded-2xl text-xs space-y-2">
              <span className="font-bold text-[#38271C] uppercase tracking-wider text-[10px] block">
                Assignment Confirmation Summary
              </span>
              <div className="space-y-1 text-[11px] text-[#806A56]">
                <div className="flex justify-between">
                  <span>Selected Gmail:</span>
                  <strong className="text-[#38271C] font-mono">{selectedUser ? selectedUser.email : 'None'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Target UID:</span>
                  <strong className="text-[#38271C] font-mono">{selectedUser ? (selectedUser.uid || 'Verified') : 'Not Selected'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Target Role:</span>
                  <strong className="text-[#38271C] uppercase font-bold">{selectedRole}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Assignment Scope:</span>
                  <strong className="text-[#38271C]">
                    {selectedRole === 'cr'
                      ? assignedClass
                      : selectedRole === 'teacher'
                      ? (assignedSubjects.length > 0 ? assignedSubjects.join(', ') : 'None')
                      : 'Standard Student Portal'}
                  </strong>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 bg-[#FDE8E4] border border-[#E26D5C] text-[#C84B31] text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-white border border-[#E6D8C7] text-xs font-semibold text-[#806A56] hover:text-[#38271C] rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedUser || isSubmitting}
              className="flex-1 py-2.5 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Assignment...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {selectedRole === 'cr'
                      ? 'Confirm & Grant CR Role'
                      : selectedRole === 'teacher'
                      ? 'Confirm & Grant Teacher Role'
                      : 'Confirm & Save Role Assignment'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
