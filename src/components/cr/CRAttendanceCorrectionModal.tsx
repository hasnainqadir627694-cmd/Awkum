import React, { useState } from 'react';
import { X, AlertTriangle, Check, RotateCcw, AlertCircle, FileDown } from 'lucide-react';
import { ClassStudentItem } from '../../data/classRosterData';
import { AttendanceSession, saveDailyAttendanceSession, StudentAttendanceRecord } from '../../lib/attendanceService';
import { downloadAttendancePDF } from '../../lib/pdfReportService';

interface CRAttendanceCorrectionModalProps {
  session: AttendanceSession;
  roster: ClassStudentItem[];
  crName: string;
  onClose: () => void;
  onSuccess: (revisedSession: AttendanceSession) => void;
}

export const CRAttendanceCorrectionModal: React.FC<CRAttendanceCorrectionModalProps> = ({
  session,
  roster,
  crName,
  onClose,
  onSuccess,
}) => {
  // Local status map initialized with existing session
  const [correctedMap, setCorrectedMap] = useState<Record<string, 'present' | 'absent'>>(() => {
    const map: Record<string, 'present' | 'absent'> = {};
    Object.values(session.records).forEach((r) => {
      map[r.rollNumber] = r.status;
    });
    return map;
  });

  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const presentCount = Object.values(correctedMap).filter((s) => s === 'present').length;
  const absentCount = roster.length - presentCount;
  const attendanceRate = roster.length > 0 ? Math.round((presentCount / roster.length) * 100) : 0;

  const toggleStudent = (rollNumber: string, status: 'present' | 'absent') => {
    setCorrectedMap((prev) => ({ ...prev, [rollNumber]: status }));
  };

  const handleApplyCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionReason.trim()) {
      setErrorText('Please provide a mandatory reason for amending the finalized attendance record.');
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    try {
      const records: Record<string, StudentAttendanceRecord> = {};
      roster.forEach((st) => {
        records[st.rollNumber] = {
          studentId: st.id,
          studentName: st.name,
          rollNumber: st.rollNumber,
          status: correctedMap[st.rollNumber] || 'absent',
          notes: correctedMap[st.rollNumber] === 'present' ? 'Attended (Amended)' : 'Unexcused (Amended)',
        };
      });

      const updatedSession: AttendanceSession = {
        ...session,
        presentCount,
        absentCount,
        attendancePercentage: attendanceRate,
        records,
        pdfReportStatus: 'generated',
        pdfGeneratedAt: new Date().toISOString(),
      };

      const result = await saveDailyAttendanceSession(updatedSession, true, correctionReason.trim());

      if (!result.success) {
        setErrorText(result.error || 'Failed to apply attendance correction.');
        setIsSubmitting(false);
        return;
      }

      onSuccess(result.session);
    } catch (err: any) {
      setErrorText(err?.message || 'A network error occurred while amending the record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 max-w-lg w-full shadow-2xl text-[#38271C] max-h-[90vh] flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E6D8C7]">
          <div>
            <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Controlled Correction Workflow</span>
            </div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#38271C] mt-0.5">
              Amend Attendance for {session.displayDate}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#806A56] hover:text-[#38271C] hover:bg-[#F3E9DD] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body with roster edits */}
        <form onSubmit={handleApplyCorrection} className="flex-1 overflow-y-auto py-3 space-y-4">
          <div className="p-3 bg-[#FFF3CD]/60 border border-[#F0D597] rounded-2xl text-xs text-[#856404] leading-relaxed">
            Every amendment creates an immutable audit trail entry and generates a revised PDF revision tagged with your identity ({crName}). Silent changes are forbidden.
          </div>

          <div>
            <label className="text-xs font-bold text-[#38271C] block mb-1">
              Mandatory Reason for Correction:
            </label>
            <textarea
              required
              rows={2}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Student 23CS1005 was marked absent by mistake due to late arrival with instructor permission."
              className="w-full px-3 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
            />
          </div>

          {/* Quick Stats Comparison */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-white border border-[#E6D8C7] rounded-xl">
              <span className="text-[10px] text-[#806A56] block">Previous Finalized:</span>
              <span className="font-bold text-[#38271C]">
                {session.presentCount} Present · {session.absentCount} Absent ({session.attendancePercentage}%)
              </span>
            </div>
            <div className="p-2.5 bg-[#EAF2E9] border border-[#C5DEC3] rounded-xl">
              <span className="text-[10px] text-[#668064] block">Revised State:</span>
              <span className="font-bold text-[#668064]">
                {presentCount} Present · {absentCount} Absent ({attendanceRate}%)
              </span>
            </div>
          </div>

          {/* Student Status Toggles */}
          <div>
            <span className="text-xs font-bold text-[#38271C] block mb-1.5">
              Amend Student Attendance Status:
            </span>
            <div className="bg-white border border-[#E6D8C7] rounded-2xl divide-y divide-[#E6D8C7] max-h-56 overflow-y-auto">
              {roster.map((st, idx) => {
                const isPresent = correctedMap[st.rollNumber] === 'present';
                return (
                  <div key={st.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-[#F8F0E5]/50">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#38271C] truncate">{st.name}</span>
                        <span className="font-mono text-[10px] text-[#806A56]">{st.rollNumber}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleStudent(st.rollNumber, 'present')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          isPresent ? 'bg-[#668064] text-white' : 'bg-[#F8F0E5] text-[#806A56]'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStudent(st.rollNumber, 'absent')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          !isPresent ? 'bg-[#C84B31] text-white' : 'bg-[#F8F0E5] text-[#806A56]'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {errorText && (
            <div className="p-3 bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31] rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#E6D8C7]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-white border border-[#E6D8C7] text-xs font-semibold text-[#806A56] rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? 'Recording Correction...' : 'Save & Publish Revision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
