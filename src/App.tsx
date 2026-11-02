import { useMemo, useState } from 'react'
import { Globe } from './Globe'
import { SITES, buildRoutes, scoreRoutes, type LatLon, type Weights } from './lib/mars'

const fmt = (p: LatLon) => `${Math.abs(p.lat).toFixed(2)}°${p.lat >= 0 ? 'N' : 'S'}  ${p.lon.toFixed(2)}°E`
const find = (id: string) => SITES.find((s) => s.id === id)!

export default function App() {
  const [startId, setStart] = useState('jezero')
  const [destId, setDest] = useState('gale')
  const [w, setW] = useState<Weights>({ safety: 50, science: 50, distance: 30 })
  const [chosen, setChosen] = useState<string>()
  const [infoId, setInfoId] = useState('jezero')
  const [focus, setFocus] = useState<LatLon>()
  const [picked, setPicked] = useState<LatLon>()

  const result = useMemo(
    () => (startId === destId ? undefined : scoreRoutes(buildRoutes(find(startId), find(destId)), w)),
    [startId, destId, w],
  )
  const ranked = result?.ranked ?? []
  const active = ranked.find((r) => r.id === chosen) ?? ranked[0]
  const info = find(infoId)
  const site = (id: string) => { setInfoId(id); setFocus({ ...find(id) }) }

  return (
    <div className="app">
      <Globe startId={startId} destId={destId} routes={ranked} activeId={active?.id} focus={focus} onSite={site} onPoint={setPicked} />
      <header>
        <b>MARS-X</b><span>From NASA Data to Mission Decisions</span>
        <em>DEMO DATA — NASA LIVE DATA CONNECTION NOT AVAILABLE</em>
      </header>

      <aside className="panel left">
        <h2>Route planner</h2>
        <label>Start<select value={startId} onChange={(e) => { setStart(e.target.value); site(e.target.value) }}>{SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Destination<select value={destId} onChange={(e) => { setDest(e.target.value); site(e.target.value) }}>{SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {(['safety', 'science', 'distance'] as const).map((k) => (
          <label key={k}>{k[0].toUpperCase() + k.slice(1)} priority: {w[k]}
            <input type="range" min={0} max={100} value={w[k]} onChange={(e) => setW({ ...w, [k]: +e.target.value })} />
          </label>
        ))}
        {!result && <p className="warn">Choose two different sites.</p>}
        {ranked.map((r, i) => (
          <button key={r.id} className={'route' + (r.id === active?.id ? ' on' : '')} onClick={() => setChosen(r.id)}>
            <div><b>{r.label}</b>{i === 0 && <span className="tag good">RECOMMENDED</span>}</div>
            <div>Score {r.total} · {Math.round(r.distanceKm)} km · {r.evaSols.toFixed(1)} sols of EVA</div>
            <div>Hazard {r.hazard.total} ({r.hazard.level}) · Science {r.science}</div>
          </button>
        ))}
        {result && <p className="why"><b>Why:</b> {result.explanation}</p>}
        {active && (
          <div className="hz">
            <h3>Hazard breakdown — {active.label}</h3>
            <div>Slope risk {active.hazard.slope} <span className="tag">DERIVED · DEMO TERRAIN</span></div>
            <div>Roughness {active.hazard.roughness} <span className="tag">DERIVED · DEMO TERRAIN</span></div>
            <div>Unknown-data penalty {active.hazard.unknown} <span className="tag">UNKNOWN</span></div>
            <small>Walking {3} km/h, 8 h EVA per sol. Distances here are inter-site traverses, not a single Marswalk.</small>
          </div>
        )}
      </aside>

      <aside className="panel right">
        <h2>{info.name}</h2>
        <div className="muted">{info.kind} · {fmt(info)}</div>
        <p>{info.note}</p>
        <button onClick={() => setFocus({ ...info })}>Fly to location</button>
        {picked && <p className="muted">Clicked point: {fmt(picked)}<br />Elevation: not available (no DEM loaded)</p>}
        <h3>Data provenance</h3>
        <table><tbody>
          <tr><td>Site list</td><td>Compiled from public mission facts <span className="tag">VERIFY</span></td></tr>
          <tr><td>Elevation / slope</td><td>Procedural demo model <span className="tag">MODELED · LOW CONF.</span></td></tr>
          <tr><td>Science score</td><td>Proximity to catalogued sites <span className="tag">DERIVED</span></td></tr>
          <tr><td>Planned</td><td>MOLA/HRSC DEM, HiRISE, THEMIS, CRISM via NASA PDS / USGS</td></tr>
        </tbody></table>
        <small>MARS-X Decision Support Model — not an official NASA recommendation.</small>
      </aside>
    </div>
  )
}
