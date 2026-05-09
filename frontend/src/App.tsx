import { useState, useEffect, useRef } from 'react'
import TopBar from './components/TopBar'
import MapPane from './components/MapPane'
import type { CircleState, FlyToTarget } from './components/MapPane'
import DetailPane from './components/DetailPane'
import FarmerSurvey from './components/FarmerSurvey'
import type { SurveyData } from './components/FarmerSurvey'
import { mockResponses } from './mockData'
import { formatSurvey } from './utils/formatSurvey'
import EnvConditionsBar from './components/EnvConditionsBar'
import type { EnvConditions } from './components/EnvConditionsBar'

const DEFAULT_CENTER: [number, number] = [32.8801, -117.2340]
const DEFAULT_RADIUS_M = 300

function computeAcres(radiusM: number): string {
  return String(Math.round((Math.PI * radiusM ** 2) / 4046.856))
}

interface ExampleStory {
  label: string
  subtitle: string
  center: [number, number]
  radiusM: number
  data: SurveyData
  conditions: EnvConditions
}

const EXAMPLE_STORIES: ExampleStory[] = [
  {
    label: 'Chappellet Winery',
    subtitle: 'St. Helena, CA',
    center: [38.480377, -122.333391],
    radiusM: 330,
    data: {
      address: '1581 Sage Canyon Rd, St Helena, CA 94574',
      coordinates: '38.4804, -122.3334',
      acreage: '85',
      crops: ['Grapes / Vineyard'],
      cropsOther: '',
      growthStage: 'Fruit Set',
      nearHarvest: 'No',
      hasLivestock: 'No',
      livestockType: '',
      animalCount: '',
      relocationSite: '',
      irrigationSource: 'Well',
      defensiveIrrigation: 'Yes',
      structures: ['Barn', 'Residence'],
      structuresOther: '',
      hasWorkers: 'Yes',
      workerDetails: '4 workers, daily during harvest season',
    },
    conditions: {
      wind: { speedMph: 38, direction: 'NE (Diablo)', gustsMph: 65 },
      moisture: { rh: 6 },
      heat: { tempF: 96 },
    },
  },
  {
    label: 'Fruit Tree Nursery',
    subtitle: 'Vista, CA',
    center: [33.23718118796823, -117.20564001388482],
    radiusM: 95,
    data: {
      address: 'Vista, CA',
      coordinates: '33.2372, -117.2056',
      acreage: '7',
      crops: ['Nursery & Greenhouse Plants', 'Tropical Fruit (cherimoya, guava, loquat)'],
      cropsOther: '',
      growthStage: 'Harvest-Ready',
      nearHarvest: 'Yes',
      hasLivestock: 'No',
      livestockType: '',
      animalCount: '',
      relocationSite: '',
      irrigationSource: 'Canal or Ditch',
      defensiveIrrigation: 'No',
      structures: ['Packing Shed', 'Residence'],
      structuresOther: '',
      hasWorkers: 'Yes',
      workerDetails: '12 workers, daily during harvest season',
    },
    conditions: {
      wind: { speedMph: 45, direction: 'NE (Santa Ana)', gustsMph: 65 },
      moisture: { rh: 4 },
      heat: { tempF: 85 },
    },
  },
  {
    label: 'Rainbow Orchards',
    subtitle: 'Camino, CA',
    center: [38.7521, -120.6777],
    radiusM: 642,
    data: {
      address: 'Camino, CA (Apple Hill)',
      coordinates: '38.7521, -120.6777',
      acreage: '320',
      crops: ['Stone Fruit (peaches, plums, nectarines)'],
      cropsOther: '',
      growthStage: 'Post-Harvest',
      nearHarvest: 'No',
      hasLivestock: 'Yes',
      livestockType: 'Cattle',
      animalCount: '51–150 animals',
      relocationSite: 'No',
      irrigationSource: 'Well',
      defensiveIrrigation: 'Unsure',
      structures: ['Barn', 'Equipment Storage', 'Residence'],
      structuresOther: '',
      hasWorkers: 'Yes',
      workerDetails: '6 workers, seasonal',
    },
    conditions: {
      wind: { speedMph: 28, direction: 'SW', gustsMph: 47 },
      moisture: { rh: 7 },
      heat: { tempF: 106 },
    },
  },
]

export default function App() {
  const [persona] = useState('almond')
  const [surveyComplete, setSurveyComplete] = useState(false)
  const [circle, setCircle] = useState<CircleState>({ center: DEFAULT_CENTER, radiusM: DEFAULT_RADIUS_M })
  const [geoAddress, setGeoAddress] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoAcres, setGeoAcres] = useState(computeAcres(DEFAULT_RADIUS_M))
  const [flyTo, setFlyTo] = useState<FlyToTarget | null>(null)
  const [formPreset, setFormPreset] = useState<SurveyData | null>(null)
  const [activeConditions, setActiveConditions] = useState<EnvConditions | null>(null)

  const fromMap = useRef({ center: true, radius: false })
  const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const forwardGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const data = mockResponses[persona]

  useEffect(() => {
    if (!fromMap.current.center) return
    fromMap.current.center = false

    const [lat, lng] = circle.center
    if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current)
    setGeoLoading(true)
    reverseGeocodeTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        )
        const json = await res.json()
        const a = json.address || {}
        const road = a.road || a.hamlet || a.suburb || ''
        const city = a.city || a.town || a.village || a.county || ''
        const state = a.state || ''
        const parts = [road, city, state].filter(Boolean)
        setGeoAddress(parts.join(', ') || json.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      } catch {
        setGeoAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      } finally {
        setGeoLoading(false)
      }
    }, 600)

    return () => {
      if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current)
    }
  }, [circle.center])

  useEffect(() => {
    if (!fromMap.current.radius) return
    fromMap.current.radius = false
    setGeoAcres(computeAcres(circle.radiusM))
  }, [circle.radiusM])

  const handleCenterChange = (center: [number, number]) => {
    fromMap.current.center = true
    setCircle((prev) => ({ ...prev, center }))
  }

  const handleRadiusChange = (radiusM: number) => {
    fromMap.current.radius = true
    setCircle((prev) => ({ ...prev, radiusM }))
  }

  const handleFormAddressChange = (addr: string) => {
    if (forwardGeocodeTimer.current) clearTimeout(forwardGeocodeTimer.current)
    forwardGeocodeTimer.current = setTimeout(async () => {
      if (!addr.trim()) return

      const nominatim = async (q: string) => {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=us`
        )
        const json = await res.json()
        return json.length > 0 ? json[0] : null
      }

      try {
        // 1. Full address
        let hit = await nominatim(addr)

        // 2. Strip leading house number (e.g. "1581 Sage Canyon Rd, …" → "Sage Canyon Rd, …")
        if (!hit) {
          hit = await nominatim(addr.replace(/^\d+\s+/, ''))
        }

        // 3. City / state / zip only (everything after the first comma)
        if (!hit) {
          const afterFirstComma = addr.indexOf(',')
          if (afterFirstComma !== -1) {
            hit = await nominatim(addr.slice(afterFirstComma + 1).trim())
          }
        }

        if (hit) {
          const coords: [number, number] = [parseFloat(hit.lat), parseFloat(hit.lon)]
          setCircle((prev) => ({ ...prev, center: coords }))
          setFlyTo({ center: coords, radiusM: circle.radiusM })
        }
      } catch {
        // ignore network errors
      }
    }, 800)
  }

  const handleFormAcresChange = (acres: string) => {
    const a = parseFloat(acres)
    if (!isNaN(a) && a > 0) {
      setCircle((prev) => ({ ...prev, radiusM: Math.sqrt((a * 4046.856) / Math.PI) }))
    }
  }

  const loadStory = (story: ExampleStory) => {
    // Set geo state directly — bypasses geocoding so the preset address/acres are preserved
    setGeoAddress(story.data.address)
    setGeoAcres(story.data.acreage)
    setCircle({ center: story.center, radiusM: story.radiusM })
    setFlyTo({ center: story.center, radiusM: story.radiusM })
    setFormPreset({ ...story.data })
    setActiveConditions(story.conditions)
    setSurveyComplete(false)
  }

  const handleSurveySubmit = async (survey: SurveyData) => {
    const profileText = formatSurvey(survey)
    console.log('[FarmerSurvey] formatted profile:\n', profileText)
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: profileText,
      })
    } catch {
      // backend not yet available; proceed anyway
    }
    setSurveyComplete(true)
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      <EnvConditionsBar conditions={activeConditions} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-3/5">
          <MapPane
            circle={circle}
            flyTo={flyTo}
            onCenterChange={handleCenterChange}
            onRadiusChange={handleRadiusChange}
          />
        </div>
        <div className="w-2/5 overflow-y-auto bg-slate-50">
          {/* Example story quick-fill buttons */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              Example Profiles
            </span>
            <div className="flex gap-2 flex-wrap">
              {EXAMPLE_STORIES.map((story) => (
                <button
                  key={story.label}
                  onClick={() => loadStory(story)}
                  className="flex flex-col items-start bg-white border border-slate-200 hover:border-purple-400 hover:bg-purple-50 rounded-lg px-3 py-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <span className="text-xs font-semibold text-slate-700 leading-tight">{story.label}</span>
                  <span className="text-xs text-slate-400 leading-tight">{story.subtitle}</span>
                </button>
              ))}
            </div>
          </div>

          {surveyComplete ? (
            <DetailPane data={data} />
          ) : (
            <FarmerSurvey
              onSubmit={handleSurveySubmit}
              geoAddress={geoAddress}
              geoAddressLoading={geoLoading}
              geoAcres={geoAcres}
              geoCoordinates={`${circle.center[0].toFixed(4)}, ${circle.center[1].toFixed(4)}`}
              onAddressChange={handleFormAddressChange}
              onAcresChange={handleFormAcresChange}
              preset={formPreset}
            />
          )}
        </div>
      </div>
    </div>
  )
}
