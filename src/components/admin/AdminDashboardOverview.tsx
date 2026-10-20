import React from 'react';
import {
  Users,
  GraduationCap,
  Briefcase,
  UserCheck,
  Clock,
  ArrowUpRight,
  TrendingUp,
  BookOpen,
  Image as ImageIcon,
  Shield,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AdminUser, AuditLogItem } from '../../data/adminData';

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
  const totalUsers = users.length + 238; // 248 total accounts in institution
  const studentCount = users.filter((u) => u.role === 'student').length + 205; // 210
  const teacherCount = users.filter((u) => u.role === 'teacher').length + 8; // 12
  const crCount = users.filter((u) => u.role === 'cr').length + 5; // 6
  const pendingCount = users.filter((u) => u.status === 'pending').length + 4; // 5

  const subjectBarData = [
    { name: 'PF Theory', count: 45, color: '#493222' },
    { name: 'PF Lab', count: 33, color: '#668064' },
    { name: 'Management', count: 32, color: '#806A56' },
    { name: 'English', count: 28, color: '#C84B31' },
    { name: 'Maths', count: 40, color: '#38271C' },
    { name: 'Physics', count: 33, color: '#4A5B49' },
  ];

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
            Complete central control room over AWKUM ClassHub (Garden Campus Mardan)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EAF2E9] text-[#668064] text-xs font-bold rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#668064] animate-pulse" />
            Live Backend Connected
          </span>
        </div>
      </div>

      {/* 2. Top 5 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
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
            <span className="text-[11px] font-bold text-[#668064] flex items-center">
              ↑ 12%
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
            <span className="text-[11px] font-bold text-[#668064] flex items-center">
              ↑ 10%
            </span>
          </div>
        </div>

        {/* Teachers */}
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806A56]">Teachers</span>
            <div className="p-2 bg-[#F8F0E5] rounded-xl text-[#493222]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#38271C]">{teacherCount}</span>
            <span className="text-[11px] font-bold text-[#668064] flex items-center">
              ↑ 8%
            </span>
          </div>
        </div>

        {/* Class Representatives */}
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806A56]">Class Reps</span>
            <div className="p-2 bg-[#F0F5FA] rounded-xl text-[#3A7BD5]">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#38271C]">{crCount}</span>
            <span className="text-[11px] font-bold text-[#806A56] flex items-center">
              ↑ 0%
            </span>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806A56]">Pending Requests</span>
            <div className="p-2 bg-[#FFF3CD] rounded-xl text-[#B78103]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#38271C]">{pendingCount}</span>
            <span className="text-[11px] font-bold text-[#B78103] flex items-center">
              ↑ 2%
            </span>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: User Distribution & Subjects Overview & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* User Distribution (Donut Breakdown) */}
        <div className="lg:col-span-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs flex flex-col justify-between">
          <h2 className="text-sm font-bold text-[#38271C] mb-4">User Distribution</h2>

          <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
            {/* Donut representation */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E6D8C7" strokeWidth="4.5" />
                {/* Students (84.7%) */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#493222"
                  strokeWidth="4.5"
                  strokeDasharray="74.5, 100"
                  strokeLinecap="round"
                />
                {/* Teachers (4.8%) */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#668064"
                  strokeWidth="4.5"
                  strokeDasharray="4.2, 100"
                  strokeDashoffset="-74.5"
                  strokeLinecap="round"
                />
                {/* CRs (2.4%) */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#3A7BD5"
                  strokeWidth="4.5"
                  strokeDasharray="2.1, 100"
                  strokeDashoffset="-78.7"
                  strokeLinecap="round"
                />
                {/* Pending (8.1%) */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#E2A03F"
                  strokeWidth="4.5"
                  strokeDasharray="7.1, 100"
                  strokeDashoffset="-80.8"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-bold text-[#38271C]">{totalUsers}</span>
                <span className="text-[10px] text-[#806A56]">Total Users</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 text-xs w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#493222]" />
                  <span className="text-[#38271C] font-medium">Students</span>
                </div>
                <span className="font-semibold text-[#38271C]">210 <span className="text-[10px] text-[#806A56]">(84.7%)</span></span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#668064]" />
                  <span className="text-[#38271C] font-medium">Teachers</span>
                </div>
                <span className="font-semibold text-[#38271C]">12 <span className="text-[10px] text-[#806A56]">(4.8%)</span></span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3A7BD5]" />
                  <span className="text-[#38271C] font-medium">CRs</span>
                </div>
                <span className="font-semibold text-[#38271C]">6 <span className="text-[10px] text-[#806A56]">(2.4%)</span></span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E2A03F]" />
                  <span className="text-[#38271C] font-medium">Pending</span>
                </div>
                <span className="font-semibold text-[#38271C]">20 <span className="text-[10px] text-[#806A56]">(8.1%)</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects Overview (Bar Chart) */}
        <div className="lg:col-span-5 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#38271C]">Subjects Overview</h2>
            <span className="text-[11px] font-semibold text-[#493222] bg-[#F8F0E5] px-2.5 py-1 rounded-lg border border-[#E6D8C7]">
              This Semester ▾
            </span>
          </div>

          <div className="pt-2 pb-1">
            <div className="h-44 flex items-end justify-between gap-2 px-2 border-b border-[#E6D8C7]/80 pb-2">
              {subjectBarData.map((bar) => {
                const heightPercent = (bar.count / 50) * 100;
                return (
                  <div key={bar.name} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
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
                <span key={b.name} className="flex-1 text-center truncate">
                  {b.name.replace(' Theory', '').replace(' Lab', ' (Lab)')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activities (5 rows matching mockup) */}
        <div className="lg:col-span-3 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#38271C]">Recent Activities</h2>
            <button
              onClick={() => onNavigate('logs')}
              className="text-[11px] font-semibold text-[#493222] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 pb-2.5 border-b border-[#E6D8C7]/50 last:border-0 last:pb-0">
                <span className="w-2 h-2 rounded-full bg-[#493222] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#38271C] truncate">{log.action}</span>
                    <span className="text-[10px] text-[#806A56] shrink-0">{log.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-[#806A56] truncate mt-0.5">{log.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Quick Actions Grid (6 actions matching Mockup 2) */}
      <div>
        <h2 className="text-sm font-bold text-[#38271C] mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigate('users')}
            className="p-3.5 bg-[#FFF9F1] hover:bg-[#F3E9DD] border border-[#E6D8C7] rounded-2xl text-left shadow-2xs transition-all cursor-pointer group"
          >
            <div className="p-2 w-fit bg-[#EFE3D3] rounded-xl text-[#493222] mb-2 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-[#38271C]">Manage Users</div>
            <div className="text-[10px] text-[#806A56] mt-0.5 line-clamp-1">View & student accounts</div>
          </button>

          <button
            onClick={() => onNavigate('roles')}
            className="p-3.5 bg-[#FFF9F1] hover:bg-[#F3E9DD] border border-[#E6D8C7] rounded-2xl text-left shadow-2xs transition-all cursor-pointer group"
          >
            <div className="p-2 w-fit bg-[#EAF2E9] rounded-xl text-[#668064] mb-2 group-hover:scale-105 transition-transform">
              <Shield className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-[#38271C]">Assign Roles</div>
            <div className="text-[10px] text-[#806A56] mt-0.5 line-clamp-1">Grant or revoke user roles</div>
          </button>

          <button
            onClick={() => onNavigate('subjects')}
            className="p-3.5 bg-[#FFF9F1] hover:bg-[#F3E9DD] border border-[#E6D8C7] rounded-2xl text-left shadow-2xs transition-all cursor-pointer group"
          >
            <div className="p-2 w-fit bg-[#F0F5FA] rounded-xl text-[#3A7BD5] mb-2 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-[#38271C]">Manage Subjects</div>
            <div className="text-[10px] text-[#806A56] mt-0.5 line-clamp-1">Add, edit or update subjects</div>
          </button>

          <button
            onClick={() => onNavigate('teachers')}
            className="p-3.5 bg-[#FFF9F1] hover:bg-[#F3E9DD] border border-[#E6D8C7] rounded-2xl text-left shadow-2xs transition-all cursor-pointer group"
          >
            <div className="p-2 w-fit bg-[#F8F0E5] rounded-xl text-[#B78103] mb-2 group-hover:scale-105 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-[#38271C]">Assign Teachers</div>
            <div className="text-[10px] text-[#806A56] mt-0.5 line-clamp-1">Map teachers to subjects</div>
          </button>

          <button
            onClick={() => onNavigate('crs')}
            className="p-3.5 bg-[#FFF9F1] hover:bg-[#F3E9DD] border border-[#E6D8C7] rounded-2xl text-left shadow-2xs transition-all cursor-pointer group"
          >
            <div className="p-2 w-fit bg-[#FDE8E4] rounded-xl text-[#C84B31] mb-2 group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-[#38271C]">Manage CRs</div>
            <div className="text-[10px] text-[#806A56] mt-0.5 line-clamp-1">Assign class representatives</div>
          </button>

          <button
            onClick={() => onNavigate('branding')}
            className="p-3.5 bg-[#FFF9F1] hover:bg-[#F3E9DD] border border-[#E6D8C7] rounded-2xl text-left shadow-2xs transition-all cursor-pointer group"
          >
            <div className="p-2 w-fit bg-[#EFE3D3] rounded-xl text-[#493222] mb-2 group-hover:scale-105 transition-transform">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-[#38271C]">Branding</div>
            <div className="text-[10px] text-[#806A56] mt-0.5 line-clamp-1">Update logo & login image</div>
          </button>
        </div>
      </div>
    </div>
  );
};
