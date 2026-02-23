/**
 * Rwandan Public Holidays
 * 
 * Provides fixed and computed public holidays for Rwanda.
 * Used for attendance calculations, leave planning, and OT tracking.
 * 
 * Reference: Labour Law of Rwanda + Government gazette
 */

export interface PublicHoliday {
  date: Date;
  name: string;
  type: 'fixed' | 'moveable';
}

/**
 * Fixed Rwandan public holidays (month is 0-indexed).
 * These dates don't change year to year.
 */
const FIXED_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 0, day: 1, name: "New Year's Day" },
  { month: 1, day: 1, name: "National Heroes' Day" },
  { month: 3, day: 7, name: "Genocide Memorial Day" },
  { month: 4, day: 1, name: "Labour Day" },
  { month: 6, day: 1, name: "Independence Day" },
  { month: 6, day: 4, name: "Liberation Day" },
  { month: 7, day: 15, name: "Assumption Day" },
  { month: 11, day: 25, name: "Christmas Day" },
  { month: 11, day: 26, name: "Boxing Day" },
];

/**
 * Calculate Easter Sunday using the Anonymous Gregorian algorithm.
 */
function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/**
 * Get all Rwandan public holidays for a given year.
 */
export function getRwandanHolidays(year: number): PublicHoliday[] {
  const holidays: PublicHoliday[] = [];

  // Fixed holidays
  for (const h of FIXED_HOLIDAYS) {
    holidays.push({
      date: new Date(year, h.month, h.day),
      name: h.name,
      type: 'fixed',
    });
  }

  // Moveable holidays based on Easter
  const easter = calculateEasterSunday(year);
  
  // Good Friday = Easter - 2 days
  const goodFriday = new Date(easter);
  goodFriday.setDate(goodFriday.getDate() - 2);
  holidays.push({ date: goodFriday, name: 'Good Friday', type: 'moveable' });

  // Easter Monday = Easter + 1 day  
  const easterMonday = new Date(easter);
  easterMonday.setDate(easterMonday.getDate() + 1);
  holidays.push({ date: easterMonday, name: 'Easter Monday', type: 'moveable' });

  // Eid al-Fitr and Eid al-Adha are also recognized but dates vary by Islamic calendar
  // These would need to be manually added per year or computed from Islamic calendar

  // Sort by date
  holidays.sort((a, b) => a.date.getTime() - b.date.getTime());

  return holidays;
}

/**
 * Check if a specific date is a Rwandan public holiday.
 */
export function isPublicHoliday(date: Date): PublicHoliday | null {
  const holidays = getRwandanHolidays(date.getFullYear());
  return holidays.find(h => 
    h.date.getFullYear() === date.getFullYear() &&
    h.date.getMonth() === date.getMonth() &&
    h.date.getDate() === date.getDate()
  ) || null;
}

/**
 * Count working days between two dates (excluding weekends and holidays).
 * This is used for the Quick Calculator (leave day calculation).
 */
export function countWorkingDays(startDate: Date, endDate: Date): {
  totalDays: number;
  workingDays: number;
  weekends: number;
  holidays: number;
  holidayList: PublicHoliday[];
} {
  let totalDays = 0;
  let workingDays = 0;
  let weekends = 0;
  let holidays = 0;
  const holidayList: PublicHoliday[] = [];

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    totalDays++;
    const dayOfWeek = current.getDay();
    const holiday = isPublicHoliday(current);

    if (dayOfWeek === 0) {
      // Sunday
      weekends++;
    } else if (dayOfWeek === 6) {
      // Saturday (half day in Rwanda work system)
      weekends++;
    } else if (holiday) {
      holidays++;
      holidayList.push(holiday);
    } else {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return { totalDays, workingDays, weekends, holidays, holidayList };
}

/**
 * Calculate expected working hours for a month.
 * Based on Rwanda labour law: 8 hours/day for weekdays.
 * Saturdays are half-days (4 hours) when worked.
 */
export function getMonthExpectedHours(year: number, month: number): {
  weekdays: number;
  saturdays: number;
  sundays: number;
  holidays: number;
  expectedHours: number;
} {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let weekdays = 0, saturdays = 0, sundays = 0, holidays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay();
    
    if (dow === 0) {
      sundays++;
    } else if (dow === 6) {
      saturdays++;
    } else {
      const holiday = isPublicHoliday(date);
      if (holiday) {
        holidays++;
      } else {
        weekdays++;
      }
    }
  }

  // Standard expected hours: weekdays * 8
  const expectedHours = weekdays * 8;

  return { weekdays, saturdays, sundays, holidays, expectedHours };
}
