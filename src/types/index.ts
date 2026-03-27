export interface Competition {
  id: string;
  name: string;
  invite_code: string;
  season_year: number;
  created_at: string;
  accepting_members: boolean;
}

export interface Profile {
  id: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
}

export interface CompetitionMember {
  id: string;
  competition_id: string;
  user_id: string;
  joined_at: string;
}

export interface Race {
  id: string;
  season: number;
  round_number: number;
  race_name: string;
  circuit: string;
  race_date: string;
  qualifying_time: string;
  sprint_qualifying_time: string | null;
  is_sprint_weekend: boolean;
  status: "upcoming" | "active" | "completed";
  /** Custom lock time — overrides qualifying_time - 5 min when set */
  prediction_lock_time: string | null;
  /** Custom sprint lock time — overrides sprint_qualifying_time - 5 min when set */
  sprint_prediction_lock_time: string | null;
  /** Admin has manually unlocked race predictions (cron won't re-lock) */
  admin_race_unlocked: boolean;
  /** Admin has manually unlocked sprint predictions (cron won't re-lock) */
  admin_sprint_unlocked: boolean;
}

export interface Driver {
  id: string;
  full_name: string;
  abbreviation: string;
  team: string;
  season: number;
}

export interface DriverAssignment {
  id: string;
  competition_id: string;
  race_id: string;
  user_id: string;
  driver_id: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  race_id: string;
  competition_id: string;
  predicted_position_race: number | null;
  predicted_position_sprint: number | null;
  submitted_at: string;
  is_locked: boolean;
  is_sprint_locked: boolean;
  is_missed: boolean;
}

export interface Result {
  id: string;
  race_id: string;
  driver_id: string;
  finish_position_race: number | null;
  finish_position_sprint: number | null;
  is_dnf_race: boolean;
  is_dnf_sprint: boolean;
}

export interface Score {
  id: string;
  user_id: string;
  race_id: string;
  competition_id: string;
  race_points: number;
  sprint_points: number;
  total_points: number;
  race_position_off: number | null;
  sprint_position_off: number | null;
}

export interface Feedback {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
}
