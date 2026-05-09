import { useState, useEffect, useRef } from 'react'
import TopBar from './components/TopBar'
import MapPane from './components/MapPane'
import type { CircleState } from './components/MapPane'
import DetailPane from './components/DetailPane'
import type { ApiResponse } from './components/DetailPane'
import FarmerSurvey from './components/FarmerSurvey'
import type { SurveyData } from './components/FarmerSurvey'

const DEFAULT_CENTER: [number, number] = [32.8801, -117.234]
const DEFAULT_RADIUS_M = 300

function computeAcres(radiusM: number): string {
  return ((Math.PI * radiusM ** 2) / 4046.856).toFixed(1)
}

export default function App() {
  const [apiData, setApiData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [circle, setCircle] = useState<CircleState>({ center: DEFAULT_CENTER, radiusM: DEFAULT_RADIUS_M })
  const [geoAddress, setGeoAddress] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoAcres, setGeoAcres] = useState(computeAcres(DEFAULT_RADIUS_M))
  const [flyToCenter, setFlyToCenter] = useState<[number, number] | null>(null)

  // true = change came from map interaction; false = change came from form input
  // Start center as true so the initial default position is reverse-geocoded on mount
  const fromMap = useRef({ center: true, radius: false })
  const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const forwardGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reverse-geocode the circle center only when it was moved on the map
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

  // Update acreage displayed in the form only when radius was changed on the map
  useEffect(() => {
    if (!fromMap.current.radius) return
    fromMap.current.radius = false
    setGeoAcres(computeAcres(circle.radiusM))
  }, [circle.radiusM])

  // Map handlers — set fromMap flag so the effects above know the source
  const handleCenterChange = (center: [number, number]) => {
    fromMap.current.center = true
    setCircle((prev) => ({ ...prev, center }))
  }

  const handleRadiusChange = (radiusM: number) => {
    fromMap.current.radius = true
    setCircle((prev) => ({ ...prev, radiusM }))
  }

  // Form → map: forward-geocode the typed address, move circle center (no reverse-geocode follow-up)
  const handleFormAddressChange = (addr: string) => {
    if (forwardGeocodeTimer.current) clearTimeout(forwardGeocodeTimer.current)
    forwardGeocodeTimer.current = setTimeout(async () => {
      if (!addr.trim()) return
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`
        )
        const json = await res.json()
        if (json.length > 0) {
          const coords: [number, number] = [parseFloat(json[0].lat), parseFloat(json[0].lon)]
          // fromMap.current.center stays false → reverse geocode won't fire → user's typed address preserved
          setCircle((prev) => ({ ...prev, center: coords }))
          setFlyToCenter(coords)
        }
      } catch {
        // ignore — user can still submit whatever they typed
      }
    }, 800)
  }

  // Form → map: convert typed acreage to circle radius (no geoAcres update → user's typed value preserved)
  const handleFormAcresChange = (acres: string) => {
    const a = parseFloat(acres)
    if (!isNaN(a) && a > 0) {
      setCircle((prev) => ({ ...prev, radiusM: Math.sqrt((a * 4046.856) / Math.PI) }))
    }
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
      />
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-3/5">
          <MapPane
            circle={circle}
            flyToCenter={flyToCenter}
            onCenterChange={handleCenterChange}
            onRadiusChange={handleRadiusChange}
          />
        </div>
        <div className="w-2/5 overflow-y-auto bg-slate-50">
          {rightPane()}
        </div>
      </div>
    </div>
  )
}
