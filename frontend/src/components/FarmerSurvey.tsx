import { useState, useEffect } from 'react'
import { MapPin, Sprout, PawPrint, Droplets, Users, ChevronRight } from 'lucide-react'

const CROPS = [
  'Avocados',
  'Citrus (oranges, lemons, limes)',
  'Strawberries',
  'Tomatoes',
  'Nursery & Greenhouse Plants',
  'Cut Flowers',
  'Herbs (sage, lavender, etc.)',
  'Grapes / Vineyard',
  'Olives',
  'Stone Fruit (peaches, plums, nectarines)',
  'Hay / Forage Crops',
  'Macadamia Nuts',
  'Tropical Fruit (cherimoya, guava, loquat)',
]

const STRUCTURES = ['Barn', 'Equipment Storage', 'Packing Shed', 'Residence', 'None']

export interface SurveyData {
  address: string
  coordinates: string
  acreage: string
  crops: string[]
  cropsOther: string
  growthStage: string
  nearHarvest: string
  hasLivestock: string
  livestockType: string
  animalCount: string
  relocationSite: string
  irrigationSource: string
  defensiveIrrigation: string
  structures: string[]
  structuresOther: string
  hasWorkers: string
  workerDetails: string
}

interface FarmerSurveyProps {
  onSubmit: (data: SurveyData) => void
  geoAddress: string
  geoAddressLoading: boolean
  geoAcres: string
  geoCoordinates: string
  onAddressChange: (addr: string) => void
  onAcresChange: (acres: string) => void
  preset: SurveyData | null
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-1">
      <div className="bg-orange-50 rounded-lg p-1.5">
        <Icon className="w-3.5 h-3.5 text-orange-500" />
      </div>
      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

function RadioGroup({ name, options, value, onChange }: {
  name: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((opt) => (
        <label key={opt} className={`flex items-center gap-2.5 cursor-pointer rounded-lg px-3 py-2 transition-colors ${
          value === opt ? 'bg-orange-50 border border-orange-200' : 'hover:bg-slate-50 border border-transparent'
        }`}>
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            value === opt ? 'border-orange-500' : 'border-slate-300'
          }`}>
            {value === opt && <div className="w-2 h-2 rounded-full bg-orange-500" />}
          </div>
          <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="sr-only" />
          <span className={`text-sm transition-colors ${value === opt ? 'text-orange-700 font-medium' : 'text-slate-600'}`}>{opt}</span>
        </label>
      ))}
    </div>
  )
}

function CheckboxGroup({ options, selected, onChange }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void
}) {
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt])
  return (
    <div className="flex flex-col gap-1">
      {options.map((opt) => (
        <label key={opt} className={`flex items-center gap-2.5 cursor-pointer rounded-lg px-3 py-2 transition-colors ${
          selected.includes(opt) ? 'bg-orange-50 border border-orange-200' : 'hover:bg-slate-50 border border-transparent'
        }`}>
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            selected.includes(opt) ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
          }`}>
            {selected.includes(opt) && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="sr-only" />
          <span className={`text-sm transition-colors ${selected.includes(opt) ? 'text-orange-700 font-medium' : 'text-slate-600'}`}>{opt}</span>
        </label>
      ))}
    </div>
  )
}

function Question({ number, question, children }: { number: number; question: string; children: React.ReactNode }) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-orange-200 hover:shadow-sm transition-all duration-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center">
          {number}
        </span>
        <p className="text-sm font-semibold text-slate-700">{question}</p>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  )
}

export default function FarmerSurvey({
  onSubmit, geoAddress, geoAddressLoading, geoAcres, geoCoordinates,
  onAddressChange, onAcresChange, preset
}: FarmerSurveyProps) {
  const [form, setForm] = useState<SurveyData>({
    address: '', coordinates: '', acreage: '', crops: [], cropsOther: '',
    growthStage: '', nearHarvest: '', hasLivestock: '', livestockType: '',
    animalCount: '', relocationSite: '', irrigationSource: '', defensiveIrrigation: '',
    structures: [], structuresOther: '', hasWorkers: '', workerDetails: '',
  })

  const set = <K extends keyof SurveyData>(key: K, value: SurveyData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  useEffect(() => { setForm((prev) => ({ ...prev, address: geoAddress })) }, [geoAddress])
  useEffect(() => { setForm((prev) => ({ ...prev, acreage: geoAcres })) }, [geoAcres])
  useEffect(() => { setForm((prev) => ({ ...prev, coordinates: geoCoordinates })) }, [geoCoordinates])
  useEffect(() => { if (preset) setForm(preset) }, [preset])

  const handleClear = () =>
    setForm({
      address: geoAddress, coordinates: geoCoordinates, acreage: geoAcres,
      crops: [], cropsOther: '', growthStage: '', nearHarvest: '', hasLivestock: '',
      livestockType: '', animalCount: '', relocationSite: '', irrigationSource: '',
      defensiveIrrigation: '', structures: [], structuresOther: '', hasWorkers: '', workerDetails: '',
    })

  const showLivestock = form.hasLivestock === 'Yes'
  const showWorkerDetails = form.hasWorkers === 'Yes'

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-4 shadow-lg shadow-orange-200">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white font-black text-base tracking-tight">Farm Profile Survey</h1>
            <p className="text-orange-100 text-xs mt-0.5">Complete to receive your personalized fire risk assessment</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-orange-200 hover:text-white text-xs border border-orange-400 hover:border-white rounded-lg px-2.5 py-1.5 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Location */}
      <SectionHeader icon={MapPin} label="Location" />

      <Question number={1} question="Farm address or nearest cross-streets">
        <input
          type="text"
          placeholder={geoAddressLoading ? 'Locating…' : 'e.g., 1234 Valley Center Rd, Ramona, CA'}
          value={form.address}
          onChange={(e) => { set('address', e.target.value); onAddressChange(e.target.value) }}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-slate-50"
        />
      </Question>

      <Question number={2} question="Approximate acreage">
        <input
          type="number" min="0" step="any"
          placeholder="e.g., 45.5"
          value={form.acreage}
          onChange={(e) => { set('acreage', e.target.value); onAcresChange(e.target.value) }}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-slate-50"
        />
      </Question>

      {/* Crops */}
      <SectionHeader icon={Sprout} label="Crops" />

      <Question number={3} question="What do you currently grow? (Select all that apply)">
        <CheckboxGroup options={CROPS} selected={form.crops} onChange={(v) => set('crops', v)} />
        <div className="mt-1">
          <label className={`flex items-center gap-2.5 cursor-pointer rounded-lg px-3 py-2 transition-colors ${
            form.cropsOther !== '' ? 'bg-orange-50 border border-orange-200' : 'hover:bg-slate-50 border border-transparent'
          }`}>
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              form.cropsOther !== '' ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
            }`}>
              {form.cropsOther !== '' && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <input type="checkbox" checked={form.cropsOther !== ''} onChange={(e) => set('cropsOther', e.target.checked ? ' ' : '')} className="sr-only" />
            <span className="text-sm text-slate-600">Other</span>
          </label>
          {form.cropsOther !== '' && (
            <input
              type="text" placeholder="Please specify"
              value={form.cropsOther.trim()}
              onChange={(e) => set('cropsOther', e.target.value)}
              className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-slate-50"
            />
          )}
        </div>
      </Question>

      <Question number={4} question="Current growth stage of your primary crop">
        <RadioGroup
          name="growthStage"
          options={['Dormant', 'Flowering', 'Fruit Set', 'Harvest-Ready', 'Post-Harvest']}
          value={form.growthStage}
          onChange={(v) => set('growthStage', v)}
        />
      </Question>

      <Question number={5} question="Do you have crops within 2 weeks of harvest?">
        <RadioGroup name="nearHarvest" options={['Yes', 'No']} value={form.nearHarvest} onChange={(v) => set('nearHarvest', v)} />
      </Question>

      {/* Livestock */}
      <SectionHeader icon={PawPrint} label="Livestock" />

      <Question number={6} question="Do you have livestock on the property?">
        <RadioGroup
          name="hasLivestock"
          options={['Yes', 'No']}
          value={form.hasLivestock}
          onChange={(v) => { set('hasLivestock', v); if (v === 'No') { set('livestockType', ''); set('animalCount', '') } }}
        />
      </Question>

      {showLivestock && (
        <Question number={7} question="What type of livestock?">
          <RadioGroup
            name="livestockType"
            options={['Cattle', 'Horses', 'Sheep & Goats', 'Poultry', 'Mixed', 'Other']}
            value={form.livestockType}
            onChange={(v) => set('livestockType', v)}
          />
        </Question>
      )}

      {showLivestock && (
        <Question number={8} question="Approximately how many animals?">
          <RadioGroup
            name="animalCount"
            options={['1–10 animals', '11–50 animals', '51–150 animals', '151–500 animals', '500+ animals']}
            value={form.animalCount}
            onChange={(v) => set('animalCount', v)}
          />
        </Question>
      )}

      <Question number={9} question="Do you have a designated relocation site or trailer capacity?">
        <RadioGroup name="relocationSite" options={['Yes', 'No', 'Unsure']} value={form.relocationSite} onChange={(v) => set('relocationSite', v)} />
      </Question>

      {/* Water & Infrastructure */}
      <SectionHeader icon={Droplets} label="Water & Infrastructure" />

      <Question number={10} question="Primary irrigation source">
        <RadioGroup
          name="irrigationSource"
          options={['Well', 'Canal or Ditch', 'Municipal', 'No Irrigation']}
          value={form.irrigationSource}
          onChange={(v) => set('irrigationSource', v)}
        />
      </Question>

      <Question number={11} question="Can you run irrigation defensively during a fire event?">
        <RadioGroup name="defensiveIrrigation" options={['Yes', 'No', 'Unsure']} value={form.defensiveIrrigation} onChange={(v) => set('defensiveIrrigation', v)} />
      </Question>

      <Question number={12} question="Permanent structures on your property">
        <CheckboxGroup options={STRUCTURES} selected={form.structures} onChange={(v) => set('structures', v)} />
        <div className="mt-1">
          <label className={`flex items-center gap-2.5 cursor-pointer rounded-lg px-3 py-2 transition-colors ${
            form.structuresOther !== '' ? 'bg-orange-50 border border-orange-200' : 'hover:bg-slate-50 border border-transparent'
          }`}>
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              form.structuresOther !== '' ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
            }`}>
              {form.structuresOther !== '' && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <input type="checkbox" checked={form.structuresOther !== ''} onChange={(e) => set('structuresOther', e.target.checked ? ' ' : '')} className="sr-only" />
            <span className="text-sm text-slate-600">Other</span>
          </label>
          {form.structuresOther !== '' && (
            <input
              type="text" placeholder="Please specify"
              value={form.structuresOther.trim()}
              onChange={(e) => set('structuresOther', e.target.value)}
              className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-slate-50"
            />
          )}
        </div>
      </Question>

      {/* Workforce */}
      <SectionHeader icon={Users} label="Workforce" />

      <Question number={13} question="Do you have workers on-site during regular operations?">
        <RadioGroup
          name="hasWorkers"
          options={['Yes', 'No']}
          value={form.hasWorkers}
          onChange={(v) => { set('hasWorkers', v); if (v === 'No') set('workerDetails', '') }}
        />
      </Question>

      {showWorkerDetails && (
        <Question number={14} question="How many workers, and how often are they on-site?">
          <input
            type="text"
            placeholder="e.g., 8 workers, daily during harvest season"
            value={form.workerDetails}
            onChange={(e) => set('workerDetails', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-slate-50"
          />
        </Question>
      )}

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 active:scale-[0.98] text-white font-bold text-sm py-3.5 rounded-2xl shadow-lg shadow-orange-200 transition-all duration-150 mt-1"
      >
        Generate Risk Assessment
        <ChevronRight className="w-4 h-4" />
      </button>
    </form>
  )
}
