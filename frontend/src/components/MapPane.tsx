import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const centerIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#9333ea;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.45);cursor:grab"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export interface CircleState {
  center: [number, number]
  radiusM: number
}

function MapFlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, map.getZoom())
  }, [target, map])
  return null
}

interface FarmCircleProps {
  center: [number, number]
  radiusM: number
  onCenterChange: (c: [number, number]) => void
  onRadiusChange: (r: number) => void
}

function FarmCircle({ center, radiusM, onCenterChange, onRadiusChange }: FarmCircleProps) {
  const map = useMap()
  const isDraggingEdge = useRef(false)
  // Refs let event handlers always read the latest values without re-registering listeners
  const centerRef = useRef<[number, number]>(center)
  const localRadiusRef = useRef(radiusM)
  const [displayRadius, setDisplayRadius] = useState(radiusM)

  centerRef.current = center

  // Sync displayRadius from parent when not actively dragging the edge
  useEffect(() => {
    if (!isDraggingEdge.current) {
      setDisplayRadius(radiusM)
      localRadiusRef.current = radiusM
    }
  }, [radiusM])

  useEffect(() => {
    const metersPerPx = () => {
      const zoom = map.getZoom()
      return (156543.03392 * Math.cos((centerRef.current[0] * Math.PI) / 180)) / Math.pow(2, zoom)
    }

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      const clatlng = L.latLng(centerRef.current[0], centerRef.current[1])
      const tol = 14 * metersPerPx()
      if (Math.abs(clatlng.distanceTo(e.latlng) - localRadiusRef.current) <= tol) {
        isDraggingEdge.current = true
        map.dragging.disable()
      }
    }

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      const clatlng = L.latLng(centerRef.current[0], centerRef.current[1])
      if (isDraggingEdge.current) {
        const r = Math.max(50, clatlng.distanceTo(e.latlng))
        localRadiusRef.current = r
        setDisplayRadius(r)
        return
      }
      // Change cursor when hovering near the circumference
      const tol = 14 * metersPerPx()
      const nearEdge = Math.abs(clatlng.distanceTo(e.latlng) - localRadiusRef.current) <= tol
      map.getContainer().style.cursor = nearEdge ? 'crosshair' : ''
    }

    const onMouseUp = (e: L.LeafletMouseEvent) => {
      if (!isDraggingEdge.current) return
      isDraggingEdge.current = false
      map.dragging.enable()
      map.getContainer().style.cursor = ''
      const r = Math.max(50, L.latLng(centerRef.current[0], centerRef.current[1]).distanceTo(e.latlng))
      localRadiusRef.current = r
      setDisplayRadius(r)
      onRadiusChange(r)
    }

    map.on('mousedown', onMouseDown)
    map.on('mousemove', onMouseMove)
    map.on('mouseup', onMouseUp)

    return () => {
      map.off('mousedown', onMouseDown)
      map.off('mousemove', onMouseMove)
      map.off('mouseup', onMouseUp)
      map.dragging.enable()
      map.getContainer().style.cursor = ''
    }
  }, [map])

  return (
    <>
      <Circle
        center={center}
        radius={displayRadius}
        pathOptions={{
          color: '#9333ea',
          fillColor: '#9333ea',
          fillOpacity: 0.18,
          weight: 3,
        }}
      />
      <Marker
        position={center}
        icon={centerIcon}
        draggable
        eventHandlers={{
          drag(e) {
            const { lat, lng } = (e.target as L.Marker).getLatLng()
            onCenterChange([lat, lng])
          },
        }}
      />
    </>
  )
}

interface MapPaneProps {
  circle: CircleState
  flyToCenter: [number, number] | null
  onCenterChange: (c: [number, number]) => void
  onRadiusChange: (r: number) => void
}

export default function MapPane({ circle, flyToCenter, onCenterChange, onRadiusChange }: MapPaneProps) {
  const acres = ((Math.PI * circle.radiusM ** 2) / 4046.856).toFixed(1)

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={circle.center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        />
        <MapFlyTo target={flyToCenter} />
        <FarmCircle
          center={circle.center}
          radiusM={circle.radiusM}
          onCenterChange={onCenterChange}
          onRadiusChange={onRadiusChange}
        />
      </MapContainer>
      <div className="absolute bottom-5 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow text-xs pointer-events-none select-none">
        <span className="font-semibold text-slate-800">{acres} acres</span>
        <span className="text-slate-400 ml-2">· {Math.round(circle.radiusM)} m radius</span>
      </div>
    </div>
  )
}
