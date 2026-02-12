/**
 * Timesheet Business Rules Processor
 * 
 * Applies company policy rules to raw attendance data:
 * - Shift type detection (day/night) based on check-in time
 * - Late status based on configurable threshold
 * - Overtime calculation with min/max caps per shift type
 * - First-In / Last-Out consolidation for multiple entries
 * - Cross-midnight shift handling
 */

export interface PolicyValues {
  // Shift config
  dayShiftStart: string;      // e.g. "08:00"
  dayShiftEnd: string;        // e.g. "17:00"
  nightShiftStart: string;    // e.g. "18:00"
  nightShiftEnd: string;      // e.g. "03:00"
  shiftDetectionThreshold: string; // e.g. "18:00" — check-in >= this = night
  earlyCheckinCountsOT: boolean;
  crossMidnightDetection: boolean;

  // Attendance
  workStartTime: string;      // e.g. "08:00"
  workEndTime: string;        // e.g. "17:00"
  lateThresholdMinutes: number;
  gracePeriodMinutes: number;
  halfDayHours: number;
  minHoursFullDay: number;

  // Overtime
  otEnabled: boolean;
  dayShiftOTStart: string;    // e.g. "17:00"
  dayShiftOTMinMinutes: number;
  dayShiftOTMaxHours: number;
  nightShiftOTStart: string;  // e.g. "03:00"
  nightShiftOTMinMinutes: number;
  nightShiftOTMaxHours: number;
  otRoundingIncrement: number;
  otThresholdMinutes: number;
}

export interface ProcessedAttendance {
  shiftType: 'day' | 'night';
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  status: 'present' | 'late' | 'absent' | 'half_day';
  effectiveClockIn: Date | null;
  effectiveClockOut: Date | null;
}

/** Extract hours and minutes from "HH:MM" string */
function parseTimeStr(t: string): { hours: number; minutes: number } {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

/** Convert a Date to minutes since midnight */
function toMinutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Build default policy values from the getPolicyValue function */
export function buildPolicyValues(
  get: (category: string, key: string, defaultVal?: string) => string
): PolicyValues {
  return {
    dayShiftStart: get('shift', 'day_shift_start', '08:00'),
    dayShiftEnd: get('shift', 'day_shift_end', '17:00'),
    nightShiftStart: get('shift', 'night_shift_start', '18:00'),
    nightShiftEnd: get('shift', 'night_shift_end', '03:00'),
    shiftDetectionThreshold: get('shift', 'shift_detection_threshold', '18:00'),
    earlyCheckinCountsOT: get('shift', 'early_checkin_counts_ot', 'false') === 'true',
    crossMidnightDetection: get('shift', 'cross_midnight_detection', 'true') === 'true',

    workStartTime: get('attendance', 'work_start_time', '08:00'),
    workEndTime: get('attendance', 'work_end_time', '17:00'),
    lateThresholdMinutes: Number(get('attendance', 'late_threshold_minutes', '15')) || 15,
    gracePeriodMinutes: Number(get('attendance', 'grace_period_minutes', '5')) || 5,
    halfDayHours: Number(get('attendance', 'half_day_hours', '4')) || 4,
    minHoursFullDay: Number(get('attendance', 'min_hours_full_day', '7')) || 7,

    otEnabled: get('overtime', 'ot_enabled', 'true') === 'true',
    dayShiftOTStart: get('overtime', 'day_shift_ot_start', '17:00'),
    dayShiftOTMinMinutes: Number(get('overtime', 'day_shift_ot_min_minutes', '30')) || 30,
    dayShiftOTMaxHours: Number(get('overtime', 'day_shift_ot_max_hours', '1.5')) || 1.5,
    nightShiftOTStart: get('overtime', 'night_shift_ot_start', '03:00'),
    nightShiftOTMinMinutes: Number(get('overtime', 'night_shift_ot_min_minutes', '30')) || 30,
    nightShiftOTMaxHours: Number(get('overtime', 'night_shift_ot_max_hours', '3')) || 3,
    otRoundingIncrement: Number(get('overtime', 'ot_rounding_increment', '15')) || 15,
    otThresholdMinutes: Number(get('overtime', 'ot_threshold_minutes', '30')) || 30,
  };
}

/** Round minutes to nearest increment */
function roundToIncrement(minutes: number, increment: number): number {
  if (increment <= 0) return minutes;
  return Math.round(minutes / increment) * increment;
}

/**
 * Process a single day's attendance record using policy rules.
 */
export function processAttendanceRecord(
  clockIn: Date | null,
  clockOut: Date | null,
  policy: PolicyValues
): ProcessedAttendance {
  // No data = absent
  if (!clockIn && !clockOut) {
    return {
      shiftType: 'day',
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      status: 'absent',
      effectiveClockIn: null,
      effectiveClockOut: null,
    };
  }

  // ── Shift type detection ──
  const threshold = parseTimeStr(policy.shiftDetectionThreshold);
  const thresholdMinutes = threshold.hours * 60 + threshold.minutes;
  const clockInMinutes = clockIn ? toMinutesSinceMidnight(clockIn) : 0;
  const isNightShift = clockIn ? clockInMinutes >= thresholdMinutes : false;
  const shiftType: 'day' | 'night' = isNightShift ? 'night' : 'day';

  // ── Total hours ──
  let totalHours = 0;
  if (clockIn && clockOut) {
    let diffMs = clockOut.getTime() - clockIn.getTime();
    // Cross-midnight: if checkout is before checkin, add 24h
    if (diffMs < 0 && policy.crossMidnightDetection) {
      diffMs += 24 * 60 * 60 * 1000;
    }
    totalHours = Math.max(0, diffMs / (1000 * 60 * 60));
  }

  // ── Late detection ──
  const workStart = parseTimeStr(shiftType === 'day' ? policy.workStartTime : policy.nightShiftStart);
  const workStartMinutes = workStart.hours * 60 + workStart.minutes;
  const graceMinutes = policy.gracePeriodMinutes;
  const lateThreshold = policy.lateThresholdMinutes;
  
  let isLate = false;
  if (clockIn) {
    const minutesAfterStart = clockInMinutes - workStartMinutes;
    // For night shifts starting at e.g. 18:00 and check-in at 18:20
    isLate = minutesAfterStart > (lateThreshold + graceMinutes);
  }

  // ── Status determination ──
  let status: ProcessedAttendance['status'] = 'present';
  if (!clockIn && !clockOut) {
    status = 'absent';
  } else if (totalHours > 0 && totalHours < policy.halfDayHours) {
    status = 'half_day';
  } else if (isLate) {
    status = 'late';
  }

  // ── Overtime calculation ──
  let overtimeHours = 0;
  if (policy.otEnabled && clockIn && clockOut) {
    if (shiftType === 'day') {
      // Day shift OT: time worked after dayShiftOTStart
      const otStart = parseTimeStr(policy.dayShiftOTStart);
      const otStartMinutes = otStart.hours * 60 + otStart.minutes;
      const clockOutMinutes = toMinutesSinceMidnight(clockOut);
      
      if (clockOutMinutes > otStartMinutes) {
        const otMinutes = clockOutMinutes - otStartMinutes;
        // Check minimum threshold
        if (otMinutes >= policy.dayShiftOTMinMinutes) {
          const rounded = roundToIncrement(otMinutes, policy.otRoundingIncrement);
          overtimeHours = Math.min(rounded / 60, policy.dayShiftOTMaxHours);
        }
      }
    } else {
      // Night shift OT: time worked after nightShiftOTStart (next day)
      const otStart = parseTimeStr(policy.nightShiftOTStart);
      const otStartMinutes = otStart.hours * 60 + otStart.minutes;
      const clockOutMinutes = toMinutesSinceMidnight(clockOut);
      
      // Night shift checkout is typically early morning (before noon)
      // OT starts after e.g. 03:00
      if (clockOutMinutes <= 12 * 60 && clockOutMinutes > otStartMinutes) {
        const otMinutes = clockOutMinutes - otStartMinutes;
        if (otMinutes >= policy.nightShiftOTMinMinutes) {
          const rounded = roundToIncrement(otMinutes, policy.otRoundingIncrement);
          overtimeHours = Math.min(rounded / 60, policy.nightShiftOTMaxHours);
        }
      }
    }
  }

  // Round to 2 decimals
  totalHours = Math.round(totalHours * 100) / 100;
  overtimeHours = Math.round(overtimeHours * 100) / 100;
  const regularHours = Math.round(Math.max(0, totalHours - overtimeHours) * 100) / 100;

  return {
    shiftType,
    totalHours,
    regularHours,
    overtimeHours,
    status,
    effectiveClockIn: clockIn,
    effectiveClockOut: clockOut,
  };
}
