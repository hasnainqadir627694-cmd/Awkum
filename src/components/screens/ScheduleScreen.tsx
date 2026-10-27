import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Bell,
  BellRing,
  MoreVertical,
  Check,
  Calendar,
  AlertCircle,
  Code2,
  Monitor,
  Briefcase,
  BookOpen,
  Calculator,
  Atom,
  Radio,
  CalendarRange,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { ScheduleItem } from '../../data/portalData';
import {
  RecurringSchedule,
  ScheduleOverrideItem,
  LiveScheduleState,
  WeekdayCode,
  WEEKDAYS_ORDER,
  WEEKDAY_FULL_NAMES,
  getKarachiDateTime,
  timeStringToMinutes,
} from '../../lib/scheduleEngine';

interface ScheduleScreenProps {
  scheduleItems: ScheduleItem[];
  reminders: Record<string, { enabled: boolean; minutes: number }>;
  onToggleReminder: (classId: string, minutes: number) => void;
  publishedSchedule?: RecurringSchedule | null;
  scheduleOverrides?: ScheduleOverrideItem[];
  liveScheduleState?: LiveScheduleState | null;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  scheduleItems,
  reminders,
  onToggleReminder,
  publishedSchedule,
  scheduleOverrides = [],
  liveScheduleState,
}) => {
  // Determine current date & weekday in Asia/Karachi
  const karachiNow = getKarachiDateTime();
  const currentWeekday: WeekdayCode = karachiNow.weekday;

  const [viewMode, setViewMode] = useState<'today' | 'weekly'>('today');
  const [selectedDay, setSelectedDay] = useState<WeekdayCode>(currentWeekday);
  const [reminderModalClass, setReminderModalClass] = useState<{
    id: string;
    subjectName: string;
    startTime: string;
  } | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(15);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compute the current week's dates (Mon - Sun) in Karachi time
  const currentWeekDays: {
    day: WeekdayCode;
    dateNum: number;
    dateString: string;
    label: string;
    isToday: boolean;
    hasClasses: boolean;
  }[] = React.useMemo(() => {
    const today = new Date();
    // Monday of current week
    const currentDayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToMonday = (currentDayOfWeek + 6) % 7; // distance from Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);

    return WEEKDAYS_ORDER.map((dayCode, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const karachiD = getKarachiDateTime(d);

      const hasClasses = publishedSchedule
        ? publishedSchedule.items.some((it) => it.day === dayCode)
        : scheduleItems.some((it) => it.day === dayCode);

      return {
        day: dayCode,
        dateNum: karachiD.day,
        dateString: karachiD.dateString,
        label: dayCode,
        isToday: dayCode === currentWeekday,
        hasClasses,
      };
    });
  }, [currentWeekday, publishedSchedule, scheduleItems]);

  const activeDay: WeekdayCode = viewMode === 'today' ? currentWeekday : selectedDay;
  const activeDayMeta = currentWeekDays.find((d) => d.day === activeDay);

  // Filter items for activeDay
  const displayedEntries = React.useMemo(() => {
    if (publishedSchedule && publishedSchedule.items.length > 0) {
      const dayEntries = publishedSchedule.items
        .filter((entry) => entry.day === activeDay)
        .sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

      return dayEntries.map((entry) => {
        // Check if there is an override for this specific calendar date
        const dateStr = activeDayMeta?.dateString || '';
        const override = scheduleOverrides.find(
          (o) => o.date === dateStr && o.entryId === entry.id
        );

        const isCancelled = override?.type === 'cancelled';
        const isRescheduled = override?.type === 'rescheduled';

        return {
          id: entry.id,
          subjectId: entry.subjectId,
          subjectCode: entry.subjectCode,
          subjectName: entry.subjectName,
          startTime: isRescheduled && override?.rescheduledStartTime ? override.rescheduledStartTime : entry.startTime,
          endTime: isRescheduled && override?.rescheduledEndTime ? override.rescheduledEndTime : entry.endTime,
          room: isRescheduled && override?.rescheduledRoom ? override.rescheduledRoom : entry.room || 'Department Lecture Hall',
          teacher: isRescheduled && override?.rescheduledTeacher ? override.rescheduledTeacher : entry.teacherName || 'Faculty Instructor',
          isCancelled,
          cancelReason: override?.reason,
          isRescheduled,
          rescheduleReason: override?.reason,
        };
      });
    }

    // Fallback to legacy scheduleItems if no publishedSchedule is available
    return scheduleItems
      .filter((it) => it.day === activeDay)
      .map((it) => ({
        id: it.id,
        subjectId: it.subjectId,
        subjectCode: it.subjectId.toUpperCase(),
        subjectName: it.subjectName,
        startTime: it.startTime,
        endTime: it.endTime,
        room: it.room,
        teacher: it.teacher,
        isCancelled: false,
        cancelReason: undefined,
        isRescheduled: false,
        rescheduleReason: undefined,
      }));
  }, [publishedSchedule, activeDay, activeDayMeta?.dateString, scheduleOverrides, scheduleItems]);

  const getSubjectIcon = (subjectId: string) => {
    const low = subjectId.toLowerCase();
    if (low.includes('code') || low.includes('pf') || low.includes('cs') || low.includes('prog')) {
      return <Code2 className="w-4 h-4 text-[#493222]" />;
    }
    if (low.includes('lab') || low.includes('mon')) {
      return <Monitor className="w-4 h-4 text-[#493222]" />;
    }
    if (low.includes('mgt') || low.includes('bus') || low.includes('manag')) {
      return <Briefcase className="w-4 h-4 text-[#493222]" />;
    }
    if (low.includes('math') || low.includes('calc') || low.includes('stat')) {
      return <Calculator className="w-4 h-4 text-[#493222]" />;
    }
    if (low.includes('phys') || low.includes('sci')) {
      return <Atom className="w-4 h-4 text-[#493222]" />;
    }
    return <BookOpen className="w-4 h-4 text-[#493222]" />;
  };

  const handleSaveReminder = () => {
    if (!reminderModalClass) return;
    onToggleReminder(reminderModalClass.id, selectedMinutes);
    const isNowEnabled = !reminders[reminderModalClass.id]?.enabled;
    setToastMessage(
      isNowEnabled
        ? `Reminder set for ${reminderModalClass.subjectName} (${selectedMinutes}m prior).`
        : `Reminder removed for ${reminderModalClass.subjectName}.`
    );
    setReminderModalClass(null);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#493222] text-[#FFF9F1] px-4 py-2 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <BellRing className="w-3.5 h-3.5 text-[#668064]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#38271C]">
            Weekly Timetable
          </h2>
          <p className="text-xs font-medium text-[#806A56] mt-0.5">
            Recurring academic schedule synchronized across the semester
          </p>
        </div>
      </div>

      {/* Validity Banner */}
      {publishedSchedule && (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#F8F0E5] text-[#493222] flex items-center justify-center shrink-0">
              <CalendarRange className="w-4 h-4 text-[#493222]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#38271C] truncate">
                  {publishedSchedule.semester || 'Semester Timetable'}
                </span>
                <span className="text-[10px] font-bold bg-[#EAF2E9] text-[#668064] px-1.5 py-0.2 rounded-full">
                  v{publishedSchedule.publishedVersion}
                </span>
              </div>
              <p className="text-[11px] text-[#806A56] truncate">
                Valid: {publishedSchedule.startDate} to {publishedSchedule.endDate}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#668064] bg-[#EAF2E9] px-2 py-0.5 rounded-full shrink-0">
            Recurring Weekly
          </span>
        </div>
      )}

      {/* View Mode Toggle: Today vs Weekly */}
      <div className="flex items-center p-1 bg-[#EFE3D3] rounded-xl border border-[#E6D8C7]">
        <button
          onClick={() => {
            setViewMode('today');
            setSelectedDay(currentWeekday);
          }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            viewMode === 'today'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          Today ({WEEKDAY_FULL_NAMES[currentWeekday]})
        </button>
        <button
          onClick={() => setViewMode('weekly')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            viewMode === 'weekly'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          Full Week Timetable
        </button>
      </div>

      {/* Weekday Selector Strip (Mon - Sun) */}
      <div className="grid grid-cols-7 gap-1 px-0.5">
        {currentWeekDays.map((item) => {
          const isSelected = activeDay === item.day;

          return (
            <button
              key={item.day}
              onClick={() => {
                if (viewMode === 'today') setViewMode('weekly');
                setSelectedDay(item.day);
              }}
              className={`flex flex-col items-center py-2 px-1 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#493222] border-[#493222] text-[#FFF9F1] shadow-sm scale-102'
                  : 'bg-[#FFF9F1] border-[#E6D8C7] text-[#38271C] hover:border-[#806A56]'
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  isSelected ? 'text-[#E6D8C7]' : 'text-[#806A56]'
                }`}
              >
                {item.label}
              </span>
              <span
                className={`text-sm font-extrabold mt-0.5 ${
                  isSelected ? 'text-[#FFF9F1]' : 'text-[#38271C]'
                }`}
              >
                {item.dateNum}
              </span>
              {item.isToday && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1 ${
                    isSelected ? 'bg-[#668064]' : 'bg-[#493222]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#38271C]">
            {WEEKDAY_FULL_NAMES[activeDay]}
          </span>
          {activeDayMeta?.dateString && (
            <span className="text-[11px] text-[#806A56]">
              ({activeDayMeta.dateString})
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-[#806A56]">
          {displayedEntries.length === 1 ? '1 Class' : `${displayedEntries.length} Classes`}
        </span>
      </div>

      {/* Schedule Items List */}
      <div className="space-y-3">
        {displayedEntries.length === 0 ? (
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-8 text-center">
            <Calendar className="w-8 h-8 text-[#806A56] mx-auto mb-2" />
            <h4 className="text-sm font-bold text-[#38271C]">
              No Classes on {WEEKDAY_FULL_NAMES[activeDay]}
            </h4>
            <p className="text-xs text-[#806A56] mt-1">
              There are no lecture or laboratory sessions recorded for this day in the recurring timetable.
            </p>
          </div>
        ) : (
          displayedEntries.map((item) => {
            const isReminderActive = reminders[item.id]?.enabled;
            const isCurrentClass =
              liveScheduleState?.currentClass?.entryId === item.id &&
              activeDay === currentWeekday;
            const isNextClass =
              liveScheduleState?.nextClass?.entryId === item.id &&
              activeDay === currentWeekday;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border transition-all shadow-xs ${
                  item.isCancelled
                    ? 'bg-rose-50/50 border-rose-200 opacity-80'
                    : isCurrentClass
                    ? 'bg-[#FFFDF9] border-[#668064] ring-2 ring-[#668064]/20'
                    : isNextClass
                    ? 'bg-[#FFFDF9] border-[#493222] ring-1 ring-[#493222]/20'
                    : 'bg-[#FFF9F1] border-[#E6D8C7]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Left / Main Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Top Row: Time Badge & Status Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F8F0E5] border border-[#E6D8C7] text-[11px] font-bold text-[#493222]">
                        <Clock className="w-3 h-3 text-[#806A56]" />
                        {item.startTime} - {item.endTime}
                      </span>
                      {isCurrentClass && (
                        <span className="text-[10px] font-bold text-white bg-[#668064] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Radio className="w-2.5 h-2.5 animate-pulse" />
                          Live Now
                        </span>
                      )}
                      {isNextClass && (
                        <span className="text-[10px] font-bold text-[#668064] bg-[#EAF2E9] px-1.5 py-0.5 rounded-full">
                          Next Class
                        </span>
                      )}
                      {item.isCancelled && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">
                          Cancelled
                        </span>
                      )}
                      {item.isRescheduled && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                          Rescheduled
                        </span>
                      )}
                    </div>

                    {/* Subject Name & Code */}
                    <h3
                      className={`text-sm font-extrabold tracking-tight pt-0.5 ${
                        item.isCancelled ? 'line-through text-rose-800' : 'text-[#38271C]'
                      }`}
                    >
                      {item.subjectName}
                      {item.subjectCode && (
                        <span className="ml-1.5 text-xs font-semibold text-[#806A56]">
                          ({item.subjectCode})
                        </span>
                      )}
                    </h3>

                    {/* Teacher & Room Details (Separately identifiable with icons) */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-[#806A56]">
                      <div className="flex items-center gap-1 min-w-0">
                        <GraduationCap className="w-3.5 h-3.5 text-[#493222] shrink-0" />
                        <span className="truncate font-medium text-[#38271C]">{item.teacher}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-[#493222] shrink-0" />
                        <span className="truncate font-medium text-[#38271C]">{item.room}</span>
                      </div>
                    </div>

                    {item.cancelReason && (
                      <p className="text-[10px] font-medium text-rose-600 mt-0.5">
                        Reason: {item.cancelReason}
                      </p>
                    )}
                    {item.rescheduleReason && (
                      <p className="text-[10px] font-medium text-amber-600 mt-0.5">
                        Note: {item.rescheduleReason}
                      </p>
                    )}
                  </div>

                  {/* Right: Reminder Action Button */}
                  <div className="shrink-0 pt-0.5">
                    <button
                      onClick={() => {
                        setReminderModalClass({
                          id: item.id,
                          subjectName: item.subjectName,
                          startTime: item.startTime,
                        });
                        setSelectedMinutes(reminders[item.id]?.minutes || 15);
                      }}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        isReminderActive
                          ? 'bg-[#EAF2E9] text-[#668064] hover:bg-[#D5E5D4]'
                          : 'text-[#806A56] hover:bg-[#F3E9DD] hover:text-[#38271C]'
                      }`}
                      title={
                        isReminderActive
                          ? `Reminder active (${reminders[item.id]?.minutes}m before)`
                          : 'Set Class Reminder'
                      }
                      aria-label="Set reminder"
                    >
                      {isReminderActive ? (
                        <BellRing className="w-4 h-4 text-[#668064]" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reminder Configuration Modal */}
      {reminderModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-xl bg-[#F8F0E5] text-[#493222]">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#38271C]">
                  Class Notification Alert
                </h3>
                <p className="text-xs text-[#806A56]">
                  {reminderModalClass.subjectName} · {reminderModalClass.startTime}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#806A56] mb-4">
              Select how many minutes before class you want to be notified:
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setSelectedMinutes(mins)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    selectedMinutes === mins
                      ? 'bg-[#493222] border-[#493222] text-[#FFF9F1]'
                      : 'bg-white border-[#E6D8C7] text-[#38271C] hover:border-[#806A56]'
                  }`}
                >
                  {mins} mins
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E6D8C7]">
              <button
                type="button"
                onClick={() => setReminderModalClass(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#806A56] hover:bg-[#F3E9DD] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReminder}
                className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                {reminders[reminderModalClass.id]?.enabled
                  ? 'Turn Off'
                  : 'Save Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
