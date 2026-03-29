import type {
  PhaseResponse,
  AlertResponse,
  RiskAssessment,
  ReportCreate,
  ReportResponse,
  IncidentResponse,
  ResourceResponse,
  MissingPersonCreate,
  MissingPersonResponse,
  FoundPersonCreate,
  FoundPersonResponse,
  MatchResponse,
  WaterLevelsResponse,
  TideData,
  CurrentWeather,
  ForecastResponse,
  WeatherAlertsResponse,
  NewsFeedResponse,
  LiveStreamsResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API = `${BASE}/api/v1`;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

// Phase
export const getPhase = () => get<PhaseResponse>("/phase");
export const advancePhase = () => post<PhaseResponse>("/phase/advance");
export const setPhase = (phase: string) =>
  post<PhaseResponse>("/phase/set", { phase });

// Monitor
export const getRisk = () =>
  get<{ neighborhoods: RiskAssessment[] }>("/monitor/risk");
export const getWeather = () => get<Record<string, unknown>>("/monitor/weather");
export const triggerAnalysis = () => post("/monitor/analyze");

// Alerts
export const getAlerts = (priority?: string) =>
  get<AlertResponse[]>(`/alerts${priority ? `?priority=${priority}` : ""}`);
export const generateAlerts = (context?: string) =>
  post("/alerts/generate", context ? { context } : undefined);

// Reports
export const getReports = () => get<ReportResponse[]>("/reports");
export const submitReport = (data: ReportCreate) =>
  post<ReportResponse>("/reports", data);

// Incidents
export const getIncidents = (severity?: string) =>
  get<IncidentResponse[]>(
    `/incidents${severity ? `?severity=${severity}` : ""}`
  );

// Resources
export const getResources = (type?: string) =>
  get<ResourceResponse[]>(`/resources${type ? `?type=${type}` : ""}`);
export const getNearestResource = (
  lat: number,
  lng: number,
  type?: string
) =>
  get<{ resource: ResourceResponse | null; distance_miles: number | null }>(
    `/resources/nearest?lat=${lat}&lng=${lng}${type ? `&type=${type}` : ""}`
  );
export const updateResource = (id: number, data: Partial<ResourceResponse>) =>
  put<ResourceResponse>(`/resources/${id}`, data);

// Reunification
export const getMissing = () =>
  get<MissingPersonResponse[]>("/reunification/missing");
export const reportMissing = (data: MissingPersonCreate) =>
  post<MissingPersonResponse>("/reunification/missing", data);
export const getFound = () =>
  get<FoundPersonResponse[]>("/reunification/found");
export const reportFound = (data: FoundPersonCreate) =>
  post<FoundPersonResponse>("/reunification/found", data);
export const getMatches = () =>
  get<MatchResponse[]>("/reunification/matches");
export const triggerMatching = () => post("/reunification/match");

// Recovery
export const getRecoveryBriefs = () =>
  get<Record<string, unknown>[]>("/recovery/briefs");
export const getRecoveryBrief = (neighborhood: string) =>
  get<Record<string, unknown>>(`/recovery/briefs/${neighborhood}`);

// Live Data
export const getLiveWaterLevels = () =>
  get<WaterLevelsResponse>("/live/water-levels");
export const getLiveTides = () => get<TideData>("/live/tides");
export const getLiveWeather = () => get<CurrentWeather>("/live/weather");
export const getLiveForecast = () => get<ForecastResponse>("/live/forecast");
export const getLiveAlerts = () =>
  get<WeatherAlertsResponse>("/live/alerts");
export const getLiveNews = () => get<NewsFeedResponse>("/live/news");
export const getLiveStreams = () => get<LiveStreamsResponse>("/live/streams");

// Match review
async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

export const reviewMatch = (id: number, status: "confirmed" | "rejected") =>
  patch<MatchResponse>(`/reunification/matches/${id}`, { status });
