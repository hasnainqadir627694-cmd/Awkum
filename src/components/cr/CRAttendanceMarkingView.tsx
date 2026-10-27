import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Search,
  Check,
  X,
  AlertCircle,
  FileDown,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Sparkles,
  HelpCircle,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';
import { ClassStudentItem } from '../../data/classRosterData';
import {
  AttendanceSession,
  getDailyAttendanceSession,
  saveDailyAttendanceSession,
  formatDateKey,
  formatDisplayDate,
  StudentAttendanceRecord,
} from '../../lib/attendanceService';
import { downloadAttendancePDF, markReportGenerated } from '../../lib/pdfReportService';
import { CRAttendanceCorrectionModal } from './CRAttendanceCorrectionModal';
import { CRPdfModal } from './CRPdfModal';

interface CRAttendanceMarkingViewProps {
  assignedClass: string;
  crUser: { id: string; name: string; email: string };
  roster: ClassStudentItem[];
  onBackToDashboard: () => void;
  onGoToHistory?: () => void;
  onAttendanceFinalized: (session: AttendanceSession) => void;
}

export const CRAttendanceMarkingView: React.FC<CRAttendanceMarkingViewProps> = ({
  assignedClass,
  crUser,
  roster,
  onBackToDashboard,
  onGoToHistory,
  onAttendanceFinalized,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(formatDateKey());
  const [existingSession, setExistingSession] = useState<AttendanceSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Student status map: rollNumber -> 'present' | 'absent'
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent'>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'present' | 'absent'>('all');

  // Review & Confirmation Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Success Modal & PDF Modal
  const [savedSession, setSavedSession] = useState<AttendanceSession | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [previewingPdfSession, setPreviewingPdfSession] = useState<AttendanceSession | null>(null);

  // Correction Workflow Modal
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  // Check if session exists whenever selectedDate or assignedClass changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSession(true);
    setSaveError(null);

    getDailyAttendanceSession(assignedClass, selectedDate).then((sess) => {
      if (!isMounted) return;
      setIsLoadingSession(false);
      setExistingSession(sess);

      if (sess && sess.finalized) {
        // Populate from existing finalized session
        const map: Record<string, 'present' | 'absent'> = {};
        Object.values(sess.records).forEach((r) => {
          map[r.rollNumber] = r.status;
        });
        setAttendanceMap(map);
      } else {
        // Unselected initial state as requested
        setAttendanceMap({});
      }
    });

    return () => {
      isMounted = false;
    };
  }, [assignedClass, selectedDate, roster]);

  // Derived counts
  const totalEnrolled = roster.length;
  const presentCount = roster.filter((st) => attendanceMap[st.rollNumber] === 'present').length;
  const explicitAbsentCount = roster.filter((st) => attendanceMap[st.rollNumber] === 'absent').length;
  const unmarkedCount = totalEnrolled - presentCount - explicitAbsentCount;
  const absentCount = explicitAbsentCount + unmarkedCount; // Upon save confirmation, unmarked become absent
  const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

  // Filtered roster for search
  const filteredRoster = roster.filter((st) => {
    if (filterMode === 'present' && attendanceMap[st.rollNumber] !== 'present') return false;
    if (filterMode === 'absent' && attendanceMap[st.rollNumber] !== 'absent') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        st.name.toLowerCase().includes(q) ||
        st.rollNumber.toLowerCase().includes(q) ||
        st.fatherName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleStatus = (rollNumber: string, status: 'present' | 'absent') => {
    if (existingSession?.finalized) return; // Prevent silent modification of finalized records
    setAttendanceMap((prev) => ({
      ...prev,
      [rollNumber]: status,
    }));
  };

  const handleMarkAll = (status: 'present' | 'absent') => {
    if (existingSession?.finalized) return;
    const newMap: Record<string, 'present' | 'absent'> = {};
    roster.forEach((st) => {
      newMap[st.rollNumber] = status;
    });
    setAttendanceMap(newMap);
  };

  // Finalize attendance session
  const handleFinalizeAttendance = async () => {
    setIsSubmitting(true);
    setSaveError(null);

    try {
      const dateObj = new Date(selectedDate);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayOfWeek = days[dateObj.getDay()];

      const records: Record<string, StudentAttendanceRecord> = {};
      roster.forEach((st) => {
        const status = attendanceMap[st.rollNumber] === 'present' ? 'present' : 'absent';
        records[st.rollNumber] = {
          studentId: st.id,
          studentName: st.name,
          rollNumber: st.rollNumber,
          status,
          notes: status === 'present' ? 'Attended' : 'Unexcused / Unmarked',
        };
      });

      const newSession: AttendanceSession = {
        id: `${assignedClass.replace(/\s+/g, '_')}_${selectedDate}`,
        classId: assignedClass,
        date: selectedDate,
        displayDate: formatDisplayDate(dateObj),
        dayOfWeek,
        recordedByUid: crUser.id,
        recordedByName: crUser.name,
        recordedByEmail: crUser.email,
        totalEnrolled,
        presentCount,
        absentCount,
        attendancePercentage: attendanceRate,
        finalized: true,
        finalizedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        records,
        pdfReportStatus: 'generated',
        pdfGeneratedAt: new Date().toISOString(),
      };

      const result = await saveDailyAttendanceSession(newSession, false);

      if (!result.success) {
        setSaveError(result.error || 'Failed to save attendance record.');
        setIsSubmitting(false);
        return;
      }

      setSavedSession(result.session);
      setExistingSession(result.session);
      setShowReviewModal(false);
      setShowSuccessModal(true);
      onAttendanceFinalized(result.session);
      markReportGenerated(result.session);
    } catch (err: any) {
      setSaveError(err?.message || 'A network error occurred while finalizing attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header with back navigation */}
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
          Mark Daily Whole-Class Attendance
        </h1>
        <p className="text-xs text-[#806A56] mt-0.5">
          One single official session per date covering all enrolled students in {assignedClass}
        </p>
      </div>

      {/* 2. Date Selection & Status Banner */}
      <div className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#493222]" />
            <span className="text-xs font-bold text-[#38271C]">Select Attendance Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
            />
          </div>

          {/* Existing record status indicator */}
          {existingSession?.finalized && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-2.5 py-1 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" /> Record Finalized
              </span>
              <button
                type="button"
                onClick={() => setShowCorrectionModal(true)}
                className="px-3 py-1 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-[11px] font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                Amend / Correct
              </button>
            </div>
          )}
        </div>

        {/* Existing Session Alert */}
        {existingSession?.finalized && (
          <div className="p-3 bg-[#EAF2E9]/60 border border-[#C5DEC3] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#668064]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Attendance for <strong>{existingSession.displayDate}</strong> is locked and archived.
              </span>
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setPreviewingPdfSession(existingSession)}
                className="px-2.5 py-1 bg-white border border-[#C5DEC3] rounded-lg font-bold text-[11px] text-[#493222] hover:bg-[#F8F0E5] flex items-center gap-1 cursor-pointer"
              >
                <span>View Report</span>
              </button>
              <button
                type="button"
                onClick={() => downloadAttendancePDF(existingSession)}
                className="px-2.5 py-1 bg-[#493222] text-[#FFF9F1] rounded-lg font-bold text-[11px] hover:bg-[#38271C] flex items-center gap-1 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Live Metrics Row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl text-center">
          <span className="text-[10px] font-bold text-[#806A56] uppercase block">Total</span>
          <span className="text-lg font-bold text-[#38271C]">{totalEnrolled}</span>
        </div>
        <div className="p-3 bg-[#EAF2E9] border border-[#C5DEC3] rounded-2xl text-center">
          <span className="text-[10px] font-bold text-[#668064] uppercase block">Present</span>
          <span className="text-lg font-bold text-[#668064]">{presentCount}</span>
        </div>
        <div className="p-3 bg-[#FDE8E4] border border-[#F5C2B8] rounded-2xl text-center">
          <span className="text-[10px] font-bold text-[#C84B31] uppercase block">Absent</span>
          <span className="text-lg font-bold text-[#C84B31]">{absentCount}</span>
        </div>
        <div className="p-3 bg-[#EFE3D3] border border-[#D8C7B4] rounded-2xl text-center">
          <span className="text-[10px] font-bold text-[#493222] uppercase block">Rate</span>
          <span className="text-lg font-bold text-[#493222]">{attendanceRate}%</span>
        </div>
      </div>

      {/* 4. Search & Fast Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FFF9F1] p-3 rounded-2xl border border-[#E6D8C7]">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or roll number..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
          />
        </div>

        {/* Quick Marking Buttons */}
        {!existingSession?.finalized && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleMarkAll('present')}
              className="px-3 py-1.5 bg-[#EAF2E9] hover:bg-[#D9EADB] text-[#668064] text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll('absent')}
              className="px-3 py-1.5 bg-[#FDE8E4] hover:bg-[#FCD3CB] text-[#C84B31] text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Mark All Absent
            </button>
          </div>
        )}
      </div>

      {/* 5. Student Roster Table */}
      <div className="bg-white border border-[#E6D8C7] rounded-3xl overflow-hidden shadow-2xs divide-y divide-[#E6D8C7]">
        {roster.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#806A56] space-y-1.5">
            <p className="font-bold text-sm text-[#38271C]">No students are assigned to this class yet.</p>
            <p className="text-[11px] text-[#806A56]">
              Once students are enrolled into {assignedClass}, they will appear here automatically.
            </p>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#806A56]">
            No enrolled students match your search filter.
          </div>
        ) : (
          filteredRoster.map((st, index) => {
            const isPresent = attendanceMap[st.rollNumber] === 'present';
            return (
              <div
                key={st.id}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F8F0E5]/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-[11px] font-bold text-[#806A56] text-center">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#38271C] truncate">{st.name}</span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-[#EFE3D3] text-[#493222] rounded">
                        {st.rollNumber}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#806A56] block truncate">
                      S/D of {st.fatherName}
                    </span>
                  </div>
                </div>

                {/* Touch-Friendly Present/Absent Toggle */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={existingSession?.finalized}
                    onClick={() => toggleStatus(st.rollNumber, 'present')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-80 ${
                      isPresent
                        ? 'bg-[#668064] text-white shadow-xs'
                        : 'bg-[#F8F0E5] text-[#806A56] hover:bg-[#EFE3D3]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Present</span>
                  </button>

                  <button
                    type="button"
                    disabled={existingSession?.finalized}
                    onClick={() => toggleStatus(st.rollNumber, 'absent')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-80 ${
                      !isPresent
                        ? 'bg-[#C84B31] text-white shadow-xs'
                        : 'bg-[#F8F0E5] text-[#806A56] hover:bg-[#EFE3D3]'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Absent</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Bottom Sticky Finalize Bar */}
      {!existingSession?.finalized && (
        <div className="sticky bottom-4 z-20 p-4 bg-[#FFF9F1]/95 backdrop-blur-md border border-[#E6D8C7] rounded-2xl shadow-xl flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-[#38271C] block">
              {presentCount} Present · {absentCount} Absent
            </span>
            <span className="text-[11px] text-[#806A56]">
              {attendanceRate}% Class Attendance Rate
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowReviewModal(true)}
            className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Review & Save</span>
          </button>
        </div>
      )}

      {/* REVIEW & CONFIRMATION MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 max-w-sm w-full shadow-2xl text-[#38271C] space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#38271C]">
              Review Daily Attendance
            </h3>
            <p className="text-xs text-[#806A56] leading-relaxed">
              You are finalizing whole-class attendance for <strong className="text-[#38271C]">{assignedClass}</strong> on{' '}
              <strong className="text-[#38271C]">{formatDisplayDate(new Date(selectedDate))}</strong>.
            </p>

            <div className="p-3.5 bg-white border border-[#E6D8C7] rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#806A56]">Total Students:</span>
                <span className="font-bold text-[#38271C]">{totalEnrolled}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#668064] font-semibold">Present:</span>
                <span className="font-bold text-[#668064]">{presentCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#C84B31] font-semibold">Explicitly Absent:</span>
                <span className="font-bold text-[#C84B31]">{explicitAbsentCount}</span>
              </div>
              {unmarkedCount > 0 && (
                <div className="flex justify-between text-amber-800">
                  <span>Unmarked (Will be Absent):</span>
                  <span className="font-bold">{unmarkedCount}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-[#E6D8C7]">
                <span className="font-bold text-[#493222]">Final Absent Count:</span>
                <span className="font-bold text-[#C84B31]">{absentCount}</span>
              </div>
            </div>

            {unmarkedCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{unmarkedCount} students have not been marked. If you continue, these students will be recorded as Absent.</span>
              </div>
            )}

            {saveError && (
              <div className="p-3 bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31] rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-2.5 bg-white border border-[#E6D8C7] text-xs font-semibold text-[#806A56] rounded-xl cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalizeAttendance}
                className="flex-1 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS & PDF REPORT DIALOG (Matching Reference Screen 09) */}
      {showSuccessModal && savedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center text-[#38271C] space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-[#EAF2E9] text-[#668064] flex items-center justify-center mx-auto shadow-xs border-2 border-[#C5DEC3]">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="font-serif text-xl font-bold text-[#38271C]">
              Attendance Saved Successfully
            </h3>

            <p className="text-xs text-[#806A56] leading-relaxed">
              Official daily attendance record for <strong className="text-[#38271C]">{savedSession.classId}</strong> on{' '}
              <strong className="text-[#38271C]">{savedSession.displayDate}</strong> has been finalized and archived.
            </p>

            {/* Quick Metrics Recap */}
            <div className="p-3 bg-white border border-[#E6D8C7] rounded-2xl grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#668064] uppercase block">Present</span>
                <span className="text-sm font-bold text-[#668064]">{savedSession.presentCount}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#C84B31] uppercase block">Absent</span>
                <span className="text-sm font-bold text-[#C84B31]">{savedSession.absentCount}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#493222] uppercase block">Rate</span>
                <span className="text-sm font-bold text-[#493222]">{savedSession.attendancePercentage}%</span>
              </div>
            </div>

            {/* Three Screen 09 Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setPreviewingPdfSession(savedSession)}
                className="w-full py-2.5 px-4 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <FileDown className="w-4 h-4" />
                <span>View PDF Report</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onGoToHistory) {
                    onGoToHistory();
                  } else {
                    onBackToDashboard();
                  }
                }}
                className="w-full py-2.5 px-4 bg-white hover:bg-[#F8F0E5] border border-[#E6D8C7] text-[#38271C] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-[#806A56]" />
                <span>Go to History</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onBackToDashboard();
                }}
                className="w-full py-2 bg-transparent text-[#806A56] hover:text-[#38271C] text-xs font-semibold cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL A4 PRINTABLE PDF PREVIEW MODAL */}
      <CRPdfModal
        isOpen={!!previewingPdfSession}
        session={previewingPdfSession}
        onClose={() => setPreviewingPdfSession(null)}
      />

      {/* CONTROLLED CORRECTION WORKFLOW MODAL */}
      {showCorrectionModal && existingSession && (
        <CRAttendanceCorrectionModal
          session={existingSession}
          roster={roster}
          crName={crUser.name}
          onClose={() => setShowCorrectionModal(false)}
          onSuccess={(revised) => {
            setExistingSession(revised);
            setSavedSession(revised);
            setShowCorrectionModal(false);
            onAttendanceFinalized(revised);
          }}
        />
      )}
    </div>
  );
};
