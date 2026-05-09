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
  vpd_kpa: number
  fire_weather_index: number
  risk_level: string
}

export interface ApiRecommendation {
  rank: number
  action: string
  reason: string
  consequences: string
  urgency: string
  time_to_act: string
}

export interface ApiWeatherAlert {
  event: string
  severity: string
  headline: string
  expires: string
}

export interface ApiNearbyFire {
  latitude: number
  longitude: number
  detection_date: string
  confidence: string
  frp: number
}

export interface ApiFireApproachAlert {
  level: string
  distance_km: number
  direction: string
  estimated_hours_to_farm: number
  wind_pushing_toward_farm: boolean
  message: string
}

export interface ApiResponse {
  farm_profile: ApiFarmProfile
  drought_level: string
  ndvi_status: string
  elevation_m: number | null
  risk_trend: string
  fire_approach_alert: ApiFireApproachAlert | null
  weather_alerts: ApiWeatherAlert[]
  nearby_fires: ApiNearbyFire[]
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

const ALERT_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  SEVERE: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-800', icon: '🔴' },
  WARNING: { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-800', icon: '🟠' },
  WATCH: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-800', icon: '🟡' },
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })
}

// ---------- sub-components ----------

function FireStatusBanner({ alert }: { alert: ApiFireApproachAlert | null }) {
  if (!alert) {
    return (
      <section className="bg-green-50 border-l-4 border-green-400 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-sm text-green-800">
          <span>🟢</span>
          <span>FIRE APPROACH STATUS — ALL CLEAR</span>
        </div>
        <p className="text-xs text-green-700 mt-1">
          No active satellite fire detections within 55 km of this farm in the last 24 hours.
        </p>
      </section>
    )
  }

  const style = ALERT_STYLES[alert.level] ?? ALERT_STYLES.WATCH
  const pulse = alert.level === 'SEVERE' ? 'animate-pulse' : ''
  return (
    <section className={`${style.bg} border-l-4 ${style.border} rounded-xl p-4 shadow-sm ${pulse}`}>
      <div className={`flex items-center gap-2 font-bold text-sm ${style.text} mb-1`}>
        <span>{style.icon}</span>
        <span>FIRE APPROACH ALERT — {alert.level}</span>
        <span className="ml-auto text-xs font-normal opacity-70">{alert.distance_km} km {alert.direction}</span>
      </div>
      <p className={`text-xs ${style.text} leading-relaxed`}>{alert.message}</p>
      <div className="flex gap-4 mt-2 text-xs opacity-70">
        <span className={style.text}>Est. arrival: ~{alert.estimated_hours_to_farm}h</span>
        {alert.wind_pushing_toward_farm && (
          <span className={`font-semibold ${style.text}`}>⚠ Wind pushing toward farm</span>
        )}
      </div>
    </section>
  )
}

function WeatherAlertBanner({ alerts }: { alerts: ApiWeatherAlert[] }) {
  if (!alerts.length) return null
  return (
    <section className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-sm">
      <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
        ⚠ Active Government Alerts
      </h2>
      <div className="flex flex-col gap-1.5">
        {alerts.map((a, i) => (
          <div key={i} className="text-xs text-amber-800">
            <span className="font-semibold">{a.event}</span>
            <span className="text-amber-600 ml-1">({a.severity})</span>
            <p className="text-amber-700 mt-0.5 opacity-80">{a.headline}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FarmSummary({
  profile, drought, ndvi, elevation, trend, nearbyFires,
}: {
  profile: ApiFarmProfile
  drought: string
  ndvi: string
  elevation: number | null
  trend: string
  nearbyFires: ApiNearbyFire[]
}) {
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
        {elevation != null && (
          <div><span className="font-medium text-slate-700">Elevation:</span> {elevation} m</div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-3 text-xs">
        <span className="bg-amber-50 border border-amber-200 text-amber-700 rounded px-2 py-0.5">{drought}</span>
        <span className="bg-slate-100 text-slate-600 rounded px-2 py-0.5">{ndvi}</span>
        {nearbyFires.length > 0 && (
          <span className="bg-red-50 border border-red-200 text-red-700 rounded px-2 py-0.5">
            🔥 {nearbyFires.length} fire{nearbyFires.length > 1 ? 's' : ''} detected nearby
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-3 italic">{trend}</p>
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
    vpd: d.vpd_kpa,
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
                  <div className="text-slate-400">VPD: {d.vpd} kPa</div>
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
  const [section, setSection] = useState<'none' | 'why' | 'consequences'>('none')
  const badgeClass = URGENCY_COLORS[rec.urgency] ?? 'bg-slate-500'

  const toggle = (s: 'why' | 'consequences') =>
    setSection((prev) => (prev === s ? 'none' : s))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`${badgeClass} text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5`}>
          {rec.rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm leading-snug">{rec.action}</p>
          <div className="flex flex-wrap gap-2 mt-1.5 items-center">
            <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5 capitalize">{rec.urgency} urgency</span>
            {rec.time_to_act && (
              <span className="text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded px-2 py-0.5">
                ⏱ {rec.time_to_act}
              </span>
            )}
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => toggle('why')}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium"
            >
              {section === 'why' ? 'Hide ▲' : 'Why this? ▼'}
            </button>
            {rec.consequences && (
              <button
                onClick={() => toggle('consequences')}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                {section === 'consequences' ? 'Hide ▲' : 'What if ignored? ▼'}
              </button>
            )}
          </div>
          {section === 'why' && (
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded p-2.5">
              <p className="text-xs font-semibold text-blue-700 mb-1">📊 Why this recommendation</p>
              <p className="text-xs text-slate-700 leading-relaxed">{rec.reason}</p>
            </div>
          )}
          {section === 'consequences' && rec.consequences && (
            <div className="mt-2 bg-red-50 border border-red-100 rounded p-2.5">
              <p className="text-xs font-semibold text-red-700 mb-1">⚠ What could happen if ignored</p>
              <p className="text-xs text-slate-700 leading-relaxed">{rec.consequences}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NearbyFiresPanel({ fires, farmLat, farmLon }: { fires: ApiNearbyFire[]; farmLat: number; farmLon: number }) {
  if (!fires.length) return null

  const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@${farmLon.toFixed(3)},${farmLat.toFixed(3)},10z`

  const frpLabel = (frp: number) => {
    if (frp >= 50) return { label: 'Intense', color: 'text-red-700' }
    if (frp >= 10) return { label: 'Moderate', color: 'text-orange-600' }
    return { label: 'Low', color: 'text-yellow-600' }
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          🔥 NASA FIRMS Fire Detections
        </h2>
        <a
          href={firmsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-orange-600 hover:text-orange-700 font-medium underline"
        >
          Verify on NASA FIRMS map ↗
        </a>
      </div>
      <div className="flex flex-col gap-2">
        {fires.map((f, i) => {
          const { label, color } = frpLabel(f.frp)
          const mapsUrl = `https://www.google.com/maps?q=${f.latitude},${f.longitude}`
          return (
            <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-slate-700 hover:text-orange-600 underline"
                >
                  {f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}
                </a>
                <span className="text-slate-400 ml-2">· {f.detection_date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${color}`}>{label}</span>
                <span className="text-slate-400">{f.frp} MW</span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-slate-400 mt-3">
        Source: NASA VIIRS satellite (SNPP), near-real-time (~3h delay). FRP = Fire Radiative Power in megawatts.
        Confidence "n" = nominal (standard detection quality).
      </p>
    </section>
  )
}

// ---------- main export ----------

export default function DetailPane({ data }: { data: ApiResponse }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <FireStatusBanner alert={data.fire_approach_alert ?? null} />
      <WeatherAlertBanner alerts={data.weather_alerts ?? []} />
      <FarmSummary
        profile={data.farm_profile}
        drought={data.drought_level}
        ndvi={data.ndvi_status}
        elevation={data.elevation_m ?? null}
        trend={data.risk_trend ?? ''}
        nearbyFires={data.nearby_fires ?? []}
      />
      <RiskTimeline timeline={data.risk_timeline} />
      <NearbyFiresPanel
        fires={data.nearby_fires ?? []}
        farmLat={data.farm_profile.latitude}
        farmLon={data.farm_profile.longitude}
      />
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Recommendations</h2>
        <div className="flex flex-col gap-3">
          {data.recommendations.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} />
          ))}
        </div>
      </section>
    </div>
  )
}
