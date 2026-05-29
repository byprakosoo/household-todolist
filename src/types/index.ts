export type AssigneeType = "me" | "partner" | "both";

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_color: string;
  created_at: string;
}

export interface Household {
  id: string;
  invite_code: string;
  rollover_confirmed: boolean;
  confirmed_week: number;
  confirmed_year: number;
  created_at: string;
}

export interface HouseholdMember {
  household_id: string;
  user_id: string;
  joined_at: string;
}

export interface TaskCategory {
  id: string;
  household_id: string;
  name: string;
  color_hex: string;
  emoji: string | null;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  household_id: string;
  created_by: string;
  assigned_to: string | null;
  category_id: string | null;
  title: string;
  notes: string | null;
  assignee_type: AssigneeType;
  is_done: boolean;
  week_number: number;
  year: number;
  sort_order: number;
  rolled_over_from: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: TaskCategory | null;
  creator?: User | null;
  assignee?: User | null;
}

export interface BuyingItem {
  id: string;
  household_id: string;
  created_by: string | null;
  name: string;
  quantity: string | null;
  is_bought: boolean;
  bought_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  creator?: User | null;
}

export interface MonthlySummary {
  week_number: number;
  year: number;
  created: number;
  done: number;
  rolled_over: number;
}

export interface CategorySummary {
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  category_emoji: string | null;
  done: number;
  rolled_over: number;
}

export const CATEGORY_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#3B82F6", "#6366F1", "#A855F7",
  "#EC4899", "#78716C", "#84CC16", "#14B8A6",
] as const;

export const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9",
] as const;
