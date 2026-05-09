import { useState, useEffect, useRef } from 'react'
import TopBar from './components/TopBar'
import MapPane from './components/MapPane'
import type { CircleState, FlyToTarget } from './components/MapPane'
import DetailPane from './components/DetailPane'
import type { ApiResponse } from './components/DetailPane'
import FarmerSurvey from './components/FarmerSurvey'
import type { SurveyData } from './components/FarmerSurvey'
import EnvConditionsBar from './components/EnvConditionsBar'
import type { EnvConditions } from './components/EnvConditionsBar'

const DEFAULT_CENTER: [number, number] = [32.8801, -117.234]
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
  const [apiData, setApiData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
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
        let hit = await nominatim(addr)

        if (!hit) {
          hit = await nominatim(addr.replace(/^\d+\s+/, ''))
        }

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
    setGeoAddress(story.data.address)
    setGeoAcres(story.data.acreage)
    setCircle({ center: story.center, radiusM: story.radiusM })
    setFlyTo({ center: story.center, radiusM: story.radiusM })
    setFormPreset({ ...story.data })
    setActiveConditions(story.conditions)
    setApiData(null)
  }

  const handleSurveySubmit = async (survey: SurveyData) => {
    setLoading(true)
    setApiError(null)

    const [lat, lng] = circle.center
    const allCrops = [
      ...survey.crops,
      ...(survey.cropsOther.trim() ? [survey.cropsOther.trim()] : []),
    ]

    const farmProfile = {
      location_name: survey.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      latitude: lat,
      longitude: lng,
      crop_type: allCrops.join(', ') || 'mixed crops',
      livestock: survey.hasLivestock === 'Yes',
      acres: parseFloat(survey.acreage) || null,
    }

    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(farmProfile),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data: ApiResponse = await res.json()
      setApiData(data)
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const rightPane = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Analyzing your farm profile…</p>
        </div>
      )
    }
    if (apiError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
          <p className="text-sm font-semibold text-red-600">Could not reach the server</p>
          <p className="text-xs text-slate-500">{apiError}</p>
          <button
            onClick={() => setApiError(null)}
            className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-medium underline"
          >
            ← Back to survey
          </button>
        </div>
      )
    }
    if (apiData) {
      return <DetailPane data={apiData} />
    }
    return (
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
    )
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

          {rightPane()}
        </div>
      </div>
    </div>
  )
}
