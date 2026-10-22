import React, { useState } from 'react';
import {
  History,
  FileDown,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Search,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { AttendanceSession } from '../../lib/attendanceService';
import { downloadAttendancePDF } from '../../lib/pdfReportService';
import { CRPdfModal } from './CRPdfModal';

interface CRAttendanceHistoryViewProps {
  assignedClass: string;
  sessions: AttendanceSession[];
  onBackToDashboard: () => void;
  onOpenSessionCorrection: (session: AttendanceSession) => void;
}

export const CRAttendanceHistoryView: React.FC<CRAttendanceHistoryViewProps> = ({
  assignedClass,
  sessions,
  onBackToDashboard,
  onOpenSessionCorrection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<AttendanceSession | null>(null);
  const [previewSession, setPreviewSession] = useState<AttendanceSession | null>(null);

  const filteredSessions = sessions.filter((s) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        s.displayDate.toLowerCase().includes(q) ||
        s.date.includes(q) ||
        s.dayOfWeek.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header with back button */}
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

      <div>
        <h1 className="text-xl font-bold text-[#38271C] tracking-tight">
          Attendance History & PDF Archive
        </h1>
        <p className="text-xs text-[#806A56] mt-0.5">
          Archived whole-class daily attendance sessions and official printable reports
        </p>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="relative bg-[#FFF9F1] p-3 rounded-2xl border border-[#E6D8C7]">
        <Search className="w-4 h-4 text-[#806A56] absolute left-6 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by date, month, or day (e.g. 'Oct 19', 'Mon')..."
          className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
        />
      </div>

      {/* 3. History List */}
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#E6D8C7] space-y-2">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-[#806A56]/60" />
            <h3 className="font-bold text-xs text-[#38271C]">No attendance reports available.</h3>
            <p className="text-[11px] text-[#806A56]">
              Finalized daily sessions and generated reports will appear here automatically.
            </p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#E6D8C7] space-y-2">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-[#806A56]/60" />
            <h3 className="font-bold text-xs text-[#38271C]">No attendance history found</h3>
            <p className="text-[11px] text-[#806A56]">
              No archived sessions match your date search.
            </p>
          </div>
        ) : (
          filteredSessions.map((sess) => {
            const hasRevisions = sess.revisions && sess.revisions.length > 0;
            return (
              <div
                key={sess.id}
                className="bg-white border border-[#E6D8C7] rounded-3xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#EFE3D3] text-[#493222] font-bold text-xs flex flex-col items-center justify-center shrink-0">
                      <span className="uppercase text-[9px] tracking-wider text-[#806A56]">{sess.dayOfWeek}</span>
                      <span className="text-sm font-bold leading-tight">{sess.date.split('-')[2]}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#38271C]">{sess.displayDate}</h3>
                        <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                          {sess.attendancePercentage}% Rate
                        </span>
                        {hasRevisions && (
                          <span className="px-2 py-0.5 bg-[#FFF3CD] text-[#856404] text-[9px] font-bold rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Rev #{sess.revisions!.length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#806A56] mt-0.5">
                        {sess.presentCount} Present · {sess.absentCount} Absent · Finalized by {sess.recordedByName}
                      </p>
                    </div>
                  </div>

                  {/* PDF Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewSession(sess)}
                      className="px-3 py-2 bg-[#F8F0E5] hover:bg-[#EFE3D3] text-[#493222] border border-[#E6D8C7] rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      <span>View Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadAttendancePDF(sess)}
                      className="px-3 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Download Official PDF Report"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download PDF</span>
                    </button>
                  </div>
                </div>

                {/* Revision Note Banner if present */}
                {hasRevisions && (
                  <div className="p-2.5 bg-[#FFF3CD]/50 border border-[#F0D597] rounded-xl text-[11px] text-[#856404] flex items-center justify-between">
                    <span>
                      Latest Revision: <strong>{sess.revisions![sess.revisions!.length - 1].reason}</strong> (by{' '}
                      {sess.revisions![sess.revisions!.length - 1].revisedBy})
                    </span>
                  </div>
                )}

                {/* Footer Controls: Drill-down & Amend option */}
                <div className="flex items-center justify-between pt-2 border-t border-[#E6D8C7]/60 text-xs">
                  <button
                    type="button"
                    onClick={() => onOpenSessionCorrection(sess)}
                    className="font-bold text-[#806A56] hover:text-[#38271C] text-xs transition-colors cursor-pointer"
                  >
                    Request Amendment / Correction
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSessionDetail(selectedSessionDetail?.id === sess.id ? null : sess)}
                    className="font-bold text-[#493222] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{selectedSessionDetail?.id === sess.id ? 'Hide Roster' : 'View Roster'}</span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        selectedSessionDetail?.id === sess.id ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Expanded Roster Breakdown */}
                {selectedSessionDetail?.id === sess.id && (
                  <div className="mt-3 pt-3 border-t border-[#E6D8C7] animate-in fade-in">
                    <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block mb-2">
                      Roster Details ({Object.keys(sess.records).length} students recorded)
                    </span>
                    <div className="bg-[#F8F0E5]/60 border border-[#E6D8C7] rounded-2xl p-2 max-h-48 overflow-y-auto divide-y divide-[#E6D8C7]">
                      {Object.values(sess.records).map((r) => (
                        <div key={r.rollNumber} className="py-1.5 px-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-[#806A56]">{r.rollNumber}</span>
                            <span className="font-semibold text-[#38271C]">{r.studentName}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'present'
                                ? 'bg-[#EAF2E9] text-[#668064]'
                                : 'bg-[#FDE8E4] text-[#C84B31]'
                            }`}
                          >
                            {r.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Full A4 PDF Preview Modal */}
      <CRPdfModal
        isOpen={!!previewSession}
        session={previewSession}
        onClose={() => setPreviewSession(null)}
      />
    </div>
  );
};
