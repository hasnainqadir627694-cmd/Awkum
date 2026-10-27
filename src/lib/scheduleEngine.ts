/**
 * Schedule Engine & Deterministic Recurrence Calculator
 * AWKUM ClassHub — Asia/Karachi Timezone Authority
 */

export type WeekdayCode =
  | 'Mon'
  | 'Tue'
  | 'Wed'
  | 'Thu'
  | 'Fri'
  | 'Sat'
  | 'Sun'
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun';

export const WEEKDAYS_ORDER: WeekdayCode[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEKDAY_FULL_NAMES: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

export interface RecurringScheduleEntry {
  id: string;
  day: WeekdayCode;
  startTime: string; // "09:00"
  endTime: string;   // "10:30"
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  code?: string;
  room?: string;
  teacherName?: string;
  teacherEmail?: string;
  notes?: string;
}

export interface RecurringSchedule {
  id: string;
  classId: string;
  version?: number;
  publishedVersion?: number;
  semester?: string;
  startDate?: string;
  endDate?: string;
  publishedAt?: string;
  updatedAt?: string;
  createdAt?: string;
  notes?: string;
  publishedBy?: {
    uid: string;
    email: string;
    name: string;
  };
  items: RecurringScheduleEntry[];
  status?: 'draft' | 'published';
  activeDays?: WeekdayCode[];
}

export interface ScheduleOverrideItem {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  entryId: string;
  type: 'cancelled' | 'rescheduled' | 'cancel' | 'reschedule';
  rescheduledStartTime?: string;
  rescheduledEndTime?: string;
  rescheduledRoom?: string;
  rescheduledTeacher?: string;
  reason?: string;
  createdAt?: string;
  createdBy?: any;
}

export interface ScheduledClassOccurrence {
  id: string;
  occurrenceId?: string;
  entryId: string;
  classId: string;
  date: string;
  day: WeekdayCode;
  startTime: string;
  endTime: string;
  originalStartTime?: string;
  originalEndTime?: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  code?: string;
  room?: string;
  teacherName?: string;
  teacherEmail?: string;
  status: 'scheduled' | 'cancelled' | 'rescheduled';
  isCancelled?: boolean;
  isRescheduled?: boolean;
  cancelReason?: string;
  rescheduleReason?: string;
  override?: ScheduleOverrideItem;
}

export interface ScheduleCountdown {
  type: 'starts_in' | 'active' | 'upcoming' | 'break' | 'none';
  hours?: number;
  minutes?: number;
  seconds?: number;
  formatted: string;
  progressPercentage: number;
}

export interface LiveScheduleState {
  status: 'in_progress' | 'upcoming' | 'completed' | 'none';
  state?: 'active' | 'break' | 'upcoming' | 'completed_today' | 'no_classes_today' | 'completed' | 'none' | 'in_progress';
  currentClass?: ScheduledClassOccurrence;
  nextClass?: ScheduledClassOccurrence;
  minutesUntilNext?: number;
  minutesRemainingInCurrent?: number;
  countdown?: ScheduleCountdown;
  todayClasses?: ScheduledClassOccurrence[];
  todayOccurrences: ScheduledClassOccurrence[];
}

/**
 * Converts "HH:mm" (24h) or "hh:mm AM/PM" (12h) string to total minutes from midnight
 */
export function timeStringToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();

  // Check for 12-hour format with AM/PM (e.g. "09:00 AM", "02:30 PM", "12:15 PM")
  const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([APap][Mm])$/);
  if (match12) {
    let hours = parseInt(match12[1], 10) || 0;
    const minutes = parseInt(match12[2], 10) || 0;
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  }

  // Check for 24-hour format (e.g. "09:00", "14:30")
  const parts = clean.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Formats total minutes from midnight to canonical "hh:mm A" string (e.g. "09:00 AM")
 */
export function formatMinutesTo12Hour(totalMinutes: number): string {
  const norm = Math.max(0, Math.floor(totalMinutes)) % (24 * 60);
  const h24 = Math.floor(norm / 60);
  const m = norm % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Parses any time string into its 12-hour components: hour (1-12), minute (0-59), period ('AM' | 'PM')
 */
export function parse12HourTime(timeStr?: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  if (!timeStr) return { hour: 9, minute: 0, period: 'AM' };
  const clean = timeStr.trim();

  const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([APap][Mm])$/);
  if (match12) {
    let hour = parseInt(match12[1], 10) || 12;
    if (hour < 1 || hour > 12) hour = 12;
    let minute = parseInt(match12[2], 10) || 0;
    if (minute < 0 || minute > 59) minute = 0;
    const period = match12[3].toUpperCase() === 'PM' ? 'PM' : 'AM';
    return { hour, minute, period };
  }

  // Fallback for 24h format (e.g. "14:30")
  const parts = clean.split(':');
  const h24 = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const hour = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour, minute: Math.max(0, Math.min(59, m)), period };
}

/**
 * Converts minutes from midnight to "HH:mm" string
 */
export function minutesToTimeString(minutes: number): string {
  const norm = Math.max(0, Math.floor(minutes));
  const h = Math.floor(norm / 60) % 24;
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Normalizes any weekday representation to canonical lowercase
 */
export function normalizeWeekday(day: string): WeekdayCode {
  const lower = (day || '').trim().toLowerCase().slice(0, 3);
  const map: Record<string, WeekdayCode> = {
    mon: 'mon',
    tue: 'tue',
    wed: 'wed',
    thu: 'thu',
    fri: 'fri',
    sat: 'sat',
    sun: 'sun',
  };
  return map[lower] || 'mon';
}

/**
 * Returns current timestamp & breakdown in Asia/Karachi (UTC+5)
 */
export function getKarachiDateTime(refDate?: Date) {
  const now = refDate || new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  let year = '';
  let month = '';
  let day = '';
  let weekdayShort = '';
  let hourStr = '00';
  let minuteStr = '00';
  let secondStr = '00';

  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'day') day = part.value;
    if (part.type === 'weekday') weekdayShort = part.value;
    if (part.type === 'hour') hourStr = part.value;
    if (part.type === 'minute') minuteStr = part.value;
    if (part.type === 'second') secondStr = part.value;
  }

  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const totalMinutes = hour * 60 + minute;
  const date = `${year}-${month}-${day}`;
  const time = `${hourStr.padStart(2, '0')}:${minuteStr.padStart(2, '0')}`;

  const canonicalDay = normalizeWeekday(weekdayShort);
  const dayOfMonth = parseInt(day, 10) || 1;

  return {
    date,
    dateString: date,
    time,
    dayOfWeek: canonicalDay,
    weekday: canonicalDay,
    day: dayOfMonth,
    dateNum: dayOfMonth,
    hour,
    minute,
    second: parseInt(secondStr, 10) || 0,
    totalMinutes,
  };
}

/**
 * Returns WeekdayCode for a date string "YYYY-MM-DD" in Asia/Karachi
 */
export function getWeekdayForDateString(dateStr: string): WeekdayCode {
  if (!dateStr) return 'mon';
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayIndex = dateObj.getUTCDay(); // 0 is Sunday, 1 is Monday
  const map: WeekdayCode[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[dayIndex] || 'mon';
}

/**
 * Returns list of distinct active weekdays from schedule entries
 */
export function extractActiveWeekdays(entries?: RecurringScheduleEntry[]): WeekdayCode[] {
  if (!Array.isArray(entries)) return [];
  const set = new Set(entries.map((e) => normalizeWeekday(e.day)));
  return WEEKDAYS_ORDER.filter((w) => set.has(w));
}

/**
 * Validates schedule draft for time sanity and overlapping class periods
 */
export function validateScheduleDraft(
  scheduleOrEntries: RecurringSchedule | RecurringScheduleEntry[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: { entryA: RecurringScheduleEntry; entryB: RecurringScheduleEntry; reason: string }[];
} {
  const items: RecurringScheduleEntry[] = Array.isArray(scheduleOrEntries)
    ? scheduleOrEntries
    : scheduleOrEntries?.items || [];

  const errors: string[] = [];
  const warnings: string[] = [];
  const conflicts: { entryA: RecurringScheduleEntry; entryB: RecurringScheduleEntry; reason: string }[] = [];

  if (items.length === 0) {
    warnings.push('The schedule currently contains zero class periods.');
  }

  // Check period overlaps within the same day
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    const dayA = normalizeWeekday(a.day);
    const startA = timeStringToMinutes(a.startTime);
    const endA = timeStringToMinutes(a.endTime);

    if (endA <= startA) {
      errors.push(`Period ${a.subjectName || a.id} (${WEEKDAY_FULL_NAMES[dayA]}): End time must be after start time.`);
    }

    for (let j = i + 1; j < items.length; j++) {
      const b = items[j];
      const dayB = normalizeWeekday(b.day);
      if (dayA !== dayB) continue;

      const startB = timeStringToMinutes(b.startTime);
      const endB = timeStringToMinutes(b.endTime);

      // Overlap condition
      if (startA < endB && endA > startB) {
        const desc = `Time conflict on ${WEEKDAY_FULL_NAMES[dayA]}: "${a.subjectName}" (${a.startTime}-${a.endTime}) overlaps with "${b.subjectName}" (${b.startTime}-${b.endTime}).`;
        errors.push(desc);
        conflicts.push({ entryA: a, entryB: b, reason: desc });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    conflicts,
  };
}

/**
 * Resolves recurring schedule entries into concrete occurrences for a specific calendar date,
 * taking date-specific cancellations and reschedules into account.
 */
export function getOccurrencesForDate(
  schedule?: RecurringSchedule | null,
  targetDate?: string,
  overrides?: ScheduleOverrideItem[]
): ScheduledClassOccurrence[] {
  if (!schedule || !Array.isArray(schedule.items) || schedule.items.length === 0) {
    return [];
  }

  const karachi = getKarachiDateTime();
  const dateStr = targetDate || karachi.date;
  const targetDay = getWeekdayForDateString(dateStr);

  const dayEntries = schedule.items.filter((item) => normalizeWeekday(item.day) === targetDay);
  const relevantOverrides = (overrides || []).filter((o) => o.date === dateStr);

  const occurrences: ScheduledClassOccurrence[] = [];

  for (const entry of dayEntries) {
    const override = relevantOverrides.find((o) => o.entryId === entry.id);
    let status: 'scheduled' | 'cancelled' | 'rescheduled' = 'scheduled';
    let startTime = entry.startTime;
    let endTime = entry.endTime;
    let room = entry.room;
    let isCancelled = false;
    let isRescheduled = false;
    let cancelReason: string | undefined;
    let rescheduleReason: string | undefined;

    if (override) {
      if (override.type === 'cancel' || override.type === 'cancelled') {
        status = 'cancelled';
        isCancelled = true;
        cancelReason = override.reason;
      } else if (override.type === 'reschedule' || override.type === 'rescheduled') {
        status = 'rescheduled';
        isRescheduled = true;
        rescheduleReason = override.reason;
        if (override.rescheduledStartTime) startTime = override.rescheduledStartTime;
        if (override.rescheduledEndTime) endTime = override.rescheduledEndTime;
        if (override.rescheduledRoom) room = override.rescheduledRoom;
      }
    }

    const occurrenceId = `${schedule.classId}_${dateStr}_${entry.id}`;

    occurrences.push({
      id: occurrenceId,
      occurrenceId,
      entryId: entry.id,
      classId: schedule.classId,
      date: dateStr,
      day: targetDay,
      startTime,
      endTime,
      originalStartTime: entry.startTime,
      originalEndTime: entry.endTime,
      subjectId: entry.subjectId,
      subjectName: entry.subjectName,
      subjectCode: entry.subjectCode || entry.code,
      code: entry.code || entry.subjectCode,
      room,
      teacherName: entry.teacherName,
      teacherEmail: entry.teacherEmail,
      status,
      isCancelled,
      isRescheduled,
      cancelReason,
      rescheduleReason,
      override,
    });
  }

  // Sort occurrences by start time
  occurrences.sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));
  return occurrences;
}

/**
 * Calculates real-time live schedule state for Karachi timezone:
 * Current ongoing class, next upcoming class, countdown minutes, and today's occurrences.
 */
export function calculateLiveScheduleState(
  schedule?: RecurringSchedule | null,
  overrides?: ScheduleOverrideItem[],
  refDate?: Date
): LiveScheduleState {
  const karachi = getKarachiDateTime(refDate);
  const todayOccurrences = getOccurrencesForDate(schedule, karachi.date, overrides);

  if (todayOccurrences.length === 0) {
    return {
      status: 'none',
      state: 'no_classes_today',
      todayClasses: [],
      todayOccurrences: [],
    };
  }

  const currentMinutes = karachi.totalMinutes;
  let currentClass: ScheduledClassOccurrence | undefined;
  let nextClass: ScheduledClassOccurrence | undefined;

  for (const occ of todayOccurrences) {
    if (occ.status === 'cancelled' || occ.isCancelled) continue;

    const startM = timeStringToMinutes(occ.startTime);
    const endM = timeStringToMinutes(occ.endTime);

    // Active in progress
    if (currentMinutes >= startM && currentMinutes < endM) {
      currentClass = occ;
      break;
    }

    // Next upcoming
    if (currentMinutes < startM && !nextClass) {
      nextClass = occ;
    }
  }

  // Determine overall status
  if (currentClass) {
    const startM = timeStringToMinutes(currentClass.startTime);
    const endM = timeStringToMinutes(currentClass.endTime);
    const totalDuration = Math.max(1, endM - startM);
    const elapsed = Math.max(0, currentMinutes - startM);
    const remaining = Math.max(0, endM - currentMinutes);
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    const countdownHours = Math.floor(remaining / 60);
    const countdownMins = remaining % 60;
    const formatted = countdownHours > 0 ? `${countdownHours}h ${countdownMins}m` : `${countdownMins}m`;

    return {
      status: 'in_progress',
      state: 'active',
      currentClass,
      nextClass,
      minutesRemainingInCurrent: remaining,
      minutesUntilNext: nextClass ? timeStringToMinutes(nextClass.startTime) - currentMinutes : undefined,
      countdown: {
        type: 'active',
        hours: countdownHours,
        minutes: countdownMins,
        formatted,
        progressPercentage: progress,
      },
      todayClasses: todayOccurrences,
      todayOccurrences,
    };
  }

  if (nextClass) {
    const startM = timeStringToMinutes(nextClass.startTime);
    const until = Math.max(0, startM - currentMinutes);
    const countdownHours = Math.floor(until / 60);
    const countdownMins = until % 60;
    const formatted = countdownHours > 0 ? `${countdownHours}h ${countdownMins}m` : `${countdownMins}m`;

    const hasPreviousClass = todayOccurrences.some(
      (occ) => !occ.isCancelled && timeStringToMinutes(occ.endTime) <= currentMinutes
    );

    return {
      status: 'upcoming',
      state: hasPreviousClass ? 'break' : 'upcoming',
      nextClass,
      minutesUntilNext: until,
      countdown: {
        type: 'starts_in',
        hours: countdownHours,
        minutes: countdownMins,
        formatted,
        progressPercentage: 0,
      },
      todayClasses: todayOccurrences,
      todayOccurrences,
    };
  }

  const hadClassesToday = todayOccurrences.some((occ) => !occ.isCancelled);
  return {
    status: 'completed',
    state: hadClassesToday ? 'completed_today' : 'no_classes_today',
    todayClasses: todayOccurrences,
    todayOccurrences,
  };
}
