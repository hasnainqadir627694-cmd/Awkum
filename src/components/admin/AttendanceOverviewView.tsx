import React, { useState, useEffect } from 'react';
import { Calendar, UserCheck, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { INITIAL_CLASSES, AdminUser } from '../../data/adminData';
import {
  AttendanceSession,
  formatDateKey,
  getDailyAttendanceSession,
} from '../../lib/attendanceService';

interface AttendanceOverviewViewProps {
  users?: AdminUser[];
}

export const AttendanceOverviewView: React.FC<AttendanceOverviewViewProps> = ({ users }) => {
  const [selectedDate, setSelectedDate] = useState<string>(formatDateKey());
  const [sessionsMap, setSessionsMap] = useState<Record<string, AttendanceSession | null>>({});
  const [isLoading, setIsLoading] = useState(false);

  const safeUsers = Array.isArray(users)
    ? users.filter((u): u is AdminUser => Boolean(u && typeof u === 'object' && u.id && u.role))
    : [];

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadSessions = async () => {
      const results: Record<string, AttendanceSession | null> = {};
      for (const cls of INITIAL_CLASSES) {
        const classKey = `${cls.class} ${cls.section}`;
        try {
          const session = await getDailyAttendanceSession(classKey, selectedDate);
          results[classKey] = session;
        } catch {
          results[classKey] = null;
        }
      }
      if (isMounted) {
        setSessionsMap(results);
        setIsLoading(false);
      }
    };

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Derive real statistics across sections
  const attendanceSections = INITIAL_CLASSES.map((cls) => {
    const classKey = `${cls.class} ${cls.section}`;
    const assignedCR = safeUsers.find(
      (u) =>
        (u.isCR || u.role === 'cr' || (Array.isArray(u.roles) && u.roles.includes('cr'))) &&
        (u.assignedClass?.toLowerCase() === classKey.toLowerCase() ||
          u.assignedClass?.toLowerCase().replace(/\s+/g, '') === classKey.toLowerCase().replace(/\s+/g, ''))
    );

    const enrolledStudents = safeUsers.filter(
      (u) =>
        (u.role === 'student' || (Array.isArray(u.roles) && u.roles.includes('student'))) &&
        (u.assignedClass?.toLowerCase() === classKey.toLowerCase() ||
          u.assignedClass?.toLowerCase().replace(/\s+/g, '') === classKey.toLowerCase().replace(/\s+/g, ''))
    ).length;

    const session = sessionsMap[classKey];

    if (session && session.finalized) {
      return {
        section: classKey,
        cr: assignedCR ? assignedCR.name : session.recordedByName || 'Authorized CR',
        total: session.totalEnrolled || enrolledStudents,
        present: session.presentCount,
        absent: session.absentCount,
        percentage: session.attendancePercentage,
        status: 'Marked' as const,
      };
    }

    return {
      section: classKey,
      cr: assignedCR ? assignedCR.name : 'Unassigned',
      total: enrolledStudents,
      present: 0,
      absent: 0,
      percentage: 0,
      status: (assignedCR ? 'Pending' : 'No CR') as 'Pending' | 'No CR',
    };
  });

  const finalizedSections = attendanceSections.filter((s) => s.status === 'Marked');
  const totalPresent = finalizedSections.reduce((acc, s) => acc + s.present, 0);
  const totalAbsent = finalizedSections.reduce((acc, s) => acc + s.absent, 0);
  const totalFinalizedEnrolled = finalizedSections.reduce((acc, s) => acc + s.total, 0);
  const averageRate =
    totalFinalizedEnrolled > 0
      ? Math.round((totalPresent / totalFinalizedEnrolled) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Institutional Attendance Overview</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Real daily whole-class attendance records submitted by authorized Class Representatives
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#806A56]" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl text-xs font-bold text-[#38271C]"
          />
        </div>
      </div>

      {/* 2. Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs">
          <span className="text-xs font-bold text-[#806A56]">Campus Daily Average</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-[#38271C]">
              {finalizedSections.length > 0 ? `${averageRate}%` : '0%'}
            </span>
            <span className="text-xs font-semibold text-[#806A56]">
              {finalizedSections.length > 0 ? `${finalizedSections.length} sections reporting` : 'Awaiting submissions'}
            </span>
          </div>
        </div>

        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs">
          <span className="text-xs font-bold text-[#806A56]">Sections Finalized</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-[#38271C]">
              {finalizedSections.length} / {attendanceSections.length}
            </span>
            <span className="text-xs font-semibold text-[#806A56]">
              {finalizedSections.length === attendanceSections.length && attendanceSections.length > 0
                ? 'All complete'
                : 'In progress'}
            </span>
          </div>
        </div>

        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs">
          <span className="text-xs font-bold text-[#806A56]">Active Students Present</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-[#38271C]">
              {totalPresent} / {totalFinalizedEnrolled}
            </span>
            <span className="text-xs font-semibold text-[#806A56]">
              {totalAbsent} recorded absent
            </span>
          </div>
        </div>
      </div>

      {/* 3. Section-Wise Breakdown Table */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F0E5]/80 text-[#806A56] uppercase text-[10px] tracking-wider font-bold border-b border-[#E6D8C7]">
              <tr>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Marking Authority / CR</th>
                <th className="py-3 px-4">Present</th>
                <th className="py-3 px-4">Absent</th>
                <th className="py-3 px-4">Rate</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6D8C7]/50 text-[#38271C]">
              {attendanceSections.map((sec) => (
                <tr key={sec.section} className="hover:bg-[#F3E9DD]/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#38271C]">{sec.section}</td>
                  <td className="py-3.5 px-4 text-[#806A56] font-medium">{sec.cr}</td>
                  <td className="py-3.5 px-4 font-bold text-[#668064]">{sec.present}</td>
                  <td className="py-3.5 px-4 font-bold text-[#C84B31]">{sec.absent}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-[#E6D8C7]/50 h-2 rounded-full overflow-hidden">
                        <div style={{ width: `${sec.percentage}%` }} className="bg-[#668064] h-full" />
                      </div>
                      <span className="font-bold">{sec.percentage}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                        sec.status === 'Marked'
                          ? 'bg-[#EAF2E9] text-[#668064]'
                          : sec.status === 'Pending'
                          ? 'bg-[#FFF3CD] text-[#B78103]'
                          : 'bg-[#F8F0E5] text-[#806A56]'
                      }`}
                    >
                      {sec.status === 'Marked'
                        ? 'Finalized'
                        : sec.status === 'Pending'
                        ? 'Awaiting Roll Call'
                        : 'No CR Assigned'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
