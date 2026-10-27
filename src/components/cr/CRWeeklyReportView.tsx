import React, { useState, useMemo } from 'react';
import { Calendar, FileDown, ArrowLeft, Check, X, ShieldCheck } from 'lucide-react';
import { ClassStudentItem } from '../../data/classRosterData';
import { AttendanceSession } from '../../lib/attendanceService';
import { generateWeeklyAttendancePDF } from '../../lib/pdfReportService';

interface CRWeeklyReportViewProps {
  assignedClass: string;
  roster: ClassStudentItem[];
  sessions: AttendanceSession[];
  onBackToDashboard: () => void;
}

export const CRWeeklyReportView: React.FC<CRWeeklyReportViewProps> = ({
  assignedClass,
  roster,
  sessions,
  onBackToDashboard,
}) => {
  // Helper to get Monday of current week
  const getMondayOfCurrentWeek = (d: Date = new Date()) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMondayOfCurrentWeek());

  // Compute 7 days of the week starting from currentWeekStart
  const weekDays = useMemo(() => {
    const days: { dateStr: string; display: string; dayName: string; dateObj: Date }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const display = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ dateStr, display, dayName, dateObj: d });
    }
    return days;
  }, [currentWeekStart]);

  const weekStartDateStr = weekDays[0].display;
  const weekEndDateStr = weekDays[6].display;
  const yearStr = currentWeekStart.getFullYear();

  // Filter sessions occurring within this week
  const weekSessions = useMemo(() => {
    const dateSet = new Set(weekDays.map((d) => d.dateStr));
    return sessions.filter((s) => dateSet.has(s.date) && s.finalized);
  }, [sessions, weekDays]);

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleExportPDF = () => {
    generateWeeklyAttendancePDF(assignedClass, weekStartDateStr, weekEndDateStr, String(yearStr), roster, weekSessions);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#806A56] hover:text-[#38271C] p-1.5 -ml-1 rounded-lg hover:bg-[#F3E9DD] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] text-[10px] font-bold rounded-md">
          {assignedClass}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#38271C] tracking-tight">
            Weekly Attendance Report
          </h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Automatically aggregated from finalized daily whole-class sessions
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportPDF}
          className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <FileDown className="w-4 h-4" />
          <span>Export Weekly PDF</span>
        </button>
      </div>

      {/* Week Navigation Bar */}
      <div className="p-3 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevWeek}
          className="px-3 py-1.5 bg-white border border-[#E6D8C7] rounded-xl text-xs font-semibold text-[#38271C] hover:bg-[#F8F0E5] cursor-pointer"
        >
          ← Previous Week
        </button>

        <div className="flex items-center gap-2 text-xs font-bold text-[#38271C]">
          <Calendar className="w-4 h-4 text-[#493222]" />
          <span>{weekStartDateStr} – {weekEndDateStr}, {yearStr}</span>
        </div>

        <button
          type="button"
          onClick={handleNextWeek}
          className="px-3 py-1.5 bg-white border border-[#E6D8C7] rounded-xl text-xs font-semibold text-[#38271C] hover:bg-[#F8F0E5] cursor-pointer"
        >
          Next Week →
        </button>
      </div>

      {/* Weekly Matrix Table */}
      <div className="bg-white border border-[#E6D8C7] rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#493222] text-[#FFF9F1]">
                <th className="p-3 font-bold sticky left-0 bg-[#493222] z-10">Student Name</th>
                <th className="p-3 font-bold">Roll No</th>
                {weekDays.map((d) => (
                  <th key={d.dateStr} className="p-3 font-bold text-center whitespace-nowrap">
                    <div>{d.dayName}</div>
                    <div className="text-[10px] font-normal text-[#E6D8C7]">{d.display}</div>
                  </th>
                ))}
                <th className="p-3 font-bold text-center">Present</th>
                <th className="p-3 font-bold text-center">Absent</th>
                <th className="p-3 font-bold text-center">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6D8C7] text-[#38271C]">
              {roster.map((st) => {
                let studentPresent = 0;
                let studentAbsent = 0;
                let finalizedSessionsCount = 0;

                const dayStatuses = weekDays.map((d) => {
                  const sess = weekSessions.find((s) => s.date === d.dateStr);
                  if (!sess || !sess.finalized) {
                    return { type: 'not_recorded', label: '—' };
                  }
                  finalizedSessionsCount++;
                  const rec = sess.records[st.rollNumber];
                  if (!rec) {
                    studentAbsent++;
                    return { type: 'absent', label: '✕' };
                  }
                  if (rec.status === 'present') {
                    studentPresent++;
                    return { type: 'present', label: '✓' };
                  } else {
                    studentAbsent++;
                    return { type: 'absent', label: '✕' };
                  }
                });

                const rate = finalizedSessionsCount > 0 ? Math.round((studentPresent / finalizedSessionsCount) * 100) : 0;

                return (
                  <tr key={st.id} className="hover:bg-[#F8F0E5]/50 transition-colors">
                    <td className="p-3 font-bold sticky left-0 bg-white z-10 whitespace-nowrap shadow-xs">
                      {st.name}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-[#806A56] whitespace-nowrap">
                      {st.rollNumber}
                    </td>
                    {dayStatuses.map((ds, idx) => (
                      <td key={idx} className="p-3 text-center whitespace-nowrap font-bold">
                        {ds.type === 'present' && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#EAF2E9] text-[#668064]">
                            ✓
                          </span>
                        )}
                        {ds.type === 'absent' && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#FDE8E4] text-[#C84B31]">
                            ✕
                          </span>
                        )}
                        {ds.type === 'not_recorded' && (
                          <span className="text-[#806A56]/50 font-normal">—</span>
                        )}
                      </td>
                    ))}
                    <td className="p-3 text-center font-bold text-[#668064]">{studentPresent}</td>
                    <td className="p-3 text-center font-bold text-[#C84B31]">{studentAbsent}</td>
                    <td className="p-3 text-center font-extrabold text-[#493222]">{rate}%</td>
                  </tr>
                );
              })}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-xs text-[#806A56]">
                    No students enrolled in {assignedClass}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
