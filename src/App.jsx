import { useState, useEffect, useRef } from 'react'
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

function SearchInput({ label, value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayValue = isOpen ? filter : value
  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(displayValue.toLowerCase())
  )

  return (
    <div className="input-group" ref={wrapperRef}>
      <label>{label}</label>
      <div className="input-wrapper">
        <input
          type="text"
          className="custom-input"
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            setFilter(e.target.value)
            if (value) onChange('')
            setIsOpen(true)
          }}
          onFocus={() => {
            setFilter('')
            setIsOpen(true)
          }}
        />
        {(value || filter) && (
          <button 
            type="button" 
            className="clear-btn" 
            onClick={() => {
              setFilter('')
              onChange('')
              setIsOpen(false)
            }}
            title="Clear input"
          >
            &times;
          </button>
        )}
      </div>
      {isOpen && (
        <ul className="dropdown-list">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <li 
                key={opt} 
                className={`dropdown-item ${opt === value ? 'active' : ''}`}
                onClick={() => {
                  onChange(opt)
                  setFilter('')
                  setIsOpen(false)
                }}
              >
                {opt}
              </li>
            ))
          ) : (
            <li className="dropdown-item" style={{ color: 'var(--text-muted)' }}>No stops found</li>
          )}
        </ul>
      )}
    </div>
  )
}

function App() {
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [results, setResults] = useState(null)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    document.body.dataset.theme = theme
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const allStops = Array.from(new Set(busRoutes.flatMap(r => r.stops))).sort()

  const handleSwap = () => {
    setSource(destination)
    setDestination(source)
  }

  const handleSearch = () => {
    if (!source || !destination || source === destination) {
      setResults({ error: 'Please select valid and distinct source and destination.' })
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
    <>
      
      <header className="app-header">
        <div className="app-title">Kolkata Bus Finder</div>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          )}
        </button>
      </header>

      <div className="container">
        <section className="hero">
          <h1>Find Your Bus Route</h1>
          <p>Search across Kolkata to find the fastest way to your destination.</p>
        </section>

        <div className="search-card">
          <div className="search-fields">
            <SearchInput 
              label="Source" 
              value={source} 
              onChange={setSource} 
              options={allStops}
              placeholder="Search source stop..."
            />
            <button className="swap-btn" onClick={handleSwap} aria-label="Swap source and destination" title="Swap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m16 3 4 4-4 4"/>
                <path d="M20 7H4"/>
                <path d="m8 21-4-4 4-4"/>
                <path d="M4 17h16"/>
              </svg>
            </button>
            <SearchInput 
              label="Destination" 
              value={destination} 
              onChange={setDestination} 
              options={allStops}
              placeholder="Search destination stop..."
            />
          </div>
          <button className="search-btn" onClick={handleSearch}>Find Routes</button>
        </div>

        {results && (
          <div className="results-card">
            {results.error && <div className="error-msg">{results.error}</div>}
            
            {results.direct && (
              <div className="results-section">
                <h2>Direct Buses</h2>
                <div className="route-list">
                  {results.direct.map(route => (
                    <div className="route-item" key={route.name}>
                      <div className="route-name">{route.name}</div>
                      <div className="route-stops">{route.stops.join(' → ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.combos && (
              <div className="results-section">
                <h2>Bus Combinations (1 Transfer)</h2>
                <div className="route-list">
                  {results.combos.map((combo, idx) => (
                    <div className="route-item combo-item" key={idx}>
                      <div className="combo-step">
                        <span className="combo-bus">{combo.first.bus}</span>
                        <span className="combo-path">{combo.first.from} → {combo.first.to}</span>
                      </div>
                      <div className="combo-step">
                        <span className="combo-bus">{combo.second.bus}</span>
                        <span className="combo-path">{combo.second.from} → {combo.second.to}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(results.direct || results.combos) && (
              <MapVisualizer direct={results.direct} combos={results.combos} source={source} destination={destination} />
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default App
