import React from 'react';
import { X, FileDown, Printer, ShieldCheck, Check, Calendar, Users } from 'lucide-react';
import { AttendanceSession } from '../../lib/attendanceService';
import { downloadAttendancePDF } from '../../lib/pdfReportService';

interface CRPdfModalProps {
  isOpen: boolean;
  session: AttendanceSession | null;
  onClose: () => void;
}

export const CRPdfModal: React.FC<CRPdfModalProps> = ({ isOpen, session, onClose }) => {
  if (!isOpen || !session) return null;

  const recordsList = Object.values(session.records).sort((a, b) =>
    a.rollNumber.localeCompare(b.rollNumber)
  );

  const reportId = `REP-${session.classId.replace(/\s+/g, '')}-${session.date.replace(/-/g, '')}-V${
    (session.revisions?.length || 0) + 1
  }`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[#38271C] animate-in fade-in zoom-in-95">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#493222] text-[#FFF9F1] shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-xs sm:text-sm tracking-wide">
                Official Attendance Report Preview
              </h3>
              <span className="text-[10px] text-[#E6D8C7]">
                {session.classId} · {session.displayDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 sm:px-3 sm:py-1.5 bg-white/10 hover:bg-white/20 text-[#FFF9F1] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print Report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={() => downloadAttendancePDF(session)}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#38271C] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Download PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer ml-1"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Document Shell */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#F8F0E5]/60 print:p-0">
          <div className="bg-white border border-[#E6D8C7] rounded-2xl p-5 sm:p-7 shadow-xs space-y-5 print:border-none print:shadow-none">
            {/* 1. University Header */}
            <div className="text-center pb-4 border-b-2 border-[#493222]">
              <h1 className="font-serif text-base sm:text-lg font-extrabold text-[#38271C] tracking-wide uppercase">
                Abdul Wali Khan University Mardan
              </h1>
              <p className="text-xs text-[#806A56] font-medium mt-0.5">
                Department of Computer Science & Software Engineering · Garden Campus
              </p>
              <div className="mt-2 inline-block px-3 py-1 bg-[#EFE3D3] text-[#493222] text-[11px] font-bold rounded-md tracking-wider uppercase">
                Class Representative (CR) Official Attendance Report
              </div>
            </div>

            {/* 2. Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#F8F0E5] border border-[#E6D8C7] rounded-xl text-xs">
              <div className="space-y-1">
                <div>
                  <span className="text-[#806A56] font-medium">Assigned Class / Section: </span>
                  <strong className="text-[#38271C]">{session.classId}</strong>
                </div>
                <div>
                  <span className="text-[#806A56] font-medium">Session Date: </span>
                  <strong className="text-[#38271C]">{session.displayDate} ({session.dayOfWeek})</strong>
                </div>
                <div>
                  <span className="text-[#806A56] font-medium">Report Reference ID: </span>
                  <span className="font-mono font-bold text-[#493222]">{reportId}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-[#806A56] font-medium">Recorded By: </span>
                  <strong className="text-[#38271C]">{session.recordedByName} (CR)</strong>
                </div>
                <div>
                  <span className="text-[#806A56] font-medium">Verified Email: </span>
                  <span className="text-[#38271C]">{session.recordedByEmail}</span>
                </div>
                <div>
                  <span className="text-[#806A56] font-medium">Finalized At: </span>
                  <span className="text-[#38271C]">{session.finalizedAt || 'Official Session'}</span>
                </div>
              </div>
            </div>

            {/* 3. Summary Statistics Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2.5 bg-white border border-[#E6D8C7] rounded-xl text-center">
                <span className="text-[10px] font-bold text-[#806A56] uppercase block">Total Enrolled</span>
                <span className="text-base sm:text-lg font-bold text-[#38271C]">{session.totalEnrolled}</span>
              </div>
              <div className="p-2.5 bg-[#EAF2E9] border border-[#C5DEC3] rounded-xl text-center">
                <span className="text-[10px] font-bold text-[#668064] uppercase block">Present</span>
                <span className="text-base sm:text-lg font-bold text-[#668064]">{session.presentCount}</span>
              </div>
              <div className="p-2.5 bg-[#FDE8E4] border border-[#F5C2B8] rounded-xl text-center">
                <span className="text-[10px] font-bold text-[#C84B31] uppercase block">Absent</span>
                <span className="text-base sm:text-lg font-bold text-[#C84B31]">{session.absentCount}</span>
              </div>
              <div className="p-2.5 bg-[#EFE3D3] border border-[#D8C7B4] rounded-xl text-center">
                <span className="text-[10px] font-bold text-[#493222] uppercase block">Rate</span>
                <span className="text-base sm:text-lg font-bold text-[#493222]">{session.attendancePercentage}%</span>
              </div>
            </div>

            {/* 4. Student Attendance Roster Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#806A56]">
                  Verified Student Roster ({recordsList.length} Students)
                </span>
                <span className="text-[10px] text-[#806A56]">
                  Status locked at submission
                </span>
              </div>

              <div className="border border-[#E6D8C7] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#493222] text-[#FFF9F1] font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">#</th>
                      <th className="py-2 px-3 w-28">Roll No</th>
                      <th className="py-2 px-3">Student Full Name</th>
                      <th className="py-2 px-3 w-24 text-center">Status</th>
                      <th className="py-2 px-3 w-28">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D8C7] bg-white">
                    {recordsList.map((rec, idx) => {
                      const isPresent = rec.status === 'present';
                      return (
                        <tr key={rec.rollNumber} className={idx % 2 === 1 ? 'bg-[#F8F0E5]/40' : 'bg-white'}>
                          <td className="py-2 px-3 text-center text-[#806A56] font-bold text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-[#38271C]">{rec.rollNumber}</td>
                          <td className="py-2 px-3 font-medium text-[#38271C]">{rec.studentName}</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                isPresent ? 'bg-[#EAF2E9] text-[#668064]' : 'bg-[#FDE8E4] text-[#C84B31]'
                              }`}
                            >
                              {isPresent ? 'PRESENT' : 'ABSENT'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-[#806A56]">
                            {rec.notes || (isPresent ? 'Attended' : 'Unexcused')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Footer & Verification Stamp */}
            <div className="pt-4 border-t border-[#E6D8C7] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#806A56]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#668064]" />
                <span>Digitally Authenticated by Abdul Wali Khan University ClassHub System</span>
              </div>
              <div className="text-right font-medium">
                Official Department Archive Copy
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3.5 bg-[#FFF9F1] border-t border-[#E6D8C7] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#E6D8C7] text-xs font-semibold text-[#806A56] hover:text-[#38271C] rounded-xl cursor-pointer"
          >
            Close Preview
          </button>

          <button
            type="button"
            onClick={() => downloadAttendancePDF(session)}
            className="px-5 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span>Download PDF Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
