import React, { useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Calendar,
  Filter,
  Search,
  ShieldCheck,
  Info,
} from 'lucide-react';
import {
  DailyAttendanceRecord,
  ATTENDANCE_WEEKLY_TREND,
  ATTENDANCE_MONTHLY_TREND,
} from '../../data/portalData';

interface ProgressScreenProps {
  attendanceRecords: DailyAttendanceRecord[];
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  attendanceRecords,
}) => {
  const [trendView, setTrendView] = useState<'weekly' | 'monthly'>('weekly');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [searchDate, setSearchDate] = useState('');

  // Daily whole-class attendance calculations
  const totalRecordedDays = attendanceRecords.filter((r) => r.finalized).length;
  const presentDays = attendanceRecords.filter(
    (r) => r.finalized && r.status === 'present'
  ).length;
  const absentDays = attendanceRecords.filter(
    (r) => r.finalized && r.status === 'absent'
  ).length;

  const percentage =
    totalRecordedDays > 0
      ? Math.round((presentDays / totalRecordedDays) * 100)
      : 0;

  // Filtered date-wise history
  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesStatus =
      statusFilter === 'all' || record.status === statusFilter;
    const matchesSearch =
      record.date.toLowerCase().includes(searchDate.toLowerCase()) ||
      record.dayOfWeek.toLowerCase().includes(searchDate.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const trendData =
    trendView === 'weekly' ? ATTENDANCE_WEEKLY_TREND : ATTENDANCE_MONTHLY_TREND;

  // SVG Circular Gauge calculation
  const circleRadius = 54;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset =
    circleCircumference - (percentage / 100) * circleCircumference;

  return (
    <div className="space-y-4 pb-20">
      {/* Screen Title */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#38271C]">
            My Progress & Attendance
          </h2>
          <p className="text-xs font-medium text-[#806A56] mt-0.5">
            Daily whole-class attendance records & semester tracking
          </p>
        </div>
      </div>

      {/* Official Attendance Standard Notice Pill */}
      <div className="p-3 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl flex items-center gap-2 text-xs text-[#806A56]">
        <Info className="w-4 h-4 text-[#668064] shrink-0" />
        <span className="leading-snug">
          AWKUM Semester Regulation: <strong>75% minimum attendance</strong> required to sit for final semester examinations.
        </span>
      </div>

      {/* Overall Attendance Card (With Circular Donut Progress Ring matching Screen 06) */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 sm:p-5 shadow-xs">
        <h3 className="text-xs font-bold text-[#806A56] uppercase tracking-wider mb-3">
          Overall Daily Attendance
        </h3>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* Circular SVG Donut Gauge */}
          <div className="relative flex items-center justify-center">
            <svg className="w-36 h-36 transform -rotate-90">
              {/* Background Ring */}
              <circle
                cx="72"
                cy="72"
                r={circleRadius}
                stroke="#EFE3D3"
                strokeWidth="11"
                fill="transparent"
              />
              {/* Foreground Olive Green Arc */}
              <circle
                cx="72"
                cy="72"
                r={circleRadius}
                stroke="#668064"
                strokeWidth="11"
                fill="transparent"
                strokeDasharray={circleCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-[#38271C] tracking-tight">
                {totalRecordedDays > 0 ? `${percentage}%` : '0%'}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                totalRecordedDays === 0
                  ? 'text-[#806A56]'
                  : percentage >= 75
                  ? 'text-[#668064]'
                  : 'text-[#C84B31]'
              }`}>
                {totalRecordedDays === 0
                  ? 'Initial Stage'
                  : percentage >= 75
                  ? 'Eligible'
                  : 'Below 75%'}
              </span>
            </div>
          </div>

          {/* Breakdown Statistics */}
          <div className="w-full sm:w-auto flex-1 space-y-2.5">
            <div className="flex items-center justify-between p-2.5 bg-white border border-[#E6D8C7] rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#668064]" />
                <span className="font-semibold text-[#38271C]">Present Days</span>
              </div>
              <span className="font-bold text-[#38271C] font-mono">
                {presentDays}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-white border border-[#E6D8C7] rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C84B31]" />
                <span className="font-semibold text-[#38271C]">Absent Days</span>
              </div>
              <span className="font-bold text-[#C84B31] font-mono">
                {absentDays}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-white border border-[#E6D8C7] rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#806A56]" />
                <span className="font-semibold text-[#38271C]">Total Days Recorded</span>
              </div>
              <span className="font-bold text-[#38271C] font-mono">
                {totalRecordedDays}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Trend Chart */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-[#38271C] uppercase tracking-wider">
              Attendance Trend
            </h3>
            <p className="text-[11px] text-[#806A56]">
              {trendView === 'weekly' ? 'Weekly daily presence' : 'Monthly aggregated weeks'}
            </p>
          </div>

          {/* Toggle Weekly vs Monthly */}
          <div className="flex items-center p-0.5 bg-[#EFE3D3] rounded-lg border border-[#E6D8C7] text-xs">
            <button
              onClick={() => setTrendView('weekly')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                trendView === 'weekly'
                  ? 'bg-[#493222] text-[#FFF9F1]'
                  : 'text-[#806A56] hover:text-[#38271C]'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTrendView('monthly')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                trendView === 'monthly'
                  ? 'bg-[#493222] text-[#FFF9F1]'
                  : 'text-[#806A56] hover:text-[#38271C]'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Clean Responsive Bar Chart */}
        {totalRecordedDays === 0 ? (
          <div className="py-8 text-center text-xs text-[#806A56] italic">
            Attendance trends will calculate automatically once daily sessions are recorded in the database.
          </div>
        ) : (
          <div className="pt-4 pb-2">
            <div className="h-36 flex items-end justify-between gap-2 px-1">
              {trendData.map((item, index) => {
                const isWeekend = (item as any).isWeekend;
                const barHeight = isWeekend ? 4 : Math.max(8, item.percentage);
                const isHigh = item.percentage >= 80;

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center h-full justify-end group"
                  >
                    <span className="text-[10px] font-mono font-bold text-[#806A56] mb-1 opacity-80 group-hover:opacity-100">
                      {isWeekend ? '-' : `${item.percentage}%`}
                    </span>
                    <div className="w-full max-w-[28px] bg-[#EFE3D3] rounded-t-lg h-28 flex items-end overflow-hidden">
                      <div
                        style={{ height: `${barHeight}%` }}
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isWeekend
                            ? 'bg-transparent'
                            : isHigh
                            ? 'bg-[#668064] group-hover:bg-[#4d664c]'
                            : 'bg-[#C84B31]/80 group-hover:bg-[#C84B31]'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-[#806A56] mt-2 group-hover:text-[#38271C]">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Date-wise Daily Attendance History List */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-xs font-bold text-[#38271C] uppercase tracking-wider">
              Recent Daily Attendance Records
            </h3>
            <p className="text-[11px] text-[#806A56]">
              Single whole-class record per calendar date
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 text-xs">
            {(['all', 'present', 'absent'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                  statusFilter === filter
                    ? 'bg-[#493222] text-[#FFF9F1]'
                    : 'bg-white border border-[#E6D8C7] text-[#806A56] hover:text-[#38271C]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Date search filter */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#806A56]" />
          <input
            type="text"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            placeholder="Search by date (e.g. Oct 18, Mon)..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] placeholder:text-[#B39E8A] outline-none focus:border-[#493222]"
          />
        </div>

        {/* Records list */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {filteredRecords.length === 0 ? (
            <div className="py-8 text-center bg-white rounded-xl border border-dashed border-[#E6D8C7] p-6">
              <Calendar className="w-8 h-8 text-[#806A56] mx-auto mb-2 opacity-60" />
              <h4 className="text-xs font-bold text-[#38271C]">No attendance records logged yet</h4>
              <p className="text-[11px] text-[#806A56] mt-1 max-w-sm mx-auto">
                Your daily attendance will be logged here in real time as soon as your Class Representative (CR) or Faculty logs attendance for your section.
              </p>
            </div>
          ) : (
            filteredRecords.map((record, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-white border border-[#E6D8C7] rounded-xl text-xs hover:border-[#493222] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 text-center font-bold text-[11px] text-[#806A56] bg-[#F8F0E5] py-1 rounded-md">
                    {record.dayOfWeek}
                  </span>
                  <div>
                    <h4 className="font-bold text-[#38271C]">
                      {record.date}
                    </h4>
                    {record.notes && (
                      <p className="text-[10px] text-[#806A56] italic">
                        {record.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {record.status === 'present' ? (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[11px] font-bold rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Present</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-[#FDE8E4] text-[#C84B31] text-[11px] font-bold rounded-full">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Absent</span>
                    </span>
                  )}
                  <span
                    title="Finalized by Academic Registrar"
                    className="text-gray-400"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#668064]" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
