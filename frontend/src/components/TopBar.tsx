interface TopBarProps {
  persona: string
  onPersonaChange: (value: string) => void
}

const PERSONAS = [
  { value: 'almond', label: 'Almond Grower' },
  { value: 'cattle', label: 'Cattle Rancher' },
  { value: 'vineyard', label: 'Vineyard Operator' },
]

export default function TopBar({ persona, onPersonaChange }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-orange-600 text-white shadow-md">
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold tracking-tight">FireSight</span>
        <span className="text-orange-200 text-sm">Riverside County Fire Risk Intelligence</span>
      </div>
      <select
        value={persona}
        onChange={(e) => onPersonaChange(e.target.value)}
        className="bg-orange-700 text-white border border-orange-400 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white"
      >
        {PERSONAS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </header>
  )
}
