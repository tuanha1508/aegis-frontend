# Aegis Frontend — What Needs To Be Done

This document lists everything the frontend team still needs to implement. Items are ordered by priority. Check off items as you complete them.

---

## PRIORITY 1: Live Monitoring Page (New Feature)

A new `/dashboard/live` page that shows real-time storm data, water levels, weather, news, and live news streams. This is the command center view.

### Task 1.1: Add types for live data

Add to `src/lib/types.ts`:

```typescript
// ─── Live Data Types ─────────────────────────────────────

export interface WaterStation {
  station_id: string;
  name: string;
  lat: number;
  lng: number;
  current_level_ft: number;
  trend: "rising" | "falling" | "stable";
  change_1h: number;
  readings_24h: { time: string; value: number }[];
  flood_stage_ft: number;
  percent_of_flood: number;
  last_updated: string;
}

export interface WaterLevelsResponse {
  stations: WaterStation[];
  fetched_at: string;
}

export interface TideData {
  station: string;
  current_level_ft: number;
  datum: string;
  observations_24h: { time: string; level_ft: number }[];
  next_high_tide: { time: string; level_ft: number } | null;
  next_low_tide: { time: string; level_ft: number } | null;
  tide_predictions: { time: string; level_ft: number; type: "high" | "low" }[];
  fetched_at: string;
}

export interface CurrentWeather {
  station: string;
  temperature_f: number;
  wind_speed_mph: number;
  wind_gust_mph: number | null;
  wind_direction: string;
  wind_direction_degrees: number;
  barometric_pressure_inhg: number;
  humidity_percent: number;
  conditions: string;
  observed_at: string;
  fetched_at: string;
}

export interface WeatherAlert {
  event: string;
  headline: string;
  description: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  urgency: string;
  onset: string;
  expires: string;
  sender: string;
  areas: string;
}

export interface WeatherAlertsResponse {
  zone: string;
  active_count: number;
  alerts: WeatherAlert[];
  fetched_at: string;
}

export interface NewsItem {
  source: string;
  title: string;
  summary: string;
  url: string;
  published_at: string;
  severity: "extreme" | "severe" | "moderate" | "minor";
  category: "hurricane" | "flood" | "tornado" | "thunderstorm" | "other";
}

export interface NewsFeedResponse {
  items: NewsItem[];
  source_count: number;
  total_items: number;
  fetched_at: string;
}

export interface LiveStream {
  name: string;
  description: string;
  youtube_channel_url: string;
  live_url: string;
  embed_url: string | null;
  is_local: boolean;
}

export interface LiveStreamsResponse {
  streams: LiveStream[];
}

export interface ForecastPeriod {
  name: string;
  temperature_f: number;
  wind_speed: string;
  wind_direction: string;
  short_forecast: string;
  detailed_forecast: string;
  is_daytime: boolean;
}

export interface ForecastResponse {
  location: string;
  periods: ForecastPeriod[];
  fetched_at: string;
}
```

### Task 1.2: Add API functions for live data

Add to `src/lib/api.ts`:

```typescript
// Live Data
export const getLiveWaterLevels = () =>
  get<WaterLevelsResponse>("/live/water-levels");
export const getLiveTides = () =>
  get<TideData>("/live/tides");
export const getLiveWeather = () =>
  get<CurrentWeather>("/live/weather");
export const getLiveForecast = () =>
  get<ForecastResponse>("/live/forecast");
export const getLiveAlerts = () =>
  get<WeatherAlertsResponse>("/live/alerts");
export const getLiveNews = () =>
  get<NewsFeedResponse>("/live/news");
export const getLiveStreams = () =>
  get<LiveStreamsResponse>("/live/streams");
```

### Task 1.3: Add sidebar navigation entry

In `src/components/dashboard/sidebar.tsx`, add to the first nav group:

```typescript
{ href: "/dashboard/live", label: "Live", icon: icons.broadcast },
// or use icons.pulse, icons.activity — pick an appropriate one from icons.ts
```

If a "broadcast" or "pulse" icon doesn't exist in `icons.ts`, add one:
```typescript
broadcast: "ph:broadcast-bold",
pulse: "ph:pulse-bold",
activity: "ph:activity-bold",
```

### Task 1.4: Create the Live page

Create `src/app/dashboard/live/page.tsx` with this layout:

```
┌─────────────────────────────────────────────────────────────┐
│  LIVE MONITORING                              Last updated  │
│                                               • 30s ago     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ 🌡 WEATHER  │ │ 💨 WIND     │ │ 🌊 TIDE     │          │
│  │             │ │             │ │             │          │
│  │  82°F       │ │  45 mph     │ │  1.8 ft     │          │
│  │  Rain       │ │  NE →       │ │  MLLW       │          │
│  │  78% humid  │ │  Gusts: 62  │ │  Next high: │          │
│  │  29.85 inHg │ │             │ │  6:45 PM    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
│  ─── ACTIVE ALERTS ────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🔴 EXTREME: Hurricane Warning                      │  │
│  │ Hurricane Warning issued for Hillsborough County... │  │
│  │ Onset: 3/28 12:00 PM — Expires: 3/29 12:00 PM     │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🟠 SEVERE: Storm Surge Warning                     │  │
│  │ Storm surge of 4-6 ft expected along Tampa Bay...   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ─── WATER LEVELS ─────────────────────────────────────── │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ Hillsborough │ │ Alafia       │ │ Palm River   │      │
│  │ River        │ │ River        │ │              │      │
│  │  4.2 ft      │ │  3.8 ft      │ │  2.1 ft      │      │
│  │  ████░░░░░░  │ │  ███░░░░░░░  │ │  ██░░░░░░░░  │      │
│  │  35% flood   │ │  25% flood   │ │  26% flood   │      │
│  │  ↑ Rising    │ │  → Stable    │ │  ↑ Rising    │      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                             │
│  ─── WATER LEVEL TREND (24h) ────────────────────────── │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  12ft ┤ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ Flood Stage ─ ─ ─ ─  │  │
│  │   8ft ┤                                             │  │
│  │   4ft ┤          ╱──╲                               │  │
│  │   2ft ┤  ╱──╱──╱╱    ╲──╲                          │  │
│  │   0ft ┤──╱                 ╲──                      │  │
│  │       └──────────────────────────                   │  │
│  │        6AM  9AM  12PM  3PM  6PM                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ─── NEWS FEED ───────────────── │ ─── LIVE TV ────────── │
│  ┌─────────────────────────────┐ │ ┌────────────────────┐ │
│  │ 🔴 NWS Tampa Bay            │ │ │                    │ │
│  │ Hurricane Warning for       │ │ │  Bay News 9        │ │
│  │ Hillsborough County         │ │ │  ► Watch Live      │ │
│  │ 2 min ago                   │ │ │                    │ │
│  ├─────────────────────────────┤ │ │  WFLA Channel 8    │ │
│  │ 🟠 USGS Water Alert         │ │ │  ► Watch Live      │ │
│  │ Hillsborough River above    │ │ │                    │ │
│  │ normal levels               │ │ │  FOX 13 Tampa Bay  │ │
│  │ 15 min ago                  │ │ │  ► Watch Live      │ │
│  ├─────────────────────────────┤ │ │                    │ │
│  │ 🟡 NHC Atlantic             │ │ │  Weather Channel   │ │
│  │ Tropical Storm advisory     │ │ │  ► Watch Live      │ │
│  │ updated                     │ │ └────────────────────┘ │
│  │ 30 min ago                  │ │                        │
│  └─────────────────────────────┘ │                        │
└──────────────────────────────────┴────────────────────────┘
```

### Task 1.5: Build components for Live page

Create these components in `src/components/live/`:

#### `WeatherCard.tsx`
- Shows: temperature, conditions, humidity, barometric pressure
- Icon changes based on conditions ("Rain" → rain icon, "Partly Cloudy" → cloud icon)
- Subtle background color based on conditions

#### `WindCard.tsx`
- Shows: wind speed, gust speed, direction with arrow
- Arrow rotates based on `wind_direction_degrees`
- Color shifts: green (<20mph), yellow (20-40), orange (40-60), red (>60)

#### `TideCard.tsx`
- Shows: current tide level, next high/low tide time
- Small visual showing tide rising or falling

#### `WaterGaugeCard.tsx`
- One card per USGS station
- Progress bar: current_level / flood_stage (colored green→yellow→red)
- Trend indicator: ↑ Rising (red), → Stable (gray), ↓ Falling (green)
- Shows: station name, current level in feet, percent of flood stage

#### `WaterChart.tsx`
- Simple 24-hour line chart showing water level over time
- Dashed horizontal line at flood stage
- Use `<canvas>` with vanilla JS — do NOT add a chart library (too heavy for hackathon)
- Or use a minimal approach: render SVG polyline from data points
- X-axis: time labels every 3 hours
- Y-axis: water level in feet

Implementation with SVG (simplest approach):
```typescript
// Convert readings_24h array to SVG polyline points
// Scale: x = (index / total) * width, y = height - (value / maxValue) * height
// Render <svg> with <polyline> for data and <line> for flood stage
```

#### `AlertBanner.tsx`
- If there are active NWS alerts with severity "Extreme" or "Severe":
  - Show a prominent banner at the top of the page
  - Red background for Extreme, orange for Severe
  - Pulsing dot animation
  - Shows the event name and headline
  - Collapsible to show full description

#### `NewsFeedPanel.tsx`
- Scrollable list of news items
- Each item shows: source badge, title, summary (truncated), relative time ("2 min ago")
- Color-coded left border by severity:
  - extreme → red
  - severe → orange
  - moderate → yellow
  - minor → blue
- Clicking opens the URL in a new tab
- Auto-refreshes every 2 minutes

#### `LiveStreamPanel.tsx`
- List of TV stations with "Watch Live" buttons
- Each button links to the YouTube live URL (opens in new tab)
- Local stations marked with a badge
- Optional: iframe embed if we find a working embed URL

### Task 1.6: Auto-refresh hook

Create `src/hooks/useLiveData.ts`:

```typescript
// Polls /live/weather, /live/water-levels, /live/alerts, /live/news
// every 60 seconds.
// Returns { weather, waterLevels, alerts, news, streams, isLoading, lastUpdated }
//
// Use the existing useApi pattern but with setInterval for auto-refresh:
//
// const [data, setData] = useState(null)
// const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
//
// useEffect(() => {
//   const fetch = async () => {
//     const [weather, water, alerts, news, streams] = await Promise.allSettled([
//       getLiveWeather(),
//       getLiveWaterLevels(),
//       getLiveAlerts(),
//       getLiveNews(),
//       getLiveStreams(),
//     ])
//     setData({ weather, water, alerts, news, streams })
//     setLastUpdated(new Date())
//   }
//   fetch()
//   const interval = setInterval(fetch, 60_000)
//   return () => clearInterval(interval)
// }, [])
```

---

## PRIORITY 2: Dashboard Polish

### Task 2.1: Add live data mini-widgets to main dashboard

On the main `/dashboard` page, add a small row at the top showing:
- Current wind speed + direction
- Current water level (Hillsborough River)
- Active NWS alert count

This gives the dashboard a "live" feel even when not on the Live page.

```
┌──────────────┬──────────────┬──────────────┐
│ 💨 Wind 45mph│ 🌊 Water 4.2ft│ ⚠ 3 Alerts  │
│    NE →      │    ↑ Rising  │    Active    │
└──────────────┴──────────────┴──────────────┘
```

### Task 2.2: Add NWS alert banner to dashboard layout

In `src/app/dashboard/layout.tsx`, add a persistent alert banner at the top when there are active NWS "Extreme" or "Severe" alerts. This banner shows on ALL dashboard pages, not just the Live page.

```typescript
// Fetch from /live/alerts every 60 seconds
// If any alert has severity "Extreme" or "Severe":
//   Show red/orange banner at very top of layout, above the page content
//   Text: "{event}: {headline}"
//   Dismiss button (per session, not permanent)
```

---

## PRIORITY 3: Missing Features

### Task 3.1: Match review buttons

On the reunification page (`/dashboard/reunification`), the Matches tab shows matches but has no way to confirm or reject them.

Add two buttons to each `MatchCard`:
- **Confirm** → `PATCH /api/v1/reunification/matches/{id}` with `{"status": "confirmed"}`
- **Reject** → `PATCH /api/v1/reunification/matches/{id}` with `{"status": "rejected"}`

After clicking, refresh the matches list. Show confirmed matches with a green checkmark, rejected with strikethrough.

Add to `src/lib/api.ts`:
```typescript
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
```

### Task 3.2: Add `error.tsx` boundary

Create `src/app/dashboard/error.tsx`:
```typescript
"use client";
// Show a friendly error message with a "Try Again" button
// Use the same design language as the rest of the dashboard
```

### Task 3.3: Favicon and branding

- Replace the default Next.js favicon with an Aegis shield icon
- Add `<title>Aegis — Storm Intelligence</title>` to layout metadata
- Add Open Graph meta tags for social sharing (helps when sharing Devpost link)

---

## PRIORITY 4: Nice-to-Have

### Task 4.1: Forecast panel on Live page

Show the NWS 7-day forecast as horizontal cards:
```
Tonight: 75°F, Rain   |   Saturday: 82°F, Partly Cloudy   |   ...
```

### Task 4.2: Map integration for water gauges

On the Map page, add water gauge station markers (blue droplet icons) showing real-time water levels. Popup shows station name, current level, flood stage percentage.

### Task 4.3: Sound notification for critical alerts

When a new "Extreme" or "Severe" NWS alert appears, play a short notification sound. Use the Web Audio API — no sound files needed:
```typescript
const ctx = new AudioContext();
const osc = ctx.createOscillator();
osc.frequency.value = 880; // A5 note
osc.connect(ctx.destination);
osc.start(); setTimeout(() => osc.stop(), 200);
```

---

## Summary Checklist

```
[ ] 1.1  Add live data types to types.ts
[ ] 1.2  Add live API functions to api.ts
[ ] 1.3  Add "Live" to sidebar navigation
[ ] 1.4  Create /dashboard/live/page.tsx
[ ] 1.5  Build live components:
         [ ] WeatherCard
         [ ] WindCard
         [ ] TideCard
         [ ] WaterGaugeCard
         [ ] WaterChart (SVG or canvas)
         [ ] AlertBanner
         [ ] NewsFeedPanel
         [ ] LiveStreamPanel
[ ] 1.6  Create useLiveData hook with auto-refresh

[ ] 2.1  Add live mini-widgets to main dashboard
[ ] 2.2  Add NWS alert banner to dashboard layout

[ ] 3.1  Match review buttons (confirm/reject)
[ ] 3.2  Add error.tsx boundary
[ ] 3.3  Favicon and branding

[ ] 4.1  Forecast panel (optional)
[ ] 4.2  Water gauge markers on map (optional)
[ ] 4.3  Sound notification (optional)
```
