import { useState, useEffect } from 'react'

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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-slate-700 mb-2">{children}</p>
  )
}

function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="accent-orange-500"
          />
          <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt}</span>
        </label>
      ))}
    </div>
  )
}

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="accent-orange-500 rounded"
          />
          <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt}</span>
        </label>
      ))}
    </div>
  )
}

function QuestionBlock({ number, question, children }: { number: number; question: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Q{number}</p>
      <Label>{question}</Label>
      {children}
    </div>
  )
}

export default function FarmerSurvey({ onSubmit, geoAddress, geoAddressLoading, geoAcres, geoCoordinates, onAddressChange, onAcresChange, preset }: FarmerSurveyProps) {
  const [form, setForm] = useState<SurveyData>({
    address: '',
    coordinates: '',
    acreage: '',
    crops: [],
    cropsOther: '',
    growthStage: '',
    nearHarvest: '',
    hasLivestock: '',
    livestockType: '',
    animalCount: '',
    relocationSite: '',
    irrigationSource: '',
    defensiveIrrigation: '',
    structures: [],
    structuresOther: '',
    hasWorkers: '',
    workerDetails: '',
  })

  const set = <K extends keyof SurveyData>(key: K, value: SurveyData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  useEffect(() => { setForm((prev) => ({ ...prev, address: geoAddress })) }, [geoAddress])
  useEffect(() => { setForm((prev) => ({ ...prev, acreage: geoAcres })) }, [geoAcres])
  useEffect(() => { setForm((prev) => ({ ...prev, coordinates: geoCoordinates })) }, [geoCoordinates])
  useEffect(() => { if (preset) setForm(preset) }, [preset])

  const handleClear = () => {
    setForm({
      address: geoAddress,
      coordinates: geoCoordinates,
      acreage: geoAcres,
      crops: [],
      cropsOther: '',
      growthStage: '',
      nearHarvest: '',
      hasLivestock: '',
      livestockType: '',
      animalCount: '',
      relocationSite: '',
      irrigationSource: '',
      defensiveIrrigation: '',
      structures: [],
      structuresOther: '',
      hasWorkers: '',
      workerDetails: '',
    })
  }

  const showLivestock = form.hasLivestock === 'Yes'
  const showWorkerDetails = form.hasWorkers === 'Yes'

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-orange-800 tracking-tight">FIRESIGHT FARMER PROFILE</h1>
          <p className="text-xs text-orange-600 mt-0.5">Complete the survey below to receive a personalized fire risk assessment.</p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 text-xs text-orange-500 hover:text-orange-700 border border-orange-300 hover:border-orange-500 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Q1 — pre-filled from map center; manual entry triggers forward geocode */}
      <QuestionBlock number={1} question="Farm address or nearest cross-streets">
        <input
          type="text"
          placeholder={geoAddressLoading ? 'Locating…' : 'e.g., 1234 Valley Center Rd, Ramona, CA'}
          value={form.address}
          onChange={(e) => {
            set('address', e.target.value)
            onAddressChange(e.target.value)
          }}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </QuestionBlock>

      {/* Q2 — pre-filled from map circle area; manual entry resizes the circle */}
      <QuestionBlock number={2} question="Approximate acreage">
        <input
          type="number"
          min="0"
          step="any"
          placeholder="e.g., 45.5"
          value={form.acreage}
          onChange={(e) => {
            set('acreage', e.target.value)
            onAcresChange(e.target.value)
          }}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </QuestionBlock>

      {/* Q3 */}
      <QuestionBlock number={3} question="What do you currently grow? (Select all that apply)">
        <CheckboxGroup options={CROPS} selected={form.crops} onChange={(v) => set('crops', v)} />
        <div className="mt-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.cropsOther !== ''}
              onChange={(e) => set('cropsOther', e.target.checked ? ' ' : '')}
              className="accent-orange-500"
            />
            <span className="text-sm text-slate-700">Other</span>
          </label>
          {form.cropsOther !== '' && (
            <input
              type="text"
              placeholder="Please specify"
              value={form.cropsOther.trim()}
              onChange={(e) => set('cropsOther', e.target.value)}
              className="mt-1.5 ml-6 w-[calc(100%-1.5rem)] border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          )}
        </div>
      </QuestionBlock>

      {/* Q4 */}
      <QuestionBlock number={4} question="What is the current growth stage of your primary crop?">
        <RadioGroup
          name="growthStage"
          options={['Dormant', 'Flowering', 'Fruit Set', 'Harvest-Ready', 'Post-Harvest']}
          value={form.growthStage}
          onChange={(v) => set('growthStage', v)}
        />
      </QuestionBlock>

      {/* Q5 */}
      <QuestionBlock number={5} question="Do you have any crops within 2 weeks of harvest?">
        <RadioGroup
          name="nearHarvest"
          options={['Yes', 'No']}
          value={form.nearHarvest}
          onChange={(v) => set('nearHarvest', v)}
        />
      </QuestionBlock>

      {/* Q6 */}
      <QuestionBlock number={6} question="Do you have livestock on the property?">
        <RadioGroup
          name="hasLivestock"
          options={['Yes', 'No']}
          value={form.hasLivestock}
          onChange={(v) => {
            set('hasLivestock', v)
            if (v === 'No') {
              set('livestockType', '')
              set('animalCount', '')
            }
          }}
        />
      </QuestionBlock>

      {/* Q7 — conditional */}
      {showLivestock && (
        <QuestionBlock number={7} question="What type of livestock do you have?">
          <RadioGroup
            name="livestockType"
            options={['Cattle', 'Horses', 'Sheep & Goats', 'Poultry', 'Mixed', 'Other']}
            value={form.livestockType}
            onChange={(v) => set('livestockType', v)}
          />
        </QuestionBlock>
      )}

      {/* Q8 — conditional */}
      {showLivestock && (
        <QuestionBlock number={8} question="Approximately how many animals do you have?">
          <RadioGroup
            name="animalCount"
            options={['1–10 animals', '11–50 animals', '51–150 animals', '151–500 animals', '500+ animals']}
            value={form.animalCount}
            onChange={(v) => set('animalCount', v)}
          />
        </QuestionBlock>
      )}

      {/* Q9 */}
      <QuestionBlock number={9} question="Do you have a designated relocation site or trailer capacity for your livestock?">
        <RadioGroup
          name="relocationSite"
          options={['Yes', 'No', 'Unsure']}
          value={form.relocationSite}
          onChange={(v) => set('relocationSite', v)}
        />
      </QuestionBlock>

      {/* Q10 */}
      <QuestionBlock number={10} question="What is your primary irrigation source?">
        <RadioGroup
          name="irrigationSource"
          options={['Well', 'Canal or Ditch', 'Municipal', 'No Irrigation']}
          value={form.irrigationSource}
          onChange={(v) => set('irrigationSource', v)}
        />
      </QuestionBlock>

      {/* Q11 */}
      <QuestionBlock number={11} question="Do you have the ability to run irrigation defensively during a fire event?">
        <RadioGroup
          name="defensiveIrrigation"
          options={['Yes', 'No', 'Unsure']}
          value={form.defensiveIrrigation}
          onChange={(v) => set('defensiveIrrigation', v)}
        />
      </QuestionBlock>

      {/* Q12 */}
      <QuestionBlock number={12} question="What permanent structures are on your property? (Select all that apply)">
        <CheckboxGroup
          options={STRUCTURES}
          selected={form.structures}
          onChange={(v) => set('structures', v)}
        />
        <div className="mt-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.structuresOther !== ''}
              onChange={(e) => set('structuresOther', e.target.checked ? ' ' : '')}
              className="accent-orange-500"
            />
            <span className="text-sm text-slate-700">Other</span>
          </label>
          {form.structuresOther !== '' && (
            <input
              type="text"
              placeholder="Please specify"
              value={form.structuresOther.trim()}
              onChange={(e) => set('structuresOther', e.target.value)}
              className="mt-1.5 ml-6 w-[calc(100%-1.5rem)] border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          )}
        </div>
      </QuestionBlock>

      {/* Q13 */}
      <QuestionBlock number={13} question="Do you have workers on-site during regular operations?">
        <RadioGroup
          name="hasWorkers"
          options={['Yes', 'No']}
          value={form.hasWorkers}
          onChange={(v) => {
            set('hasWorkers', v)
            if (v === 'No') set('workerDetails', '')
          }}
        />
      </QuestionBlock>

      {/* Q14 — conditional */}
      {showWorkerDetails && (
        <QuestionBlock number={14} question="How many workers, and how often are they on-site?">
          <input
            type="text"
            placeholder="e.g., 8 workers, daily during harvest season"
            value={form.workerDetails}
            onChange={(e) => set('workerDetails', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </QuestionBlock>
      )}

      <button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-sm py-3 rounded-xl shadow transition-colors mt-2"
      >
        Submit Profile →
      </button>
    </form>
  )
}
