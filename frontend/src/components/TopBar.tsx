import { Flame } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-700 shadow-lg shrink-0">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-orange-400 to-red-600 rounded-xl p-2 shadow-lg shadow-orange-900/40">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-white font-black text-lg tracking-tight">FIRESIGHT</span>
          <span className="text-slate-400 text-xs tracking-wide mt-0.5">Wildfire Risk Intelligence for Farmers</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-xs text-slate-500 border border-slate-700 rounded-full px-3 py-1">
          San Diego UN Hackathon 2025
        </span>
        <span className="flex items-center gap-1.5 bg-emerald-950 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-800">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          LIVE
        </span>
      </div>
    </header>
  )
}
