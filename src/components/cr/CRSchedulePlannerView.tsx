import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Eye,
  X,
  Edit3,
  BookOpen,
  ArrowLeft,
  Check,
  Info,
  ShieldCheck,
  Trash2,
  Plus,
  Copy,
  History,
  RotateCcw,
  Ban,
  CalendarDays,
} from 'lucide-react';
import {
  RecurringSchedule,
  RecurringScheduleEntry,
  ScheduleOverrideItem,
  WeekdayCode,
  WEEKDAYS_ORDER,
  WEEKDAY_FULL_NAMES,
  validateScheduleDraft,
  timeStringToMinutes,
  minutesToTimeString,
  getKarachiDateTime,
  getOccurrencesForDate,
  getWeekdayForDateString,
  extractActiveWeekdays,
} from '../../lib/scheduleEngine';
import {
  saveScheduleDraft,
  publishSchedule,
  getPublishedSchedule,
  getScheduleDraft,
  subscribeToPublishedSchedule,
  subscribeToScheduleOverrides,
  saveScheduleOverride,
  deleteScheduleOverride,
  getScheduleHistory,
  restoreScheduleVersion,
  ScheduleHistoryRecord,
} from '../../lib/scheduleService';
import { getCachedSubjects, subscribeToCurriculumSubjects } from '../../lib/subjectService';
import { SubjectConfig } from '../../data/adminData';

interface CRSchedulePlannerViewProps {
  assignedClass: string;
  crUser: { id: string; name: string; email: string; uid?: string };
  onBackToDashboard: () => void;
}

type ScheduleTab = 'editor' | 'preview' | 'exceptions' | 'history';

// Default academic period presets (Fall 2026)
const STANDARD_TIME_SLOTS = [
  { start: '09:00 AM', end: '10:25 AM', label: 'Period 1 (09:00 AM - 10:25 AM)' },
  { start: '10:35 AM', end: '12:00 PM', label: 'Period 2 (10:35 AM - 12:00 PM)' },
  { start: '12:10 PM', end: '01:35 PM', label: 'Period 3 (12:10 PM - 01:35 PM)' },
  { start: '02:00 PM', end: '03:25 PM', label: 'Period 4 (02:00 PM - 03:25 PM)' },
  { start: '03:35 PM', end: '05:00 PM', label: 'Period 5 (03:35 PM - 05:00 PM)' },
];

export const CRSchedulePlannerView: React.FC<CRSchedulePlannerViewProps> = ({
  assignedClass,
  crUser,
  onBackToDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<ScheduleTab>('editor');

  // Main schedule states
  const [publishedSchedule, setPublishedSchedule] = useState<RecurringSchedule | null>(null);
  const [workingSchedule, setWorkingSchedule] = useState<RecurringSchedule>({
    id: `draft_${assignedClass.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    classId: assignedClass,
    semester: 'Fall 2026',
    startDate: '2026-09-01',
    endDate: '2027-01-31',
    status: 'draft',
    publishedVersion: 0,
    items: [],
    activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [availableSubjects, setAvailableSubjects] = useState<SubjectConfig[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverrideItem[]>([]);
  const [historyRecords, setHistoryRecords] = useState<ScheduleHistoryRecord[]>([]);

  // Editor states
  const [selectedDay, setSelectedDay] = useState<WeekdayCode>('Mon');
  const [isEditingEntry, setIsEditingEntry] = useState<boolean>(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Entry Form fields
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formSubjectCode, setFormSubjectCode] = useState<string>('');
  const [formSubjectName, setFormSubjectName] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState<string>('09:00 AM');
  const [formEndTime, setFormEndTime] = useState<string>('10:25 AM');
  const [formTeacherName, setFormTeacherName] = useState<string>('');
  const [formRoom, setFormRoom] = useState<string>('Department Lecture Hall');
  const [formNotes, setFormNotes] = useState<string>('');

  // Exception Form fields
  const [exceptionDate, setExceptionDate] = useState<string>(() => getKarachiDateTime().dateString);
  const [exceptionModalItem, setExceptionModalItem] = useState<{
    entryId: string;
    subjectName: string;
    time: string;
    date: string;
    type: 'cancelled' | 'rescheduled';
  } | null>(null);
  const [exceptionReason, setExceptionReason] = useState<string>('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState<string>('11:00 AM');
  const [rescheduleEndTime, setRescheduleEndTime] = useState<string>('12:25 PM');
  const [rescheduleRoom, setRescheduleRoom] = useState<string>('');

  // Status & UI
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [showConfirmPublishModal, setShowConfirmPublishModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load published schedule, drafts, curriculum subjects, and overrides
  useEffect(() => {
    // 1. Initial published fetch
    getPublishedSchedule(assignedClass).then((pub) => {
      if (pub) {
        setPublishedSchedule(pub);
      }
    });

    // 2. Initial draft fetch
    getScheduleDraft(assignedClass).then((draft) => {
      if (draft && draft.items && draft.items.length > 0) {
        setWorkingSchedule(draft);
      } else {
        // If no draft exists yet, inherit from published schedule if available
        getPublishedSchedule(assignedClass).then((pub) => {
          if (pub && pub.items && pub.items.length > 0) {
            setWorkingSchedule({
              ...pub,
              status: 'draft',
            });
          }
        });
      }
    });

    // 3. Real-time published schedule listener
    const unsubPublished = subscribeToPublishedSchedule(assignedClass, (pub) => {
      setPublishedSchedule(pub);
    });

    // 4. Real-time overrides listener
    const unsubOverrides = subscribeToScheduleOverrides(assignedClass, (ovs) => {
      setOverrides(ovs);
    });

    // 5. Curriculum subjects
    setAvailableSubjects(getCachedSubjects());
    const unsubSubjects = subscribeToCurriculumSubjects((subs) => {
      setAvailableSubjects(subs);
    });

    // 6. Schedule history
    getScheduleHistory(assignedClass).then((hist) => {
      setHistoryRecords(hist);
    });

    return () => {
      unsubPublished();
      unsubOverrides();
      unsubSubjects();
    };
  }, [assignedClass]);

  // When a subject is picked in the entry form, auto-fill code, name, and teacher
  const handleSelectSubject = (subjectId: string) => {
    setFormSubjectId(subjectId);
    if (!subjectId) return;

    const matched = availableSubjects.find((s) => s.id === subjectId);
    if (matched) {
      setFormSubjectCode(matched.code);
      setFormSubjectName(matched.name);
      if (matched.assignedTeacher) {
        setFormTeacherName(matched.assignedTeacher);
      }
    }
  };

  // Reset entry form
  const resetEntryForm = () => {
    setFormSubjectId('');
    setFormSubjectCode('');
    setFormSubjectName('');
    setFormStartTime('09:00 AM');
    setFormEndTime('10:25 AM');
    setFormTeacherName('');
    setFormRoom('Department Lecture Hall');
    setFormNotes('');
    setEditingEntryId(null);
    setIsEditingEntry(false);
  };

  // Open entry form for a new entry
  const handleOpenAddEntry = () => {
    resetEntryForm();
    setIsEditingEntry(true);
  };

  // Open entry form to edit existing entry
  const handleOpenEditEntry = (entry: RecurringScheduleEntry) => {
    setEditingEntryId(entry.id);
    setSelectedDay(entry.day);
    setFormSubjectId(entry.subjectId);
    setFormSubjectCode(entry.subjectCode || '');
    setFormSubjectName(entry.subjectName);
    setFormStartTime(entry.startTime);
    setFormEndTime(entry.endTime);
    setFormTeacherName(entry.teacherName || '');
    setFormRoom(entry.room || 'Department Lecture Hall');
    setFormNotes(entry.notes || '');
    setIsEditingEntry(true);
  };

  // Save an entry to the working schedule
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formSubjectName.trim() && !formSubjectCode.trim()) {
      showToast('Please specify a subject name or course code.', 'error');
      return;
    }

    const startM = timeStringToMinutes(formStartTime);
    const endM = timeStringToMinutes(formEndTime);

    if (endM <= startM) {
      showToast('End time must be after start time.', 'error');
      return;
    }

    const newEntry: RecurringScheduleEntry = {
      id: editingEntryId || `entry_${selectedDay.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      day: selectedDay,
      startTime: formStartTime,
      endTime: formEndTime,
      subjectId: formSubjectId || `subj_${formSubjectCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      subjectCode: formSubjectCode || formSubjectName.split(' ')[0] || 'CLASS',
      subjectName: formSubjectName || formSubjectCode,
      teacherName: formTeacherName.trim() || undefined,
      room: formRoom.trim() || 'Department Lecture Hall',
      notes: formNotes.trim() || undefined,
    };

    let updatedItems: RecurringScheduleEntry[];
    if (editingEntryId) {
      updatedItems = workingSchedule.items.map((item) => (item.id === editingEntryId ? newEntry : item));
    } else {
      updatedItems = [...workingSchedule.items, newEntry];
    }

    // Sort items by day order and start time
    updatedItems.sort((a, b) => {
      const dayDiff = WEEKDAYS_ORDER.indexOf(a.day) - WEEKDAYS_ORDER.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime);
    });

    const nextSchedule: RecurringSchedule = {
      ...workingSchedule,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    setWorkingSchedule(nextSchedule);
    resetEntryForm();

    // Auto-save draft to Firestore
    setIsSavingDraft(true);
    await saveScheduleDraft(nextSchedule);
    setIsSavingDraft(false);
    showToast(editingEntryId ? 'Class updated in draft.' : 'Class added to weekly schedule.');
  };

  // Delete an entry
  const handleDeleteEntry = async (entryId: string) => {
    const updatedItems = workingSchedule.items.filter((item) => item.id !== entryId);
    const nextSchedule: RecurringSchedule = {
      ...workingSchedule,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    setWorkingSchedule(nextSchedule);
    await saveScheduleDraft(nextSchedule);
    showToast('Class entry removed from draft.');
  };

  // Copy entire day's schedule to another day
  const handleCopyDay = async (targetDay: WeekdayCode) => {
    if (targetDay === selectedDay) return;

    const sourceEntries = workingSchedule.items.filter((i) => i.day === selectedDay);
    if (sourceEntries.length === 0) {
      showToast(`No classes exist on ${WEEKDAY_FULL_NAMES[selectedDay]} to copy.`, 'error');
      return;
    }

    // Clone source entries for targetDay
    const newTargetEntries: RecurringScheduleEntry[] = sourceEntries.map((src, idx) => ({
      ...src,
      id: `entry_${targetDay.toLowerCase()}_${Date.now()}_${idx}`,
      day: targetDay,
    }));

    // Retain entries from other days, replace targetDay entries
    const otherEntries = workingSchedule.items.filter((i) => i.day !== targetDay);
    const combined = [...otherEntries, ...newTargetEntries];

    const nextSchedule: RecurringSchedule = {
      ...workingSchedule,
      items: combined,
      updatedAt: new Date().toISOString(),
    };

    setWorkingSchedule(nextSchedule);
    await saveScheduleDraft(nextSchedule);
    setSelectedDay(targetDay);
    showToast(`Copied ${sourceEntries.length} classes to ${WEEKDAY_FULL_NAMES[targetDay]}.`);
  };

  // Publish Schedule Atomically
  const handleConfirmPublish = async () => {
    const validation = validateScheduleDraft(workingSchedule);
    if (!validation.isValid) {
      showToast(validation.errors[0] || 'Please fix schedule validation errors.', 'error');
      setShowConfirmPublishModal(false);
      return;
    }

    setIsPublishing(true);
    try {
      const res = await publishSchedule(workingSchedule, {
        uid: crUser.uid || crUser.id,
        email: crUser.email,
        name: crUser.name,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to publish schedule.');
      }

      setShowConfirmPublishModal(false);
      showToast(`Weekly Schedule v${res.version || 1} published successfully! Live for all students.`);

      // Refresh history records
      getScheduleHistory(assignedClass).then((hist) => setHistoryRecords(hist));
      setActiveTab('preview');
    } catch (err: any) {
      showToast(err?.message || 'Publishing failed.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // Submit date-specific exception (Cancel or Reschedule)
  const handleSaveException = async () => {
    if (!exceptionModalItem) return;

    const overrideItem: ScheduleOverrideItem = {
      id: `${assignedClass.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${exceptionModalItem.date}_${exceptionModalItem.entryId}`,
      classId: assignedClass,
      date: exceptionModalItem.date,
      entryId: exceptionModalItem.entryId,
      type: exceptionModalItem.type,
      reason: exceptionReason.trim() || undefined,
      rescheduledStartTime: exceptionModalItem.type === 'rescheduled' ? rescheduleStartTime : undefined,
      rescheduledEndTime: exceptionModalItem.type === 'rescheduled' ? rescheduleEndTime : undefined,
      rescheduledRoom: exceptionModalItem.type === 'rescheduled' && rescheduleRoom ? rescheduleRoom : undefined,
      createdAt: new Date().toISOString(),
      createdBy: {
        uid: crUser.uid || crUser.id,
        email: crUser.email,
        name: crUser.name,
      },
    };

    const res = await saveScheduleOverride(overrideItem);
    if (res.success) {
      showToast(
        exceptionModalItem.type === 'cancelled'
          ? `Class cancelled for ${exceptionModalItem.date} only.`
          : `Class rescheduled for ${exceptionModalItem.date} only.`
      );
      setExceptionModalItem(null);
      setExceptionReason('');
    } else {
      showToast(res.error || 'Failed to save exception.', 'error');
    }
  };

  // Delete an exception
  const handleDeleteException = async (overrideId: string) => {
    const res = await deleteScheduleOverride(overrideId, crUser.email);
    if (res.success) {
      showToast('Exception removed. Default recurring schedule restored for this date.');
    } else {
      showToast(res.error || 'Failed to delete exception.', 'error');
    }
  };

  // Restore history version
  const handleRestoreVersion = async (record: ScheduleHistoryRecord) => {
    if (!window.confirm(`Are you sure you want to restore and republish Schedule Version ${record.version}?`)) {
      return;
    }

    const res = await restoreScheduleVersion(assignedClass, record, {
      uid: crUser.uid || crUser.id,
      email: crUser.email,
      name: crUser.name,
    });

    if (res.success) {
      showToast(`Schedule Version ${record.version} restored and published!`);
      getScheduleHistory(assignedClass).then((hist) => setHistoryRecords(hist));
      setActiveTab('preview');
    } else {
      showToast(res.error || 'Failed to restore version.', 'error');
    }
  };

  // Validation report for preview tab
  const validationReport = validateScheduleDraft(workingSchedule);
  const dayClasses = workingSchedule.items.filter((item) => item.day === selectedDay);

  // Occurrences for currently picked exception date
  const exceptionDateOccurrences = publishedSchedule
    ? getOccurrencesForDate(publishedSchedule, exceptionDate, overrides)
    : [];

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#493222] text-[#FFF9F1] px-4 py-2.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#668064]" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#C84B31]" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="p-2 rounded-xl bg-[#FFF9F1] hover:bg-[#EFE3D3] border border-[#E6D8C7] text-[#493222] cursor-pointer transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#38271C]">
              Weekly Class Schedule
            </h2>
            <p className="text-xs font-medium text-[#806A56]">
              Section {assignedClass} · Fixed recurring weekly timetable
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          {publishedSchedule ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-[#EAF2E9] border border-[#C5DEC3] text-[#557353] rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#557353]" />
              v{publishedSchedule.publishedVersion} Live
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Draft Only
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center p-1 bg-[#EFE3D3] rounded-2xl border border-[#E6D8C7] overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className={`flex-1 min-w-[110px] py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'editor'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Timetable</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex-1 min-w-[110px] py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'preview'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview & Publish</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exceptions')}
          className={`flex-1 min-w-[110px] py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'exceptions'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Exceptions ({overrides.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[110px] py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>History ({historyRecords.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TIMETABLE EDITOR                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'editor' && (
        <div className="space-y-4">
          {/* Validity Period Card */}
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold text-sm text-[#38271C] flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#806A56]" />
                  <span>Schedule Validity Period</span>
                </h3>
                <p className="text-[11px] text-[#806A56] mt-0.5">
                  The weekly schedule automatically repeats for every week between these dates.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...workingSchedule, startDate: '2026-09-01', endDate: '2027-01-31' };
                    setWorkingSchedule(next);
                    saveScheduleDraft(next);
                    showToast('Validity set: Full Fall 2026 Semester.');
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-[#F6EFE6] border border-[#E6D8C7] rounded-lg text-[10px] font-semibold text-[#493222] cursor-pointer"
                >
                  Full Semester (5 Mos)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...workingSchedule, startDate: '2026-10-01', endDate: '2026-12-31' };
                    setWorkingSchedule(next);
                    saveScheduleDraft(next);
                    showToast('Validity set: Mid-Semester Term.');
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-[#F6EFE6] border border-[#E6D8C7] rounded-lg text-[10px] font-semibold text-[#493222] cursor-pointer"
                >
                  Midterm Term (3 Mos)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-[#493222] mb-1">
                  Effective Start Date
                </label>
                <input
                  type="date"
                  value={workingSchedule.startDate}
                  onChange={(e) => {
                    const next = { ...workingSchedule, startDate: e.target.value };
                    setWorkingSchedule(next);
                    saveScheduleDraft(next);
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] focus:ring-2 focus:ring-[#493222] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#493222] mb-1">
                  Validity End Date
                </label>
                <input
                  type="date"
                  value={workingSchedule.endDate}
                  onChange={(e) => {
                    const next = { ...workingSchedule, endDate: e.target.value };
                    setWorkingSchedule(next);
                    saveScheduleDraft(next);
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] focus:ring-2 focus:ring-[#493222] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Weekday Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {WEEKDAYS_ORDER.map((day) => {
              const count = workingSchedule.items.filter((i) => i.day === day).length;
              const isSelected = selectedDay === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setSelectedDay(day);
                    setIsEditingEntry(false);
                  }}
                  className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
                      : 'bg-[#FFF9F1] hover:bg-white text-[#806A56] border border-[#E6D8C7]'
                  }`}
                >
                  <span>{day}</span>
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isSelected ? 'bg-white/20 text-[#FFF9F1]' : 'bg-[#EFE3D3] text-[#493222]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Day Section Header & Action */}
          <div className="flex items-center justify-between bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl px-4 py-3">
            <div>
              <h3 className="font-bold text-sm text-[#38271C]">
                {WEEKDAY_FULL_NAMES[selectedDay]} Classes
              </h3>
              <p className="text-[11px] text-[#806A56]">
                {dayClasses.length === 0
                  ? 'No classes scheduled on this day.'
                  : `${dayClasses.length} class${dayClasses.length === 1 ? '' : 'es'} configured.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Copy Day Tool */}
              {dayClasses.length > 0 && (
                <div className="relative group">
                  <button
                    type="button"
                    className="p-2 bg-white hover:bg-[#F6EFE6] border border-[#E6D8C7] rounded-xl text-[#806A56] hover:text-[#38271C] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Copy this day's classes to another day"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy Day</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-30 bg-white border border-[#E6D8C7] rounded-xl p-1 shadow-lg min-w-[140px]">
                    <span className="block px-2 py-1 text-[10px] font-bold text-[#806A56] uppercase tracking-wider">
                      Copy to...
                    </span>
                    {WEEKDAYS_ORDER.filter((d) => d !== selectedDay).map((targetDay) => (
                      <button
                        key={targetDay}
                        type="button"
                        onClick={() => handleCopyDay(targetDay)}
                        className="w-full text-left px-2 py-1 text-xs text-[#38271C] hover:bg-[#FAF4ED] rounded-lg cursor-pointer"
                      >
                        {WEEKDAY_FULL_NAMES[targetDay]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Class Button */}
              <button
                type="button"
                onClick={handleOpenAddEntry}
                className="py-1.5 px-3 bg-[#493222] hover:bg-[#341F12] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Class</span>
              </button>
            </div>
          </div>

          {/* Class Entry Form (Inline when active) */}
          {isEditingEntry && (
            <div className="bg-white border-2 border-[#493222]/30 rounded-2xl p-4 sm:p-5 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6D8C7] mb-3">
                <h4 className="font-bold text-sm text-[#38271C]">
                  {editingEntryId ? 'Edit Class Details' : `New Class on ${WEEKDAY_FULL_NAMES[selectedDay]}`}
                </h4>
                <button
                  type="button"
                  onClick={resetEntryForm}
                  className="p-1 text-[#806A56] hover:text-[#38271C] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEntry} className="space-y-3">
                {/* Curriculum Subject Picker */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#493222] mb-1">
                    Select Registered Curriculum Subject (or enter custom below)
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => handleSelectSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] focus:ring-2 focus:ring-[#493222] outline-none"
                  >
                    <option value="">— Choose a curriculum subject or type custom —</option>
                    {availableSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code}: {sub.name} {sub.assignedTeacher ? `(${sub.assignedTeacher})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Code & Name */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#493222] mb-1">
                      Course Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CS101"
                      value={formSubjectCode}
                      onChange={(e) => setFormSubjectCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] focus:ring-2 focus:ring-[#493222] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[#493222] mb-1">
                      Subject Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Programming Fundamentals Theory"
                      value={formSubjectName}
                      onChange={(e) => setFormSubjectName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] focus:ring-2 focus:ring-[#493222] outline-none"
                    />
                  </div>
                </div>

                {/* Times & Quick Slot Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-[#493222]">
                      Class Start & End Time <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-[#806A56]">Presets:</span>
                  </div>

                  {/* Standard Period Quick Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {STANDARD_TIME_SLOTS.map((slot) => (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => {
                          setFormStartTime(slot.start);
                          setFormEndTime(slot.end);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border cursor-pointer ${
                          formStartTime === slot.start && formEndTime === slot.end
                            ? 'bg-[#493222] text-white border-[#493222]'
                            : 'bg-white hover:bg-[#F6EFE6] text-[#806A56] border-[#E6D8C7]'
                        }`}
                      >
                        {slot.start} - {slot.end}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="09:00 AM"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] focus:ring-2 focus:ring-[#493222] outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="10:25 AM"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] focus:ring-2 focus:ring-[#493222] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Teacher & Room */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#493222] mb-1">
                      Assigned Teacher / Instructor
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Engr. Salman Khan"
                      value={formTeacherName}
                      onChange={(e) => setFormTeacherName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] focus:ring-2 focus:ring-[#493222] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#493222] mb-1">
                      Room / Lecture Hall
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Room 204 or Lab 1"
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] focus:ring-2 focus:ring-[#493222] outline-none"
                    />
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6D8C7]">
                  <button
                    type="button"
                    onClick={resetEntryForm}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#806A56] hover:text-[#38271C] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#493222] hover:bg-[#341F12] text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                  >
                    {editingEntryId ? 'Update Class' : 'Save to Schedule'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Scheduled Classes for Selected Day */}
          {dayClasses.length === 0 ? (
            <div className="bg-[#FFF9F1] border border-dashed border-[#D8C7B4] rounded-2xl p-8 text-center">
              <Calendar className="w-8 h-8 text-[#B09882] mx-auto mb-2 opacity-60" />
              <h4 className="font-bold text-sm text-[#38271C]">
                No Classes on {WEEKDAY_FULL_NAMES[selectedDay]}
              </h4>
              <p className="text-xs text-[#806A56] max-w-sm mx-auto mt-1">
                If the coordinator's WhatsApp timetable leaves {WEEKDAY_FULL_NAMES[selectedDay]} empty, leave it empty.
                Classes will only repeat on days you add.
              </p>
              <button
                type="button"
                onClick={handleOpenAddEntry}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#493222] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Class to {selectedDay}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dayClasses.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F6EDE4] text-[#493222] font-black text-xs flex flex-col items-center justify-center shrink-0 border border-[#E6D8C7]/60">
                      <span>P{idx + 1}</span>
                      <span className="text-[9px] font-semibold text-[#806A56]">{item.day}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#668064]">
                          {item.subjectCode}
                        </span>
                        <span className="text-xs text-[#806A56]">·</span>
                        <h4 className="font-bold text-sm text-[#38271C]">
                          {item.subjectName}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#806A56] mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 opacity-80" />
                          <span className="font-semibold text-[#38271C]">
                            {item.startTime} – {item.endTime}
                          </span>
                        </span>
                        <span>·</span>
                        <span>{item.room || 'Department Lecture Hall'}</span>
                        {item.teacherName && (
                          <>
                            <span>·</span>
                            <span className="text-[#493222] font-medium">{item.teacherName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Entry Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleOpenEditEntry(item)}
                      className="p-1.5 rounded-lg hover:bg-[#F6EFE6] text-[#806A56] hover:text-[#38271C] transition-colors cursor-pointer"
                      title="Edit class"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                      title="Remove class"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Jump to Preview Banner */}
          <div className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-[#806A56]" />
              <span className="text-xs font-semibold text-[#38271C]">
                Total configured: {workingSchedule.items.length} classes across {workingSchedule.items.length > 0 ? extractActiveWeekdays(workingSchedule.items).length : 0} days
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className="px-3 py-1.5 bg-[#493222] text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Review & Publish →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PREVIEW & PUBLISH                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          {/* Validity & Summary Card */}
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-[#38271C] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#557353]" />
                  <span>Official Weekly Timetable Summary ({assignedClass})</span>
                </h3>
                <p className="text-xs text-[#806A56] mt-0.5">
                  Valid from <span className="font-bold text-[#38271C]">{workingSchedule.startDate}</span> to{' '}
                  <span className="font-bold text-[#38271C]">{workingSchedule.endDate}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmPublishModal(true)}
                disabled={!validationReport.isValid || isPublishing}
                className="py-2.5 px-5 bg-[#493222] hover:bg-[#341F12] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Publish Schedule for Students</span>
              </button>
            </div>

            {/* Validation Alerts */}
            {validationReport.errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Please resolve the following conflicts before publishing:
                </span>
                {validationReport.errors.map((err, i) => (
                  <li key={i} className="ml-4 list-disc">{err}</li>
                ))}
              </div>
            )}

            {validationReport.warnings.length > 0 && validationReport.errors.length === 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <Info className="w-4 h-4 shrink-0" />
                  Notes:
                </span>
                {validationReport.warnings.map((w, i) => (
                  <li key={i} className="ml-4 list-disc">{w}</li>
                ))}
              </div>
            )}
          </div>

          {/* Full Weekly Grid Preview */}
          <div className="space-y-3">
            {WEEKDAYS_ORDER.map((day) => {
              const classesOnDay = workingSchedule.items.filter((i) => i.day === day);
              if (classesOnDay.length === 0) return null;

              return (
                <div key={day} className="bg-white border border-[#E6D8C7] rounded-2xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-[#FAF4ED] border-b border-[#E6D8C7] flex items-center justify-between">
                    <span className="font-bold text-xs text-[#38271C] tracking-wide uppercase">
                      {WEEKDAY_FULL_NAMES[day]}
                    </span>
                    <span className="text-[11px] font-semibold text-[#806A56]">
                      {classesOnDay.length} class{classesOnDay.length === 1 ? '' : 'es'}
                    </span>
                  </div>

                  <div className="divide-y divide-[#E6D8C7]/50">
                    {classesOnDay.map((c, idx) => (
                      <div key={c.id} className="p-3 sm:px-4 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-[#F6EDE4] text-[#493222] font-black text-[10px] flex items-center justify-center shrink-0">
                            P{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-[#38271C]">{c.subjectName}</span>
                            <div className="flex items-center gap-2 text-[11px] text-[#806A56] mt-0.5">
                              <span>{c.subjectCode}</span>
                              <span>·</span>
                              <span>{c.room || 'Hall'}</span>
                              {c.teacherName && (
                                <>
                                  <span>·</span>
                                  <span>{c.teacherName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-[#493222]">
                            {c.startTime} – {c.endTime}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {workingSchedule.items.length === 0 && (
              <div className="p-8 text-center bg-white border border-dashed border-[#E6D8C7] rounded-2xl">
                <p className="text-xs text-[#806A56]">No classes have been added to this schedule yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className="mt-2 px-3 py-1.5 bg-[#493222] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Open Timetable Editor
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXCEPTIONS (Date-Specific Cancellations & Reschedules)             */}
      {/* ========================================================================= */}
      {activeTab === 'exceptions' && (
        <div className="space-y-4">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs">
            <h3 className="font-bold text-sm text-[#38271C] flex items-center gap-2">
              <Ban className="w-4 h-4 text-[#806A56]" />
              <span>Date-Specific Overrides & Cancellations</span>
            </h3>
            <p className="text-xs text-[#806A56] mt-0.5">
              Cancel or reschedule a class for a single calendar date without altering future recurring weeks.
            </p>

            {/* Date Picker */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-xs font-semibold text-[#493222]">
                Select Occurrence Date:
              </label>
              <input
                type="date"
                value={exceptionDate}
                onChange={(e) => setExceptionDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] outline-none"
              />
              <span className="text-xs text-[#806A56]">
                ({WEEKDAY_FULL_NAMES[getWeekdayForDateString(exceptionDate)]})
              </span>
            </div>
          </div>

          {/* Classes Scheduled on Picked Date */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs text-[#493222] uppercase tracking-wider">
              Classes on {exceptionDate} ({WEEKDAY_FULL_NAMES[getWeekdayForDateString(exceptionDate)]}):
            </h4>

            {exceptionDateOccurrences.length === 0 ? (
              <div className="p-6 text-center bg-white border border-[#E6D8C7] rounded-2xl text-xs text-[#806A56]">
                No classes are recurring on this date in the published schedule.
              </div>
            ) : (
              exceptionDateOccurrences.map((occ) => (
                <div
                  key={occ.occurrenceId}
                  className={`border rounded-2xl p-4 shadow-2xs transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    occ.isCancelled
                      ? 'bg-red-50/60 border-red-200'
                      : occ.isRescheduled
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-white border-[#E6D8C7]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-sm text-[#38271C]">
                        {occ.subjectName}
                      </h5>
                      {occ.isCancelled && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                          Cancelled
                        </span>
                      )}
                      {occ.isRescheduled && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Rescheduled
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#806A56] mt-1">
                      <span>
                        Time: <strong className="text-[#38271C]">{occ.startTime} – {occ.endTime}</strong>
                      </span>
                      {occ.isRescheduled && (
                        <span className="text-[11px] text-[#806A56] line-through">
                          Original: {occ.originalStartTime} – {occ.originalEndTime}
                        </span>
                      )}
                      <span>·</span>
                      <span>Room: {occ.room}</span>
                      {occ.teacherName && (
                        <>
                          <span>·</span>
                          <span>{occ.teacherName}</span>
                        </>
                      )}
                    </div>

                    {(occ.cancelReason || occ.rescheduleReason) && (
                      <p className="text-[11px] font-medium text-[#806A56] mt-1 italic">
                        Reason: {occ.cancelReason || occ.rescheduleReason}
                      </p>
                    )}
                  </div>

                  {/* Override Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {occ.isCancelled || occ.isRescheduled ? (
                      <button
                        type="button"
                        onClick={() => {
                          const ov = overrides.find(
                            (o) => o.date === occ.date && o.entryId === occ.entryId
                          );
                          if (ov) handleDeleteException(ov.id);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#E6D8C7] text-xs font-semibold text-[#38271C] rounded-xl cursor-pointer"
                      >
                        Restore Default Class
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setExceptionModalItem({
                              entryId: occ.entryId,
                              subjectName: occ.subjectName,
                              time: `${occ.startTime} - ${occ.endTime}`,
                              date: occ.date,
                              type: 'cancelled',
                            });
                            setExceptionReason('');
                          }}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold text-red-700 rounded-xl cursor-pointer"
                        >
                          Cancel for this Date
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExceptionModalItem({
                              entryId: occ.entryId,
                              subjectName: occ.subjectName,
                              time: `${occ.startTime} - ${occ.endTime}`,
                              date: occ.date,
                              type: 'rescheduled',
                            });
                            setRescheduleStartTime(occ.startTime);
                            setRescheduleEndTime(occ.endTime);
                            setRescheduleRoom(occ.room || '');
                            setExceptionReason('');
                          }}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-800 rounded-xl cursor-pointer"
                        >
                          Reschedule for this Date
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Active Overrides Table */}
          {overrides.length > 0 && (
            <div className="mt-4 bg-white border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs">
              <h4 className="font-bold text-xs text-[#38271C] uppercase tracking-wider mb-2">
                All Active Recorded Exceptions ({overrides.length}):
              </h4>
              <div className="space-y-2">
                {overrides.map((ov) => (
                  <div key={ov.id} className="p-2.5 bg-[#FAF4ED] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#38271C]">{ov.date}</span>: {ov.type.toUpperCase()}{' '}
                      {ov.reason && `— "${ov.reason}"`}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteException(ov.id)}
                      className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                    >
                      Remove Override
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SCHEDULE HISTORY & REVERT                                         */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs">
            <h3 className="font-bold text-sm text-[#38271C] flex items-center gap-2">
              <History className="w-4 h-4 text-[#806A56]" />
              <span>Published Version History & Rollback</span>
            </h3>
            <p className="text-xs text-[#806A56] mt-0.5">
              View previous timetable revisions and restore any earlier published version with full auditability.
            </p>
          </div>

          {historyRecords.length === 0 ? (
            <div className="p-8 text-center bg-white border border-[#E6D8C7] rounded-2xl text-xs text-[#806A56]">
              No previous versions archived yet. When you publish a timetable, an archived snapshot is preserved here.
            </div>
          ) : (
            <div className="space-y-3">
              {historyRecords.map((record) => (
                <div
                  key={record.id}
                  className="bg-white border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] font-bold text-xs rounded-full">
                        Version {record.version}
                      </span>
                      <span className="text-xs text-[#806A56]">
                        Published on {new Date(record.publishedAt).toLocaleDateString()} at{' '}
                        {new Date(record.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-[#38271C] font-semibold mt-1.5">
                      {record.totalClasses} classes across {record.activeDays.length} days ({record.activeDays.join(', ')})
                    </p>
                    <p className="text-[11px] text-[#806A56]">
                      Valid: {record.startDate} to {record.endDate} · By {record.publishedBy.name} ({record.publishedBy.email})
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestoreVersion(record)}
                    className="self-end sm:self-center px-3.5 py-1.5 bg-white hover:bg-[#FAF4ED] border border-[#E6D8C7] text-xs font-bold text-[#493222] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore & Publish</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM PUBLISH SCHEDULE                                          */}
      {/* ========================================================================= */}
      {showConfirmPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-[#38271C] flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-[#557353]" />
              <span>Confirm Weekly Timetable Publication</span>
            </h3>

            <p className="text-xs text-[#806A56] leading-relaxed mb-4">
              You are about to publish the official recurring weekly timetable for <strong className="text-[#38271C]">{assignedClass}</strong>.
              All enrolled students will receive this update in real time.
            </p>

            <div className="bg-white border border-[#E6D8C7] rounded-xl p-3 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-[#806A56]">Total Classes:</span>
                <span className="font-bold text-[#38271C]">{workingSchedule.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806A56]">Active Days:</span>
                <span className="font-bold text-[#38271C]">
                  {extractActiveWeekdays(workingSchedule.items).join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806A56]">Validity Period:</span>
                <span className="font-bold text-[#38271C]">
                  {workingSchedule.startDate} to {workingSchedule.endDate}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmPublishModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#806A56] hover:text-[#38271C] cursor-pointer"
              >
                Back to Review
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={isPublishing}
                className="px-5 py-2 bg-[#493222] hover:bg-[#341F12] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-1.5"
              >
                {isPublishing ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SUBMIT DATE EXCEPTION (CANCEL OR RESCHEDULE)                       */}
      {/* ========================================================================= */}
      {exceptionModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-sm text-[#38271C] mb-2">
              {exceptionModalItem.type === 'cancelled'
                ? 'Cancel Class for this Date Only'
                : 'Reschedule Class for this Date Only'}
            </h3>

            <p className="text-xs text-[#806A56] mb-3">
              <strong className="text-[#38271C]">{exceptionModalItem.subjectName}</strong> on{' '}
              <strong className="text-[#38271C]">{exceptionModalItem.date}</strong> ({exceptionModalItem.time})
            </p>

            {exceptionModalItem.type === 'rescheduled' && (
              <div className="space-y-2 mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#493222] mb-0.5">
                      New Start Time
                    </label>
                    <input
                      type="text"
                      value={rescheduleStartTime}
                      onChange={(e) => setRescheduleStartTime(e.target.value)}
                      placeholder="11:00 AM"
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E6D8C7] rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#493222] mb-0.5">
                      New End Time
                    </label>
                    <input
                      type="text"
                      value={rescheduleEndTime}
                      onChange={(e) => setRescheduleEndTime(e.target.value)}
                      placeholder="12:25 PM"
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E6D8C7] rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#493222] mb-0.5">
                    New Room (Optional)
                  </label>
                  <input
                    type="text"
                    value={rescheduleRoom}
                    onChange={(e) => setRescheduleRoom(e.target.value)}
                    placeholder="e.g. Lab 3"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E6D8C7] rounded-lg text-xs outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-[#493222] mb-1">
                Reason (Displayed to students)
              </label>
              <textarea
                rows={2}
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="e.g. Faculty instructor attending departmental seminar"
                className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setExceptionModalItem(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#806A56] hover:text-[#38271C] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveException}
                className="px-4 py-1.5 bg-[#493222] hover:bg-[#341F12] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Confirm Exception
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
