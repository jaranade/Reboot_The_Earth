import { useState, useEffect, useRef } from 'react'
import TopBar from './components/TopBar'
import MapPane from './components/MapPane'
import type { CircleState } from './components/MapPane'
import DetailPane from './components/DetailPane'
import FarmerSurvey from './components/FarmerSurvey'
import type { SurveyData } from './components/FarmerSurvey'
import { mockResponses } from './mockData'
import { formatSurvey } from './utils/formatSurvey'

const DEFAULT_CENTER: [number, number] = [32.8801, -117.2340]
const DEFAULT_RADIUS_M = 300

function computeAcres(radiusM: number): string {
  return ((Math.PI * radiusM ** 2) / 4046.856).toFixed(1)
}

export default function App() {
  const [persona, setPersona] = useState('almond')
  const [surveyComplete, setSurveyComplete] = useState(false)
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

  const data = mockResponses[persona]

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
      <TopBar persona={persona} onPersonaChange={setPersona} />
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
            />
          )}
        </div>
      </div>
    </div>
  )
}
