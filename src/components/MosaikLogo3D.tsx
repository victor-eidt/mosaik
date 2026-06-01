import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, useTexture, Environment, Center, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'

const MODEL_URL = '/mosaik-icon.glb'
const DRACO_PATH = '/draco/' // decoder self-hosted (sem CDN)

/**
 * Material + post config, dialed in against the hero reference:
 *  Material: metalness 1 · roughness 0.26 · clearcoat 0.38/0.08 · reflection 1.25 · normal 0.08
 *  Glow:     bloom 1.06 · threshold 0 · radius 0.19
 *  Cena:     scale 2.18 · keyLight 4.35
 */
const CFG = {
  tint: '#ffffff',
  metalness: 1,
  roughness: 0.26,
  clearcoat: 0.38,
  clearcoatRoughness: 0.08,
  normalScale: 0.08,
  envIntensity: 1.25,
  bloom: 1.06,
  glowThreshold: 0,
  glowRadius: 0.19,
  scale: 2.18,
  keyLight: 4.35,
} as const

/** Static reclined 3/4 pose + low offset camera that frames the mark like the reference. */
const POSE = {
  rotation: [-0.78, -0.14, 0] as [number, number, number],
  position: [0, -0.22, 0.8] as [number, number, number],
}
const CAMERA = {
  position: [1.35, -0.45, 6] as [number, number, number],
  fov: 46,
  lookAt: [0, 0, 0] as [number, number, number],
}
const KEY_LIGHT = [-1.9, 6.8, 5] as [number, number, number]

/** Rect area lights surrounding the mark — positioned in the light sandbox. Each
 *  carries an explicit Euler rotation instead of auto-facing the center. */
type HeroLight = {
  x: number
  y: number
  z: number
  w: number
  h: number
  intensity: number
  color: string
  rx: number
  ry: number
  rz: number
}
const HERO_LIGHTS: HeroLight[] = [
  { x: -5, y: 2, z: 5, w: 0.6, h: 14, intensity: 9, color: '#ffffff', rx: 2.76, ry: 0.75, rz: -2.88 },
  { x: 0, y: 8.9, z: 0.3, w: 0.9, h: 40, intensity: 11.8, color: '#ffffff', rx: 1.6, ry: 0, rz: -3.14 },
  { x: 0, y: 7.1, z: -1.4, w: 0.5, h: 40, intensity: 20, color: '#ffffff', rx: 1.38, ry: 0, rz: 0 },
  { x: 7, y: 0.5, z: 0, w: 0.6, h: 16, intensity: 10, color: '#ffffff', rx: 1.57, ry: -1.5, rz: 1.57 },
  { x: -8.9, y: -0.6, z: -6.3, w: 1.3, h: 14, intensity: 9.2, color: '#ffffff', rx: -0.09, ry: 0.95, rz: 0.08 },
  { x: -2.6, y: 13.7, z: -1.1, w: 0.9, h: 40, intensity: 8, color: '#ffffff', rx: 1.49, ry: 0.19, rz: -1.16 },
  { x: -4, y: 5, z: 3, w: 0.5, h: 12, intensity: 7, color: '#ffffff', rx: 2.11, ry: 0.6, rz: -2.39 },
  { x: 4, y: 5, z: 3, w: 0.5, h: 12, intensity: 7, color: '#ffffff', rx: 2.11, ry: -0.6, rz: 2.39 },
  { x: 0, y: 8, z: 2, w: 18, h: 0.7, intensity: 8, color: '#ffffff', rx: 1.82, ry: 0, rz: -3.14 },
  { x: 0, y: 7, z: -3, w: 16, h: 0.7, intensity: 6, color: '#ffffff', rx: 1.17, ry: 0, rz: 0 },
  { x: 0, y: -6, z: 2, w: 16, h: 0.7, intensity: 3.5, color: '#cfcfcf', rx: -1.89, ry: 0, rz: -3.14 },
  { x: 6, y: 1.5, z: 3, w: 1, h: 34, intensity: 12, color: '#ffffff', rx: 2.68, ry: -1.06, rz: 2.73 },
  { x: 9, y: 1, z: 1, w: 0.8, h: 30, intensity: 11, color: '#ffffff', rx: 2.36, ry: -1.41, rz: 2.36 },
  { x: 8, y: 2, z: -2, w: 0.7, h: 28, intensity: 10, color: '#ffffff', rx: 0.79, ry: -1.23, rz: 0.76 },
]

/** Full revolutions the mark makes across the whole scroll range (progress 0→1). */
const SPIN_TURNS = 0.7

type Props = {
  /** canvas transparente (compõe sobre o fundo da página) vs. fundo escuro próprio */
  transparent?: boolean
  /** Scroll progress 0→1 (by ref, to avoid re-rendering on every scroll). Drives the spin. */
  spinRef?: MutableRefObject<number>
}

/** Aims the offset camera at the mark (the default camera only looks down -Z). */
function CameraLook() {
  const { camera } = useThree()
  useEffect(() => {
    camera.lookAt(CAMERA.lookAt[0], CAMERA.lookAt[1], CAMERA.lookAt[2])
  }, [camera])
  return null
}

function Logo({ spinRef }: { spinRef?: MutableRefObject<number> }) {
  const spin = useRef<THREE.Group>(null)
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)

  // texturas BAKEADAS do material "Brushed Aluminium" (BlenderKit)
  const [baseMap, roughMap, normalMap] = useTexture([
    '/textures/alu_basecolor.webp',
    '/textures/alu_roughness.webp',
    '/textures/alu_normal.webp',
  ]) as THREE.Texture[]

  useMemo(() => {
    baseMap.colorSpace = THREE.SRGBColorSpace
    roughMap.colorSpace = THREE.NoColorSpace
    normalMap.colorSpace = THREE.NoColorSpace
    // glTF usa origem top-left -> flipY=false p/ alinhar com o UV
    for (const t of [baseMap, roughMap, normalMap]) {
      t.flipY = false
      t.anisotropy = 8
      t.needsUpdate = true
    }
  }, [baseMap, roughMap, normalMap])

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: baseMap,
        roughnessMap: roughMap,
        normalMap: normalMap,
        color: new THREE.Color(CFG.tint),
        metalness: CFG.metalness,
        roughness: CFG.roughness,
        clearcoat: CFG.clearcoat,
        clearcoatRoughness: CFG.clearcoatRoughness,
        envMapIntensity: CFG.envIntensity,
        normalScale: new THREE.Vector2(CFG.normalScale, CFG.normalScale),
      }),
    [baseMap, roughMap, normalMap]
  )

  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.material = material
        m.castShadow = true
        m.receiveShadow = true
      }
    })
  }, [scene, material])

  // Scroll-driven spin about the mark's own (vertical) axis, eased toward target.
  useFrame(() => {
    if (!spin.current) return
    const target = (spinRef?.current ?? 0) * SPIN_TURNS * Math.PI * 2
    spin.current.rotation.y += (target - spin.current.rotation.y) * 0.12
  })

  return (
    <group position={POSE.position} rotation={POSE.rotation}>
      <group ref={spin}>
        <Center>
          <primitive object={scene} scale={CFG.scale} />
        </Center>
      </group>
    </group>
  )
}

export default function MosaikLogo3D({ transparent = false, spinRef }: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ alpha: transparent, antialias: false, toneMapping: THREE.NoToneMapping }}
      camera={{ position: CAMERA.position, fov: CAMERA.fov }}
      style={{ width: '100%', height: '100%' }}
    >
      <CameraLook />
      {!transparent && <color attach="background" args={['#070708']} />}

      <ambientLight intensity={0.05} />
      <directionalLight
        position={KEY_LIGHT}
        intensity={CFG.keyLight}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
      />

      <Suspense fallback={null}>
        <Logo spinRef={spinRef} />
      </Suspense>

      {/* rect area lights surrounding the mark (positioned in the sandbox) */}
      <Environment resolution={1024} environmentIntensity={1.0}>
        <Lightformer intensity={0.06} position={[0, 0, -12]} scale={[34, 34, 1]} color="#101012" />
        {HERO_LIGHTS.map((l, i) => (
          <Lightformer
            key={i}
            form="rect"
            intensity={l.intensity}
            position={[l.x, l.y, l.z]}
            scale={[l.w, l.h, 1]}
            color={l.color}
            rotation={[l.rx, l.ry, l.rz]}
          />
        ))}
      </Environment>

      {/* glow das pontas (bloom só nos realces) + tonemap AgX */}
      <EffectComposer multisampling={4}>
        <Bloom
          mipmapBlur
          intensity={CFG.bloom}
          luminanceThreshold={CFG.glowThreshold}
          luminanceSmoothing={0.12}
          radius={CFG.glowRadius}
        />
        <ToneMapping mode={ToneMappingMode.AGX} />
      </EffectComposer>
    </Canvas>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)
