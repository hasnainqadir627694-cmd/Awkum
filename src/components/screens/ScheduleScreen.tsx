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
} from 'lucide-react';
import { ScheduleItem } from '../../data/portalData';

interface ScheduleScreenProps {
  scheduleItems: ScheduleItem[];
  reminders: Record<string, { enabled: boolean; minutes: number }>;
  onToggleReminder: (classId: string, minutes: number) => void;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  scheduleItems,
  reminders,
  onToggleReminder,
}) => {
  const dayNames: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const todayDayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon ... 5 = Fri
  const currentWeekday = todayDayIndex >= 1 && todayDayIndex <= 5 ? dayNames[todayDayIndex - 1] : 'Mon';

  const [viewMode, setViewMode] = useState<'today' | 'weekly'>('today');
  const [selectedDay, setSelectedDay] = useState<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'>(currentWeekday);
  const [reminderModalClass, setReminderModalClass] = useState<ScheduleItem | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(15);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const days: { day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'; date: number; label: string }[] = [
    { day: 'Mon', date: 20, label: 'Mon' },
    { day: 'Tue', date: 21, label: 'Tue' },
    { day: 'Wed', date: 22, label: 'Wed' },
    { day: 'Thu', date: 23, label: 'Thu' },
    { day: 'Fri', date: 24, label: 'Fri' },
  ];

  // In "today" mode, show current weekday. In "weekly" mode, show selected day.
  const activeDay = viewMode === 'today' ? currentWeekday : selectedDay;
  const filteredClasses = scheduleItems.filter((item) => item.day === activeDay);

  const getSubjectIcon = (subjectId: string) => {
    switch (subjectId) {
      case 'pf-theory':
        return <Code2 className="w-4 h-4 text-[#493222]" />;
      case 'pf-lab':
        return <Monitor className="w-4 h-4 text-[#493222]" />;
      case 'management':
        return <Briefcase className="w-4 h-4 text-[#493222]" />;
      case 'english':
        return <BookOpen className="w-4 h-4 text-[#493222]" />;
      case 'maths':
        return <Calculator className="w-4 h-4 text-[#493222]" />;
      case 'physics':
        return <Atom className="w-4 h-4 text-[#493222]" />;
      default:
        return <BookOpen className="w-4 h-4 text-[#493222]" />;
    }
  };

  const handleSaveReminder = () => {
    if (!reminderModalClass) return;
    onToggleReminder(reminderModalClass.id, selectedMinutes);
    const isNowEnabled = !reminders[reminderModalClass.id]?.enabled;
    setToastMessage(
      isNowEnabled
        ? `Reminder set for ${reminderModalClass.subjectName} (${selectedMinutes}m prior).`
        : `Reminder cancelled for ${reminderModalClass.subjectName}.`
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
            My Schedule
          </h2>
          <p className="text-xs font-medium text-[#806A56] mt-0.5">
            View timetable and configure class reminders
          </p>
        </div>
      </div>

      {/* View Mode Toggle: Today vs Weekly (matching reference Screen 03) */}
      <div className="flex items-center p-1 bg-[#EFE3D3] rounded-xl border border-[#E6D8C7]">
        <button
          onClick={() => setViewMode('today')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            viewMode === 'today'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setViewMode('weekly')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            viewMode === 'weekly'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          Weekly
        </button>
      </div>

      {/* Day Selector (Week days horizontal strip) */}
      <div className="flex items-center justify-between gap-1.5 px-0.5">
        {days.map((item) => {
          const isSelected = activeDay === item.day;
          const isToday = item.day === 'Wed';

          return (
            <button
              key={item.day}
              onClick={() => {
                if (viewMode === 'today') setViewMode('weekly');
                setSelectedDay(item.day);
              }}
              className={`flex-1 flex flex-col items-center py-2 px-1 rounded-2xl border transition-all ${
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
                {item.date}
              </span>
              {isToday && (
                <span
                  className={`w-1 h-1 rounded-full mt-1 ${
                    isSelected ? 'bg-[#668064]' : 'bg-[#493222]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule Items List */}
      <div className="space-y-3">
        {filteredClasses.length === 0 ? (
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-8 text-center">
            <Calendar className="w-8 h-8 text-[#806A56] mx-auto mb-2" />
            <h4 className="text-sm font-bold text-[#38271C]">
              No Classes Scheduled
            </h4>
            <p className="text-xs text-[#806A56] mt-1">
              There are no lecture or laboratory sessions recorded for this day.
            </p>
          </div>
        ) : (
          filteredClasses.map((item) => {
            const isReminderActive = reminders[item.id]?.enabled;
            const isNext = item.startsIn !== undefined;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all shadow-xs ${
                  isNext
                    ? 'bg-[#FFFDF9] border-[#493222] ring-1 ring-[#493222]/20'
                    : 'bg-[#FFF9F1] border-[#E6D8C7]'
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Left: Time & Icon & Details */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F8F0E5] border border-[#E6D8C7] flex items-center justify-center shrink-0">
                      {getSubjectIcon(item.subjectId)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#806A56]">
                          {item.startTime}
                        </span>
                        {isNext && (
                          <span className="text-[10px] font-bold text-[#668064] bg-[#EAF2E9] px-1.5 py-0.2 rounded">
                            Next Class
                          </span>
                        )}
                        {item.status === 'completed' && (
                          <span className="text-[10px] font-semibold text-[#806A56] bg-[#EFE3D3] px-1.5 py-0.2 rounded">
                            Completed
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-[#38271C] mt-0.5">
                        {item.subjectName}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-[#806A56] mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{item.room}</span>
                        </span>
                        <span>·</span>
                        <span>{item.teacher}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Reminder Bell & Options */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setReminderModalClass(item);
                        setSelectedMinutes(reminders[item.id]?.minutes || 15);
                      }}
                      className={`p-2 rounded-xl transition-colors ${
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
                    <button
                      onClick={() => {
                        setReminderModalClass(item);
                        setSelectedMinutes(reminders[item.id]?.minutes || 15);
                      }}
                      className="p-1.5 text-[#806A56] hover:text-[#38271C] rounded-lg"
                      aria-label="More class options"
                    >
                      <MoreVertical className="w-4 h-4" />
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
                  Class Reminder
                </h3>
                <p className="text-xs text-[#806A56]">
                  {reminderModalClass.subjectName} · {reminderModalClass.startTime}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#806A56] mb-4">
              Select how many minutes before class you want to receive an alert:
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setSelectedMinutes(mins)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
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
                className="px-3 py-1.5 text-xs font-semibold text-[#806A56] hover:bg-[#F3E9DD] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReminder}
                className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-colors shadow-xs"
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
