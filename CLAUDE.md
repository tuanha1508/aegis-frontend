# Aegis Frontend — Context for Contributors

## What is Aegis?

Aegis is a multi-agent disaster intelligence platform for Tampa Bay built for HackUSF 2026. It covers the full storm lifecycle: pre-storm monitoring → active storm response → post-storm recovery. The frontend is the face — a Next.js dashboard with an interactive map, alert feeds, report submission, resource finder, and family reunification portal.

## Hackathon Requirements

- **Public GitHub repo** (this repo)
- **Best Design prize** ($350) — UI must be polished and intuitive
- **Demo video** (1-2 min) — the dashboard IS the demo
- **Code freeze: March 29, 2026 at 11:30 AM EDT**

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS for styling
- React-Leaflet for interactive map
- Fetch API for backend communication (no axios needed)

## Backend Repo

The backend is at: https://github.com/tuanha1508/aegis-backend
It runs on `http://localhost:8000` during development.
All data comes from the backend REST API at `/api/v1/*`.

## Project Structure

```
aegis-frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout: Navbar + PhaseIndicator
│   │   ├── page.tsx                 # Home → redirects to /dashboard
│   │   ├── globals.css              # Tailwind base + custom theme
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Main view: map + alert feed + incidents
│   │   │
│   │   ├── report/
│   │   │   └── page.tsx             # Submit field report form
│   │   │
│   │   ├── reunify/
│   │   │   └── page.tsx             # Missing/found person portal
│   │   │
│   │   ├── resources/
│   │   │   └── page.tsx             # Resource finder (shelters, supplies)
│   │   │
│   │   └── recovery/
│   │       └── page.tsx             # Neighborhood recovery briefs
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx           # Top nav: logo + page links + phase badge
│   │   │   ├── PhaseIndicator.tsx   # Phase progress bar (pre → active → post)
│   │   │   └── Sidebar.tsx          # Context sidebar (alerts or incidents)
│   │   │
│   │   ├── map/
│   │   │   ├── MapContainer.tsx     # Leaflet map centered on Tampa Bay
│   │   │   ├── RiskZoneLayer.tsx    # Colored circles/polygons for flood risk
│   │   │   ├── IncidentMarkers.tsx  # Incident pins with severity colors
│   │   │   ├── ResourceMarkers.tsx  # Shelter/supply/charging pins
│   │   │   └── MapLegend.tsx        # Color legend overlay
│   │   │
│   │   ├── alerts/
│   │   │   ├── AlertFeed.tsx        # Scrolling list of alerts
│   │   │   └── AlertCard.tsx        # Single alert with priority color border
│   │   │
│   │   ├── reports/
│   │   │   ├── ReportForm.tsx       # Text input + submit for field reports
│   │   │   └── ReportList.tsx       # List of submitted reports
│   │   │
│   │   ├── incidents/
│   │   │   ├── IncidentList.tsx     # Horizontal scrolling incident cards
│   │   │   └── IncidentCard.tsx     # Severity badge + type + location
│   │   │
│   │   ├── resources/
│   │   │   ├── ResourceList.tsx     # Filtered list by type
│   │   │   ├── ResourceCard.tsx     # Name + status + capacity bar
│   │   │   └── ResourceFinder.tsx   # "Find nearest" with type dropdown
│   │   │
│   │   ├── reunification/
│   │   │   ├── MissingForm.tsx      # Form: name, age, description, last location
│   │   │   ├── FoundForm.tsx        # Form: name, found at, description
│   │   │   ├── MatchCard.tsx        # Side-by-side missing↔found with confidence %
│   │   │   └── MatchList.tsx        # All current matches
│   │   │
│   │   ├── recovery/
│   │   │   ├── BriefCard.tsx        # Neighborhood brief: power, water, roads, shelters
│   │   │   └── BriefList.tsx        # All neighborhood briefs
│   │   │
│   │   └── ui/
│   │       ├── Badge.tsx            # Colored badge (severity, status, phase)
│   │       ├── Button.tsx           # Styled button with variants
│   │       ├── Card.tsx             # Base card with shadow + rounded corners
│   │       ├── Input.tsx            # Styled text input
│   │       ├── Modal.tsx            # Overlay modal
│   │       └── Tabs.tsx             # Tab switcher component
│   │
│   ├── lib/
│   │   ├── api.ts                   # All fetch calls to backend
│   │   ├── types.ts                 # TypeScript types (must match backend)
│   │   └── constants.ts            # Tampa coords, colors, phase names
│   │
│   └── hooks/
│       ├── usePhase.ts              # Poll backend for current phase
│       ├── useAlerts.ts             # Fetch + auto-refresh alerts
│       ├── useIncidents.ts          # Fetch + auto-refresh incidents
│       └── useResources.ts          # Fetch + auto-refresh resources
│
├── public/
│   ├── aegis-logo.svg
│   └── marker-icons/
│       ├── shelter.png
│       ├── medical.png
│       ├── incident-critical.png
│       ├── incident-high.png
│       └── charging.png
│
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

## TypeScript Types (Contract with Backend)

These types MUST match the backend Pydantic models exactly. Both repos share this contract.

```typescript
// src/lib/types.ts

export type Phase = "pre_storm" | "active_storm" | "post_storm"
export type Priority = "info" | "warning" | "critical" | "emergency"
export type SeverityLabel = "low" | "medium" | "high" | "critical"
export type IncidentType =
  | "flooding"
  | "structural_damage"
  | "trapped_person"
  | "road_blocked"
  | "power_outage"
  | "medical_emergency"
  | "other"
export type ResourceType = "shelter" | "medical" | "supply_point" | "charging" | "road"
export type ResourceStatus = "open" | "limited" | "full" | "closed" | "damaged"

export interface PhaseState {
  current_phase: Phase
  started_at: string
  updated_at: string
}

export interface RiskAssessment {
  id: number
  neighborhood: string
  zone: string
  lat: number
  lng: number
  flood_risk: number
  storm_surge_ft: number
  time_to_impact_hours: number
  recommendation: "evacuate" | "shelter_in_place" | "monitor"
  evacuate_by: string | null
}

export interface Alert {
  id: number
  phase: Phase
  priority: Priority
  neighborhood: string | null
  title: string
  message: string
  message_es: string | null
  channels: string[]
  delivered: boolean
  created_at: string
}

export interface Report {
  id: number
  raw_text: string
  source: "sms" | "app" | "partner"
  location_text: string | null
  lat: number | null
  lng: number | null
  incident_type: IncidentType | null
  people_mentioned: number | null
  has_children: boolean
  language: string
  processed: boolean
  created_at: string
}

export interface Incident {
  id: number
  report_ids: number[]
  incident_type: IncidentType
  location_text: string
  lat: number
  lng: number
  severity_score: number
  severity_label: SeverityLabel
  factors: string[]
  recommended_action: string
  verified: boolean
  report_count: number
  resolved: boolean
  created_at: string
  updated_at: string
}

export interface Resource {
  id: number
  type: ResourceType
  name: string
  lat: number
  lng: number
  address: string | null
  capacity: number | null
  current_occupancy: number | null
  amenities: string[]
  status: ResourceStatus
  notes: string | null
  last_updated: string
}

export interface MissingPerson {
  id: number
  reported_by: string
  name: string
  age: number | null
  gender: string | null
  description: string | null
  last_known_location: string | null
  last_known_lat: number | null
  last_known_lng: number | null
  last_contact: string | null
  status: "missing" | "found" | "confirmed_safe"
  created_at: string
}

export interface FoundPerson {
  id: number
  name: string
  age_approx: number | null
  gender: string | null
  description: string | null
  found_at: string
  found_lat: number | null
  found_lng: number | null
  checked_in: string
}

export interface Match {
  id: number
  missing_id: number
  found_id: number
  confidence: number
  match_factors: string[]
  status: "pending" | "confirmed" | "rejected"
  created_at: string
  missing_person?: MissingPerson
  found_person?: FoundPerson
}

export interface RecoveryBrief {
  id: number
  neighborhood: string
  power_status: string
  water_status: string
  roads_status: string
  shelters_nearby: Resource[]
  medical_nearby: Resource[]
  key_updates: string[]
  generated_at: string
}
```

## API Client (src/lib/api.ts)

All communication with the backend goes through this file. The backend runs at the URL specified in `NEXT_PUBLIC_API_URL`.

```typescript
// src/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

// Phase
GET  ${API_URL}/phase                         → PhaseState
POST ${API_URL}/phase/advance                 → PhaseState
POST ${API_URL}/phase/set                     → PhaseState  (body: { phase: Phase })

// Monitor
GET  ${API_URL}/monitor/risk                  → RiskAssessment[]
GET  ${API_URL}/monitor/weather               → storm/weather data

// Alerts
GET  ${API_URL}/alerts                        → Alert[]  (optional ?priority=critical)
POST ${API_URL}/alerts/generate               → Alert[]  (triggers Alert Agent)

// Reports
GET  ${API_URL}/reports                       → Report[]
POST ${API_URL}/reports                       → Report  (body: { text: string, source: "app" })
POST ${API_URL}/reports/process               → Report[]  (triggers Field Report Agent)

// Incidents
GET  ${API_URL}/incidents                     → Incident[]  (sorted by severity_score desc)
GET  ${API_URL}/incidents?severity=critical   → Incident[]  (filtered)
POST ${API_URL}/incidents/rank                → Incident[]  (triggers Severity Agent)

// Resources
GET  ${API_URL}/resources                     → Resource[]
GET  ${API_URL}/resources?type=shelter        → Resource[]  (filtered)
GET  ${API_URL}/resources/nearest?lat=X&lng=Y&type=shelter → Resource[]
PUT  ${API_URL}/resources/:id                 → Resource  (update status/capacity)

// Reunification
GET  ${API_URL}/reunification/missing         → MissingPerson[]
POST ${API_URL}/reunification/missing         → MissingPerson  (body: MissingPerson fields)
GET  ${API_URL}/reunification/found           → FoundPerson[]
POST ${API_URL}/reunification/found           → FoundPerson  (body: FoundPerson fields)
GET  ${API_URL}/reunification/matches         → Match[]
POST ${API_URL}/reunification/match           → Match[]  (triggers Reunification Agent)

// Recovery
GET  ${API_URL}/recovery/briefs               → RecoveryBrief[]
GET  ${API_URL}/recovery/briefs/:neighborhood → RecoveryBrief
```

## Constants (src/lib/constants.ts)

```typescript
// Tampa Bay center coordinates
export const TAMPA_CENTER = { lat: 27.9506, lng: -82.4572 }
export const DEFAULT_ZOOM = 12

// Phase display
export const PHASE_LABELS = {
  pre_storm: "Pre-Storm",
  active_storm: "Active Storm",
  post_storm: "Post-Storm",
}

export const PHASE_COLORS = {
  pre_storm: "#3B82F6",    // blue
  active_storm: "#F97316", // orange
  post_storm: "#22C55E",   // green
}

// Severity colors
export const SEVERITY_COLORS = {
  critical: "#EF4444",  // red
  high: "#F97316",      // orange
  medium: "#EAB308",    // yellow
  low: "#3B82F6",       // blue
}

// Resource status colors
export const STATUS_COLORS = {
  open: "#22C55E",      // green
  limited: "#EAB308",   // yellow
  full: "#EF4444",      // red
  closed: "#6B7280",    // gray
  damaged: "#6B7280",   // gray
}

// Priority colors
export const PRIORITY_COLORS = {
  emergency: "#EF4444",
  critical: "#EF4444",
  warning: "#F97316",
  info: "#3B82F6",
}
```

## Page Details

### Dashboard (/dashboard) — THE MAIN PAGE

This is the hero page. Split into:
- **Left (65%):** Leaflet map of Tampa Bay
  - Pre-storm: colored circles on neighborhoods (green/yellow/orange/red by flood_risk)
  - Active storm: incident markers (colored by severity) + resource markers
  - Post-storm: resource markers + shelter markers with capacity
- **Right (35%):** Sidebar with context
  - Pre-storm: Alert feed (scrolling list of warnings)
  - Active storm: Incident list (ranked by severity) + incoming report count
  - Post-storm: Match notifications + recovery brief summaries
- **Bottom:** Incident cards in horizontal scroll (active storm only)

### Report (/report)

- Large text input for typing a field report
- Dropdown for incident type (optional, agent will classify anyway)
- Submit button → POST /reports
- Below: list of recent reports with their parsed status

### Reunify (/reunify)

- Two columns:
  - Left: "Report Missing Person" form (name, age, gender, description, last known location)
  - Right: "Report Found Person" form (name, found at, description)
- Below: Match cards showing missing↔found pairs with confidence percentage
  - Green border if confidence > 80%
  - Yellow border if 50-80%
  - Each match has Confirm/Reject buttons

### Resources (/resources)

- Filter tabs: All | Shelters | Medical | Supplies | Charging
- List of resource cards showing:
  - Name, address, status badge
  - Capacity bar (current_occupancy / capacity) if applicable
  - Amenities tags
  - Distance from user (if geolocation available)
- "Find Nearest" input at top

### Recovery (/recovery)

- Grid of neighborhood brief cards
- Each card shows: neighborhood name, power status, water status, roads, nearby shelters
- Key updates as bullet points
- "Last updated" timestamp

## Map Implementation Notes

React-Leaflet requires dynamic import in Next.js (no SSR):

```typescript
import dynamic from 'next/dynamic'
const Map = dynamic(() => import('@/components/map/MapContainer'), { ssr: false })
```

Use circle markers for risk zones (radius proportional to risk level):
```typescript
<CircleMarker center={[lat, lng]} radius={riskLevel * 30} color={severityColor} />
```

Custom marker icons for resources and incidents — use images from `/public/marker-icons/`.

## Design Guidelines

- **Dark theme** with navy/slate background — feels like a command center
- **Accent color:** Blue (#3B82F6) for Aegis brand
- **Cards:** Dark gray (slate-800) with subtle border, rounded-lg
- **Typography:** Clean sans-serif, use font-mono for data/numbers
- **Animations:** Subtle pulse on critical alerts, smooth transitions between phases
- **Mobile:** Responsive but optimize for desktop (judges demo on laptops)

Suggested Tailwind dark theme base:
```
bg-slate-900      — page background
bg-slate-800      — card background
border-slate-700  — card borders
text-slate-100    — primary text
text-slate-400    — secondary text
```

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

For Vercel deployment, set this to the deployed backend URL.

## How to Run

```bash
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL
npm run dev
# Opens on http://localhost:3000
```

## Priority Order for Building

1. **First:** Next.js setup + Tailwind + layout + Navbar + PhaseIndicator (Person C)
2. **Second:** Leaflet map centered on Tampa Bay + risk zone layer (Person C)
3. **Third:** API client (src/lib/api.ts) + types.ts + constants.ts (Person C)
4. **Fourth:** AlertFeed + AlertCard + ReportForm (Person D)
5. **Fifth:** IncidentList + ResourceList + reunification forms (Person D)
6. **Sixth:** Recovery briefs + polish + logo + responsive (Person D)
7. **Last:** Demo video recording

## Important: Leaflet CSS

You must import Leaflet CSS in your layout or globals.css:
```css
@import "leaflet/dist/leaflet.css";
```

Or in layout.tsx:
```typescript
import "leaflet/dist/leaflet.css"
```

Without this, the map tiles will render broken.
