import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'

// ---------- API response types ----------

export interface ApiFarmProfile {
  location_name: string
  latitude: number
  longitude: number
  crop_type: string
  livestock: boolean
  acres: number | null
}

export interface ApiDailyRisk {
  date: string
  temperature_max_c: number
  humidity_min_percent: number
  wind_max_kmh: number
  precipitation_mm: number
  fire_weather_index: number
  risk_level: string // "Low" | "Moderate" | "High" | "Extreme"
}

export interface ApiRecommendation {
  rank: number
  action: string
  reason: string
  urgency: string // "high" | "medium" | "low"
}

export interface ApiResponse {
  farm_profile: ApiFarmProfile
  drought_level: string
  ndvi_status: string
  risk_timeline: ApiDailyRisk[]
  recommendations: ApiRecommendation[]
}

// ---------- constants ----------

const LEVEL_COLORS: Record<string, string> = {
  Low: '#22c55e',
  Moderate: '#eab308',
  High: '#f97316',
  Extreme: '#dc2626',
}

const URGENCY_COLORS: Record<string, string> = {
  high: 'bg-red-600',
  medium: 'bg-orange-500',
  low: 'bg-blue-500',
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })
}

// ---------- sub-components ----------

function FarmSummary({ profile, drought, ndvi }: { profile: ApiFarmProfile; drought: string; ndvi: string }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Farm Summary</h2>
      <div className="text-lg font-bold text-slate-800 mb-1">{profile.location_name}</div>
      <div className="flex flex-wrap gap-4 text-sm text-slate-600 mt-2">
        <div><span className="font-medium text-slate-700">Crop:</span> {profile.crop_type}</div>
        {profile.acres != null && (
          <div><span className="font-medium text-slate-700">Size:</span> {profile.acres} acres</div>
        )}
        <div><span className="font-medium text-slate-700">Livestock:</span> {profile.livestock ? 'Yes' : 'No'}</div>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
        <span className="bg-amber-50 border border-amber-200 text-amber-700 rounded px-2 py-0.5">{drought}</span>
        <span className="bg-slate-100 text-slate-600 rounded px-2 py-0.5">{ndvi}</span>
      </div>
    </section>
  )
}

function RiskTimeline({ timeline }: { timeline: ApiDailyRisk[] }) {
  const chartData = timeline.map((d) => ({
    date: fmtDate(d.date),
    fwi: d.fire_weather_index,
    level: d.risk_level,
    temp: d.temperature_max_c,
    humidity: d.humidity_min_percent,
    wind: d.wind_max_kmh,
  }))

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">7-Day Fire Weather Index</h2>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="bg-slate-800 text-white text-xs rounded px-2 py-1.5 shadow space-y-0.5">
                  <div className="font-semibold">{d.date} — FWI {d.fwi}</div>
                  <div style={{ color: LEVEL_COLORS[d.level] ?? '#9ca3af' }}>{d.level}</div>
                  <div className="text-slate-400">{d.temp}°C · {d.humidity}% RH · {d.wind} km/h</div>
                </div>
              )
            }}
          />
          <Bar dataKey="fwi" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.date} fill={LEVEL_COLORS[entry.level] ?? '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-3 mt-3 flex-wrap">
        {Object.entries(LEVEL_COLORS).map(([level, color]) => (
          <div key={level} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
            <span>{level}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function RecommendationCard({ rec }: { rec: ApiRecommendation }) {
  const [expanded, setExpanded] = useState(false)
  const badgeClass = URGENCY_COLORS[rec.urgency] ?? 'bg-slate-500'

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`${badgeClass} text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5`}>
          {rec.rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm leading-snug">{rec.action}</p>
          <span className="inline-block mt-1.5 text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5 capitalize">{rec.urgency} urgency</span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="block text-xs text-orange-600 hover:text-orange-700 mt-2 font-medium"
          >
            {expanded ? 'Hide reason ▲' : 'Why? ▼'}
          </button>
          {expanded && (
            <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded p-2.5 leading-relaxed border border-slate-100">
              {rec.reason}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- main export ----------

export default function DetailPane({ data }: { data: ApiResponse }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <FarmSummary profile={data.farm_profile} drought={data.drought_level} ndvi={data.ndvi_status} />
      <RiskTimeline timeline={data.risk_timeline} />
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Recommendations</h2>
        <div className="flex flex-col gap-3">
          {data.recommendations.map((rec) => (
            <RecommendationCard key={rec.rank} rec={rec} />
          ))}
        </div>
      </section>
    </div>
  )
}
