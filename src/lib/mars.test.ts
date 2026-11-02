import { describe, expect, it } from 'vitest'
import { SITES, buildRoutes, greatCircle, haversineKm, latLonToXYZ, scoreRoutes, xyzToLatLon, R_KM } from './mars'

describe('coordinates', () => {
  it('round-trips lat/lon through XYZ', () => {
    const p = { lat: 18.44, lon: 77.45 }
    const q = xyzToLatLon(...latLonToXYZ(p.lat, p.lon))
    expect(q.lat).toBeCloseTo(p.lat, 6); expect(q.lon).toBeCloseTo(p.lon, 6)
  })
})
describe('distance', () => {
  it('quarter circumference along the equator', () => {
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 90 })).toBeCloseTo((Math.PI / 2) * R_KM, 3)
  })
  it('great circle keeps the endpoints', () => {
    const [a, b] = [SITES[0], SITES[1]]
    const pts = greatCircle(a, b)
    expect(haversineKm(pts[0], a)).toBeLessThan(1e-6); expect(haversineKm(pts[pts.length - 1], b)).toBeLessThan(1e-6)
  })
})
describe('route scoring', () => {
  const routes = buildRoutes(SITES[0], SITES[1])
  it('direct route is shortest', () => expect(routes[0].distanceKm).toBeLessThan(routes[1].distanceKm))
  it('distance-only weights rank the direct route first', () => {
    expect(scoreRoutes(routes, { safety: 0, science: 0, distance: 100 }).ranked[0].id).toBe('A')
  })
  it('explains the ranking', () => {
    expect(scoreRoutes(routes, { safety: 50, science: 50, distance: 50 }).explanation).toContain('ranks first')
  })
})
