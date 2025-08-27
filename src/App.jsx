import { useState, useEffect } from 'react'
import { busRoutes, stops } from './busData'
import './App.css'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function findDirectBuses(source, destination) {
  return busRoutes.filter(route => {
    const srcIdx = route.stops.indexOf(source)
    const destIdx = route.stops.indexOf(destination)
    return srcIdx !== -1 && destIdx !== -1 && srcIdx < destIdx
  })
}

// Find combinations: buses from source to an interchange, then another to destination
function findBusCombinations(source, destination) {
  let combinations = []
  busRoutes.forEach(route1 => {
    const srcIdx = route1.stops.indexOf(source)
    if (srcIdx === -1) return
    // Try all possible interchanges after source
    for (let i = srcIdx + 1; i < route1.stops.length; i++) {
      const interchange = route1.stops[i]
      // Find a second bus from interchange to destination
      busRoutes.forEach(route2 => {
        if (route2 === route1) return
        const interIdx = route2.stops.indexOf(interchange)
        const destIdx = route2.stops.indexOf(destination)
        if (interIdx !== -1 && destIdx !== -1 && interIdx < destIdx) {
          combinations.push({
            first: { bus: route1.name, from: source, to: interchange, stops: route1.stops.slice(route1.stops.indexOf(source), route1.stops.indexOf(interchange)+1) },
            second: { bus: route2.name, from: interchange, to: destination, stops: route2.stops.slice(route2.stops.indexOf(interchange), route2.stops.indexOf(destination)+1) },
          })
        }
      })
    }
  })
  return combinations
}

async function fetchRoadRoute(coordsArr) {
  // coordsArr: [[lat, lng], [lat, lng], ...]
  if (coordsArr.length < 2) return []
  const coordStr = coordsArr.map(([lat, lng]) => `${lng},${lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.routes && data.routes[0]) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
    }
  } catch (e) {}
  // fallback: straight line
  return coordsArr
}

function MapVisualizer({ direct, combos, source, destination }) {
  const center = [22.57, 88.36]
  const [roadPolylines, setRoadPolylines] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function getRoutes() {
      setLoading(true)
      let segments = []
      let markers = []
      if (direct && direct.length > 0) {
        const route = direct[0]
        const stopsArr = route.stops.slice(route.stops.indexOf(source), route.stops.indexOf(destination)+1)
        for (let i = 0; i < stopsArr.length - 1; i++) {
          const from = stops[stopsArr[i]]
          const to = stops[stopsArr[i+1]]
          if (from && to) {
            const poly = await fetchRoadRoute([[from.lat, from.lng], [to.lat, to.lng]])
            segments.push({ polyline: poly, color: '#1976d2', name: route.name })
          }
        }
        markers = [source, destination]
      } else if (combos && combos.length > 0) {
        const combo = combos[0]
        // First segment
        const stops1 = combo.first.stops
        for (let i = 0; i < stops1.length - 1; i++) {
          const from = stops[stops1[i]]
          const to = stops[stops1[i+1]]
          if (from && to) {
            const poly = await fetchRoadRoute([[from.lat, from.lng], [to.lat, to.lng]])
            segments.push({ polyline: poly, color: '#1976d2', name: combo.first.bus })
          }
        }
        // Second segment
        const stops2 = combo.second.stops
        for (let i = 0; i < stops2.length - 1; i++) {
          const from = stops[stops2[i]]
          const to = stops[stops2[i+1]]
          if (from && to) {
            const poly = await fetchRoadRoute([[from.lat, from.lng], [to.lat, to.lng]])
            segments.push({ polyline: poly, color: '#c62828', name: combo.second.bus })
          }
        }
        markers = [combo.first.from, combo.first.to, combo.second.to]
      }
      if (isMounted) {
        setRoadPolylines(segments)
        setLoading(false)
      }
    }
    getRoutes()
    return () => { isMounted = false }
  }, [direct, combos, source, destination])

  let markers = []
  if (direct && direct.length > 0) {
    markers = [source, destination]
  } else if (combos && combos.length > 0) {
    const combo = combos[0]
    markers = [combo.first.from, combo.first.to, combo.second.to]
  }

  return (
    <div style={{ height: 400, marginTop: 24, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
      {loading && <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'rgba(255,255,255,0.7)',zIndex:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,fontSize:20}}>Loading route...</div>}
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {roadPolylines.map((pl, idx) => (
          <Polyline key={idx} positions={pl.polyline} color={pl.color} />
        ))}
        {markers.map((stop, idx) => stops[stop] && (
          <Marker key={stop} position={[stops[stop].lat, stops[stop].lng]}>
            <Popup>{stop}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

function App() {
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [results, setResults] = useState(null)

  const allStops = Array.from(new Set(busRoutes.flatMap(r => r.stops))).sort()

  const handleSearch = () => {
    if (!source || !destination || source === destination) {
      setResults({ error: 'Please select different source and destination.' })
      return
    }
    const direct = findDirectBuses(source, destination)
    if (direct.length > 0) {
      setResults({ direct })
    } else {
      const combos = findBusCombinations(source, destination)
      if (combos.length > 0) {
        setResults({ combos })
      } else {
        setResults({ error: 'No route found.' })
      }
    }
  }

  return (
    <div className="container">
      <h1>Kolkata Bus Route Finder</h1>
      <div className="search-box">
        <label>
          Source:
          <select value={source} onChange={e => setSource(e.target.value)}>
            <option value="">Select Source</option>
            {allStops.map(stop => (
              <option key={stop} value={stop}>{stop}</option>
            ))}
          </select>
        </label>
        <label>
          Destination:
          <select value={destination} onChange={e => setDestination(e.target.value)}>
            <option value="">Select Destination</option>
            {allStops.map(stop => (
              <option key={stop} value={stop}>{stop}</option>
            ))}
          </select>
        </label>
        <button onClick={handleSearch}>Search</button>
      </div>
      <div className="results">
        {results?.error && <p>{results.error}</p>}
        {results?.direct && (
          <div>
            <h2>Direct Buses:</h2>
            <ul>
              {results.direct.map(route => (
                <li key={route.name}>{route.name} ({route.stops.join(' → ')})</li>
              ))}
            </ul>
          </div>
        )}
        {results?.combos && (
          <div>
            <h2>Bus Combinations:</h2>
            <ul>
              {results.combos.map((combo, idx) => (
                <li key={idx}>
                  {combo.first.bus} ({combo.first.from} → {combo.first.to}) → {combo.second.bus} ({combo.second.from} → {combo.second.to})
                </li>
              ))}
            </ul>
          </div>
        )}
        {(results?.direct || results?.combos) && (
          <MapVisualizer direct={results.direct} combos={results.combos} source={source} destination={destination} />
        )}
      </div>
    </div>
  )
}

export default App
