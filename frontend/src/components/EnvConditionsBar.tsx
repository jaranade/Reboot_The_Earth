import { Wind, Droplets, Thermometer, AlertTriangle } from 'lucide-react'

export interface EnvConditions {
  wind: { speedMph: number; direction: string; gustsMph?: number }
  moisture: { rh: number }
  heat: { tempF: number }
}

function windRisk(mph: number) {
  if (mph >= 25) return { label: 'Extreme', cls: 'text-red-400', bg: 'bg-red-950' }
  if (mph >= 15) return { label: 'Elevated', cls: 'text-orange-400', bg: 'bg-orange-950' }
  return { label: 'Normal', cls: 'text-emerald-400', bg: 'bg-emerald-950' }
}

function moistureRisk(rh: number) {
  if (rh < 15) return { label: 'Critical', cls: 'text-red-400', bg: 'bg-red-950' }
  if (rh < 30) return { label: 'Low', cls: 'text-orange-400', bg: 'bg-orange-950' }
  return { label: 'Normal', cls: 'text-emerald-400', bg: 'bg-emerald-950' }
}

function heatRisk(f: number) {
  if (f >= 100) return { label: 'Extreme', cls: 'text-red-400', bg: 'bg-red-950' }
  if (f >= 85) return { label: 'High', cls: 'text-orange-400', bg: 'bg-orange-950' }
  return { label: 'Moderate', cls: 'text-amber-400', bg: 'bg-amber-950' }
}

interface MetricProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  riskCls: string
  riskBg: string
  riskLabel: string
}

function Metric({ icon, label, value, sub, riskCls, riskBg, riskLabel }: MetricProps) {
  return (
    <div className="flex-1 flex items-center gap-3 px-5 py-3">
      <div className="text-slate-400 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{label}</p>
        <p className="text-white font-bold text-base leading-tight">{value}</p>
        <p className="text-slate-400 text-xs truncate">{sub}</p>
      </div>
      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${riskCls} ${riskBg} border-current/30`}>
        {riskLabel}
      </span>
    </div>
  )
}

export default function EnvConditionsBar({ conditions }: { conditions: EnvConditions | null }) {
  return (
    <div
      className={`overflow-hidden transition-all duration-500 ease-in-out ${
        conditions ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
      } bg-slate-800 border-b border-slate-700`}
    >
      {conditions && (
        <div className="flex divide-x divide-slate-700">
          <div className="px-3 py-3 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">FIRE CONDITIONS</span>
          </div>
          <Metric
            icon={<Wind className="w-4 h-4" />}
            label="Wind"
            value={`${conditions.wind.speedMph} mph`}
            sub={`${conditions.wind.direction}${conditions.wind.gustsMph ? ` · Gusts ${conditions.wind.gustsMph} mph` : ''}`}
            riskCls={windRisk(conditions.wind.speedMph).cls}
            riskBg={windRisk(conditions.wind.speedMph).bg}
            riskLabel={windRisk(conditions.wind.speedMph).label}
          />
          <Metric
            icon={<Droplets className="w-4 h-4" />}
            label="Humidity"
            value={`${conditions.moisture.rh}%`}
            sub="Relative Humidity"
            riskCls={moistureRisk(conditions.moisture.rh).cls}
            riskBg={moistureRisk(conditions.moisture.rh).bg}
            riskLabel={moistureRisk(conditions.moisture.rh).label}
          />
          <Metric
            icon={<Thermometer className="w-4 h-4" />}
            label="Temperature"
            value={`${conditions.heat.tempF}°F`}
            sub="Ambient Temperature"
            riskCls={heatRisk(conditions.heat.tempF).cls}
            riskBg={heatRisk(conditions.heat.tempF).bg}
            riskLabel={heatRisk(conditions.heat.tempF).label}
          />
        </div>
      )}
    </div>
  )
}
