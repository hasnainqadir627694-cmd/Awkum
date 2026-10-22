import React, { useState, useEffect } from 'react';
import {
  BellRing,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  UserCheck,
  ShieldCheck,
  History,
} from 'lucide-react';
import { ScheduleItem } from '../../data/portalData';
import {
  sendTeacherAlert,
  getTeacherAlertHistory,
  getAlertCooldownSeconds,
  TeacherAlertRecord,
} from '../../lib/teacherAlertService';

interface CRNotifyTeacherViewProps {
  assignedClass: string;
  crUser: { id: string; name: string; email: string };
  todaySchedule: ScheduleItem[];
  preselectedClass?: ScheduleItem;
  onBackToDashboard: () => void;
}

export const CRNotifyTeacherView: React.FC<CRNotifyTeacherViewProps> = ({
  assignedClass,
  crUser,
  todaySchedule,
  preselectedClass,
  onBackToDashboard,
}) => {
  const [selectedClassItem, setSelectedClassItem] = useState<ScheduleItem | null>(
    preselectedClass || todaySchedule[0] || null
  );
  const [alertHistory, setAlertHistory] = useState<TeacherAlertRecord[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load alert history on mount
  useEffect(() => {
    getTeacherAlertHistory(assignedClass).then(setAlertHistory);
  }, [assignedClass]);

  const handleSendAlert = async () => {
    if (!selectedClassItem) return;

    setStatusFeedback(null);
    setIsSending(true);

    try {
      const cooldown = getAlertCooldownSeconds(assignedClass, selectedClassItem.subjectName);
      if (cooldown > 0) {
        setStatusFeedback({
          type: 'error',
          text: `Cooldown active: Please wait ${cooldown} seconds before reminding ${selectedClassItem.teacher} again.`,
        });
        setIsSending(false);
        return;
      }

      const teacherEmail = `${selectedClassItem.teacher.toLowerCase().replace(/[^a-z]/g, '')}@awkum.edu.pk`;

      const result = await sendTeacherAlert({
        classId: assignedClass,
        subjectName: selectedClassItem.subjectName,
        teacherName: selectedClassItem.teacher,
        teacherEmail,
        scheduledTime: selectedClassItem.time,
        room: selectedClassItem.room,
        sentByCRName: crUser.name,
        sentByCREmail: crUser.email,
      });

      if (!result.success) {
        setStatusFeedback({
          type: 'error',
          text: result.error || 'Failed to dispatch alert.',
        });
        setIsSending(false);
        return;
      }

      setStatusFeedback({
        type: 'success',
        text: `Reminder successfully sent to ${selectedClassItem.teacher}! Logged in university audit registry.`,
      });

      // Refresh alert history
      if (result.alert) {
        setAlertHistory((prev) => [result.alert!, ...prev]);
      }
    } catch (err: any) {
      setStatusFeedback({
        type: 'error',
        text: err?.message || 'Failed to dispatch notification.',
      });
    } finally {
      setIsSending(false);
    }
  };

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
          Notify Assigned Faculty / Teacher
        </h1>
        <p className="text-xs text-[#806A56] mt-0.5">
          Send scheduled class arrival reminders directly to your class instructor
        </p>
      </div>

      {/* Status Feedback */}
      {statusFeedback && (
        <div
          className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-semibold animate-in fade-in ${
            statusFeedback.type === 'success'
              ? 'bg-[#EAF2E9] border border-[#C5DEC3] text-[#668064]'
              : 'bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31]'
          }`}
        >
          {statusFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{statusFeedback.text}</span>
        </div>
      )}

      {/* 2. Select Upcoming Class from Timetable */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-3">
        <span className="text-xs font-bold text-[#38271C] block">
          1. Select Scheduled Class from Timetable:
        </span>

        <div className="space-y-2">
          {todaySchedule.map((cls) => {
            const isSelected = selectedClassItem?.id === cls.id;
            return (
              <div
                key={cls.id}
                onClick={() => {
                  setSelectedClassItem(cls);
                  setStatusFeedback(null);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-white border-[#493222] shadow-xs ring-1 ring-[#493222]'
                    : 'bg-white/60 border-[#E6D8C7] hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#38271C]">{cls.subjectName}</span>
                    <span className="text-[10px] text-[#806A56] font-mono">{cls.time}</span>
                  </div>
                  <p className="text-xs text-[#806A56] mt-0.5">
                    Instructor: <strong className="text-[#38271C]">{cls.teacher}</strong> · {cls.room}
                  </p>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-[#493222] bg-[#493222] text-[#FFF9F1]' : 'border-[#D8C7B4]'
                  }`}
                >
                  {isSelected && <span className="w-2 h-2 rounded-full bg-[#FFF9F1]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Dispatch Notification Confirmation Box */}
        {selectedClassItem && (
          <div className="mt-4 pt-4 border-t border-[#E6D8C7] space-y-3">
            <span className="text-xs font-bold text-[#38271C] block">
              2. Notification Preview:
            </span>

            <div className="p-3.5 bg-white border border-[#E6D8C7] rounded-2xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#806A56]">Recipient:</span>
                <span className="font-bold text-[#38271C]">{selectedClassItem.teacher}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806A56]">Subject & Room:</span>
                <span className="font-bold text-[#38271C]">
                  {selectedClassItem.subjectName} ({selectedClassItem.room})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806A56]">Scheduled Time:</span>
                <span className="font-bold text-[#38271C]">{selectedClassItem.time}</span>
              </div>
              <div className="pt-2 border-t border-[#E6D8C7] text-[11px] text-[#806A56] italic">
                &quot;Your upcoming {selectedClassItem.subjectName} class for {assignedClass} ({selectedClassItem.time} at {selectedClassItem.room}) is approaching. Class students are assembled.&quot;
              </div>
            </div>

            <button
              type="button"
              disabled={isSending}
              onClick={handleSendAlert}
              className="w-full py-3 px-4 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-98"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Sending Alert...' : `Send Notification to ${selectedClassItem.teacher}`}</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Alert History Registry */}
      <div className="p-4 bg-white border border-[#E6D8C7] rounded-3xl space-y-3 shadow-2xs">
        <span className="text-xs font-bold text-[#38271C] flex items-center gap-1.5">
          <History className="w-4 h-4 text-[#806A56]" /> Previous Alerts Dispatched
        </span>

        {alertHistory.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#806A56]">
            No teacher notifications sent yet today.
          </div>
        ) : (
          <div className="divide-y divide-[#E6D8C7]">
            {alertHistory.map((al) => (
              <div key={al.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#38271C]">{al.teacherName}</span>
                    <span className="text-[10px] px-2 py-0.2 bg-[#EFE3D3] text-[#493222] font-semibold rounded">
                      {al.subjectName}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#806A56] block mt-0.5">
                    Sent at {al.sentAt} · {al.room}
                  </span>
                </div>

                <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                  {al.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
