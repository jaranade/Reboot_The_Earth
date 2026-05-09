import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import {
  MapPin, Wheat, Ruler, PawPrint, Droplets, Mountain, TrendingUp, TrendingDown, Minus,
  Flame, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, Satellite
} from 'lucide-react'

// ---------- types ----------

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
  risk_level: string
}

export interface ApiRecommendation {
  rank: number
  action: string
  reason: string
  urgency: string
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

export interface ApiResponse {
  farm_profile: ApiFarmProfile
  drought_level: string
  ndvi_status: string
  elevation_m?: number | null
  risk_trend?: string
  weather_alerts?: ApiWeatherAlert[]
  nearby_fires?: ApiNearbyFire[]
  risk_timeline: ApiDailyRisk[]
  recommendations: ApiRecommendation[]
}

// ---------- constants ----------

const LEVEL_COLORS: Record<string, string> = {
  Low: '#22c55e',
  Moderate: '#f59e0b',
  High: '#f97316',
  Extreme: '#dc2626',
}

const LEVEL_BG: Record<string, string> = {
  Low: 'from-emerald-600 to-emerald-800',
  Moderate: 'from-amber-500 to-amber-700',
  High: 'from-orange-500 to-orange-700',
  Extreme: 'from-red-600 to-red-800',
}

const URGENCY_CONFIG: Record<string, { bg: string; border: string; badge: string; icon: React.ElementType }> = {
  high:   { bg: 'bg-red-50',    border: 'border-l-red-500',    badge: 'bg-red-100 text-red-700',    icon: AlertTriangle },
  medium: { bg: 'bg-orange-50', border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  low:    { bg: 'bg-sky-50',    border: 'border-l-sky-500',    badge: 'bg-sky-100 text-sky-700',    icon: Info },
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtShortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })
}

function peakRisk(timeline: ApiDailyRisk[]): string {
  const order: Record<string, number> = { Low: 1, Moderate: 2, High: 3, Extreme: 4 }
  return timeline.reduce((max, d) => (order[d.risk_level] ?? 0) > (order[max] ?? 0) ? d.risk_level : max, 'Low')
}

// ---------- sub-components ----------

function RiskBanner({ level, trend }: { level: string; trend?: string }) {
  const TrendIcon = trend?.startsWith('Worsening') ? TrendingUp : trend?.startsWith('Improving') ? TrendingDown : Minus
  return (
    <div className={`bg-gradient-to-r ${LEVEL_BG[level] ?? 'from-slate-600 to-slate-800'} px-5 py-4 flex items-center justify-between`}>
      <div>
        <p className="text-white/70 text-xs uppercase tracking-widest font-semibold">Peak Fire Risk</p>
        <p className="text-white font-black text-3xl tracking-tight leading-none mt-0.5">{level}</p>
        {trend && (
          <div className="flex items-center gap-1.5 mt-2">
            <TrendIcon className="w-3.5 h-3.5 text-white/70" />
            <p className="text-white/80 text-xs leading-tight">{trend}</p>
          </div>
        )}
      </div>
      <div className="bg-white/10 rounded-2xl p-3">
        <Flame className="w-10 h-10 text-white" />
      </div>
    </div>
  )
}

function InfoChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2.5 shadow-sm">
      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <div>
        <p className="text-xs text-slate-400 leading-none">{label}</p>
        <p className="text-sm font-semibold text-slate-800 leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function FarmSummary({ profile, drought, ndvi, elevationM }: {
  profile: ApiFarmProfile; drought: string; ndvi: string; elevationM?: number | null
}) {
  return (
    <section className="flex flex-col gap-3 px-4 pt-4">
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
        <p className="text-slate-800 font-bold text-base leading-snug">{profile.location_name}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InfoChip icon={Wheat} label="Crop" value={profile.crop_type} />
        {profile.acres != null && <InfoChip icon={Ruler} label="Size" value={`${profile.acres} acres`} />}
        <InfoChip icon={PawPrint} label="Livestock" value={profile.livestock ? 'Yes' : 'No'} />
        {elevationM != null && <InfoChip icon={Mountain} label="Elevation" value={`${Math.round(elevationM)} m`} />}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-full px-3 py-1">
          <Droplets className="w-3 h-3" />
          {drought}
        </span>
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-full px-3 py-1">
          <Satellite className="w-3 h-3" />
          {ndvi}
        </span>
      </div>
    </section>
  )
}

function WeatherAlertsSection({ alerts }: { alerts: ApiWeatherAlert[] }) {
  if (!alerts.length) return null
  return (
    <section className="px-4">
      <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-red-100 border-b border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-xs font-black text-red-700 uppercase tracking-widest">
            {alerts.length} Active Government Alert{alerts.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex flex-col divide-y divide-red-100">
          {alerts.map((a, i) => (
            <div key={i} className="px-4 py-3">
              <p className="text-sm font-bold text-red-800">{a.event}</p>
              <p className="text-xs text-red-600 mt-0.5">{a.headline}</p>
              {a.severity && (
                <span className="inline-block mt-1.5 text-xs bg-red-100 text-red-600 border border-red-200 rounded-full px-2 py-0.5 font-semibold">
                  Severity: {a.severity}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function NearbyFiresSection({ fires }: { fires: ApiNearbyFire[] }) {
  if (!fires.length) return null
  return (
    <section className="px-4">
      <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="bg-orange-500 rounded-xl p-2 shrink-0">
          <Flame className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-orange-800">
            {fires.length} Active Fire Detection{fires.length > 1 ? 's' : ''} Nearby
          </p>
          <p className="text-xs text-orange-600 mt-0.5">Satellite detections within ~55 km in the last 24 hours</p>
        </div>
      </div>
    </section>
  )
}

function RiskTimeline({ timeline }: { timeline: ApiDailyRisk[] }) {
  const chartData = timeline.map((d) => ({
    date: fmtShortDate(d.date),
    fullDate: fmtDate(d.date),
    fwi: d.fire_weather_index,
    level: d.risk_level,
    fill: LEVEL_COLORS[d.risk_level] ?? '#94a3b8',
    temp: d.temperature_max_c,
    humidity: d.humidity_min_percent,
    wind: d.wind_max_kmh,
  }))

  return (
    <section className="px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">7-Day Fire Weather Index</p>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
            <ReferenceLine y={25} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={35} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.1)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl space-y-1">
                    <div className="font-bold text-white">{d.fullDate}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: LEVEL_COLORS[d.level] }} />
                      <span style={{ color: LEVEL_COLORS[d.level] }} className="font-semibold">{d.level} Risk</span>
                      <span className="text-slate-400">· FWI {d.fwi}</span>
                    </div>
                    <div className="text-slate-400 pt-0.5 border-t border-slate-700">
                      {d.temp}°C · {d.humidity}% RH · {d.wind} km/h
                    </div>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="fwi"
              maxBarSize={36}
              shape={(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) => (
                <rect
                  x={props.x ?? 0} y={props.y ?? 0}
                  width={props.width ?? 0} height={Math.max(0, props.height ?? 0)}
                  rx={5} ry={5}
                  fill={props.fill ?? '#94a3b8'}
                />
              )}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 px-4 pb-4 pt-1 flex-wrap">
          {Object.entries(LEVEL_COLORS).map(([level, color]) => (
            <div key={level} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
              {level}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function RecommendationCard({ rec }: { rec: ApiRecommendation }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = URGENCY_CONFIG[rec.urgency] ?? URGENCY_CONFIG.low
  const Icon = cfg.icon

  return (
    <div className={`${cfg.bg} rounded-2xl border-l-4 ${cfg.border} border border-slate-200 border-l-[4px] shadow-sm overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Icon className={`w-5 h-5 ${
              rec.urgency === 'high' ? 'text-red-500' : rec.urgency === 'medium' ? 'text-orange-500' : 'text-sky-500'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-black text-slate-400">#{rec.rank}</span>
              <span className={`text-xs font-bold rounded-full px-2.5 py-0.5 capitalize ${cfg.badge}`}>
                {rec.urgency} urgency
              </span>
            </div>
            <p className="text-sm font-bold text-slate-800 leading-snug">{rec.action}</p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Hide reason</> : <><ChevronDown className="w-3.5 h-3.5" /> Why?</>}
            </button>
          </div>
        </div>
        {expanded && (
          <div className="mt-3 ml-8 bg-white/70 rounded-xl border border-slate-200 px-3 py-2.5">
            <p className="text-xs text-slate-600 leading-relaxed">{rec.reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- main export ----------

export default function DetailPane({ data }: { data: ApiResponse }) {
  const peak = peakRisk(data.risk_timeline)
  const alerts = data.weather_alerts ?? []
  const fires = data.nearby_fires ?? []

  return (
    <div className="flex flex-col gap-4 pb-6">
      <RiskBanner level={peak} trend={data.risk_trend} />
      <FarmSummary
        profile={data.farm_profile}
        drought={data.drought_level}
        ndvi={data.ndvi_status}
        elevationM={data.elevation_m}
      />
      {alerts.length > 0 && <WeatherAlertsSection alerts={alerts} />}
      {fires.length > 0 && <NearbyFiresSection fires={fires} />}
      <RiskTimeline timeline={data.risk_timeline} />
      <section className="px-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Recommendations</p>
        <div className="flex flex-col gap-3">
          {data.recommendations.map((rec) => (
            <RecommendationCard key={rec.rank} rec={rec} />
          ))}
        </div>
      </section>
    </div>
  )
}
