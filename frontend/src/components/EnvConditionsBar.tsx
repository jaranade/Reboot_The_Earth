export interface EnvConditions {
  wind: { speedMph: number; direction: string; gustsMph?: number }
  moisture: { rh: number }   // relative humidity %
  heat: { tempF: number }
}

function windRisk(mph: number) {
  if (mph >= 25) return { label: 'Extreme', cls: 'text-red-600' }
  if (mph >= 15) return { label: 'Elevated', cls: 'text-orange-500' }
  return { label: 'Low', cls: 'text-green-600' }
}

function moistureRisk(rh: number) {
  if (rh < 15) return { label: 'Critical', cls: 'text-red-600' }
  if (rh < 30) return { label: 'Low', cls: 'text-orange-500' }
  return { label: 'Moderate', cls: 'text-green-600' }
}

function heatRisk(f: number) {
  if (f >= 100) return { label: 'Extreme', cls: 'text-red-600' }
  if (f >= 85) return { label: 'High', cls: 'text-orange-500' }
  return { label: 'Moderate', cls: 'text-green-600' }
}

interface MetricProps {
  label: string
  value: string
  sub: string
  riskCls: string
  riskLabel: string
  border?: boolean
}

function Metric({ label, value, sub, riskCls, riskLabel, border }: MetricProps) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center py-3 px-4 ${border ? 'border-l border-slate-200' : ''}`}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-800 leading-none">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      <p className={`text-xs font-semibold mt-1 ${riskCls}`}>{riskLabel}</p>
    </div>
  )
}

interface Props {
  conditions: EnvConditions | null
}

export default function EnvConditionsBar({ conditions }: Props) {
  return (
    <div
      className={`overflow-hidden transition-all duration-500 ease-in-out ${
        conditions ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
      } bg-white border-b border-slate-200 shadow-sm`}
    >
      {conditions && (
        <div className="flex divide-x divide-slate-200">
          <Metric
            label="Wind"
            value={`${conditions.wind.speedMph} mph`}
            sub={`${conditions.wind.direction}${conditions.wind.gustsMph ? ` · Gusts ${conditions.wind.gustsMph} mph` : ''}`}
            riskCls={windRisk(conditions.wind.speedMph).cls}
            riskLabel={windRisk(conditions.wind.speedMph).label}
          />
          <Metric
            label="Moisture"
            value={`${conditions.moisture.rh}%`}
            sub="Relative Humidity"
            riskCls={moistureRisk(conditions.moisture.rh).cls}
            riskLabel={moistureRisk(conditions.moisture.rh).label}
            border
          />
          <Metric
            label="Heat"
            value={`${conditions.heat.tempF}°F`}
            sub="Ambient Temperature"
            riskCls={heatRisk(conditions.heat.tempF).cls}
            riskLabel={heatRisk(conditions.heat.tempF).label}
            border
          />
        </div>
      )}
    </div>
  )
}
