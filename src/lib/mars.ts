// MARS-X Decision Support Model — NOT a NASA-certified algorithm.
// lon is degrees EAST, 0..360. All terrain below is a DEMO model, not NASA data.
export interface LatLon { lat: number; lon: number }
export interface Site extends LatLon { id: string; name: string; kind: string; note: string }
export type V3 = [number, number, number]
export type Level = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
export interface Hazard { slope: number; roughness: number; unknown: number; total: number; level: Level }
export interface Route {
  id: string; label: string; points: LatLon[]; distanceKm: number
  maxSlopeDeg: number; hazard: Hazard; science: number; evaSols: number
}
export interface Weights { safety: number; science: number; distance: number }
export interface Raw { safety: number; science: number; distance: number }
export interface ScoredRoute extends Route { raw: Raw; parts: Raw; total: number }

export const R_KM = 3389.5
export const WALK_KMH = 3
export const EVA_HOURS_PER_SOL = 8
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

// Public mission facts; coordinates approximate — verify against NASA/USGS gazetteer before citing.
export const SITES: Site[] = [
  { id: 'jezero', name: 'Jezero Crater', lat: 18.44, lon: 77.45, kind: 'Crater / ancient delta', note: 'Ancient river-delta crater; Perseverance landed here in February 2021 to search for signs of past habitability.' },
  { id: 'gale', name: 'Gale Crater', lat: -5.4, lon: 137.8, kind: 'Crater / layered mound', note: 'Curiosity landed in August 2012; it climbs the layered Mount Sharp to read Mars\' sedimentary history.' },
  { id: 'olympus', name: 'Olympus Mons', lat: 18.65, lon: 226.2, kind: 'Shield volcano', note: 'Largest known volcano in the Solar System.' },
  { id: 'valles', name: 'Valles Marineris (approx. centre)', lat: -14, lon: 301, kind: 'Canyon system', note: 'Canyon system thousands of kilometres long, exposing deep crustal layers.' },
  { id: 'gusev', name: 'Gusev Crater', lat: -14.57, lon: 175.47, kind: 'Crater', note: 'Landing site of the Spirit rover (2004).' },
  { id: 'meridiani', name: 'Meridiani Planum', lat: -1.95, lon: 354.47, kind: 'Plains', note: 'Opportunity landed here in 2004 and found hematite-bearing terrain.' },
  { id: 'viking2', name: 'Utopia Planitia (Viking 2)', lat: 47.97, lon: 134.26, kind: 'Lander site', note: 'Viking 2 landing site (1976).' },
  { id: 'insight', name: 'Elysium Planitia (InSight)', lat: 4.5, lon: 135.62, kind: 'Lander site', note: 'InSight lander site (2018), used for seismology.' },
  { id: 'hellas', name: 'Hellas Planitia', lat: -42.4, lon: 70.5, kind: 'Impact basin', note: 'One of the largest impact basins on Mars.' },
]

export function latLonToXYZ(lat: number, lon: number, r = 1): V3 {
  const la = rad(lat), lo = rad(lon)
  return [-r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), r * Math.cos(la) * Math.sin(lo)]
}
export function xyzToLatLon(x: number, y: number, z: number): LatLon {
  const r = Math.hypot(x, y, z)
  return { lat: deg(Math.asin(y / r)), lon: (deg(Math.atan2(z, -x)) + 360) % 360 }
}
export function haversineKm(a: LatLon, b: LatLon): number {
  const dLa = rad(b.lat - a.lat), dLo = rad(b.lon - a.lon)
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLo / 2) ** 2
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** DEMO procedural elevation (km). Replace with a MOLA/HRSC DEM sampler for real data. */
export function terrainKm(lat: number, lon: number, detail = true): number {
  const la = rad(lat), lo = rad(lon)
  const base = 2.5 * Math.sin(2 * la + 1) * Math.cos(2 * lo) + 1.5 * Math.sin(5 * la) * Math.cos(3 * lo + 1)
  return detail ? base + 3 * Math.sin(90 * la) * Math.cos(70 * lo) : base
}

const unit = (p: LatLon): V3 => latLonToXYZ(p.lat, p.lon)
const norm = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

export function greatCircle(a: LatLon, b: LatLon, n = 48, bulgeRad = 0): LatLon[] {
  const A = unit(a), B = unit(b)
  const w = Math.acos(Math.min(1, Math.max(-1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])))
  const s = Math.sin(w)
  const perp: V3 = s < 1e-9 ? [0, 0, 0] : norm(cross(A, B))
  const out: LatLon[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const ka = s < 1e-9 ? 1 - t : Math.sin((1 - t) * w) / s
    const kb = s < 1e-9 ? t : Math.sin(t * w) / s
    const off = bulgeRad * Math.sin(Math.PI * t)
    const p = norm([A[0] * ka + B[0] * kb + perp[0] * off, A[1] * ka + B[1] * kb + perp[1] * off, A[2] * ka + B[2] * kb + perp[2] * off])
    out.push(xyzToLatLon(p[0], p[1], p[2]))
  }
  return out
}

export function hazardLevel(total: number): Level {
  return total < 25 ? 'LOW' : total < 50 ? 'MODERATE' : total < 75 ? 'HIGH' : 'CRITICAL'
}

export function analyseRoute(id: string, label: string, points: LatLon[]): Route {
  let dist = 0, maxSlope = 0, sum = 0
  for (let i = 1; i < points.length; i++) {
    const seg = haversineKm(points[i - 1], points[i])
    dist += seg
    const dh = terrainKm(points[i].lat, points[i].lon) - terrainKm(points[i - 1].lat, points[i - 1].lon)
    const sl = seg > 0 ? Math.abs(deg(Math.atan2(dh, seg))) : 0
    maxSlope = Math.max(maxSlope, sl); sum += sl
  }
  const slope = Math.min(100, maxSlope * 6)
  const roughness = Math.min(100, (sum / Math.max(1, points.length - 1)) * 12)
  const unknown = 60 // fixed penalty: no real DEM / hazard data loaded
  const total = Math.round(0.4 * slope + 0.3 * roughness + 0.3 * unknown)
  let prox = 0
  for (const p of points) prox += Math.max(...SITES.map((s) => Math.max(0, 1 - haversineKm(p, s) / 400)))
  return {
    id, label, points, distanceKm: dist, maxSlopeDeg: maxSlope,
    hazard: { slope: Math.round(slope), roughness: Math.round(roughness), unknown, total, level: hazardLevel(total) },
    science: Math.round((100 * prox) / points.length),
    evaSols: dist / (WALK_KMH * EVA_HOURS_PER_SOL),
  }
}

export function buildRoutes(a: LatLon, b: LatLon): Route[] {
  return [
    analyseRoute('A', 'Route A · Direct', greatCircle(a, b)),
    analyseRoute('B', 'Route B · Detour east', greatCircle(a, b, 48, 0.05)),
    analyseRoute('C', 'Route C · Detour west', greatCircle(a, b, 48, -0.05)),
  ]
}

export function scoreRoutes(routes: Route[], w: Weights): { ranked: ScoredRoute[]; explanation: string } {
  const minD = Math.min(...routes.map((r) => r.distanceKm))
  const sum = w.safety + w.science + w.distance || 1
  const ranked: ScoredRoute[] = routes.map((r) => {
    const raw: Raw = { safety: 100 - r.hazard.total, science: r.science, distance: Math.round((100 * minD) / r.distanceKm) }
    const parts: Raw = { safety: (w.safety * raw.safety) / sum, science: (w.science * raw.science) / sum, distance: (w.distance * raw.distance) / sum }
    return { ...r, raw, parts, total: Math.round(parts.safety + parts.science + parts.distance) }
  }).sort((x, y) => y.total - x.total)
  const [top, next] = ranked
  const keys: (keyof Raw)[] = ['safety', 'science', 'distance']
  const key = keys.reduce((m, k) => (top.parts[k] - next.parts[k] > top.parts[m] - next.parts[m] ? k : m), keys[0])
  const explanation = `${top.label} ranks first (${top.total} vs ${next.total} for ${next.label}). Its largest advantage is ${key}: raw score ${top.raw[key]} vs ${next.raw[key]}, weighted at ${Math.round((100 * w[key]) / sum)}% of the total. Scores use DEMO terrain, so treat this as a demonstration of the method, not a navigation recommendation.`
  return { ranked, explanation }
}
