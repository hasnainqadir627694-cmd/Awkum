import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Shield,
  Layers,
  BookOpen,
  Briefcase,
  UserCheck,
  CalendarCheck,
  CheckSquare,
  Megaphone,
  Palette,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { AwkumEmblem } from '../common/AwkumLogo';
import { AdminUser, AuditLogItem, INITIAL_AUDIT_LOGS, INITIAL_USERS, UserRole } from '../../data/adminData';
import { AdminDashboardOverview } from './AdminDashboardOverview';
import { UserManagementView } from './UserManagementView';
import { RoleAssignmentView } from './RoleAssignmentView';
import { ClassesSectionsView } from './ClassesSectionsView';
import { SubjectsManagementView } from './SubjectsManagementView';
import { TeacherAssignmentsView } from './TeacherAssignmentsView';
import { CRAssignmentsView } from './CRAssignmentsView';
import { AttendanceOverviewView } from './AttendanceOverviewView';
import { AssignmentsOverviewView } from './AssignmentsOverviewView';
import { AnnouncementsView } from './AnnouncementsView';
import { BrandingAppearanceView } from './BrandingAppearanceView';
import { SystemActivityLogsView } from './SystemActivityLogsView';
import { SettingsSecurityView } from './SettingsSecurityView';
import { recordAuditLog } from '../../lib/authService';

interface AdminLayoutProps {
  currentUser: AdminUser;
  onLogout: () => void;
}

export type AdminViewType =
  | 'dashboard'
  | 'users'
  | 'roles'
  | 'classes'
  | 'subjects'
  | 'teachers'
  | 'crs'
  | 'attendance'
  | 'assignments'
  | 'announcements'
  | 'branding'
  | 'logs'
  | 'settings';

export const AdminLayout: React.FC<AdminLayoutProps> = ({ currentUser, onLogout }) => {
  const [activeView, setActiveView] = useState<AdminViewType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_USERS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [roleAssignmentTargetUser, setRoleAssignmentTargetUser] = useState<AdminUser | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Update a user record (e.g. status suspension)
  const handleUpdateUser = (userId: string, updates: Partial<AdminUser>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, ...updates };

          if (updates.status) {
            const actionText = updates.status === 'suspended' ? 'Account Suspended' : 'Account Reactivated';
            const logItem: AuditLogItem = {
              id: `log-${Date.now()}`,
              action: actionText,
              performedBy: currentUser.email,
              details: `${u.email} status -> ${updates.status}`,
              timestamp: 'Just now',
              category: 'security',
              status: updates.status === 'suspended' ? 'warning' : 'success',
            };
            setAuditLogs((prevLogs) => [logItem, ...prevLogs]);
            recordAuditLog(logItem);
          }

          return updated;
        }
        return u;
      })
    );
  };

  // Save Role Assignment
  const handleSaveRole = (
    userId: string,
    newRole: UserRole,
    assignedSubjects?: string[],
    assignedClass?: string
  ) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const logDetails = `${u.name} -> ${newRole.toUpperCase()}${
            assignedSubjects ? ` (${assignedSubjects.join(', ')})` : assignedClass ? ` (${assignedClass})` : ''
          }`;

          const newLog: AuditLogItem = {
            id: `log-${Date.now()}`,
            action: 'Role Assigned',
            performedBy: currentUser.email,
            details: logDetails,
            timestamp: 'Just now',
            category: 'role',
            status: 'success',
          };
          setAuditLogs((prevLogs) => [newLog, ...prevLogs]);
          recordAuditLog(newLog);

          return {
            ...u,
            role: newRole,
            assignedSubjects,
            assignedClass,
          };
        }
        return u;
      })
    );
  };

  const navItems = [
    { id: 'dashboard' as AdminViewType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users' as AdminViewType, label: 'User Management', icon: Users },
    { id: 'roles' as AdminViewType, label: 'Role Assignment', icon: Shield },
    { id: 'classes' as AdminViewType, label: 'Classes & Sections', icon: Layers },
    { id: 'subjects' as AdminViewType, label: 'Subjects Management', icon: BookOpen },
    { id: 'teachers' as AdminViewType, label: 'Teacher Assignments', icon: Briefcase },
    { id: 'crs' as AdminViewType, label: 'Class Representatives', icon: UserCheck },
    { id: 'attendance' as AdminViewType, label: 'Attendance Overview', icon: CalendarCheck },
    { id: 'assignments' as AdminViewType, label: 'Assignments Overview', icon: CheckSquare },
    { id: 'announcements' as AdminViewType, label: 'Announcements', icon: Megaphone },
    { id: 'branding' as AdminViewType, label: 'Branding & Login Appearance', icon: Palette, highlight: true },
    { id: 'logs' as AdminViewType, label: 'System Activity Logs', icon: FileText },
    { id: 'settings' as AdminViewType, label: 'Settings & Security', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8F0E5] text-[#38271C] flex selection:bg-[#493222] selection:text-[#FFF9F1]">
      {/* 1. Desktop Left Sidebar (Dark Espresso-Brown) */}
      <aside className="hidden lg:flex w-68 bg-[#24170F] text-[#FFF9F1] flex-col shrink-0 border-r border-[#38251A] shadow-2xl">
        {/* Top University Branding Badge */}
        <div className="p-5 border-b border-[#38251A] flex items-center gap-3 bg-[#1C120B]">
          <AwkumEmblem size={38} className="text-[#FFF9F1] shrink-0" />
          <div className="flex flex-col">
            <span className="font-serif text-base font-bold tracking-wider leading-tight text-[#FFF9F1]">
              AWKUM
            </span>
            <span className="text-[10px] font-bold text-[#D6A564] uppercase tracking-wider">
              Master Admin Panel
            </span>
          </div>
        </div>

        {/* 13 Navigation Menu Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#493222] text-[#FFF9F1] shadow-xs ring-1 ring-white/15'
                    : 'text-[#D5C2B4] hover:bg-[#342217] hover:text-white'
                } ${item.highlight && !isActive ? 'text-[#E2A03F]' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'opacity-80'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom User Profile & Logout */}
        <div className="p-4 border-t border-[#38251A] bg-[#1C120B]/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-amber-400/40 shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
              <span className="text-[10px] text-amber-400 font-semibold truncate">Master Admin</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="p-1.5 hover:bg-[#493222] text-[#D5C2B4] hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E6D8C7] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-[#493222] hover:bg-[#F3E9DD] rounded-xl cursor-pointer"
              aria-label="Open Admin Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Top search bar matching Mockup 2 */}
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="w-4 h-4 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search users, classes, subjects or 'awkum'..."
                className="w-full pl-9 pr-3.5 py-1.5 bg-[#F8F0E5]/60 hover:bg-[#F8F0E5] border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
              />

              {/* Dynamic Search Dropdown */}
              {globalSearch.trim() && (
                <div className="absolute top-11 left-0 right-0 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl shadow-xl overflow-hidden z-40 animate-in zoom-in-95 divide-y divide-[#E6D8C7]">
                  {/* Matching 'awkum' or university query: shows the distinctive circular avatar */}
                  {globalSearch.toLowerCase().includes('awkum') && (
                    <div
                      onClick={() => {
                        setActiveView('branding');
                        setGlobalSearch('');
                      }}
                      className="p-3.5 hover:bg-[#F3E9DD] transition-colors cursor-pointer flex items-center gap-3"
                    >
                      {/* THAT CIRCLE: Circle containing the updated AWKUM logo */}
                      <div className="w-11 h-11 rounded-full bg-[#FFFDF9] border border-[#493222]/30 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                        <AwkumEmblem size={30} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#38271C]">
                            Abdul Wali Khan University Mardan
                          </span>
                          <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[9px] font-bold rounded-full">
                            University
                          </span>
                        </div>
                        <p className="text-[11px] text-[#806A56] truncate mt-0.5">
                          Garden Campus, Mardan · Click to manage live Branding & Appearance
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Matching registered users */}
                  {users
                    .filter(
                      (u) =>
                        u.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(globalSearch.toLowerCase())
                    )
                    .slice(0, 3)
                    .map((matchedUser) => (
                      <div
                        key={matchedUser.id}
                        onClick={() => {
                          setActiveView('users');
                          setGlobalSearch('');
                        }}
                        className="p-3 hover:bg-[#F3E9DD] transition-colors cursor-pointer flex items-center gap-2.5 text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#EFE3D3] text-[#493222] font-bold text-xs flex items-center justify-center shrink-0">
                          {matchedUser.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs text-[#38271C]">{matchedUser.name}</span>
                          <span className="text-[10px] text-[#806A56] font-mono block truncate">{matchedUser.email}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-[#F8F0E5] text-[#806A56] rounded-md">
                          {matchedUser.role}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Notifications & Profile Pill */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('announcements')}
              className="relative p-2 text-[#493222] hover:bg-[#F3E9DD] rounded-xl cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#C84B31] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                1
              </span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 hover:bg-[#F3E9DD] rounded-full sm:rounded-xl border border-transparent hover:border-[#E6D8C7] transition-all cursor-pointer"
              >
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-[#493222]"
                />
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#38271C] leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold">Master Admin</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#806A56] hidden sm:block" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-11 w-48 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl shadow-xl py-1 z-30 animate-in zoom-in-95">
                  <div className="px-3.5 py-2 border-b border-[#E6D8C7]/60">
                    <div className="font-bold text-xs text-[#38271C]">{currentUser.name}</div>
                    <div className="text-[10px] text-[#806A56] font-mono truncate">{currentUser.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveView('settings');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-xs text-[#38271C] hover:bg-[#F3E9DD] flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings & Security</span>
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-xs text-[#C84B31] hover:bg-[#FDE8E4] flex items-center gap-2 cursor-pointer border-t border-[#E6D8C7]/60"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeView === 'dashboard' && (
            <AdminDashboardOverview
              users={users}
              auditLogs={auditLogs}
              onNavigate={(v) => setActiveView(v as AdminViewType)}
            />
          )}

          {activeView === 'users' && (
            <UserManagementView
              users={users}
              onUpdateUser={handleUpdateUser}
              onOpenRoleAssignment={(u) => {
                setRoleAssignmentTargetUser(u);
                setActiveView('roles');
              }}
            />
          )}

          {activeView === 'roles' && (
            <RoleAssignmentView
              users={users}
              initialSelectedUser={roleAssignmentTargetUser}
              onSaveRole={handleSaveRole}
              onCancel={() => setActiveView('users')}
            />
          )}

          {activeView === 'classes' && <ClassesSectionsView />}

          {activeView === 'subjects' && <SubjectsManagementView />}

          {activeView === 'teachers' && (
            <TeacherAssignmentsView
              users={users}
              onOpenRoleAssignment={(u) => {
                setRoleAssignmentTargetUser(u);
                setActiveView('roles');
              }}
            />
          )}

          {activeView === 'crs' && (
            <CRAssignmentsView
              users={users}
              onOpenRoleAssignment={(u) => {
                setRoleAssignmentTargetUser(u);
                setActiveView('roles');
              }}
            />
          )}

          {activeView === 'attendance' && <AttendanceOverviewView />}

          {activeView === 'assignments' && <AssignmentsOverviewView />}

          {activeView === 'announcements' && <AnnouncementsView />}

          {activeView === 'branding' && (
            <BrandingAppearanceView adminEmail={currentUser.email} />
          )}

          {activeView === 'logs' && <SystemActivityLogsView logs={auditLogs} />}

          {activeView === 'settings' && <SettingsSecurityView />}
        </main>
      </div>

      {/* 3. Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[80vw] bg-[#24170F] text-[#FFF9F1] flex flex-col h-full z-10 shadow-2xl">
            <div className="p-4 border-b border-[#38251A] flex items-center justify-between bg-[#1C120B]">
              <div className="flex items-center gap-2">
                <AwkumEmblem size={32} className="text-[#FFF9F1]" />
                <span className="font-serif font-bold text-sm text-[#FFF9F1]">AWKUM Admin</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                      isActive ? 'bg-[#493222] text-white' : 'text-[#D5C2B4] hover:bg-[#342217]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-[#38251A] bg-[#1C120B]">
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#E26D5C] hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
