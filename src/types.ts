export type Category = 'school' | 'gym' | 'skill' | 'bilingual' | 'reading' | 'personal' | 'travel';
export type Status = 'pending' | 'in-progress' | 'done' | 'skipped';

export interface ActivityBlock {
  id: string;
  date: string;
  category: Category;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: Status;
  note: string | null;
  energy_after: number | null;
  template_id: string | null;
  is_fixed: boolean;
}

export interface ScheduleTemplate {
  id: string;
  day_of_week: number;
  category: Category;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  is_fixed: boolean;
  sort_order: number;
}

export interface DailySummary {
  date: string;
  total_planned: number;
  total_completed: number;
  total_skipped: number;
  completion_rate: number;
  categories: Record<Category, { planned: number; completed: number }>;
}

export interface Streak {
  category: Category;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

export interface BilingualProgress {
  id: string;
  date: string;
  vocabulary_score: number | null;
  speaking_score: number | null;
  listening_score: number | null;
  words_learned: number;
  minutes_practiced: number;
  note: string | null;
}

export interface Prediction {
  date: string;
  predicted_completion_rate: number;
  risk_flags: string[];
  suggestions: string[];
  category_risks: Partial<Record<Category, { skip_rate: number; avg_delay_min: number }>>;
}
