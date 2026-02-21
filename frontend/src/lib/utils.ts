import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses a time string (e.g. "13:45", "01:45 PM", "1:45") into total minutes from start of day.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;

  // Try to match HH:MM with optional AM/PM
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;

  let [_, hours, minutes, meridiem] = match;
  let h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);

  if (meridiem) {
    const isPM = meridiem.toUpperCase() === 'PM';
    const isAM = meridiem.toUpperCase() === 'AM';

    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
  }

  return h * 60 + m;
}
