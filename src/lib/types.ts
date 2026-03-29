export type Phase = "pre_storm" | "active_storm" | "post_storm";

export interface PhaseResponse {
  current_phase: Phase;
  started_at: string | null;
  updated_at: string | null;
}

export interface AlertResponse {
  id: number;
  phase: string;
  priority: string;
  neighborhood: string | null;
  title: string;
  message: string;
  message_es: string | null;
  channels: string | null;
  delivered: boolean;
  created_at: string | null;
}

export interface RiskAssessment {
  id?: number;
  neighborhood: string;
  zone?: string;
  lat: number;
  lng: number;
  flood_risk: number;
  storm_surge_ft: number;
  time_to_impact_hours: number;
  recommendation: "evacuate" | "shelter_in_place" | "monitor";
}

export interface ReportCreate {
  text: string;
  source?: string;
  sender_phone?: string | null;
}

export interface ReportResponse {
  id: number;
  raw_text: string;
  source: string;
  sender_phone: string | null;
  location_text: string | null;
  lat: number | null;
  lng: number | null;
  incident_type: string | null;
  people_mentioned: number | null;
  has_children: boolean;
  language: string;
  processed: boolean;
  created_at: string | null;
}

export interface IncidentResponse {
  id: number;
  report_ids: string | null;
  incident_type: string;
  location_text: string | null;
  lat: number;
  lng: number;
  severity_score: number | null;
  severity_label: string | null;
  factors: string | null;
  recommended_action: string | null;
  verified: boolean;
  report_count: number;
  resolved: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ResourceResponse {
  id: number;
  type: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  capacity: number | null;
  current_occupancy: number;
  amenities: string | null;
  status: string;
  notes: string | null;
  last_updated: string | null;
}

export interface MissingPersonCreate {
  reported_by: string;
  reporter_phone?: string | null;
  name: string;
  age?: number | null;
  gender?: string | null;
  description?: string | null;
  last_known_location?: string | null;
  last_known_lat?: number | null;
  last_known_lng?: number | null;
  last_contact?: string | null;
}

export interface MissingPersonResponse {
  id: number;
  reported_by: string;
  reporter_phone: string | null;
  name: string;
  age: number | null;
  gender: string | null;
  description: string | null;
  last_known_location: string | null;
  last_known_lat: number | null;
  last_known_lng: number | null;
  last_contact: string | null;
  status: string;
  created_at: string | null;
}

export interface FoundPersonCreate {
  name: string;
  age_approx?: number | null;
  gender?: string | null;
  description?: string | null;
  found_at?: string | null;
  found_lat?: number | null;
  found_lng?: number | null;
}

export interface FoundPersonResponse {
  id: number;
  name: string;
  age_approx: number | null;
  gender: string | null;
  description: string | null;
  found_at: string | null;
  found_lat: number | null;
  found_lng: number | null;
  checked_in: string | null;
  matched_missing_id: number | null;
}

export interface MatchResponse {
  id: number;
  missing_id: number;
  found_id: number;
  confidence: number;
  match_factors: string | null;
  status: string;
  reviewed_by: string | null;
  created_at: string | null;
}
