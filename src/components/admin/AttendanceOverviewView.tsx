import React, { useState } from 'react';
import { Calendar, UserCheck, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { INITIAL_CLASSES } from '../../data/adminData';

export const AttendanceOverviewView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState('2026-10-19');

  const attendanceSections = [
    { section: 'BSCS 3A', cr: 'Ayesha Noor', total: 36, present: 33, absent: 3, percentage: 92, status: 'Marked' },
    { section: 'BSCS 2A', cr: 'Hamza Malik', total: 45, present: 41, absent: 4, percentage: 91, status: 'Marked' },
    { section: 'BSCS 1A', cr: 'Unassigned', total: 42, present: 38, absent: 4, percentage: 90, status: 'Marked' },
    { section: 'BSCS 2B', cr: 'Unassigned', total: 40, present: 34, absent: 6, percentage: 85, status: 'Marked' },
    { section: 'BSCS 3B', cr: 'Unassigned', total: 32, present: 29, absent: 3, percentage: 91, status: 'Marked' },
    { section: 'BSCS 4A', cr: 'Unassigned', total: 28, present: 25, absent: 3, percentage: 89, status: 'Marked' },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Institutional Attendance Overview</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Monitor daily whole-class attendance records submitted by authorized Class Representatives
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

      {/* 2. Overall Rate Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs">
          <span className="text-xs font-bold text-[#806A56]">Campus Daily Average</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-[#38271C]">90.1%</span>
            <span className="text-xs font-bold text-[#668064]">↑ 1.4% vs last week</span>
          </div>
        </div>
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs">
          <span className="text-xs font-bold text-[#806A56]">Sections Finalized</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-[#38271C]">6 / 7</span>
            <span className="text-xs font-bold text-[#668064]">86% on schedule</span>
          </div>
        </div>
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs">
          <span className="text-xs font-bold text-[#806A56]">Active Students Present</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-[#38271C]">200 / 223</span>
            <span className="text-xs font-semibold text-[#806A56]">23 absent</span>
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
                    <span className="px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                      {sec.status}
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
