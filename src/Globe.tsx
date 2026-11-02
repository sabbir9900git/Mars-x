import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Line, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { SITES, latLonToXYZ, terrainKm, xyzToLatLon, type LatLon, type ScoredRoute } from './lib/mars'

// Procedural DEMO colour map. Drop a real map at public/textures/mars.jpg (e.g. a MOLA/viking colour mosaic) to override it.
function useMarsTexture() {
  const [tex, setTex] = useState<THREE.Texture>()
  useEffect(() => {
    const W = 512, H = 256
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const g = c.getContext('2d')!, img = g.createImageData(W, H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = Math.max(0, Math.min(1, (terrainKm(90 - ((y + 0.5) * 180) / H, ((x + 0.5) * 360) / W, false) + 4) / 8))
      const i = (y * W + x) * 4
      img.data[i] = 85 + 140 * t; img.data[i + 1] = 40 + 80 * t; img.data[i + 2] = 25 + 55 * t; img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; setTex(t)
    new THREE.TextureLoader().load('/textures/mars.jpg', (r) => { r.colorSpace = THREE.SRGBColorSpace; setTex(r) }, undefined, () => {})
  }, [])
  return tex
}

function Rig({ focus }: { focus?: LatLon }) {
  const { camera } = useThree()
  const frames = useRef(0)
  useEffect(() => { frames.current = 100 }, [focus])
  useFrame(() => {
    if (!focus || frames.current <= 0) return
    frames.current--
    camera.position.lerp(new THREE.Vector3(...latLonToXYZ(focus.lat, focus.lon, 2.5)), 0.06)
  })
  return null
}

interface Props {
  startId: string; destId: string; routes: ScoredRoute[]; activeId?: string; focus?: LatLon
  onSite: (id: string) => void; onPoint: (p: LatLon) => void
}

export function Globe({ startId, destId, routes, activeId, focus, onSite, onPoint }: Props) {
  const tex = useMarsTexture()
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <Canvas camera={{ position: [0, 0.8, 2.8], fov: 45 }} dpr={[1, 2]} aria-label="Interactive 3D globe of Mars">
      <color attach="background" args={['#03050a']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 2, 3]} intensity={2.6} />
      <Stars radius={100} depth={50} count={3000} factor={3} fade />
      <mesh onClick={(e) => { e.stopPropagation(); onPoint(xyzToLatLon(e.point.x, e.point.y, e.point.z)) }}>
        <sphereGeometry args={[1, 128, 64]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
      <mesh scale={1.04}>
        <sphereGeometry args={[1, 64, 32]} />
        <meshBasicMaterial color="#e8895a" transparent opacity={0.12} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {SITES.map((s) => {
        const on = s.id === startId || s.id === destId
        return (
          <mesh key={s.id} position={latLonToXYZ(s.lat, s.lon, 1.006)} onClick={(e) => { e.stopPropagation(); onSite(s.id) }}>
            <sphereGeometry args={[on ? 0.016 : 0.01, 16, 16]} />
            <meshBasicMaterial color={on ? '#ffd27a' : '#9fd3ff'} />
            {on && <Html center distanceFactor={6} style={{ pointerEvents: 'none' }}><span className="label">{s.name}</span></Html>}
          </mesh>
        )
      })}
      {routes.map((r) => (
        <Line key={r.id} points={r.points.map((p) => new THREE.Vector3(...latLonToXYZ(p.lat, p.lon, 1.012)))}
          color={r.id === activeId ? '#ffb070' : '#6f7f95'} lineWidth={r.id === activeId ? 3 : 1.2} transparent opacity={r.id === activeId ? 1 : 0.55} />
      ))}
      <Rig focus={focus} />
      <OrbitControls makeDefault enableDamping minDistance={1.3} maxDistance={6} autoRotate={!still && routes.length === 0} autoRotateSpeed={0.3} />
    </Canvas>
  )
}
