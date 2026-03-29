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

// Live Data — single combined endpoint
export interface LiveAllResponse {
  weather: CurrentWeather | null;
  water_levels: WaterLevelsResponse | null;
  tides: TideData | null;
  alerts: WeatherAlertsResponse | null;
  news: NewsFeedResponse | null;
  forecast: ForecastResponse | null;
  streams: LiveStreamsResponse | null;
}
export const getLiveAll = () => get<LiveAllResponse>("/live/all");
export const getLiveWaterLevels = () => get<WaterLevelsResponse>("/live/water-levels");
export const getLiveTides = () => get<TideData>("/live/tides");
export const getLiveWeather = () => get<CurrentWeather>("/live/weather");
export const getLiveForecast = () => get<ForecastResponse>("/live/forecast");
export const getLiveAlerts = () => get<WeatherAlertsResponse>("/live/alerts");
export const getLiveNews = () => get<NewsFeedResponse>("/live/news");
export const getLiveStreams = () => get<LiveStreamsResponse>("/live/streams");

// Agent triggers
export const triggerOrchestrate = (phase?: string) =>
  post("/phase/orchestrate", phase ? { phase } : undefined);
export const triggerProcessReports = () => post("/reports/process");
export const triggerRankIncidents = () => post("/incidents/rank");
export const triggerRecoveryBriefs = () => post("/recovery/generate");

// Orchestration / Simulation
export const getOrchestrationStatus = () =>
  get<Record<string, unknown>>("/orchestration/status");
export const setScenario = (step: string) =>
  post("/orchestration/scenario", { step });
export const orchestrationTick = () => post("/orchestration/tick");
export const startScheduler = () => post("/orchestration/scheduler/start");
export const stopScheduler = () => post("/orchestration/scheduler/stop");

// Commander — AI situation awareness
export const askCommander = (question: string) =>
  post<Record<string, unknown>>("/commander/ask", { question });

// Simulation — hurricane lifecycle replay
export const startSimulation = (speed?: "fast" | "normal" | "slow") =>
  post<Record<string, unknown>>("/simulation/start", speed ? { speed } : undefined);
export const getSimulationStatus = () =>
  get<{ phase: string; scenario: string; stats: { reports: number; incidents: number; alerts: number; matches: number } }>("/simulation/status");

// Incident verification
export const verifyIncidents = () => post("/incidents/verify");

// Resource planning
export const planResources = (lat: number, lng: number, needs: string[], maxMiles?: number) =>
  post<{ origin: { lat: number; lng: number }; recommendations: Record<string, unknown>[]; narrative: string | null }>(
    "/resources/plan",
    { lat, lng, needs, max_miles: maxMiles ?? 10 }
  );
export const syncResources = () => post("/resources/sync");
export const resourceReportText = (text: string) =>
  post<Record<string, unknown>>("/resources/report-text", { text });

// Demo stream (SSE-based simulation)
export const startDemoStream = (speed?: string) =>
  post<Record<string, unknown>>("/simulation/demo-stream", speed ? { speed } : undefined);
export const getDemoStreamStatus = () =>
  get<Record<string, unknown>>("/simulation/demo-stream");
export const stopDemoStream = () =>
  post<Record<string, unknown>>("/simulation/demo-stream/stop");

// Reunification report text
export const reunificationReportText = (text: string) =>
  post<Record<string, unknown>>("/reunification/report-text", { text });

// Assignments
export interface Assignment {
  id: number;
  incident_id: number;
  recommended_action: string | null;
  assignee: string | null;
  status: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}
export const getAssignments = (incidentId?: number) =>
  get<Assignment[]>(`/assignments${incidentId ? `?incident_id=${incidentId}` : ""}`);
export const getAssignment = (id: number) =>
  get<Assignment>(`/assignments/${id}`);
export const createAssignment = (data: { incident_id: number; recommended_action?: string; assignee?: string; notes?: string }) =>
  post<Assignment>("/assignments", data);
export const updateAssignment = (id: number, data: { status?: string; assignee?: string; notes?: string }) =>
  patch<Assignment>(`/assignments/${id}`, data);

// Audit
export const getAuditLog = (limit?: number, runId?: string) => {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (runId) params.set("run_id", runId);
  const qs = params.toString();
  return get<Record<string, unknown>[]>(`/audit-log${qs ? `?${qs}` : ""}`);
};

// SMS (wrapper for consistency)
export const sendSmsChat = (message: string, phone?: string, lat?: number, lng?: number) =>
  post<{ status: string; reply: string; report: Record<string, unknown>; report_id: number }>(
    "/sms/chat",
    { message, phone, ...(lat != null && lng != null ? { lat, lng } : {}) }
  );

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
  patch<MatchResponse>(`/reunification/matches/${id}`, { status, reviewed_by: "operator" });
