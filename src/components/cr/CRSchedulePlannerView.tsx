import React, { useState, useEffect, useMemo } from 'react';
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
  ShieldCheck,
  Trash2,
  Plus,
  Copy,
  History,
  RotateCcw,
  Ban,
  CalendarDays,
  Search,
  Sparkles,
  Layers,
  UserCheck,
  UserX,
  CalendarRange,
  ChevronRight,
  RefreshCw,
  AlertCircle,
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
  formatMinutesTo12Hour,
  getKarachiDateTime,
  getOccurrencesForDate,
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
import {
  getCachedSubjects,
  subscribeToCurriculumSubjects,
  getAllSubjectsFromFirestore,
  subscribeToSubjectTeacherAssignment,
} from '../../lib/subjectService';
import { SubjectConfig } from '../../data/adminData';
import { WheelTimePicker } from '../common/WheelTimePicker';

interface CRSchedulePlannerViewProps {
  assignedClass: string;
  crUser: { id: string; name: string; email: string; uid?: string };
  onBackToDashboard: () => void;
}

type MainViewMode = 'planner' | 'exceptions' | 'validity' | 'history';

export const CRSchedulePlannerView: React.FC<CRSchedulePlannerViewProps> = ({
  assignedClass,
  crUser,
  onBackToDashboard,
}) => {
  const [viewMode, setViewMode] = useState<MainViewMode>('planner');

  // Main Schedule States
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
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<ScheduleOverrideItem[]>([]);
  const [historyRecords, setHistoryRecords] = useState<ScheduleHistoryRecord[]>([]);

  // Planner Weekday Selection
  const [selectedDay, setSelectedDay] = useState<WeekdayCode>('Mon');

  // Class Entry Form States
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState<string>('09:00 AM');
  const [formEndTime, setFormEndTime] = useState<string>('10:25 AM');
  const [formRoom, setFormRoom] = useState<string>('Room 204');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formValidationError, setFormValidationError] = useState<string | null>(null);

  // Authoritative resolved teacher for currently selected subject
  const [resolvedTeacher, setResolvedTeacher] = useState<{
    name: string;
    email?: string;
    uid?: string;
    status: 'active' | 'unassigned' | 'loading';
  }>({ name: '', status: 'unassigned' });

  // Validity Date Form States
  const [validitySemester, setValiditySemester] = useState<string>('Fall 2026');
  const [validityStartDate, setValidityStartDate] = useState<string>('2026-09-01');
  const [validityEndDate, setValidityEndDate] = useState<string>('2027-01-31');

  // Exception Form States
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

  // UI & Feedback States
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [showConfirmPublishModal, setShowConfirmPublishModal] = useState<boolean>(false);
  const [entryToDelete, setEntryToDelete] = useState<RecurringScheduleEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Initial Load and Real-time Listeners
  useEffect(() => {
    // A. Initial published schedule
    getPublishedSchedule(assignedClass).then((pub) => {
      if (pub) {
        setPublishedSchedule(pub);
      }
    });

    // B. Initial draft schedule
    getScheduleDraft(assignedClass).then((draft) => {
      if (draft && draft.items && draft.items.length > 0) {
        setWorkingSchedule(draft);
        if (draft.semester) setValiditySemester(draft.semester);
        if (draft.startDate) setValidityStartDate(draft.startDate);
        if (draft.endDate) setValidityEndDate(draft.endDate);
      } else {
        // If no draft exists yet, inherit published schedule
        getPublishedSchedule(assignedClass).then((pub) => {
          if (pub && pub.items && pub.items.length > 0) {
            setWorkingSchedule({
              ...pub,
              status: 'draft',
            });
            if (pub.semester) setValiditySemester(pub.semester);
            if (pub.startDate) setValidityStartDate(pub.startDate);
            if (pub.endDate) setValidityEndDate(pub.endDate);
          }
        });
      }
    });

    // C. Real-time published schedule listener
    const unsubPublished = subscribeToPublishedSchedule(assignedClass, (pub) => {
      setPublishedSchedule(pub);
    });

    // D. Real-time overrides listener
    const unsubOverrides = subscribeToScheduleOverrides(assignedClass, (ovs) => {
      setOverrides(ovs);
    });

    // E. Real-time curriculum subjects
    setIsLoadingSubjects(true);
    setSubjectsError(null);
    const cached = getCachedSubjects();
    if (cached.length > 0) {
      setAvailableSubjects(cached);
      setIsLoadingSubjects(false);
    }

    getAllSubjectsFromFirestore()
      .then((subs) => {
        setAvailableSubjects(subs);
        setIsLoadingSubjects(false);
      })
      .catch((err) => {
        console.info('[CR Schedule Planner] Error fetching subjects:', err);
        setSubjectsError('Failed to load registered subjects from database.');
        setIsLoadingSubjects(false);
      });

    const unsubSubjects = subscribeToCurriculumSubjects((subs) => {
      setAvailableSubjects(subs);
      setIsLoadingSubjects(false);
    });

    // F. Schedule version history
    getScheduleHistory(assignedClass).then((hist) => {
      setHistoryRecords(hist);
    });

    return () => {
      unsubPublished();
      unsubOverrides();
      unsubSubjects();
    };
  }, [assignedClass]);

  // 2. Filter subjects relevant to CR's authorized section
  const authorizedSubjects = useMemo(() => {
    const cleanTargetClass = assignedClass.trim().toLowerCase().replace(/\s+/g, '');
    const scoped = availableSubjects.filter((subj) => {
      if (!subj.isActive) return false;
      if (!subj.assignedClass) return true; // Universal course
      const cleanSubjClass = subj.assignedClass.trim().toLowerCase().replace(/\s+/g, '');
      return (
        cleanSubjClass === cleanTargetClass ||
        cleanSubjClass === 'all' ||
        cleanSubjClass === 'general'
      );
    });

    // If section-specific filter returns empty, fallback to all active subjects so CR is not blocked
    return scoped.length > 0 ? scoped : availableSubjects.filter((s) => s.isActive);
  }, [availableSubjects, assignedClass]);

  // 3. Search-filtered subjects in dropdown
  const filteredDropdownSubjects = useMemo(() => {
    if (!subjectSearchQuery.trim()) return authorizedSubjects;
    const q = subjectSearchQuery.toLowerCase();
    return authorizedSubjects.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.assignedTeacher && s.assignedTeacher.toLowerCase().includes(q))
    );
  }, [authorizedSubjects, subjectSearchQuery]);

  // 4. Resolve Active Teacher whenever formSubjectId changes
  useEffect(() => {
    if (!formSubjectId) {
      setResolvedTeacher({ name: '', status: 'unassigned' });
      return;
    }

    const matchedSubject = availableSubjects.find((s) => s.id === formSubjectId);
    if (!matchedSubject) {
      setResolvedTeacher({ name: '', status: 'unassigned' });
      return;
    }

    // A. Check immediate properties on subject document
    if (matchedSubject.assignedTeacher && matchedSubject.status !== 'Unassigned') {
      setResolvedTeacher({
        name: matchedSubject.assignedTeacher,
        email: matchedSubject.teacherEmail || undefined,
        uid: matchedSubject.teacherUid || undefined,
        status: 'active',
      });
    } else {
      setResolvedTeacher({
        name: '',
        status: 'unassigned',
      });
    }

    // B. Real-time validation against subjectTeacherAssignments
    const unsubAssignment = subscribeToSubjectTeacherAssignment(formSubjectId, (activeAssignment) => {
      if (activeAssignment && activeAssignment.status === 'active') {
        setResolvedTeacher({
          name: activeAssignment.teacherName,
          email: activeAssignment.teacherEmail,
          uid: activeAssignment.teacherUid,
          status: 'active',
        });
      } else if (!matchedSubject.assignedTeacher) {
        setResolvedTeacher({ name: '', status: 'unassigned' });
      }
    });

    return () => unsubAssignment();
  }, [formSubjectId, availableSubjects]);

  // 5. Reset Class Entry Form
  const handleResetForm = () => {
    setFormSubjectId('');
    setSubjectSearchQuery('');
    setFormStartTime('09:00 AM');
    setFormEndTime('10:25 AM');
    setFormRoom('Room 204');
    setFormNotes('');
    setEditingEntryId(null);
    setFormValidationError(null);
    setIsFormOpen(false);
  };

  // 6. Open Entry Form to Add New Class
  const handleOpenAddClass = () => {
    handleResetForm();
    setIsFormOpen(true);
  };

  // 7. Open Entry Form to Edit Existing Class
  const handleOpenEditClass = (entry: RecurringScheduleEntry) => {
    setEditingEntryId(entry.id);
    setSelectedDay(entry.day);
    setFormSubjectId(entry.subjectId);
    setSubjectSearchQuery('');
    setFormStartTime(entry.startTime);
    setFormEndTime(entry.endTime);
    setFormRoom(entry.room || 'Room 204');
    setFormNotes(entry.notes || '');
    setFormValidationError(null);
    setIsFormOpen(true);
  };

  // 8. Validate and Save Class Entry
  const handleSaveClassEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);

    if (!formSubjectId) {
      setFormValidationError('Please select a registered curriculum subject from Firebase.');
      return;
    }

    const matchedSubject = availableSubjects.find((s) => s.id === formSubjectId);
    if (!matchedSubject) {
      setFormValidationError('Selected subject record could not be found in curriculum catalog.');
      return;
    }

    const startMinutes = timeStringToMinutes(formStartTime);
    const endMinutes = timeStringToMinutes(formEndTime);

    if (endMinutes <= startMinutes) {
      setFormValidationError('End time must be after start time.');
      return;
    }

    if (endMinutes - startMinutes < 15) {
      setFormValidationError('Class duration must be at least 15 minutes.');
      return;
    }

    // Check overlapping periods on the same day (excluding current entry if editing)
    const otherEntriesOnDay = workingSchedule.items.filter(
      (item) => item.day === selectedDay && item.id !== editingEntryId
    );

    for (const item of otherEntriesOnDay) {
      const itemStart = timeStringToMinutes(item.startTime);
      const itemEnd = timeStringToMinutes(item.endTime);

      const hasOverlap = Math.max(startMinutes, itemStart) < Math.min(endMinutes, itemEnd);
      if (hasOverlap) {
        setFormValidationError(
          `Time conflict: Overlaps with ${item.subjectCode || item.subjectName} (${item.startTime} – ${item.endTime}) on ${WEEKDAY_FULL_NAMES[selectedDay]}.`
        );
        return;
      }
    }

    const entryId = editingEntryId || `entry_${selectedDay.toLowerCase()}_${Date.now()}`;
    const newEntry: RecurringScheduleEntry = {
      id: entryId,
      day: selectedDay,
      startTime: formStartTime,
      endTime: formEndTime,
      subjectId: matchedSubject.id,
      subjectCode: matchedSubject.code,
      subjectName: matchedSubject.name,
      teacherName: resolvedTeacher.status === 'active' && resolvedTeacher.name ? resolvedTeacher.name : undefined,
      teacherEmail: resolvedTeacher.email,
      room: formRoom.trim() || 'Room 204',
      notes: formNotes.trim() || undefined,
    };

    let updatedItems: RecurringScheduleEntry[];
    if (editingEntryId) {
      updatedItems = workingSchedule.items.map((it) => (it.id === editingEntryId ? newEntry : it));
    } else {
      updatedItems = [...workingSchedule.items, newEntry];
    }

    // Sort items chronologically
    updatedItems.sort((a, b) => {
      const dayDiff = WEEKDAYS_ORDER.indexOf(a.day) - WEEKDAYS_ORDER.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime);
    });

    const nextSchedule: RecurringSchedule = {
      ...workingSchedule,
      items: updatedItems,
      activeDays: extractActiveWeekdays(updatedItems),
      updatedAt: new Date().toISOString(),
    };

    setWorkingSchedule(nextSchedule);
    handleResetForm();

    // Persist draft to Firestore
    setIsSavingDraft(true);
    await saveScheduleDraft(nextSchedule);
    setIsSavingDraft(false);

    showToast(editingEntryId ? 'Class updated in schedule draft.' : 'Class added to weekly schedule.');
  };

  // 9. Confirm Delete Class Entry
  const handleConfirmDeleteEntry = async () => {
    if (!entryToDelete) return;

    const updatedItems = workingSchedule.items.filter((item) => item.id !== entryToDelete.id);
    const nextSchedule: RecurringSchedule = {
      ...workingSchedule,
      items: updatedItems,
      activeDays: extractActiveWeekdays(updatedItems),
      updatedAt: new Date().toISOString(),
    };

    setWorkingSchedule(nextSchedule);
    setEntryToDelete(null);

    setIsSavingDraft(true);
    await saveScheduleDraft(nextSchedule);
    setIsSavingDraft(false);

    showToast('Class entry removed from weekly timetable.');
  };

  // 10. Copy Day Schedule to Another Weekday
  const handleCopyDaySchedule = async (targetDay: WeekdayCode) => {
    if (targetDay === selectedDay) return;

    const sourceEntries = workingSchedule.items.filter((i) => i.day === selectedDay);
    if (sourceEntries.length === 0) {
      showToast(`No classes scheduled on ${WEEKDAY_FULL_NAMES[selectedDay]} to copy.`, 'error');
      return;
    }

    const clonedTargetEntries: RecurringScheduleEntry[] = sourceEntries.map((src, idx) => ({
      ...src,
      id: `entry_${targetDay.toLowerCase()}_${Date.now()}_${idx}`,
      day: targetDay,
    }));

    const otherEntries = workingSchedule.items.filter((i) => i.day !== targetDay);
    const combined = [...otherEntries, ...clonedTargetEntries];

    combined.sort((a, b) => {
      const dayDiff = WEEKDAYS_ORDER.indexOf(a.day) - WEEKDAYS_ORDER.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime);
    });

    const nextSchedule: RecurringSchedule = {
      ...workingSchedule,
      items: combined,
      activeDays: extractActiveWeekdays(combined),
      updatedAt: new Date().toISOString(),
    };

    setWorkingSchedule(nextSchedule);
    setSelectedDay(targetDay);

    setIsSavingDraft(true);
    await saveScheduleDraft(nextSchedule);
    setIsSavingDraft(false);

    showToast(`Copied ${sourceEntries.length} classes to ${WEEKDAY_FULL_NAMES[targetDay]}.`);
  };

  // 11. Save Validity Range
  const handleSaveValidityDates = async () => {
    if (!validityStartDate || !validityEndDate) {
      showToast('Both start and end dates are required.', 'error');
      return;
    }

    if (new Date(validityEndDate).getTime() <= new Date(validityStartDate).getTime()) {
      showToast('End date must be after start date.', 'error');
      return;
    }

    const nextSchedule: RecurringSchedule = {
      ...workingSchedule,
      semester: validitySemester.trim() || 'Fall 2026',
      startDate: validityStartDate,
      endDate: validityEndDate,
      updatedAt: new Date().toISOString(),
    };

    setWorkingSchedule(nextSchedule);
    setIsSavingDraft(true);
    await saveScheduleDraft(nextSchedule);
    setIsSavingDraft(false);
    showToast('Schedule validity period updated.');
    setViewMode('planner');
  };

  // 12. Publish Schedule to Students
  const handlePublishSchedule = async () => {
    const validation = validateScheduleDraft(workingSchedule);
    if (!validation.isValid) {
      showToast(validation.errors[0] || 'Please fix schedule validation errors before publishing.', 'error');
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
      showToast(`Weekly Schedule v${res.version || 1} published! Live for all students.`);

      // Refresh history records
      getScheduleHistory(assignedClass).then((hist) => setHistoryRecords(hist));
    } catch (err: any) {
      showToast(err?.message || 'Publishing failed.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // 13. Save Single-Day Override (Cancel or Reschedule)
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
      showToast(res.error || 'Failed to save date exception.', 'error');
    }
  };

  // 14. Delete Exception
  const handleDeleteException = async (overrideId: string) => {
    const res = await deleteScheduleOverride(overrideId, crUser.email);
    if (res.success) {
      showToast('Exception removed. Recurring schedule restored for that date.');
    } else {
      showToast(res.error || 'Failed to delete exception.', 'error');
    }
  };

  // 15. Restore Historical Version
  const handleRestoreVersion = async (record: ScheduleHistoryRecord) => {
    if (!window.confirm(`Restore and publish Schedule Version ${record.version}?`)) return;

    const res = await restoreScheduleVersion(assignedClass, record, {
      uid: crUser.uid || crUser.id,
      email: crUser.email,
      name: crUser.name,
    });

    if (res.success) {
      showToast(`Schedule Version ${record.version} restored and published!`);
      getScheduleHistory(assignedClass).then((hist) => setHistoryRecords(hist));
      setViewMode('planner');
    } else {
      showToast(res.error || 'Failed to restore version.', 'error');
    }
  };

  // Derived Values for UI
  const selectedDayClasses = workingSchedule.items.filter((item) => item.day === selectedDay);
  const totalClassesCount = workingSchedule.items.length;
  const activeDaysCount = extractActiveWeekdays(workingSchedule.items).length;

  const currentDurationMinutes = useMemo(() => {
    const s = timeStringToMinutes(formStartTime);
    const e = timeStringToMinutes(formEndTime);
    return Math.max(0, e - s);
  }, [formStartTime, formEndTime]);

  const validationReport = validateScheduleDraft(workingSchedule);

  const exceptionDateOccurrences = publishedSchedule
    ? getOccurrencesForDate(publishedSchedule, exceptionDate, overrides)
    : [];

  return (
    <div className="space-y-5 pb-24 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#493222] text-[#FFF9F1] px-4 py-2.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#668064]" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-[#C84B31]" />
          ) : (
            <Clock className="w-4 h-4 text-amber-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. Header Bar with Identity & Mode Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="p-2.5 rounded-xl bg-[#FFF9F1] hover:bg-[#EFE3D3] border border-[#E6D8C7] text-[#493222] cursor-pointer transition-colors shrink-0"
            title="Back to CR Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#38271C]">
                Schedule Planner
              </h1>
              <span className="font-mono text-xs font-bold text-[#493222] bg-[#EFE3D3] px-2 py-0.5 rounded-md border border-[#E6D8C7]">
                {assignedClass}
              </span>
            </div>
            <p className="text-xs text-[#806A56] mt-0.5">
              Fixed recurring timetable · Synchronized with Student Portal
            </p>
          </div>
        </div>

        {/* View Mode Tabs (Planner, Exceptions, Validity, History) */}
        <div className="flex items-center gap-1 p-1 bg-[#EFE3D3] rounded-xl border border-[#E6D8C7] self-start sm:self-auto overflow-x-auto scrollbar-none max-w-full">
          <button
            type="button"
            onClick={() => setViewMode('planner')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'planner'
                ? 'bg-[#493222] text-[#FFF9F1] shadow-2xs'
                : 'text-[#493222] hover:bg-white/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Timetable</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('exceptions')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'exceptions'
                ? 'bg-[#493222] text-[#FFF9F1] shadow-2xs'
                : 'text-[#493222] hover:bg-white/60'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Exceptions</span>
            {overrides.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {overrides.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setViewMode('validity')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'validity'
                ? 'bg-[#493222] text-[#FFF9F1] shadow-2xs'
                : 'text-[#493222] hover:bg-white/60'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Validity</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'history'
                ? 'bg-[#493222] text-[#FFF9F1] shadow-2xs'
                : 'text-[#493222] hover:bg-white/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* VIEW: SCHEDULE PLANNER (Main 4-Section Workflow) */}
      {viewMode === 'planner' && (
        <div className="space-y-5 animate-in fade-in">
          {/* SECTION A: Current Weekly Schedule Status Banner */}
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#806A56]">
                    Weekly Schedule Status
                  </span>
                  {publishedSchedule ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#EAF2E9] border border-[#C5DCC3] text-[#4A5B49] text-xs font-bold rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#668064] animate-pulse" />
                      Live Version {publishedSchedule.publishedVersion}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      Draft · Unpublished
                    </span>
                  )}
                  {isSavingDraft && (
                    <span className="text-[11px] text-[#806A56] flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Saving draft...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-[#806A56] pt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <CalendarRange className="w-3.5 h-3.5 text-[#493222]" />
                    <span>
                      {workingSchedule.semester || 'Fall 2026'} ({workingSchedule.startDate} to {workingSchedule.endDate})
                    </span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#493222]" />
                    <strong className="text-[#38271C] font-bold">{totalClassesCount}</strong> Total Classes across{' '}
                    <strong className="text-[#38271C] font-bold">{activeDaysCount}</strong> Active Days
                  </span>
                </div>
              </div>

              {/* Action Buttons: Review & Publish */}
              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConfirmPublishModal(true)}
                  disabled={totalClassesCount === 0 || isPublishing}
                  className="px-4 py-2 bg-[#493222] hover:bg-[#341F12] text-[#FFF9F1] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Review & Publish</span>
                </button>
              </div>
            </div>

            {/* Validation Warnings (if any) */}
            {validationReport.errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Action Needed: Timetable Validation Issues</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {validationReport.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* SECTION B: Edit Timetable */}
          <div className="space-y-4">
            {/* Weekday Switcher Strip */}
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-2 shadow-2xs">
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS_ORDER.map((day) => {
                  const countForDay = workingSchedule.items.filter((i) => i.day === day).length;
                  const isSelected = selectedDay === day;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setSelectedDay(day);
                        setIsFormOpen(false);
                      }}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#493222] text-[#FFF9F1] font-bold shadow-xs'
                          : 'hover:bg-white text-[#493222]'
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-bold uppercase">{day}</span>
                      <span
                        className={`text-[10px] font-semibold mt-0.5 px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : countForDay > 0
                            ? 'bg-[#EAF2E9] text-[#668064]'
                            : 'text-[#806A56]'
                        }`}
                      >
                        {countForDay} {countForDay === 1 ? 'class' : 'classes'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section Header for Selected Day with Actions */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <h2 className="text-base font-bold text-[#38271C]">
                  {WEEKDAY_FULL_NAMES[selectedDay]}'s Timetable
                </h2>
                <p className="text-xs text-[#806A56]">
                  {selectedDayClasses.length === 0
                    ? `No classes scheduled on ${selectedDay}. Free day.`
                    : `${selectedDayClasses.length} class periods configured.`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Copy Day Dropdown */}
                {selectedDayClasses.length > 0 && (
                  <div className="relative group">
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-[#FFF9F1] hover:bg-[#EFE3D3] border border-[#E6D8C7] rounded-xl text-xs font-semibold text-[#493222] flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Copy this day's classes to another day"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#806A56]" />
                      <span className="hidden sm:inline">Copy Day</span>
                    </button>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-30 bg-white border border-[#E6D8C7] rounded-xl p-1.5 shadow-lg min-w-[150px]">
                      <span className="block px-2 py-1 text-[10px] font-bold text-[#806A56] uppercase tracking-wider">
                        Copy to...
                      </span>
                      {WEEKDAYS_ORDER.filter((d) => d !== selectedDay).map((targetDay) => (
                        <button
                          key={targetDay}
                          type="button"
                          onClick={() => handleCopyDaySchedule(targetDay)}
                          className="w-full text-left px-2 py-1.5 text-xs text-[#38271C] hover:bg-[#FAF4ED] rounded-lg cursor-pointer"
                        >
                          {WEEKDAY_FULL_NAMES[targetDay]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Class Button */}
                {!isFormOpen && (
                  <button
                    type="button"
                    onClick={handleOpenAddClass}
                    className="px-3.5 py-1.5 bg-[#493222] hover:bg-[#341F12] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Class</span>
                  </button>
                )}
              </div>
            </div>

            {/* THE REDESIGNED CLASS-ENTRY FORM (Only necessary fields!) */}
            {isFormOpen && (
              <div className="bg-[#FFFDF9] border-2 border-[#493222]/30 rounded-3xl p-4 sm:p-6 shadow-md animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-[#E6D8C7] mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-[#EFE3D3] rounded-xl text-[#493222]">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#38271C]">
                        {editingEntryId ? 'Edit Class Period' : `Add Class Period for ${WEEKDAY_FULL_NAMES[selectedDay]}`}
                      </h3>
                      <p className="text-[11px] text-[#806A56]">
                        Select registered curriculum course · Teacher resolves automatically
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="p-1.5 text-[#806A56] hover:text-[#38271C] rounded-lg hover:bg-[#EFE3D3] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveClassEntry} className="space-y-4">
                  {/* Field 1: Registered Subject Dropdown with Search */}
                  <div>
                    <label className="block text-xs font-bold text-[#493222] mb-1.5">
                      1. Registered Curriculum Subject <span className="text-red-500">*</span>
                    </label>

                    {isLoadingSubjects ? (
                      <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#806A56] flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading registered curriculum courses from Firebase...</span>
                      </div>
                    ) : subjectsError ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
                        <span>{subjectsError}</span>
                        <button
                          type="button"
                          onClick={() => getAllSubjectsFromFirestore().then((s) => setAvailableSubjects(s))}
                          className="font-bold underline cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    ) : authorizedSubjects.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                        <p className="font-bold">No registered subjects found for {assignedClass}.</p>
                        <p className="text-[11px] text-amber-700">
                          Curriculum courses must be registered by the Master Admin before they can be added to class timetables.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Search Filter Box */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Filter registered subjects by code or title..."
                            value={subjectSearchQuery}
                            onChange={(e) => setSubjectSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] focus:ring-2 focus:ring-[#493222]/30 outline-none"
                          />
                        </div>

                        {/* Subject Select Element */}
                        <select
                          required
                          value={formSubjectId}
                          onChange={(e) => setFormSubjectId(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] font-medium focus:ring-2 focus:ring-[#493222] outline-none shadow-2xs cursor-pointer"
                        >
                          <option value="">— Select an Official Curriculum Subject —</option>
                          {filteredDropdownSubjects.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.code} · {sub.name} ({sub.creditHours} CH){sub.assignedTeacher ? ` — ${sub.assignedTeacher}` : ' [Unassigned]'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Field 2: Automatically Resolved Active Teacher (READ-ONLY) */}
                  <div>
                    <label className="block text-xs font-bold text-[#493222] mb-1.5">
                      2. Assigned Teacher (Authoritative Firebase Assignment)
                    </label>

                    {formSubjectId ? (
                      resolvedTeacher.status === 'active' && resolvedTeacher.name ? (
                        <div className="p-3 bg-[#EAF2E9] border border-[#C5DCC3] rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#668064] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              <UserCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#38271C]">
                                {resolvedTeacher.name}
                              </p>
                              <p className="text-[10px] text-[#4A5B49]">
                                {resolvedTeacher.email || 'Verified Faculty Member'} · Active Assignment
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-[#668064] bg-white/70 px-2 py-0.5 rounded-full border border-[#C5DCC3]">
                            Auto-Resolved
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                              <UserX className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-amber-900">
                                No Active Teacher Assigned
                              </p>
                              <p className="text-[10px] text-amber-700">
                                This subject is currently unassigned in the Master Admin registry.
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            Vacancy
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="p-3 bg-[#F8F0E5] border border-dashed border-[#D8C7B4] rounded-2xl text-xs text-[#806A56] italic">
                        Select a registered subject above to automatically load its active faculty instructor.
                      </div>
                    )}
                  </div>

                  {/* Field 3 & 4: Time Wheel Pickers (Start & End Time) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Start Time Wheel */}
                    <div className="bg-[#FFF9F1] p-3 rounded-2xl border border-[#E6D8C7]">
                      <WheelTimePicker
                        label="Class Start Time"
                        value={formStartTime}
                        onChange={(t) => setFormStartTime(t)}
                      />
                    </div>

                    {/* End Time Wheel */}
                    <div className="bg-[#FFF9F1] p-3 rounded-2xl border border-[#E6D8C7]">
                      <WheelTimePicker
                        label="Class End Time"
                        value={formEndTime}
                        onChange={(t) => setFormEndTime(t)}
                      />
                    </div>
                  </div>

                  {/* Duration Live Indicator */}
                  <div className="flex items-center justify-between px-2 text-xs text-[#806A56]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Class Duration:</span>
                      <strong className="text-[#38271C] font-bold">
                        {Math.floor(currentDurationMinutes / 60)}h {currentDurationMinutes % 60}m ({currentDurationMinutes} mins)
                      </strong>
                    </span>
                    {currentDurationMinutes < 15 && (
                      <span className="text-red-500 font-semibold text-[11px]">
                        Invalid: End must be after start
                      </span>
                    )}
                  </div>

                  {/* Field 5: Room / Lecture Hall */}
                  <div>
                    <label className="block text-xs font-bold text-[#493222] mb-1.5">
                      5. Room / Lecture Hall
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Room 204 or Software Lab 1"
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] focus:ring-2 focus:ring-[#493222] outline-none shadow-2xs"
                    />
                  </div>

                  {/* Validation Error Message */}
                  {formValidationError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{formValidationError}</span>
                    </div>
                  )}

                  {/* Field 6: Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E6D8C7]">
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-4 py-2 text-xs font-semibold text-[#806A56] hover:text-[#38271C] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingDraft}
                      className="px-5 py-2.5 bg-[#493222] hover:bg-[#341F12] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingEntryId ? 'Update Class' : 'Save to Schedule'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Configured Classes for Selected Day */}
            {selectedDayClasses.length === 0 ? (
              <div className="bg-[#FFF9F1] border border-dashed border-[#D8C7B4] rounded-3xl p-8 text-center space-y-2">
                <Calendar className="w-9 h-9 text-[#B09882] mx-auto opacity-60" />
                <h4 className="font-bold text-sm text-[#38271C]">
                  No Classes Scheduled on {WEEKDAY_FULL_NAMES[selectedDay]}
                </h4>
                <p className="text-xs text-[#806A56] max-w-sm mx-auto">
                  If this day has no university classes for {assignedClass}, leave it empty. Classes only repeat on configured weekdays.
                </p>
                {!isFormOpen && (
                  <button
                    type="button"
                    onClick={handleOpenAddClass}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#493222] text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs hover:bg-[#341F12]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Class to {selectedDay}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedDayClasses.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white border border-[#E6D8C7] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F6EDE4] text-[#493222] font-black text-xs flex flex-col items-center justify-center shrink-0 border border-[#E6D8C7]/60">
                        <span>P{idx + 1}</span>
                        <span className="text-[9px] font-semibold text-[#806A56] uppercase">{item.day}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[#668064] bg-[#EAF2E9] px-1.5 py-0.5 rounded">
                            {item.subjectCode || 'CLASS'}
                          </span>
                          <span className="text-xs text-[#806A56]">·</span>
                          <h4 className="font-bold text-sm text-[#38271C]">
                            {item.subjectName}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#806A56]">
                          <span className="flex items-center gap-1 font-semibold text-[#38271C]">
                            <Clock className="w-3.5 h-3.5 text-[#806A56]" />
                            <span>{item.startTime} – {item.endTime}</span>
                          </span>
                          <span>·</span>
                          <span>{item.room || 'Room 204'}</span>
                          <span>·</span>
                          <span className="font-medium text-[#493222]">
                            {item.teacherName ? `Faculty: ${item.teacherName}` : 'No Faculty Assigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Class Action Controls */}
                    <div className="flex items-center gap-1 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEditClass(item)}
                        className="p-2 rounded-xl hover:bg-[#F6EFE6] text-[#806A56] hover:text-[#38271C] transition-colors cursor-pointer"
                        title="Edit class"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntryToDelete(item)}
                        className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                        title="Remove class"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION C: Weekly Preview Chart (All 7 Days at a Glance) */}
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6D8C7] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#EFE3D3] rounded-xl text-[#493222]">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#38271C]">
                    Weekly Timetable Preview
                  </h3>
                  <p className="text-[11px] text-[#806A56]">
                    Recurring timetable layout across all days for {assignedClass}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#493222] bg-[#EFE3D3] px-2.5 py-1 rounded-lg border border-[#E6D8C7]">
                {totalClassesCount} Classes
              </span>
            </div>

            {totalClassesCount === 0 ? (
              <div className="py-8 text-center text-xs text-[#806A56]">
                No classes configured in the weekly schedule yet. Select a weekday above and click "+ Add Class".
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {WEEKDAYS_ORDER.slice(0, 5).map((day) => {
                  const dayItems = workingSchedule.items.filter((it) => it.day === day);

                  return (
                    <div
                      key={day}
                      className="bg-white border border-[#E6D8C7] rounded-2xl p-3 space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-[#E6D8C7]/60 pb-1.5 mb-2">
                          <span className="font-bold text-xs text-[#38271C]">{WEEKDAY_FULL_NAMES[day]}</span>
                          <span className="text-[10px] font-semibold text-[#806A56] bg-[#F8F0E5] px-1.5 py-0.2 rounded">
                            {dayItems.length}
                          </span>
                        </div>

                        {dayItems.length === 0 ? (
                          <p className="text-[11px] text-[#806A56]/60 italic py-3 text-center">No classes</p>
                        ) : (
                          <div className="space-y-1.5">
                            {dayItems.map((c) => (
                              <div
                                key={c.id}
                                className="p-2 rounded-xl bg-[#FFF9F1] border border-[#E6D8C7]/70 text-[11px] space-y-0.5"
                              >
                                <p className="font-bold text-[#38271C] truncate leading-tight">
                                  {c.subjectCode}: {c.subjectName}
                                </p>
                                <p className="text-[10px] text-[#806A56]">
                                  {c.startTime} – {c.endTime}
                                </p>
                                <p className="text-[10px] text-[#668064] truncate">
                                  {c.teacherName || 'No Faculty'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDay(day);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        className="w-full text-center text-[10px] font-bold text-[#493222] hover:underline pt-1 cursor-pointer"
                      >
                        Edit {day}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: EXCEPTIONS & RESCHEDULING (Date-Specific Overrides) */}
      {viewMode === 'exceptions' && (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#E6D8C7] pb-3">
            <div>
              <h3 className="font-bold text-base text-[#38271C]">
                Schedule Exceptions & One-Day Overrides
              </h3>
              <p className="text-xs text-[#806A56]">
                Cancel or reschedule a specific date's class without altering future recurring weeks
              </p>
            </div>
            <span className="text-xs font-bold text-[#493222] bg-[#EFE3D3] px-2.5 py-1 rounded-lg border border-[#E6D8C7]">
              {overrides.length} Active Overrides
            </span>
          </div>

          {/* Date Picker for Date-Specific View */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-[#E6D8C7] rounded-2xl">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#493222]" />
              <span className="text-xs font-bold text-[#38271C]">Select Specific Calendar Date:</span>
            </div>
            <input
              type="date"
              value={exceptionDate}
              onChange={(e) => setExceptionDate(e.target.value)}
              className="px-3 py-1.5 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] font-semibold outline-none cursor-pointer"
            />
          </div>

          {/* Classes Scheduled for Selected Date */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#806A56]">
              Classes on {exceptionDate} ({publishedSchedule?.classId || assignedClass})
            </h4>

            {exceptionDateOccurrences.length === 0 ? (
              <div className="p-8 bg-white border border-dashed border-[#D8C7B4] rounded-2xl text-center text-xs text-[#806A56]">
                No classes scheduled for {exceptionDate} based on published recurring schedule.
              </div>
            ) : (
              <div className="space-y-2.5">
                {exceptionDateOccurrences.map((occ) => (
                  <div
                    key={occ.id}
                    className="p-4 bg-white border border-[#E6D8C7] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#668064]">
                          {occ.subjectCode}
                        </span>
                        <span className="text-xs text-[#806A56]">·</span>
                        <h5 className="font-bold text-sm text-[#38271C]">{occ.subjectName}</h5>
                        {occ.status === 'cancelled' && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                            Cancelled for this date
                          </span>
                        )}
                        {occ.status === 'rescheduled' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Rescheduled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#806A56] mt-0.5">
                        Time: <strong className="text-[#38271C]">{occ.startTime} – {occ.endTime}</strong> · Room: {occ.room || 'Room 204'} · Teacher: {occ.teacherName || 'Faculty'}
                      </p>
                      {occ.override?.reason && (
                        <p className="text-[11px] text-amber-800 mt-1 italic">
                          Reason: {occ.override.reason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {occ.override ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteException(occ.override!.id)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#38271C] text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Restore Regular
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setExceptionModalItem({
                                entryId: occ.entryId,
                                subjectName: occ.subjectName,
                                time: `${occ.startTime} – ${occ.endTime}`,
                                date: exceptionDate,
                                type: 'cancelled',
                              })
                            }
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl border border-red-200 cursor-pointer"
                          >
                            Cancel Today
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExceptionModalItem({
                                entryId: occ.entryId,
                                subjectName: occ.subjectName,
                                time: `${occ.startTime} – ${occ.endTime}`,
                                date: exceptionDate,
                                type: 'rescheduled',
                              })
                            }
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 cursor-pointer"
                          >
                            Reschedule Today
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: SCHEDULE VALIDITY & SEMESTER */}
      {viewMode === 'validity' && (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4 animate-in fade-in">
          <div className="border-b border-[#E6D8C7] pb-3">
            <h3 className="font-bold text-base text-[#38271C]">
              Schedule Validity & Academic Term
            </h3>
            <p className="text-xs text-[#806A56]">
              Timetables repeat automatically each week throughout this validity window
            </p>
          </div>

          <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E6D8C7]">
            <div>
              <label className="block text-xs font-bold text-[#493222] mb-1">
                Semester Name / Academic Term
              </label>
              <input
                type="text"
                value={validitySemester}
                onChange={(e) => setValiditySemester(e.target.value)}
                placeholder="e.g. Fall 2026 or Spring 2027"
                className="w-full px-3 py-2 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] font-semibold outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#493222] mb-1">
                  Effective Start Date
                </label>
                <input
                  type="date"
                  value={validityStartDate}
                  onChange={(e) => setValidityStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] font-semibold outline-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#493222] mb-1">
                  Validity End Date
                </label>
                <input
                  type="date"
                  value={validityEndDate}
                  onChange={(e) => setValidityEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] font-semibold outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveValidityDates}
                disabled={isSavingDraft}
                className="px-4 py-2 bg-[#493222] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#341F12]"
              >
                Save Validity Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: VERSION HISTORY & ROLLBACK */}
      {viewMode === 'history' && (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-4 animate-in fade-in">
          <div className="border-b border-[#E6D8C7] pb-3">
            <h3 className="font-bold text-base text-[#38271C]">
              Published Version History
            </h3>
            <p className="text-xs text-[#806A56]">
              Archived historical releases of the {assignedClass} weekly schedule
            </p>
          </div>

          {historyRecords.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#806A56]">
              No past versions recorded yet. Publish your first schedule to start archiving version history.
            </div>
          ) : (
            <div className="space-y-2.5">
              {historyRecords.map((hist) => (
                <div
                  key={hist.id}
                  className="p-3.5 bg-white border border-[#E6D8C7] rounded-2xl flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#493222] bg-[#EFE3D3] px-2 py-0.5 rounded">
                        Version {hist.version}
                      </span>
                      <span className="text-xs font-bold text-[#38271C]">
                        {hist.totalClasses} Classes
                      </span>
                    </div>
                    <p className="text-[11px] text-[#806A56] mt-0.5">
                      Published {new Date(hist.publishedAt).toLocaleString()} by {hist.publishedBy?.name || 'CR'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestoreVersion(hist)}
                    className="px-3 py-1.5 bg-[#EFE3D3] hover:bg-[#E6D8C7] text-[#493222] text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
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

      {/* CONFIRM PUBLISH MODAL */}
      {showConfirmPublishModal && (
        <div className="fixed inset-0 z-50 bg-[#2E1F14]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E6D8C7]">
              <div className="p-2.5 bg-[#EAF2E9] rounded-2xl text-[#668064]">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#38271C]">
                  Publish Weekly Timetable?
                </h3>
                <p className="text-xs text-[#806A56]">
                  Section: {assignedClass} · Immediate student synchronization
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#38271C] bg-white p-3.5 rounded-2xl border border-[#E6D8C7]">
              <div className="flex justify-between py-1 border-b border-[#E6D8C7]/50">
                <span className="text-[#806A56]">Total Configured Classes:</span>
                <strong className="font-bold">{totalClassesCount} classes</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E6D8C7]/50">
                <span className="text-[#806A56]">Active Days:</span>
                <strong className="font-bold">{activeDaysCount} weekdays</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E6D8C7]/50">
                <span className="text-[#806A56]">Validity Window:</span>
                <strong className="font-bold">
                  {workingSchedule.startDate} to {workingSchedule.endDate}
                </strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#806A56]">Published Version:</span>
                <strong className="font-bold text-[#668064]">
                  Version {(publishedSchedule?.publishedVersion || 0) + 1}
                </strong>
              </div>
            </div>

            <p className="text-xs text-[#806A56] leading-relaxed">
              Publishing will make this recurring schedule authoritative for all enrolled students in {assignedClass}.
              Live class countdowns will recalculate automatically in the Student Portal.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmPublishModal(false)}
                disabled={isPublishing}
                className="px-4 py-2 text-xs font-semibold text-[#806A56] hover:text-[#38271C] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishSchedule}
                disabled={isPublishing}
                className="px-4 py-2 bg-[#493222] hover:bg-[#341F12] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ENTRY MODAL */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 bg-[#2E1F14]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-xl space-y-3">
            <h4 className="font-bold text-sm text-[#38271C]">
              Remove Class Entry?
            </h4>
            <p className="text-xs text-[#806A56]">
              Are you sure you want to remove <strong>{entryToDelete.subjectCode}: {entryToDelete.subjectName}</strong> ({entryToDelete.startTime} – {entryToDelete.endTime}) from {WEEKDAY_FULL_NAMES[entryToDelete.day]}'s schedule?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#806A56] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEntry}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Remove Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONE-DAY EXCEPTION MODAL */}
      {exceptionModalItem && (
        <div className="fixed inset-0 z-50 bg-[#2E1F14]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6D8C7]">
              <h4 className="font-bold text-sm text-[#38271C]">
                {exceptionModalItem.type === 'cancelled' ? 'Cancel Class for Single Date' : 'Reschedule Class for Single Date'}
              </h4>
              <button
                type="button"
                onClick={() => setExceptionModalItem(null)}
                className="p-1 text-[#806A56] hover:text-[#38271C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl text-xs space-y-1">
              <p className="font-bold text-[#38271C]">{exceptionModalItem.subjectName}</p>
              <p className="text-[11px] text-[#806A56]">
                Date: {exceptionModalItem.date} · Scheduled Time: {exceptionModalItem.time}
              </p>
            </div>

            {exceptionModalItem.type === 'rescheduled' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#493222] mb-1">New Start Time</label>
                    <input
                      type="text"
                      value={rescheduleStartTime}
                      onChange={(e) => setRescheduleStartTime(e.target.value)}
                      placeholder="11:00 AM"
                      className="w-full px-3 py-1.5 bg-white border border-[#E6D8C7] rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#493222] mb-1">New End Time</label>
                    <input
                      type="text"
                      value={rescheduleEndTime}
                      onChange={(e) => setRescheduleEndTime(e.target.value)}
                      placeholder="12:25 PM"
                      className="w-full px-3 py-1.5 bg-white border border-[#E6D8C7] rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#493222] mb-1">New Room (Optional)</label>
                  <input
                    type="text"
                    value={rescheduleRoom}
                    onChange={(e) => setRescheduleRoom(e.target.value)}
                    placeholder="e.g. Lab 2"
                    className="w-full px-3 py-1.5 bg-white border border-[#E6D8C7] rounded-xl text-xs outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#493222] mb-1">Reason / Note for Students</label>
              <input
                type="text"
                placeholder="e.g. Faculty medical leave or Room maintenance"
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6D8C7]">
              <button
                type="button"
                onClick={() => setExceptionModalItem(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#806A56] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveException}
                className={`px-4 py-2 text-xs font-bold rounded-xl text-white cursor-pointer ${
                  exceptionModalItem.type === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#493222] hover:bg-[#341F12]'
                }`}
              >
                Save Single-Day Exception
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
