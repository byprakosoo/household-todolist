import { getISOWeek, getISOWeekYear, addWeeks, startOfISOWeek, endOfISOWeek, format } from "date-fns";

export function getCurrentWeek() {
  const now = new Date();
  return {
    week_number: getISOWeek(now),
    year: getISOWeekYear(now),
  };
}

export function getAdjacentWeek(currentWeek: number, currentYear: number, direction: -1 | 1) {
  const weekStart = startOfISOWeek(
    new Date(currentYear, 0, 1 + (currentWeek - 1) * 7)
  );
  const next = addWeeks(weekStart, direction);
  return {
    week_number: getISOWeek(next),
    year: getISOWeekYear(next),
  };
}

export function formatWeekRange(week_number: number, year: number) {
  const weekStart = startOfISOWeek(new Date(year, 0, 1 + (week_number - 1) * 7));
  const weekEnd = endOfISOWeek(weekStart);
  return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;
}

export function formatMonthLabel(month: number, year: number) {
  const date = new Date(year, month - 1, 1);
  return format(date, "MMMM yyyy");
}

export const DEFAULT_CATEGORIES = [
  { name: "Home", color_hex: "#22C55E", emoji: "🏠" },
  { name: "Groceries", color_hex: "#EAB308", emoji: "🛒" },
  { name: "Work", color_hex: "#3B82F6", emoji: "💼" },
  { name: "Personal", color_hex: "#EC4899", emoji: "🙋" },
];

export const MAX_CATEGORIES = 20;
export const MAX_TASK_NOTES = 500;
