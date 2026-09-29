// Field names below are taken directly from real network responses
// captured against movixa.duckdns.org (not guessed) — see:
// POST /api/auth/login, GET /api/videos?section=play

export type UserRole = "user" | "content_creator" | "plays_organiser";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  auth_provider?: string;
  can_live_stream?: boolean;
  country?: string;
  created_at?: string;
  profile_photo_url?: string | null;
  reward_points_balance?: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type VideoSection = "play" | "archive" | "both";
export type MonetizationType = "subscription_only" | "pay_per_video" | "free";
export type VideoStatus = "pending" | "published" | "rejected" | "disabled";

// Confirmed: GET /people/{id} -> this full shape.
export interface Person {
  id: string;
  name: string;
  photo_url?: string | null;
  occupation?: string | null;
  date_of_birth?: string | null;
  birthplace?: string | null;
  about?: string | null;
  early_life?: string | null;
  personal_life?: string | null;
  debut_initial_years?: string | null;
  breakthrough_beyond?: string | null;
  recent_projects?: string | null;
  created_at?: string;
}

export interface CastMember {
  id: string;
  person: Person;
  character_role: string | null;
}

export interface CrewMember {
  id: string;
  role: string; // NOTE: on the live API this currently holds a person's name,
  // not a job title — the actual job title lives at person.occupation.
  // Carried over as-is; flag with backend if this looks like a data bug.
  person: Person;
}

export interface RevenueTier {
  id: string;
  min_minutes: number;
  max_minutes: number | null;
  rate_per_minute_inr: string;
}

export interface Pricing {
  price_inr: string;
  price_usd: string;
}

export interface AdCuePoint {
  offset_seconds: number;
  vast_tag_url: string;
}

// Confirmed from a real GET /videos?section=archive capture — subtitles is
// an array of objects, not plain strings as first assumed.
export interface Subtitle {
  id: string;
  language_code: string;
  language_label: string;
  url: string;
}

export interface Video {
  id: string;
  uploaded_by_name: string;
  uploaded_by_user_id: string;
  title: string;
  description: string;
  section: VideoSection;
  categories: string[];
  release_year: number;
  age_rating: string;
  languages: string[];
  poster_image_url: string | null;
  duration_seconds: number;
  has_ads: boolean;
  monetization_type: MonetizationType;
  status: VideoStatus;
  pricing: Pricing | null;
  revenue_tiers: RevenueTier[];
  cast: CastMember[];
  crew: CrewMember[];
  has_file: boolean;
  playback_url: string | null;
  embed_url: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  trailer_playback_url: string | null;
  subtitles: Subtitle[];
  created_at: string;
  published_at: string | null;
  has_access: boolean;
  access_reason: string | null;
  likes_count: number;
  liked_by_me: boolean;
  in_my_list: boolean;
  resume_position_seconds: number;
  ad_cue_points: AdCuePoint[];
}

export interface ApiError {
  detail: string;
}
