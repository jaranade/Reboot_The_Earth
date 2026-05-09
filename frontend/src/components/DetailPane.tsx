import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import type { MockResponse, RiskLevel } from '../mockData'

const LEVEL_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#f97316',
  extreme: '#dc2626',
}

const LEVEL_BADGE: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  extreme: 'bg-red-100 text-red-800',
}

const PRIORITY_COLORS = ['bg-red-600', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500']

interface DetailPaneProps {
  data: MockResponse
}

function FarmSummary({ farm }: { farm: MockResponse['farm'] }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Farm Summary</h2>
      <div className="text-lg font-bold text-slate-800 mb-1">{farm.name}</div>
      <div className="flex gap-4 text-sm text-slate-600 mt-2">
        <div><span className="font-medium text-slate-700">Crop:</span> {farm.crop}</div>
        <div><span className="font-medium text-slate-700">Size:</span> {farm.size}</div>
      </div>
    </section>
  )
}

function RiskTimeline({ timeline }: { timeline: MockResponse['risk_timeline'] }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">7-Day Fire Weather Index</h2>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="bg-slate-800 text-white text-xs rounded px-2 py-1.5 shadow">
                  <div className="font-semibold">{d.date} — FWI {d.fwi}</div>
                  <div className="capitalize mt-0.5" style={{ color: LEVEL_COLORS[d.level as RiskLevel] }}>{d.level}</div>
                </div>
              )
            }}
          />
          <Bar dataKey="fwi" radius={[4, 4, 0, 0]}>
            {timeline.map((entry) => (
              <Cell key={entry.date} fill={LEVEL_COLORS[entry.level]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-3 mt-3 flex-wrap">
        {(Object.entries(LEVEL_COLORS) as [RiskLevel, string][]).map(([level, color]) => (
          <div key={level} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
            <span className="capitalize">{level}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function ActionCard({ action, index }: { action: MockResponse['actions'][0]; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const colorClass = PRIORITY_BADGE_CLASS(action.priority)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`${colorClass} text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5`}>
          {action.priority}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm leading-snug">{action.action}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-slate-500">Due: <span className="font-medium text-slate-700">{action.deadline}</span></span>
            <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">{action.driver}</span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-orange-600 hover:text-orange-700 mt-2 font-medium"
          >
            {expanded ? 'Hide rationale ▲' : 'Why? ▼'}
          </button>
          {expanded && (
            <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded p-2.5 leading-relaxed border border-slate-100">
              {action.rationale}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function PRIORITY_BADGE_CLASS(priority: number) {
  return PRIORITY_COLORS[priority - 1] ?? 'bg-slate-500'
}

export default function DetailPane({ data }: DetailPaneProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <FarmSummary farm={data.farm} />
      <RiskTimeline timeline={data.risk_timeline} />
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Action Checklist</h2>
        <div className="flex flex-col gap-3">
          {data.actions.map((action, i) => (
            <ActionCard key={action.priority} action={action} index={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
