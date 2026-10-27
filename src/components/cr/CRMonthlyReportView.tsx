import React, { useState, useMemo } from 'react';
import { Calendar, FileDown, ArrowLeft } from 'lucide-react';
import { ClassStudentItem } from '../../data/classRosterData';
import { AttendanceSession } from '../../lib/attendanceService';
import { generateMonthlyAttendancePDF } from '../../lib/pdfReportService';

interface CRMonthlyReportViewProps {
  assignedClass: string;
  roster: ClassStudentItem[];
  sessions: AttendanceSession[];
  onBackToDashboard: () => void;
}

export const CRMonthlyReportView: React.FC<CRMonthlyReportViewProps> = ({
  assignedClass,
  roster,
  sessions,
  onBackToDashboard,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Compute all dates in selected month/year
  const monthDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; dayOfWeek: string }[] = [];
    const date = new Date(selectedYear, selectedMonth, 1);
    while (date.getMonth() === selectedMonth) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const dayNum = date.getDate();
      const dayStr = String(dayNum).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'narrow' });
      days.push({ dateStr, dayNum, dayOfWeek });
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [selectedYear, selectedMonth]);

  // Filter sessions occurring within this month
  const monthSessions = useMemo(() => {
    const dateSet = new Set(monthDays.map((d) => d.dateStr));
    return sessions.filter((s) => dateSet.has(s.date) && s.finalized);
  }, [sessions, monthDays]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleExportPDF = () => {
    generateMonthlyAttendancePDF(assignedClass, monthNames[selectedMonth], String(selectedYear), roster, monthSessions);
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
            Monthly Attendance Report
          </h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Comprehensive aggregation of finalized daily whole-class sessions for {monthNames[selectedMonth]} {selectedYear}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportPDF}
          className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <FileDown className="w-4 h-4" />
          <span>Export Monthly PDF</span>
        </button>
      </div>

      {/* Month Navigation Bar */}
      <div className="p-3 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="px-3 py-1.5 bg-white border border-[#E6D8C7] rounded-xl text-xs font-semibold text-[#38271C] hover:bg-[#F8F0E5] cursor-pointer"
        >
          ← {monthNames[(selectedMonth - 1 + 12) % 12]}
        </button>

        <div className="flex items-center gap-2 text-xs font-bold text-[#38271C]">
          <Calendar className="w-4 h-4 text-[#493222]" />
          <span>{monthNames[selectedMonth]} {selectedYear}</span>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="px-3 py-1.5 bg-white border border-[#E6D8C7] rounded-xl text-xs font-semibold text-[#38271C] hover:bg-[#F8F0E5] cursor-pointer"
        >
          {monthNames[(selectedMonth + 1) % 12]} →
        </button>
      </div>

      {/* Monthly Matrix Table */}
      <div className="bg-white border border-[#E6D8C7] rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#493222] text-[#FFF9F1]">
                <th className="p-3 font-bold sticky left-0 bg-[#493222] z-10">Student Name</th>
                <th className="p-3 font-bold">Roll No</th>
                {monthDays.map((d) => (
                  <th key={d.dateStr} className="p-2 font-bold text-center w-8 whitespace-nowrap">
                    <div>{d.dayNum}</div>
                    <div className="text-[9px] font-normal text-[#E6D8C7]">{d.dayOfWeek}</div>
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

                const dayStatuses = monthDays.map((d) => {
                  const sess = monthSessions.find((s) => s.date === d.dateStr);
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
                      <td key={idx} className="p-2 text-center whitespace-nowrap font-bold">
                        {ds.type === 'present' && <span className="text-[#668064]">✓</span>}
                        {ds.type === 'absent' && <span className="text-[#C84B31]">✕</span>}
                        {ds.type === 'not_recorded' && <span className="text-[#806A56]/30">—</span>}
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
                  <td colSpan={40} className="p-8 text-center text-xs text-[#806A56]">
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
