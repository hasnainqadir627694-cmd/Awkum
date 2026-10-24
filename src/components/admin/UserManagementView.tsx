import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Shield,
  UserX,
  UserCheck,
  Briefcase,
  Edit3,
  X,
  Check,
  AlertTriangle,
  Database,
  RefreshCw,
} from 'lucide-react';
import { AdminUser, UserRole, UserStatus } from '../../data/adminData';
import { searchUsersInFirestoreOrServer, mergeUsers } from '../../lib/authService';

interface UserManagementViewProps {
  users: AdminUser[];
  onUpdateUser: (userId: string, updates: Partial<AdminUser>) => void;
  onNavigateToTeacherAssignments?: () => void;
  onNavigateToCRAssignments?: () => void;
  onRefreshFirebase?: () => Promise<void> | void;
  isFirebaseSyncing?: boolean;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  onUpdateUser,
  onNavigateToTeacherAssignments,
  onNavigateToCRAssignments,
  onRefreshFirebase,
  isFirebaseSyncing = false,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'students' | 'teachers' | 'crs' | 'firebase' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null);
  const [confirmSuspendUser, setConfirmSuspendUser] = useState<AdminUser | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [discoveredUsers, setDiscoveredUsers] = useState<AdminUser[]>([]);

  const safeUsers = Array.isArray(users)
    ? users.filter((u): u is AdminUser => Boolean(u && typeof u === 'object' && u.id && u.role))
    : [];

  // Live search querying Firestore and Firebase Auth when admin searches
  useEffect(() => {
    const q = searchTerm.trim();
    if (!q || q.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const found = await searchUsersInFirestoreOrServer(q);
        if (Array.isArray(found) && found.length > 0) {
          setDiscoveredUsers((prev) => mergeUsers(prev, found));
        }
      } catch (e) {}
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const allAvailableUsers = mergeUsers(safeUsers, discoveredUsers);

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

  // Filtered users
  const filteredUsers = allAvailableUsers.filter((u) => {
    if (!u || !u.role) return false;
    // Role tab filtering
    if (activeTab === 'students' && u.role !== 'student' && !u.roles?.includes('student') && u.role !== 'cr') return false;
    if (activeTab === 'teachers' && u.role !== 'teacher' && !u.roles?.includes('teacher')) return false;
    if (activeTab === 'crs' && u.role !== 'cr' && !u.isCR && !u.roles?.includes('cr')) return false;
    if (activeTab === 'firebase' && !u.isFirebaseUser && !u.studentId?.startsWith('26SE')) return false;
    if (activeTab === 'pending' && u.status !== 'pending') return false;

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchId = u.studentId?.toLowerCase().includes(q);
      const matchFather = u.fatherName?.toLowerCase().includes(q);
      const matchDept = u.department?.toLowerCase().includes(q);
      const matchClass = u.assignedClass?.toLowerCase().includes(q);
      return matchName || matchEmail || Boolean(matchId) || Boolean(matchFather) || Boolean(matchDept) || Boolean(matchClass);
    }
    return true;
  });

  const handleToggleSuspend = (user: AdminUser) => {
    const newStatus: UserStatus = user.status === 'suspended' ? 'active' : 'suspended';
    onUpdateUser(user.id, { status: newStatus });
    setConfirmSuspendUser(null);
    setActionMenuUser(null);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'master_admin':
        return <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] text-[10px] font-bold rounded-full">Admin</span>;
      case 'teacher':
        return <span className="px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">Teacher</span>;
      case 'cr':
        return <span className="px-2.5 py-0.5 bg-[#F0F5FA] text-[#3A7BD5] text-[10px] font-bold rounded-full">CR</span>;
      case 'student':
      default:
        return <span className="px-2.5 py-0.5 bg-[#F8F0E5] text-[#806A56] text-[10px] font-bold rounded-full">Student</span>;
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">Active</span>;
      case 'pending':
        return <span className="px-2.5 py-0.5 bg-[#FFF3CD] text-[#B78103] text-[10px] font-bold rounded-full">Pending</span>;
      case 'suspended':
        return <span className="px-2.5 py-0.5 bg-[#FDE8E4] text-[#C84B31] text-[10px] font-bold rounded-full">Suspended</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">User Management</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            View, search and manage all registered AWKUM users and student identities
          </p>
        </div>
      </div>

      {/* 2. Search & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FFF9F1] p-3 rounded-2xl border border-[#E6D8C7]">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user, email or student ID..."
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {onRefreshFirebase && (
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing || isFirebaseSyncing}
              className="px-3.5 py-2 bg-white border border-[#C5DEC3] text-[#668064] hover:bg-[#EAF2E9] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isFirebaseSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Firebase</span>
            </button>
          )}
          <button
            type="button"
            className="px-3.5 py-2 bg-white border border-[#D8C7B4] hover:bg-[#F8F0E5] text-xs font-semibold text-[#493222] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
          <button
            type="button"
            onClick={() => alert('AWKUM Student Import is connected to Department Registrar Service.')}
            className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add / Import</span>
          </button>
        </div>
      </div>

      {/* 3. Filter Tabs (Matching Mockup 3) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#493222] text-[#FFF9F1]'
              : 'bg-[#FFF9F1] text-[#806A56] hover:text-[#38271C] border border-[#E6D8C7]'
          }`}
        >
          All Users ({safeUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
            activeTab === 'students'
              ? 'bg-[#493222] text-[#FFF9F1]'
              : 'bg-[#FFF9F1] text-[#806A56] hover:text-[#38271C] border border-[#E6D8C7]'
          }`}
        >
          Students ({safeUsers.filter((u) => u.role === 'student' || u.role === 'cr').length})
        </button>
        <button
          onClick={() => setActiveTab('firebase')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'firebase'
              ? 'bg-[#493222] text-[#FFF9F1]'
              : 'bg-[#FFF9F1] text-[#668064] hover:text-[#38271C] border border-[#C5DEC3]'
          }`}
        >
          <Database className="w-3 h-3" />
          <span>Firebase Registered ({safeUsers.filter((u) => u.isFirebaseUser || u.studentId?.startsWith('26SE')).length})</span>
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-[#493222] text-[#FFF9F1]'
              : 'bg-[#FFF9F1] text-[#806A56] hover:text-[#38271C] border border-[#E6D8C7]'
          }`}
        >
          Teachers ({safeUsers.filter((u) => u.role === 'teacher').length})
        </button>
        <button
          onClick={() => setActiveTab('crs')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
            activeTab === 'crs'
              ? 'bg-[#493222] text-[#FFF9F1]'
              : 'bg-[#FFF9F1] text-[#806A56] hover:text-[#38271C] border border-[#E6D8C7]'
          }`}
        >
          Class Representatives ({safeUsers.filter((u) => u.role === 'cr' || u.isCR).length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-[#493222] text-[#FFF9F1]'
              : 'bg-[#FFF9F1] text-[#806A56] hover:text-[#38271C] border border-[#E6D8C7]'
          }`}
        >
          Pending ({safeUsers.filter((u) => u.status === 'pending').length})
        </button>
      </div>

      {/* 4. Users Table */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F0E5]/80 text-[#806A56] uppercase text-[10px] tracking-wider font-bold border-b border-[#E6D8C7]">
              <tr>
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6D8C7]/50 text-[#38271C]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#806A56]">
                    No registered users match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-[#F3E9DD]/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#806A56]">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-[#38271C]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#EFE3D3] text-[#493222] flex items-center justify-center font-bold text-[11px] shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{user.name}</span>
                            {user.fatherName && (
                              <span className="text-[10px] text-[#806A56] font-normal">
                                (S/D of {user.fatherName})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {user.studentId && (
                              <span className="text-[10px] text-[#493222] font-mono bg-[#EFE3D3] px-1 rounded">
                                {user.studentId}
                              </span>
                            )}
                            {user.isFirebaseUser && (
                              <span className="text-[9px] text-[#668064] font-bold bg-[#EAF2E9] px-1.5 rounded-full flex items-center gap-0.5">
                                <Database className="w-2.5 h-2.5" />
                                <span>Firebase</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#493222] font-mono text-[11px]">
                      {user.email}
                    </td>
                    <td className="py-3.5 px-4">{getRoleBadge(user.role)}</td>
                    <td className="py-3.5 px-4">{getStatusBadge(user.status)}</td>
                    <td className="py-3.5 px-4 text-[#806A56]">{user.registeredDate}</td>
                    <td className="py-3.5 px-4 text-right relative">
                      <button
                        onClick={() => setActionMenuUser(actionMenuUser === user.id ? null : user.id)}
                        className="p-1.5 hover:bg-[#EFE3D3] rounded-lg text-[#806A56] hover:text-[#38271C] transition-colors cursor-pointer"
                        aria-label="Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Action Menu */}
                      {actionMenuUser === user.id && (
                        <div className="absolute right-4 top-10 w-48 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl shadow-lg py-1 z-30 text-left">
                          {onNavigateToTeacherAssignments && (
                            <button
                              onClick={() => {
                                onNavigateToTeacherAssignments();
                                setActionMenuUser(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-[#38271C] hover:bg-[#F3E9DD] flex items-center gap-2 cursor-pointer"
                            >
                              <Briefcase className="w-3.5 h-3.5 text-[#806A56]" />
                              <span>Assign Teacher Load</span>
                            </button>
                          )}
                          {onNavigateToCRAssignments && (
                            <button
                              onClick={() => {
                                onNavigateToCRAssignments();
                                setActionMenuUser(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-[#38271C] hover:bg-[#F3E9DD] flex items-center gap-2 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-[#3A7BD5]" />
                              <span>Appoint Class CR</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setActionMenuUser(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-[#38271C] hover:bg-[#F3E9DD] flex items-center gap-2 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#3A7BD5]" />
                            <span>View Details</span>
                          </button>
                          {user.role !== 'master_admin' && (
                            <button
                              onClick={() => {
                                setConfirmSuspendUser(user);
                                setActionMenuUser(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-[#C84B31] hover:bg-[#FDE8E4] flex items-center gap-2 cursor-pointer border-t border-[#E6D8C7]/50"
                            >
                              {user.status === 'suspended' ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-[#668064]" />
                                  <span className="text-[#668064]">Reactivate User</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3.5 h-3.5 text-[#C84B31]" />
                                  <span>Suspend User</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#E6D8C7] bg-[#F8F0E5]/50 flex items-center justify-between text-xs text-[#806A56]">
          <span>Showing 1 to {filteredUsers.length} of {users.length + 238} users</span>
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 bg-[#493222] text-[#FFF9F1] font-bold rounded-lg">1</span>
            <span className="px-2.5 py-1 bg-white border border-[#E6D8C7] text-[#806A56] rounded-lg">2</span>
            <span className="px-2.5 py-1 bg-white border border-[#E6D8C7] text-[#806A56] rounded-lg">3</span>
            <span>...</span>
            <span className="px-2.5 py-1 bg-white border border-[#E6D8C7] text-[#806A56] rounded-lg">25</span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Suspension */}
      {confirmSuspendUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FDE8E4] text-[#C84B31] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-[#38271C]">
                {confirmSuspendUser.status === 'suspended' ? 'Reactivate Account?' : 'Suspend Account?'}
              </h3>
              <p className="text-xs text-[#806A56] mt-1.5 leading-relaxed">
                Are you sure you want to {confirmSuspendUser.status === 'suspended' ? 'reactivate' : 'suspend'}{' '}
                <strong className="text-[#38271C]">{confirmSuspendUser.name}</strong> ({confirmSuspendUser.email})?
                {confirmSuspendUser.status !== 'suspended' &&
                  ' Suspended users are immediately blocked from logging into the portal and executing API actions.'}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSuspendUser(null)}
                className="flex-1 py-2.5 bg-white border border-[#E6D8C7] text-xs font-semibold text-[#806A56] rounded-xl hover:bg-[#F8F0E5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleSuspend(confirmSuspendUser)}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl text-white shadow-xs cursor-pointer ${
                  confirmSuspendUser.status === 'suspended'
                    ? 'bg-[#668064] hover:bg-[#526850]'
                    : 'bg-[#C84B31] hover:bg-[#a63c26]'
                }`}
              >
                {confirmSuspendUser.status === 'suspended' ? 'Confirm Reactivate' : 'Confirm Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Record Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8C7]">
              <h3 className="text-sm font-bold text-[#38271C]">User Account Details</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 text-[#806A56] hover:text-[#38271C]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#493222] text-[#FFF9F1] flex items-center justify-center font-bold text-lg">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#38271C]">{selectedUser.name}</h4>
                <p className="text-xs text-[#806A56]">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getRoleBadge(selectedUser.role)}
                  {getStatusBadge(selectedUser.status)}
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#806A56]">Student / Employee ID:</span>
                <span className="font-semibold text-[#38271C]">{selectedUser.studentId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806A56]">Department:</span>
                <span className="font-semibold text-[#38271C]">{selectedUser.department || 'Computer Science'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806A56]">Assigned Section / Class:</span>
                <span className="font-semibold text-[#38271C]">{selectedUser.assignedClass || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806A56]">Registered Date:</span>
                <span className="font-semibold text-[#38271C]">{selectedUser.registeredDate}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full py-2 bg-[#493222] text-[#FFF9F1] font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
