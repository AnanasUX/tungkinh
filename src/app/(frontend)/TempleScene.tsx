'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { appFontFamily, whenAppFontReady } from './app-font'
import { SEAT_AISLE, SEAT_LANE_Z, SEATS, SEAT_OCCUPANTS } from './temple-data'
import { TEMPLE_SITES, templeSiteById } from './temple-world'
import { seatManager, type ManagedSeat } from './seat-manager'

/** Imperative controls the HUD uses to drive the player inside the scene. */
export type SceneApi = {
  sit: (seat: number) => boolean
  sitNearest: () => boolean
  hasNearestSeat: () => boolean
  stand: () => void
  offerIncense: (onOffered: () => void) => void
  bow: () => void
  ringBell: () => void
  travelTo: (siteId: number) => void
  /** Analog movement from the touch joystick: x = right, y = forward, each -1..1. */
  setMove: (x: number, y: number) => void
}

type Pose = 'stand' | 'sit'

type Resident = {
  id: string
  name: string
  level: number
  status?: string
  color: string
  x: number
  z: number
  pose: Pose
  face: [number, number]
}

// People in the courtyard. Coordinates are world units; the temple faces +z.
const RESIDENTS: Resident[] = [
  {
    id: 'phuc-an-nhien',
    name: 'Phúc An Nhiên',
    level: 9,
    status: 'Bạn trồng hạt · đang niệm Phật',
    color: '#3b72b8',
    x: 1.25,
    z: 14.4,
    pose: 'stand',
    face: [1, -20],
  },
  {
    id: 'tam-an',
    name: 'Tâm An',
    level: 3,
    color: '#8a9196',
    x: -1.7,
    z: 13.4,
    pose: 'stand',
    face: [-2, -20],
  },
  {
    id: 'an-hien',
    name: 'An Hiền',
    level: 2,
    status: 'Hạt sen · đang thiền',
    color: '#3b72b8',
    x: -5.4,
    z: -5.1,
    pose: 'sit',
    face: [-5.4, -20],
  },
  {
    id: 'dao-dao',
    name: 'Thích Đào Đào',
    level: 8,
    status: 'Mầm sen · đang thiền',
    color: '#d987a6',
    x: -10.1,
    z: -6.6,
    pose: 'sit',
    face: [-10.1, -20],
  },
  {
    id: 'tu-be',
    name: 'Thích Từ Bế',
    level: 2,
    status: 'Hạt sen · đang niệm Phật',
    color: '#ece7dc',
    x: 10.1,
    z: -6.6,
    pose: 'sit',
    face: [10.1, -20],
  },
  {
    id: 'minh-tam',
    name: 'Minh Tâm',
    level: 5,
    status: 'Đang quét lá',
    color: '#ece7dc',
    x: 13.2,
    z: 5.6,
    pose: 'stand',
    face: [6, 18],
  },
]

const ROBE_COLORS: Record<string, string> = {
  xanh: '#3b72b8',
  nau: '#7a4b33',
  vang: '#c08a35',
  xam: '#7a8288',
  do: '#9a3f33',
}

function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat?: [number, number],
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d')!)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(...repeat)
  }
  return texture
}

export default function TempleScene({
  theme = 'xanh',
  playerName,
  level,
  siteId = 1,
  apiRef,
  onSeatChange,
  onSiteChange,
}: {
  theme?: string
  playerName: string
  level: number
  siteId?: number
  apiRef?: MutableRefObject<SceneApi | null>
  onSeatChange?: (seat: number | null) => void
  onSiteChange?: (siteId: number) => void
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const needleRef = useRef<HTMLSpanElement>(null)
  const robeRef = useRef<((color: string) => void) | null>(null)
  const resetViewRef = useRef<(() => void) | null>(null)
  const themeRef = useRef(theme)
  const seatCallbackRef = useRef(onSeatChange)
  seatCallbackRef.current = onSeatChange
  const apiHolderRef = useRef(apiRef)
  apiHolderRef.current = apiRef

  useEffect(() => {
    themeRef.current = theme
    robeRef.current?.(ROBE_COLORS[theme] ?? ROBE_COLORS.xanh)
  }, [theme])

  useEffect(() => {
    apiRef?.current?.travelTo(siteId)
  }, [apiRef, siteId])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch {
      // Keep the illustrated CSS fallback when WebGL is unavailable.
      return
    }
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.domElement.setAttribute('aria-label', 'Không gian 3D sân Chùa An Nhiên')
    mount.appendChild(renderer.domElement)
    mount.classList.add('is-webgl')

    const scene = new THREE.Scene()
    scene.background = canvasTexture(4, 256, (ctx) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 256)
      gradient.addColorStop(0, '#4f8fd8')
      gradient.addColorStop(0.45, '#8fc0ea')
      gradient.addColorStop(0.62, '#cfe3ef')
      gradient.addColorStop(1, '#e8efe9')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 4, 256)
    })
    scene.fog = new THREE.Fog('#d9e7ee', 60, 210)

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 260)
    // Portrait screens need a wider lens to keep the temple and the player in frame.
    const fitLens = () => {
      camera.aspect = mount.clientWidth / Math.max(mount.clientHeight, 1)
      camera.fov = camera.aspect < 1 ? 64 : 50
      camera.updateProjectionMatrix()
    }
    fitLens()

    scene.add(new THREE.HemisphereLight('#eaf3ff', '#9a8466', 1.7))
    const sun = new THREE.DirectionalLight('#fff1d6', 3.1)
    sun.position.set(18, 34, 22)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -40
    sun.shadow.camera.right = 40
    sun.shadow.camera.top = 40
    sun.shadow.camera.bottom = -40
    sun.shadow.camera.far = 120
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.03
    const sunTarget = new THREE.Object3D()
    scene.add(sun, sunTarget)
    sun.target = sunTarget

    const world = new THREE.Group()
    scene.add(world)
    const rand = seeded(42)

    const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra })
    const mat = {
      stone: std('#a19c92', { flatShading: true }),
      darkStone: std('#77736c', { flatShading: true }),
      lampStone: std('#8f8c86', { flatShading: true }),
      wall: std('#ece6d8'),
      wallCap: std('#6e6862'),
      cream: std('#eadcbf'),
      wood: std('#6b3524'),
      red: std('#a8291f', { roughness: 0.6 }),
      redDark: std('#7c2119'),
      yellow: std('#e2b33c', { roughness: 0.55 }),
      gold: std('#d9a93a', { metalness: 0.55, roughness: 0.35 }),
      bronze: std('#a37d3a', { metalness: 0.6, roughness: 0.4 }),
      trunk: std('#6e5a47', { flatShading: true }),
      bark: std('#5b4a3b', { flatShading: true }),
      leafDark: std('#3c6a2e', { flatShading: true }),
      leaf: std('#4f8036', { flatShading: true }),
      leafLight: std('#6d9a43', { flatShading: true }),
      cushion: std('#8b5a34'),
      pot: std('#2f62ad', { roughness: 0.3 }),
      grass: std('#7f9c5b'),
      mountain: std('#8ea6b6', { flatShading: true }),
      ribbon: std('#c4262e', { side: THREE.DoubleSide }),
    }
    const roofTiles = canvasTexture(
      256,
      256,
      (ctx) => {
        ctx.fillStyle = '#93452f'
        ctx.fillRect(0, 0, 256, 256)
        for (let x = 0; x < 256; x += 16) {
          ctx.fillStyle = 'rgba(70, 24, 14, .55)'
          ctx.fillRect(x, 0, 4, 256)
          ctx.fillStyle = 'rgba(255, 190, 150, .12)'
          ctx.fillRect(x + 6, 0, 3, 256)
        }
        for (let y = 0; y < 256; y += 32) {
          ctx.fillStyle = 'rgba(60, 20, 10, .25)'
          ctx.fillRect(0, y, 256, 2)
        }
      },
      [1, 1],
    )
    const roofMaterial = new THREE.MeshStandardMaterial({
      map: roofTiles,
      roughness: 0.8,
      side: THREE.DoubleSide,
    })

    function box(
      size: [number, number, number],
      position: [number, number, number],
      material: THREE.Material,
      parent: THREE.Object3D = world,
    ) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
      mesh.position.set(...position)
      mesh.castShadow = true
      mesh.receiveShadow = true
      parent.add(mesh)
      return mesh
    }
    function cylinder(
      radiusTop: number,
      radiusBottom: number,
      height: number,
      segments: number,
      position: [number, number, number],
      material: THREE.Material,
      parent: THREE.Object3D = world,
    ) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
        material,
      )
      mesh.position.set(...position)
      mesh.castShadow = true
      mesh.receiveShadow = true
      parent.add(mesh)
      return mesh
    }

    // A lightly mottled lawn keeps the large world from reading as a flat green plane.
    const grassTexture = canvasTexture(
      512,
      512,
      (ctx) => {
        const r = seeded(31)
        ctx.fillStyle = '#809c5e'
        ctx.fillRect(0, 0, 512, 512)
        for (let i = 0; i < 900; i++) {
          const light = 37 + r() * 12
          ctx.fillStyle = `hsla(${78 + r() * 22}, 32%, ${light}%, ${0.16 + r() * 0.15})`
          const size = 2 + r() * 9
          ctx.fillRect(r() * 512, r() * 512, size, size)
        }
      },
      [26, 26],
    )
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(420, 420),
      new THREE.MeshStandardMaterial({ map: grassTexture, roughness: 1 }),
    )
    grass.rotation.x = -Math.PI / 2
    grass.receiveShadow = true
    world.add(grass)

    const courtyardTexture = canvasTexture(
      512,
      512,
      (ctx) => {
        const r = seeded(7)
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const light = 54 + r() * 9
            ctx.fillStyle = `hsl(30, 30%, ${light}%)`
            ctx.fillRect(x * 64, y * 64, 64, 64)
            ctx.fillStyle = 'rgba(255, 240, 220, .1)'
            ctx.fillRect(x * 64 + 4, y * 64 + 4, 56, 6)
          }
        }
        ctx.strokeStyle = '#7b624b'
        ctx.lineWidth = 3
        for (let i = 0; i <= 512; i += 64) {
          ctx.beginPath()
          ctx.moveTo(i, 0)
          ctx.lineTo(i, 512)
          ctx.moveTo(0, i)
          ctx.lineTo(512, i)
          ctx.stroke()
        }
      },
      [5, 5.4],
    )
    const courtyard = new THREE.Mesh(
      new THREE.PlaneGeometry(54, 58),
      new THREE.MeshStandardMaterial({ map: courtyardTexture, roughness: 0.95 }),
    )
    courtyard.rotation.x = -Math.PI / 2
    courtyard.position.set(0, 0.02, 3)
    courtyard.receiveShadow = true
    world.add(courtyard)

    const pathTexture = canvasTexture(
      512,
      512,
      (ctx) => {
        const r = seeded(11)
        ctx.fillStyle = '#4b4c4f'
        ctx.fillRect(0, 0, 512, 512)
        for (let y = 0; y < 512; y += 48) {
          let x = -r() * 60
          while (x < 512) {
            const w = 58 + r() * 52
            const l = 44 + r() * 14
            ctx.fillStyle = `hsl(210, 4%, ${l}%)`
            ctx.fillRect(x + 3, y + 3, w - 6, 42)
            ctx.fillStyle = 'rgba(255, 255, 255, .08)'
            ctx.fillRect(x + 3, y + 3, w - 6, 5)
            x += w
          }
        }
      },
      [1.2, 7],
    )
    const pathMaterial = new THREE.MeshStandardMaterial({ map: pathTexture, roughness: 0.9 })
    const path = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 108), pathMaterial)
    path.rotation.x = -Math.PI / 2
    path.position.set(0, 0.04, 40)
    path.receiveShadow = true
    world.add(path)
    for (const side of [-1, 1]) box([0.3, 0.12, 108], [side * 3.35, 0.06, 40], mat.darkStone)
    const crossPath = new THREE.Mesh(new THREE.PlaneGeometry(130, 6.4), pathMaterial)
    crossPath.rotation.x = -Math.PI / 2
    crossPath.position.set(0, 0.045, 14)
    crossPath.receiveShadow = true
    world.add(crossPath)
    for (const side of [-1, 1]) box([130, 0.12, 0.3], [0, 0.06, 14 + side * 3.35], mat.darkStone)

    // Hip roof with a gently concave slope and lifted corners.
    function hipRoof(
      width: number,
      depth: number,
      height: number,
      lift: number,
      position: [number, number, number],
      ornaments = false,
    ) {
      const group = new THREE.Group()
      group.position.set(...position)
      const ridgeHalf = Math.max(width / 2 - depth / 2, 0.25)
      const corner = (u: number) => Math.abs(2 * u - 1) ** 5
      const lerp = THREE.MathUtils.lerp
      const sides: ((u: number) => [THREE.Vector3, THREE.Vector3])[] = [
        (u) => [
          new THREE.Vector3(lerp(-width / 2, width / 2, u), 0, depth / 2),
          new THREE.Vector3(lerp(-ridgeHalf, ridgeHalf, u), height, 0),
        ],
        (u) => [
          new THREE.Vector3(width / 2, 0, lerp(depth / 2, -depth / 2, u)),
          new THREE.Vector3(ridgeHalf, height, 0),
        ],
        (u) => [
          new THREE.Vector3(lerp(width / 2, -width / 2, u), 0, -depth / 2),
          new THREE.Vector3(lerp(ridgeHalf, -ridgeHalf, u), height, 0),
        ],
        (u) => [
          new THREE.Vector3(-width / 2, 0, lerp(-depth / 2, depth / 2, u)),
          new THREE.Vector3(-ridgeHalf, height, 0),
        ],
      ]
      const columns = 30
      const rows = 10
      const eavePoints: THREE.Vector3[] = []
      sides.forEach((side, sideIndex) => {
        const positions: number[] = []
        const uvs: number[] = []
        const indices: number[] = []
        const span = sideIndex % 2 === 0 ? width : depth
        for (let i = 0; i <= columns; i++) {
          const u = i / columns
          const [eave, ridge] = side(u)
          if (i < columns) eavePoints.push(new THREE.Vector3(eave.x, lift * corner(u), eave.z))
          for (let j = 0; j <= rows; j++) {
            const t = j / rows
            const point = eave.clone().lerp(ridge, t)
            point.y = height * t ** 1.6 + lift * corner(u) * (1 - t) ** 2
            positions.push(point.x, point.y, point.z)
            uvs.push((u * span) / 2.2, t * 2)
          }
        }
        for (let i = 0; i < columns; i++) {
          for (let j = 0; j < rows; j++) {
            const a = i * (rows + 1) + j
            const b = (i + 1) * (rows + 1) + j
            indices.push(a, b, a + 1, b, b + 1, a + 1)
          }
        }
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
        geometry.setIndex(indices)
        geometry.computeVertexNormals()
        const mesh = new THREE.Mesh(geometry, roofMaterial)
        mesh.castShadow = true
        mesh.receiveShadow = true
        group.add(mesh)
      })
      const fascia = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(eavePoints, true), 240, 0.13, 6, true),
        mat.red,
      )
      fascia.castShadow = true
      group.add(fascia)
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const base = new THREE.Vector3((sx * width) / 2, lift, (sz * depth) / 2)
          const out = new THREE.Vector3(sx, 0, sz).normalize()
          const curve = new THREE.QuadraticBezierCurve3(
            base,
            base
              .clone()
              .addScaledVector(out, 0.55)
              .add(new THREE.Vector3(0, 0.25, 0)),
            base
              .clone()
              .addScaledVector(out, 0.7)
              .add(new THREE.Vector3(0, 0.95, 0)),
          )
          group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.11, 6), mat.red))
          const tip = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat.gold)
          tip.position.copy(curve.getPoint(1))
          group.add(tip)
        }
      }
      box([ridgeHalf * 2 + 0.7, 0.36, 0.42], [0, height + 0.1, 0], mat.redDark, group)
      if (ornaments) {
        for (const side of [-1, 1]) {
          const points = [
            [ridgeHalf + 0.35, 0.25],
            [ridgeHalf + 0.15, 1.05],
            [ridgeHalf - 0.55, 1.3],
            [ridgeHalf - 1.2, 0.85],
            [ridgeHalf - 1.85, 1.15],
            [ridgeHalf - 2.4, 0.5],
          ].map(([x, y]) => new THREE.Vector3(side * x, height + y, 0))
          const dragon = new THREE.Mesh(
            new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.12, 8),
            mat.gold,
          )
          dragon.castShadow = true
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), mat.gold)
          head.position.copy(points[points.length - 1])
          group.add(dragon, head)
        }
        const pearl = new THREE.Mesh(
          new THREE.SphereGeometry(0.34, 18, 14),
          std('#fff0c2', { emissive: '#ffcf6a', emissiveIntensity: 0.6 }),
        )
        pearl.position.set(0, height + 1.0, 0)
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 10), mat.gold)
        flame.position.set(0, height + 1.6, 0)
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 28), mat.gold)
        halo.position.set(0, height + 1.0, 0)
        group.add(pearl, flame, halo)
      }
      world.add(group)
      return group
    }

    // Main hall.
    const temple = new THREE.Group()
    temple.position.set(0, 0, -16)
    world.add(temple)
    box([28, 1.2, 12], [0, 0.6, 0], mat.stone, temple)
    box([28.2, 0.18, 12.2], [0, 1.25, 0], mat.darkStone, temple)
    for (let i = 0; i < 5; i++)
      box([8, 0.24, 0.5], [0, 0.12 + i * 0.24, 6 + (4 - i) * 0.5 + 0.25], mat.stone, temple)
    for (const side of [-1, 1])
      box([0.5, 1.3, 2.6], [side * 4.25, 0.65, 7.3], mat.darkStone, temple)

    box([20, 5.2, 6], [0, 3.8, -1.5], mat.wood, temple)
    const lattice = canvasTexture(
      128,
      128,
      (ctx) => {
        ctx.fillStyle = '#4a2416'
        ctx.fillRect(0, 0, 128, 128)
        ctx.strokeStyle = '#8b4a2c'
        ctx.lineWidth = 5
        for (let i = 8; i < 128; i += 20) {
          ctx.beginPath()
          ctx.moveTo(i, 0)
          ctx.lineTo(i, 128)
          ctx.moveTo(0, i)
          ctx.lineTo(128, i)
          ctx.stroke()
        }
        ctx.strokeStyle = '#2b130b'
        ctx.lineWidth = 8
        ctx.strokeRect(0, 0, 128, 128)
      },
      [1, 2],
    )
    const latticeMaterial = new THREE.MeshStandardMaterial({ map: lattice, roughness: 0.8 })
    for (const x of [-8, -5.1, 5.1, 8])
      box([2.6, 3.8, 0.14], [x, 3.1, 2.55], latticeMaterial, temple)
    for (const side of [-1, 1]) box([0.14, 4.4, 1.1], [side * 3.55, 3.4, 2], mat.wood, temple)
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 4.4),
      new THREE.MeshBasicMaterial({
        map: canvasTexture(256, 160, (ctx) => {
          const g = ctx.createRadialGradient(128, 70, 6, 128, 80, 150)
          g.addColorStop(0, '#fff2c4')
          g.addColorStop(0.35, '#ffb347')
          g.addColorStop(1, '#7a2b10')
          ctx.fillStyle = g
          ctx.fillRect(0, 0, 256, 160)
        }),
      }),
    )
    glow.position.set(0, 3.4, 1.53)
    temple.add(glow)
    const buddha = new THREE.Group()
    const buddhaBody = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.001, 0),
          new THREE.Vector2(1.05, 0),
          new THREE.Vector2(1.0, 0.35),
          new THREE.Vector2(0.62, 0.7),
          new THREE.Vector2(0.55, 1.35),
          new THREE.Vector2(0.3, 1.6),
          new THREE.Vector2(0.001, 1.62),
        ],
        24,
      ),
      std('#f1c45a', {
        metalness: 0.6,
        roughness: 0.3,
        emissive: '#7a4a08',
        emissiveIntensity: 0.4,
      }),
    )
    const buddhaHead = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 16), buddhaBody.material)
    buddhaHead.position.y = 1.95
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.07, 8, 32),
      std('#ffd77a', { emissive: '#ffb93d', emissiveIntensity: 0.9 }),
    )
    halo.position.set(0, 1.95, -0.2)
    buddha.add(buddhaBody, buddhaHead, halo)
    buddha.position.set(0, 2.2, 1.95)
    temple.add(buddha)
    box([2.6, 0.9, 0.7], [0, 1.65, 2.4], mat.red, temple)
    const shrineLight = new THREE.PointLight('#ffae55', 18, 10, 2)
    shrineLight.position.set(0, 3.6, 3.6)
    temple.add(shrineLight)

    for (const x of [-9.4, -6.6, -3.6, 3.6, 6.6, 9.4]) {
      const major = Math.abs(x) < 4
      cylinder(0.42, 0.5, 0.3, 12, [x, 1.4, 4.6], mat.darkStone, temple)
      cylinder(
        major ? 0.3 : 0.25,
        major ? 0.32 : 0.27,
        4.4,
        14,
        [x, 3.6, 4.6],
        major ? mat.yellow : mat.red,
        temple,
      )
    }
    box([20.6, 0.45, 0.45], [0, 5.85, 4.6], mat.red, temple)
    box([20.6, 0.2, 2.2], [0, 6.05, 3.5], mat.wood, temple)

    const drawSign = (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#a3191a'
      ctx.fillRect(0, 0, 512, 116)
      ctx.strokeStyle = '#e8b64a'
      ctx.lineWidth = 8
      ctx.strokeRect(8, 8, 496, 100)
      ctx.fillStyle = '#f6cd5a'
      ctx.font = `800 56px ${appFontFamily()}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('CHÙA YÊN PHÚC', 256, 60, 470)
    }
    const signTexture = canvasTexture(512, 116, drawSign)
    // Redraw once the web font is ready so the plaque never keeps a fallback face.
    whenAppFontReady(['800']).then(() => {
      const canvas = signTexture.image as HTMLCanvasElement
      drawSign(canvas.getContext('2d')!)
      signTexture.needsUpdate = true
    })
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 1.0),
      new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.5, emissive: '#3a0808' }),
    )
    sign.position.set(0, 5.05, 4.85)
    temple.add(sign)

    const lanternMaterial = std('#d52a22', { emissive: '#a0180f', emissiveIntensity: 0.7 })
    for (const x of [-8, -5.1, 5.1, 8]) {
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), lanternMaterial)
      lantern.scale.y = 1.2
      lantern.position.set(x, 4.95, 4.6)
      cylinder(0.14, 0.14, 0.1, 10, [x, 5.35, 4.6], mat.gold, temple)
      cylinder(0.12, 0.12, 0.08, 10, [x, 4.58, 4.6], mat.gold, temple)
      cylinder(0.015, 0.015, 0.5, 4, [x, 5.6, 4.6], mat.redDark, temple)
      temple.add(lantern)
    }

    hipRoof(25, 12.4, 2.7, 0.95, [0, 6.15, -16 + 0.6])
    box([13, 2.6, 6], [0, 8.5, -16.6], mat.cream)
    for (const x of [-3.2, 3.2]) box([3.8, 1.4, 0.12], [x, 8.6, -13.55], latticeMaterial)
    box([1.8, 0.8, 0.12], [0, 8.75, -13.55], mat.red)
    for (const x of [-6.3, 6.3]) cylinder(0.18, 0.18, 2.6, 10, [x, 8.5, -13.5], mat.red)
    hipRoof(16.5, 8.6, 2.4, 0.8, [0, 9.8, -16.6], true)

    // Side halls.
    for (const side of [-1, 1]) {
      box([11, 3.4, 6], [side * 20.5, 1.7, -17], mat.cream)
      for (let x = -4.5; x <= 4.5; x += 3)
        cylinder(0.2, 0.22, 3.4, 10, [side * 20.5 + x, 1.7, -13.7], mat.red)
      hipRoof(13, 8, 1.9, 0.6, [side * 20.5, 3.4, -16.6])
    }

    // Bronze cranes guarding the steps.
    for (const side of [-1, 1]) {
      const crane = new THREE.Group()
      crane.position.set(side * 5.3, 0, -8.6)
      cylinder(0.9, 1, 0.5, 8, [0, 0.25, 0], mat.stone, crane)
      const turtle = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), mat.bronze)
      turtle.scale.set(1, 0.45, 1.25)
      turtle.position.y = 0.75
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), mat.bronze)
      body.scale.set(0.8, 0.75, 1.3)
      body.position.set(0, 1.85, 0)
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), mat.bronze)
      leg.position.set(0, 1.2, 0)
      const neck = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 2.0, 0.35),
            new THREE.Vector3(0, 2.7, 0.55),
            new THREE.Vector3(0, 3.3, 0.35),
          ]),
          14,
          0.08,
          6,
        ),
        mat.bronze,
      )
      const craneHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat.bronze)
      craneHead.position.set(0, 3.35, 0.35)
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 6), mat.bronze)
      beak.rotation.x = Math.PI / 2
      beak.position.set(0, 3.4, 0.68)
      crane.add(turtle, body, leg, neck, craneHead, beak)
      crane.rotation.y = side * -0.5
      crane.traverse((object) => {
        object.castShadow = true
      })
      world.add(crane)
    }

    // Incense altar.
    box([1.8, 0.9, 0.9], [0, 0.45, -6.4], mat.redDark)
    const urn = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.001, 0),
          new THREE.Vector2(0.35, 0),
          new THREE.Vector2(0.45, 0.25),
          new THREE.Vector2(0.38, 0.45),
          new THREE.Vector2(0.42, 0.5),
          new THREE.Vector2(0.001, 0.5),
        ],
        18,
      ),
      mat.bronze,
    )
    urn.position.set(0, 0.9, -6.4)
    urn.castShadow = true
    world.add(urn)
    for (let i = -1; i <= 1; i++) {
      cylinder(0.015, 0.015, 0.6, 4, [i * 0.1, 1.65, -6.4], mat.redDark)
      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 6, 4),
        new THREE.MeshBasicMaterial({ color: '#ff8a3a' }),
      )
      ember.position.set(i * 0.1, 1.96, -6.4)
      world.add(ember)
    }

    type Collider = { x: number; z: number; r: number; seatIds?: number[] }
    type RectCollider = { x: number; z: number; halfX: number; halfZ: number }
    type WorldSeat = {
      id: number
      x: number
      z: number
      heading: number
      kind: 'cushion' | 'bench'
    }
    const colliders: Collider[] = [
      { x: 0, z: -6.4, r: 1.2 },
      { x: -5.3, z: -8.6, r: 0.9 },
      { x: 5.3, z: -8.6, r: 0.9 },
    ]
    const rectColliders: RectCollider[] = []
    const worldSeats: WorldSeat[] = []
    let nextBenchSeatId = 500
    const remoteBellPivots: { siteId: number; pivot: THREE.Group }[] = []
    const addRectCollider = (x: number, z: number, width: number, depth: number) => {
      rectColliders.push({ x, z, halfX: width / 2, halfZ: depth / 2 })
    }
    // Main and side halls of Chùa Yên Phúc.
    addRectCollider(0, -17.5, 21, 7)
    addRectCollider(-20.5, -17, 11, 6)
    addRectCollider(20.5, -17, 11, 6)
    const remoteCushionMaterial = std('#8b3a2a', { roughness: 0.75 })
    const remoteCushionTop = std('#c9a24a', { roughness: 0.5 })

    // Four distant compounds and the central gathering plaza extend the scene
    // far beyond the original courtyard while keeping every route walkable.
    const makeSiteSign = (site: (typeof TEMPLE_SITES)[number], y: number, z: number) => {
      const texture = canvasTexture(512, 104, (ctx) => {
        ctx.fillStyle = site.accent
        ctx.fillRect(0, 0, 512, 104)
        ctx.strokeStyle = '#e7c46f'
        ctx.lineWidth = 8
        ctx.strokeRect(7, 7, 498, 90)
        ctx.fillStyle = '#ffe39a'
        ctx.font = `800 46px ${appFontFamily()}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(site.name.toUpperCase(), 256, 53, 470)
      })
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(6.8, 1.38),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.58 }),
      )
      sign.position.set(site.center[0], y, z)
      world.add(sign)
    }

    const buildRemoteTemple = (site: (typeof TEMPLE_SITES)[number]) => {
      const [x, z] = site.center
      const courtyard = new THREE.Mesh(
        new THREE.PlaneGeometry(42, 35),
        new THREE.MeshStandardMaterial({ map: courtyardTexture, roughness: 0.96 }),
      )
      courtyard.rotation.x = -Math.PI / 2
      courtyard.position.set(x, 0.035, z + 7)
      courtyard.receiveShadow = true
      world.add(courtyard)

      box([27, 0.8, 13], [x, 0.4, z], mat.stone)
      box([20, 5.2, 7.4], [x, 3.4, z - 2], mat.cream)
      box([18.5, 3.6, 0.35], [x, 3.1, z + 1.85], mat.wood)
      for (const doorX of [-6, -3, 0, 3, 6]) {
        box([2.35, 3.15, 0.16], [x + doorX, 3.05, z + 2.05], mat.redDark)
        for (const bar of [-0.7, 0, 0.7])
          box([0.07, 2.7, 0.03], [x + doorX + bar, 3.05, z + 2.15], mat.gold)
      }
      for (const columnX of [-8, -4, 0, 4, 8]) {
        cylinder(0.28, 0.32, 4.7, 12, [x + columnX, 3.2, z + 2], mat.red)
      }
      hipRoof(24, 11, 2.5, 0.82, [x, 6, z - 1.5], true)
      makeSiteSign(site, 5.15, z + 2.22)
      const remoteBuddha = new THREE.Group()
      const remoteBuddhaMaterial = std('#e4b84d', {
        metalness: 0.55,
        roughness: 0.32,
        emissive: '#6f4208',
        emissiveIntensity: 0.25,
      })
      const remoteBuddhaBody = new THREE.Mesh(
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0.001, 0),
            new THREE.Vector2(0.62, 0),
            new THREE.Vector2(0.58, 0.34),
            new THREE.Vector2(0.36, 0.68),
            new THREE.Vector2(0.2, 1.05),
            new THREE.Vector2(0.001, 1.08),
          ],
          18,
        ),
        remoteBuddhaMaterial,
      )
      const remoteBuddhaHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.27, 16, 12),
        remoteBuddhaMaterial,
      )
      remoteBuddhaHead.position.y = 1.32
      const remoteHalo = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.045, 7, 24), mat.gold)
      remoteHalo.position.set(0, 1.32, -0.12)
      remoteBuddha.add(remoteBuddhaBody, remoteBuddhaHead, remoteHalo)
      remoteBuddha.position.set(x, 1.25, z + 2.35)
      world.add(remoteBuddha)

      const stupaX = x - 11
      const stupaZ = z - 7
      cylinder(0.72, 0.92, 1.05, 12, [stupaX, 0.53, stupaZ], mat.wall)
      const remoteDome = new THREE.Mesh(new THREE.SphereGeometry(0.65, 14, 9), mat.wall)
      remoteDome.position.set(stupaX, 1.4, stupaZ)
      const remoteSpire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.25, 9), mat.gold)
      remoteSpire.position.set(stupaX, 2.42, stupaZ)
      world.add(remoteDome, remoteSpire)
      colliders.push({ x: stupaX, z: stupaZ, r: 0.9 })

      // Side halls, enclosing walls and a ceremonial gate make each remote
      // destination read as a complete compound rather than a lone building.
      for (const side of [-1, 1]) {
        box([7.5, 3.4, 8], [x + side * 16, 1.7, z + 2], mat.cream)
        for (const offset of [-2.4, 0, 2.4])
          cylinder(0.18, 0.2, 3.2, 10, [x + side * 16 + offset, 1.8, z + 6.1], mat.red)
        hipRoof(9.5, 10, 1.7, 0.58, [x + side * 16, 3.5, z + 2])
        addRectCollider(x + side * 16, z + 2, 7.5, 8)
      }
      for (const side of [-1, 1]) {
        box([0.45, 2.3, 22], [x + side * 21, 1.15, z - 1], mat.wall)
        box([0.45, 2.3, 4], [x + side * 21, 1.15, z + 20], mat.wall)
      }
      for (const side of [-1, 1]) box([17, 2.3, 0.45], [x + side * 12.5, 1.15, z - 12], mat.wall)
      for (const side of [-1, 1]) box([15, 2.3, 0.45], [x + side * 13.5, 1.15, z + 22], mat.wall)
      for (const gateX of [-4.4, 4.4]) box([1.1, 5.4, 1.1], [x + gateX, 2.7, z + 21.7], mat.red)
      box([10.5, 0.5, 1.2], [x, 5.25, z + 21.7], mat.redDark)
      hipRoof(13, 4.8, 1.6, 0.65, [x, 5.4, z + 21.7], true)
      addRectCollider(x, z - 2, 20, 7.4)
      for (const side of [-1, 1]) {
        addRectCollider(x + side * 21, z - 1, 0.45, 22)
        addRectCollider(x + side * 21, z + 20, 0.45, 4)
        addRectCollider(x + side * 12.5, z - 12, 17, 0.45)
      }
      addRectCollider(x - 13.5, z + 22, 15, 0.45)
      addRectCollider(x + 13.5, z + 22, 15, 0.45)
      addRectCollider(x - 4.4, z + 21.7, 1.1, 1.1)
      addRectCollider(x + 4.4, z + 21.7, 1.1, 1.1)

      for (const side of [-1, 1]) {
        lotusLamp(x + side * 8.8, z + 8)
        lotusLamp(x + side * 8.8, z + 17)
      }

      // Every temple has the same core practice facilities as Yên Phúc:
      // incense altar, meditation cushions, bonsai, a sacred tree and bell pavilion.
      cylinder(0.72, 0.86, 0.85, 18, [x, 0.72, z + 5], mat.bronze)
      for (let incense = -1; incense <= 1; incense++)
        cylinder(0.018, 0.018, 0.62, 5, [x + incense * 0.12, 1.45, z + 5], mat.redDark)
      colliders.push({ x, z: z + 5, r: 1.05 })
      for (const seat of SEATS) {
        const seatX = x + seat.x
        const seatZ = z + 9 + seat.row * 3.15
        cylinder(0.46, 0.52, 0.17, 18, [seatX, 0.1, seatZ], remoteCushionMaterial)
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 20), remoteCushionTop)
        ring.rotation.x = -Math.PI / 2
        ring.position.set(seatX, 0.19, seatZ)
        world.add(ring)
        worldSeats.push({
          id: site.id * 100 + seat.no,
          x: seatX,
          z: seatZ,
          heading: Math.PI,
          kind: 'cushion',
        })
      }
      for (const side of [-1, 1]) {
        const potX = x + side * 6.2
        cylinder(0.55, 0.42, 0.5, 14, [potX, 0.3, z + 5.8], mat.pot)
        cylinder(0.07, 0.1, 1.1, 7, [potX, 1.0, z + 5.8], mat.bark)
        const crown = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.78, 1),
          side < 0 ? mat.leaf : mat.leafLight,
        )
        crown.position.set(potX, 1.75, z + 5.8)
        crown.scale.y = 0.72
        crown.castShadow = true
        world.add(crown)
        colliders.push({ x: potX, z: z + 5.8, r: 0.75 })
      }
      roundTree(x - 13, z + 13, 1.15)

      const bellX = x + 13
      const bellZ = z + 14
      box([6.5, 0.5, 6.5], [bellX, 0.25, bellZ], mat.stone)
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          cylinder(0.2, 0.24, 4.3, 10, [bellX + sx * 2.15, 2.4, bellZ + sz * 2.15], mat.red)
      hipRoof(7.8, 7.8, 1.4, 0.55, [bellX, 4.55, bellZ])
      const remoteBellPivot = new THREE.Group()
      remoteBellPivot.position.set(bellX, 3.5, bellZ)
      const remoteBell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.92, 1.7, 20, 1, true),
        mat.bronze,
      )
      remoteBell.position.y = -0.85
      remoteBell.castShadow = true
      remoteBellPivot.add(remoteBell)
      world.add(remoteBellPivot)
      remoteBellPivots.push({ siteId: site.id, pivot: remoteBellPivot })
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.75, 20), mat.red)
      drum.rotation.x = Math.PI / 2
      drum.position.set(bellX - 1.25, 1.45, bellZ)
      drum.castShadow = true
      world.add(drum)
      colliders.push({ x: bellX, z: bellZ, r: 3.4 })

      // Each destination has a recognisable landmark.
      if (site.id === 2) {
        const water = new THREE.Mesh(
          new THREE.CircleGeometry(6.8, 40),
          std('#4c9eaa', { metalness: 0.08, roughness: 0.28 }),
        )
        water.rotation.x = -Math.PI / 2
        water.scale.y = 0.72
        water.position.set(x - 28, 0.08, z + 8)
        world.add(water)
        for (let i = 0; i < 13; i++) {
          const angle = (i / 13) * Math.PI * 2
          const pad = new THREE.Mesh(new THREE.CircleGeometry(0.35 + (i % 3) * 0.12, 14), mat.leaf)
          pad.rotation.x = -Math.PI / 2
          pad.position.set(
            x - 28 + Math.cos(angle) * (2 + (i % 4)),
            0.12,
            z + 8 + Math.sin(angle) * 3,
          )
          world.add(pad)
        }
        colliders.push({ x: x - 28, z: z + 8, r: 7.2 })
      } else if (site.id === 3) {
        for (let tier = 0; tier < 4; tier++) {
          const y = 1 + tier * 2.2
          box([6 - tier * 0.7, 1.7, 6 - tier * 0.7], [x + 28, y, z + 8], mat.cream)
          hipRoof(8 - tier * 0.8, 8 - tier * 0.8, 1.2, 0.48, [x + 28, y + 0.9, z + 8])
        }
        cylinder(0.1, 0.2, 2.4, 8, [x + 28, 10.4, z + 8], mat.gold)
        addRectCollider(x + 28, z + 8, 6, 6)
      } else if (site.id === 4) {
        for (let i = 0; i < 20; i++) {
          const side = i % 2 === 0 ? -1 : 1
          const bx = x + side * (25 + (i % 4) * 1.2)
          const bz = z + 5 + Math.floor(i / 4) * 3
          cylinder(0.1, 0.14, 5 + (i % 3), 8, [bx, 2.6, bz], mat.leafDark)
          for (const leafSide of [-1, 1]) {
            const leaf = new THREE.Mesh(
              new THREE.PlaneGeometry(0.35, 1.8),
              std('#5d9444', { side: THREE.DoubleSide }),
            )
            leaf.position.set(bx + leafSide * 0.45, 4 + (i % 2), bz)
            leaf.rotation.set(0.2, 0, leafSide * 0.9)
            world.add(leaf)
          }
        }
      }
      for (const side of [-1, 1]) {
        roundTree(x + side * 24, z - 7, 1.1)
        roundTree(x + side * 25, z + 15, 0.95)
      }
      colliders.push({ x, z: z - 1.5, r: 7.5 })
    }

    // Lotus-base stone lamps.
    const lanternTexture = canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = '#fff3d6'
      ctx.fillRect(0, 0, 128, 128)
      ctx.strokeStyle = '#b8201d'
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(30, 6)
      ctx.quadraticCurveTo(64, 64, 30, 122)
      ctx.moveTo(98, 6)
      ctx.quadraticCurveTo(64, 64, 98, 122)
      ctx.stroke()
      ctx.fillStyle = '#b8201d'
      ctx.fillRect(0, 0, 128, 8)
      ctx.fillRect(0, 120, 128, 8)
    })
    const lampMaterial = new THREE.MeshStandardMaterial({
      map: lanternTexture,
      emissive: '#ffd79a',
      emissiveMap: lanternTexture,
      emissiveIntensity: 0.55,
      roughness: 0.6,
    })
    function lotusLamp(x: number, z: number) {
      const group = new THREE.Group()
      group.position.set(x, 0, z)
      cylinder(1.15, 1.3, 0.32, 8, [0, 0.16, 0], mat.darkStone, group)
      cylinder(0.75, 0.9, 0.42, 8, [0, 0.53, 0], mat.lampStone, group)
      for (let i = 0; i < 8; i++) {
        const pivot = new THREE.Group()
        pivot.position.y = 0.72
        pivot.rotation.y = (i / 8) * Math.PI * 2
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), mat.lampStone)
        petal.scale.set(0.42, 0.95, 0.2)
        petal.position.set(0, 0.4, 0.5)
        petal.rotation.x = 0.5
        petal.castShadow = true
        pivot.add(petal)
        group.add(pivot)
      }
      cylinder(0.28, 0.34, 2.1, 8, [0, 2.0, 0], mat.lampStone, group)
      cylinder(0.62, 0.42, 0.14, 6, [0, 3.1, 0], mat.darkStone, group)
      cylinder(0.55, 0.55, 0.86, 6, [0, 3.6, 0], lampMaterial, group)
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.82, 0.55, 6), mat.darkStone)
      cap.position.y = 4.3
      cap.castShadow = true
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat.darkStone)
      finial.position.y = 4.65
      group.add(cap, finial)
      world.add(group)
      colliders.push({ x, z, r: 1.4 })
    }
    TEMPLE_SITES.filter((site) => site.kind === 'temple' && site.id !== 1).forEach(
      buildRemoteTemple,
    )

    const plaza = templeSiteById(5)
    {
      const [x, z] = plaza.center
      const plazaFloor = new THREE.Mesh(
        new THREE.CircleGeometry(17, 48),
        new THREE.MeshStandardMaterial({ color: '#a58a68', roughness: 0.92 }),
      )
      plazaFloor.rotation.x = -Math.PI / 2
      plazaFloor.position.set(x, 0.035, z)
      plazaFloor.receiveShadow = true
      world.add(plazaFloor)
      cylinder(2.8, 3.4, 0.6, 12, [x, 0.3, z], mat.stone)
      cylinder(0.7, 1.15, 4.2, 12, [x, 2.7, z], mat.gold)
      const lotus = new THREE.Mesh(new THREE.OctahedronGeometry(1.25, 1), mat.gold)
      lotus.position.set(x, 5.35, z)
      lotus.rotation.y = Math.PI / 4
      world.add(lotus)
      makeSiteSign(plaza, 2.2, z + 16)
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2
        const px = x + Math.cos(angle) * 12
        const pz = z + Math.sin(angle) * 12
        const seatId = nextBenchSeatId++
        cylinder(0.34, 0.48, 0.55, 10, [px, 0.28, pz], mat.stone)
        box([2.2, 0.2, 0.65], [px, 0.72, pz], mat.wood).rotation.y = -angle
        colliders.push({ x: px, z: pz, r: 1.25, seatIds: [seatId] })
        worldSeats.push({
          id: seatId,
          x: px - Math.cos(angle) * 0.35,
          z: pz - Math.sin(angle) * 0.35,
          heading: Math.atan2(-Math.cos(angle), -Math.sin(angle)),
          kind: 'bench',
        })
      }
      const flagAngle = Math.atan2(10, 16)
      for (const side of [-1, 1])
        cylinder(0.14, 0.18, 7, 10, [x + side * 8, 3.5, z + side * 5], mat.redDark)
      colliders.push({ x: x - 8, z: z - 5, r: 0.42 }, { x: x + 8, z: z + 5, r: 0.42 })
      const flagRope = cylinder(0.025, 0.025, Math.hypot(16, 10), 6, [x, 6.55, z], mat.wood)
      flagRope.rotation.z = Math.PI / 2
      flagRope.rotation.y = -flagAngle
      const flagMaterials = [
        std('#b8262e', { side: THREE.DoubleSide }),
        std('#e2b33c', { side: THREE.DoubleSide }),
      ]
      for (let i = 0; i < 7; i++) {
        const t = (i + 1) / 8
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.72), flagMaterials[i % 2])
        flag.position.set(x - 8 + t * 16, 6.35 - Math.sin(t * Math.PI) * 0.55, z - 5 + t * 10)
        flag.rotation.y = -flagAngle
        world.add(flag)
      }
      colliders.push({ x, z, r: 3.5 })
    }
    // The row nearest the hall was removed to make room for the cushion rows.
    for (const z of [13, 4.5]) {
      lotusLamp(-5.2, z)
      lotusLamp(5.2, z)
    }

    // Bonsai on pedestals.
    const blossom = {
      green: mat.leaf,
      yellow: std('#e9c445', { flatShading: true }),
      pink: std('#eaa5bb', { flatShading: true }),
    }
    function bonsai(x: number, z: number, foliage: THREE.Material) {
      const group = new THREE.Group()
      group.position.set(x, 0, z)
      cylinder(0.5, 0.6, 1.1, 8, [0, 0.55, 0], mat.stone, group)
      cylinder(0.6, 0.42, 0.45, 16, [0, 1.32, 0], mat.pot, group)
      cylinder(0.05, 0.09, 0.9, 6, [0, 1.9, 0], mat.bark, group)
      for (const [dx, dy, s] of [
        [0, 2.45, 0.55],
        [-0.35, 2.15, 0.38],
        [0.38, 2.25, 0.4],
      ]) {
        const clump = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), foliage)
        clump.scale.y = 0.7
        clump.position.set(dx, dy, 0)
        clump.castShadow = true
        group.add(clump)
      }
      world.add(group)
      colliders.push({ x, z, r: 0.8 })
    }
    bonsai(-4.3, 1.5, blossom.green)
    bonsai(4.3, 1.5, blossom.yellow)
    bonsai(-4.6, 8.8, blossom.pink)
    bonsai(4.6, 8.8, blossom.green)

    // Twenty-four numbered meditation cushions (bồ đoàn) in front of the main hall.
    const cushionMaterial = std('#8b3a2a', { roughness: 0.75 })
    const cushionTop = std('#c9a24a', { roughness: 0.5 })
    for (const seat of SEATS) {
      cylinder(0.5, 0.55, 0.18, 20, [seat.x, 0.09, seat.z], cushionMaterial)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 6, 24), cushionTop)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(seat.x, 0.185, seat.z)
      world.add(ring)
      worldSeats.push({
        id: seat.no,
        x: seat.x,
        z: seat.z,
        heading: Math.PI,
        kind: 'cushion',
      })
    }

    // Banyan tree with aerial roots and prayer ribbons.
    {
      const group = new THREE.Group()
      group.position.set(-17, 0, 3)
      cylinder(5, 5.3, 0.7, 24, [0, 0.35, 0], mat.stone, group)
      cylinder(1.3, 2.1, 8, 10, [0, 4.4, 0], mat.trunk, group)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + 0.4
        const limb = cylinder(0.35, 0.6, 5, 7, [0, 0, 0], mat.trunk, group)
        limb.position.set(Math.cos(angle) * 1.6, 6.5, Math.sin(angle) * 1.6)
        limb.rotation.set(Math.sin(angle) * 0.7, 0, -Math.cos(angle) * 0.7)
        const root = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 6), mat.trunk)
        root.position.set(Math.cos(angle) * 1.8, 1.5, Math.sin(angle) * 1.8)
        root.rotation.set(Math.sin(angle) * 0.5, 0, -Math.cos(angle) * 0.5)
        group.add(root)
      }
      const leaves = [mat.leafDark, mat.leaf, mat.leafLight]
      for (let i = 0; i < 26; i++) {
        const angle = rand() * Math.PI * 2
        const radius = rand() * 7.5
        const crown = new THREE.Mesh(
          new THREE.IcosahedronGeometry(2.4 + rand() * 1.8, 1),
          leaves[i % 3],
        )
        crown.position.set(
          Math.cos(angle) * radius,
          9.5 + rand() * 3 - radius * 0.2,
          Math.sin(angle) * radius,
        )
        crown.scale.y = 0.7
        crown.castShadow = true
        group.add(crown)
      }
      for (let i = 0; i < 34; i++) {
        const angle = rand() * Math.PI * 2
        const radius = 2 + rand() * 6
        const length = 3 + rand() * 4
        cylinder(
          0.04,
          0.05,
          length,
          4,
          [Math.cos(angle) * radius, 8.2 - length / 2, Math.sin(angle) * radius],
          mat.bark,
          group,
        )
      }
      for (let i = 0; i < 12; i++) {
        const angle = rand() * Math.PI * 2
        const radius = 2.4 + rand() * 3.5
        const ribbon = new THREE.Mesh(
          new THREE.PlaneGeometry(0.16, 1.2 + rand() * 0.6),
          i % 4 === 0 ? std('#e7b23c', { side: THREE.DoubleSide }) : mat.ribbon,
        )
        ribbon.position.set(Math.cos(angle) * radius, 5.4 + rand() * 1.4, Math.sin(angle) * radius)
        ribbon.rotation.y = rand() * Math.PI
        group.add(ribbon)
      }
      world.add(group)
      colliders.push({ x: -17, z: 3, r: 5.6 })
    }

    // Bell tower and drum.
    const bellPivot = new THREE.Group()
    {
      const group = new THREE.Group()
      group.position.set(17, 0, -3)
      box([7.2, 0.6, 7.2], [0, 0.3, 0], mat.stone, group)
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          cylinder(0.26, 0.3, 5, 12, [sx * 2.5, 3.1, sz * 2.5], mat.red, group)
      box([5.6, 0.35, 0.35], [0, 5.3, 0], mat.redDark, group)
      const bell = new THREE.Mesh(
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0.001, 0),
            new THREE.Vector2(0.95, 0),
            new THREE.Vector2(0.88, 0.2),
            new THREE.Vector2(0.72, 1.0),
            new THREE.Vector2(0.62, 1.55),
            new THREE.Vector2(0.48, 1.8),
            new THREE.Vector2(0.001, 1.88),
          ],
          28,
        ),
        std('#c99a35', { metalness: 0.7, roughness: 0.32 }),
      )
      bell.position.y = -1.9
      bell.castShadow = true
      bellPivot.position.y = 5.0
      bellPivot.add(bell)
      group.add(bellPivot)
      world.add(group)
      hipRoof(8.6, 8.6, 1.5, 0.75, [17, 5.5, -3])
      box([3, 1.3, 3], [17, 7.4, -3], mat.redDark)
      hipRoof(5.6, 5.6, 1.5, 0.6, [17, 8.0, -3])
      const drum = new THREE.Group()
      drum.position.set(12.4, 0, -1)
      cylinder(0.08, 0.08, 1.2, 6, [-0.8, 0.6, 0], mat.wood, drum)
      cylinder(0.08, 0.08, 1.2, 6, [0.8, 0.6, 0], mat.wood, drum)
      const shell = cylinder(
        1.1,
        1.1,
        0.9,
        28,
        [0, 1.6, 0],
        std('#b8281d', { roughness: 0.5 }),
        drum,
      )
      shell.rotation.x = Math.PI / 2
      const drumSkin = cylinder(1.02, 1.02, 0.92, 28, [0, 1.6, 0], std('#ecc988'), drum)
      drumSkin.rotation.x = Math.PI / 2
      world.add(drum)
      colliders.push({ x: 17, z: -3, r: 4.6 }, { x: 12.4, z: -1, r: 1.4 })
    }

    // Compound walls.
    // Side walls have openings aligned with the east/west inter-temple path.
    const wallSegments: [number, number, number, number][] = [
      [0, -27, 56, 0.6],
      [-28, -9, 0.6, 36],
      [28, -9, 0.6, 36],
      [-28, 25, 0.6, 12],
      [28, 25, 0.6, 12],
    ]
    for (const [x, z, w, d] of wallSegments) {
      box([w, 2, d], [x, 1, z], mat.wall)
      box([w + 0.3, 0.3, d + 0.3], [x, 2.1, z], mat.wallCap)
      addRectCollider(x, z, w, d)
    }

    // Trees inside and outside the walls.
    function roundTree(x: number, z: number, scale: number) {
      const group = new THREE.Group()
      group.position.set(x, 0, z)
      cylinder(0.25 * scale, 0.4 * scale, 3.6 * scale, 7, [0, 1.8 * scale, 0], mat.trunk, group)
      const leaves = [mat.leafDark, mat.leaf, mat.leafLight]
      for (let i = 0; i < 4; i++) {
        const crown = new THREE.Mesh(
          new THREE.IcosahedronGeometry((1.6 + rand() * 0.8) * scale, 1),
          leaves[Math.floor(rand() * 3)],
        )
        crown.position.set(
          (rand() - 0.5) * 2 * scale,
          (4 + rand() * 1.6) * scale,
          (rand() - 0.5) * 2 * scale,
        )
        crown.castShadow = true
        group.add(crown)
      }
      world.add(group)
      colliders.push({ x, z, r: Math.max(0.75, 1.15 * scale) })
    }
    function palm(x: number, z: number, height: number) {
      const group = new THREE.Group()
      group.position.set(x, 0, z)
      cylinder(0.16, 0.24, height, 7, [0, height / 2, 0], mat.bark, group)
      for (let i = 0; i < 8; i++) {
        const pivot = new THREE.Group()
        pivot.position.y = height
        pivot.rotation.y = (i / 8) * Math.PI * 2
        const frond = new THREE.Mesh(
          new THREE.PlaneGeometry(0.7, 3.2),
          std('#4f8a3a', { side: THREE.DoubleSide, flatShading: true }),
        )
        frond.position.set(0, 0, 1.4)
        frond.rotation.x = Math.PI / 2 + 0.45
        frond.castShadow = true
        pivot.add(frond)
        group.add(pivot)
      }
      world.add(group)
      colliders.push({ x, z, r: 0.65 })
    }
    for (const [x, z, s] of [
      [-24.5, -23.5, 1.2],
      [24.5, -23.5, 1.3],
      [-24, 18, 1.1],
      [24, 16, 1.2],
      [-10, -24, 0.9],
      [11, -24, 1],
    ] as const)
      roundTree(x, z, s)
    for (const [x, z, h] of [
      [-12, -22, 9],
      [13, -21, 10],
      [24, -10, 8],
      [-25, -8, 9],
      [9, -25, 11],
    ] as const)
      palm(x, z, h)
    for (let i = 0; i < 46; i++) {
      const angle = Math.PI * (0.05 + rand() * 0.9)
      const radius = 36 + rand() * 30
      roundTree(Math.cos(angle) * radius * 1.3, -Math.sin(angle) * radius + 6, 1.3 + rand() * 1.2)
    }

    // Fill the land between compounds with distinct gardens and rest areas.
    // These low-cost layers keep every travel route visually populated without
    // repeating another main hall or turning the open world into a maze.
    const groundPatch = (x: number, z: number, radius: number, color: string, squash = 1) => {
      const patch = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 32),
        std(color, { roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }),
      )
      patch.rotation.x = -Math.PI / 2
      patch.scale.y = squash
      patch.position.set(x, 0.012, z)
      patch.receiveShadow = true
      world.add(patch)
    }
    for (const [x, z, radius, color, squash] of [
      [-39, 42, 19, '#76965b', 0.65],
      [39, 42, 18, '#89a765', 0.7],
      [-38, 72, 18, '#738e56', 0.75],
      [38, 72, 19, '#91a968', 0.7],
      [-54, 42, 16, '#8ca764', 0.62],
      [54, 42, 15, '#718c55', 0.7],
      [-35, -13, 13, '#91a967', 0.7],
      [35, -13, 13, '#759157', 0.7],
    ] as const)
      groundPatch(x, z, radius, color, squash)

    function gardenLantern(x: number, z: number, rotation = 0) {
      const group = new THREE.Group()
      group.position.set(x, 0, z)
      group.rotation.y = rotation
      cylinder(0.42, 0.56, 0.28, 8, [0, 0.14, 0], mat.darkStone, group)
      cylinder(0.14, 0.2, 1.75, 8, [0, 1.1, 0], mat.lampStone, group)
      box([0.8, 0.72, 0.8], [0, 2.05, 0], lampMaterial, group)
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.42, 4), mat.darkStone)
      cap.position.y = 2.62
      cap.rotation.y = Math.PI / 4
      group.add(cap)
      world.add(group)
      colliders.push({ x, z, r: 0.62 })
    }
    for (let z = 24; z <= 92; z += 11) {
      gardenLantern(-6.4, z)
      gardenLantern(6.4, z, Math.PI)
    }
    for (let x = -50; x <= 50; x += 10) {
      if (Math.abs(x) < 8) continue
      gardenLantern(x, 8.2, Math.PI / 2)
      gardenLantern(x, 19.8, -Math.PI / 2)
    }

    function restPavilion(x: number, z: number, accent: THREE.Material) {
      groundPatch(x, z, 7.2, '#9e957d', 0.82)
      cylinder(4.8, 5.2, 0.42, 12, [x, 0.21, z], mat.stone)
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          cylinder(0.2, 0.23, 3.8, 10, [x + sx * 2.7, 2.25, z + sz * 2.2], accent)
          colliders.push({ x: x + sx * 2.7, z: z + sz * 2.2, r: 0.46 })
        }
      hipRoof(8.8, 7.8, 1.55, 0.62, [x, 4.2, z], true)
      for (const side of [-1, 1]) {
        const seatIds = [nextBenchSeatId++, nextBenchSeatId++]
        const bench = box([3.2, 0.28, 0.8], [x, 0.78, z + side * 2.1], mat.wood)
        bench.rotation.y = 0
        colliders.push({ x, z: z + side * 2.1, r: 1.7, seatIds })
        seatIds.forEach((id, index) => {
          worldSeats.push({
            id,
            x: x + (index === 0 ? -0.82 : 0.82),
            z: z + side * 2.1,
            heading: side > 0 ? Math.PI : 0,
            kind: 'bench',
          })
        })
      }
    }
    restPavilion(-34, 35, mat.red)
    restPavilion(34, 35, mat.redDark)
    restPavilion(-34, 68, mat.wood)
    restPavilion(34, 68, mat.red)

    function landscapePond(x: number, z: number, radius: number) {
      const bank = new THREE.Mesh(new THREE.CircleGeometry(radius + 1.4, 40), mat.stone)
      bank.rotation.x = -Math.PI / 2
      bank.scale.y = 0.62
      bank.position.set(x, 0.035, z)
      world.add(bank)
      const water = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 40),
        std('#438b9a', { metalness: 0.1, roughness: 0.22 }),
      )
      water.rotation.x = -Math.PI / 2
      water.scale.y = 0.62
      water.position.set(x, 0.075, z)
      world.add(water)
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2
        const distance = radius * (0.3 + (i % 4) * 0.15)
        const pad = new THREE.Mesh(new THREE.CircleGeometry(0.25 + (i % 3) * 0.12, 12), mat.leaf)
        pad.rotation.x = -Math.PI / 2
        pad.position.set(
          x + Math.cos(angle) * distance,
          0.11,
          z + Math.sin(angle) * distance * 0.62,
        )
        world.add(pad)
      }
      for (const side of [-1, 1]) {
        for (let i = -2; i <= 2; i++) {
          const reedX = x + side * (radius - 0.4)
          const reedZ = z + i * 0.8
          cylinder(0.025, 0.035, 1.5 + (i % 2) * 0.25, 5, [reedX, 0.78, reedZ], mat.leafDark)
        }
      }
    }
    landscapePond(-51, 51, 8)
    landscapePond(51, 51, 7.4)

    // Perimeter woodland and inner groves hide the flat world edge and provide
    // a continuous foreground/background layer from every temple.
    for (let z = -18; z <= 98; z += 8) {
      roundTree(-77 + rand() * 5, z + rand() * 3, 0.85 + rand() * 0.45)
      roundTree(77 - rand() * 5, z + rand() * 3, 0.85 + rand() * 0.45)
    }
    for (let x = -68; x <= 68; x += 8) {
      roundTree(x + rand() * 3, 98 - rand() * 5, 0.9 + rand() * 0.5)
    }
    for (const [cx, cz] of [
      [-54, 30],
      [54, 30],
      [-18, 52],
      [18, 52],
      [-58, 74],
      [58, 74],
    ] as const) {
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2
        roundTree(
          cx + Math.cos(angle) * (5 + rand() * 4),
          cz + Math.sin(angle) * (4 + rand() * 3),
          0.65 + rand() * 0.35,
        )
      }
    }

    // Instanced flowers, shrubs and rocks add close-range detail with only
    // three draw calls. Keep paths and temple compounds clear for walking.
    const isOpenGarden = (x: number, z: number) => {
      if (Math.abs(x) < 8 || Math.abs(z - 14) < 7) return false
      if (
        TEMPLE_SITES.some(
          (site) => Math.abs(x - site.center[0]) < 25 && Math.abs(z - site.center[1]) < 24,
        )
      )
        return false
      return true
    }
    const flowerCount = 460
    const flowerMesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.13, 0),
      std('#ffffff', { roughness: 0.75 }),
      flowerCount,
    )
    const flowerColors = ['#f2cf5b', '#ef9daf', '#f4eee0', '#a8cce9', '#d99ad8']
    const flowerDummy = new THREE.Object3D()
    let flowersPlaced = 0
    let flowerAttempts = 0
    while (flowersPlaced < flowerCount && flowerAttempts++ < 5000) {
      const x = -72 + rand() * 144
      const z = -6 + rand() * 100
      if (!isOpenGarden(x, z)) continue
      const scale = 0.65 + rand() * 0.85
      flowerDummy.position.set(x, 0.22 + scale * 0.06, z)
      flowerDummy.rotation.set(rand() * 0.3, rand() * Math.PI, rand() * 0.3)
      flowerDummy.scale.setScalar(scale)
      flowerDummy.updateMatrix()
      flowerMesh.setMatrixAt(flowersPlaced, flowerDummy.matrix)
      flowerMesh.setColorAt(
        flowersPlaced,
        new THREE.Color(flowerColors[flowersPlaced % flowerColors.length]),
      )
      flowersPlaced++
    }
    flowerMesh.count = flowersPlaced
    flowerMesh.instanceMatrix.needsUpdate = true
    if (flowerMesh.instanceColor) flowerMesh.instanceColor.needsUpdate = true
    world.add(flowerMesh)

    const shrubCount = 150
    const shrubMesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.55, 1),
      mat.leaf,
      shrubCount,
    )
    const shrubDummy = new THREE.Object3D()
    let shrubsPlaced = 0
    let shrubAttempts = 0
    while (shrubsPlaced < shrubCount && shrubAttempts++ < 3000) {
      const x = -72 + rand() * 144
      const z = 22 + rand() * 72
      if (!isOpenGarden(x, z)) continue
      const scale = 0.55 + rand() * 0.75
      shrubDummy.position.set(x, scale * 0.45, z)
      shrubDummy.rotation.y = rand() * Math.PI
      shrubDummy.scale.set(scale, scale * 0.72, scale)
      shrubDummy.updateMatrix()
      shrubMesh.setMatrixAt(shrubsPlaced++, shrubDummy.matrix)
    }
    shrubMesh.count = shrubsPlaced
    shrubMesh.instanceMatrix.needsUpdate = true
    shrubMesh.castShadow = true
    world.add(shrubMesh)

    const rockCount = 54
    const rockMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.75, 0),
      mat.darkStone,
      rockCount,
    )
    const rockDummy = new THREE.Object3D()
    for (let i = 0; i < rockCount; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const x = side * (20 + rand() * 48)
      const z = 24 + rand() * 70
      const scale = 0.45 + rand() * 0.9
      rockDummy.position.set(x, scale * 0.35, z)
      rockDummy.rotation.set(rand(), rand() * Math.PI, rand() * 0.4)
      rockDummy.scale.set(scale, scale * (0.55 + rand() * 0.3), scale)
      rockDummy.updateMatrix()
      rockMesh.setMatrixAt(i, rockDummy.matrix)
      colliders.push({ x, z, r: Math.max(0.45, scale * 0.65) })
    }
    rockMesh.instanceMatrix.needsUpdate = true
    rockMesh.castShadow = true
    rockMesh.receiveShadow = true
    world.add(rockMesh)

    // White stupa.
    cylinder(0.9, 1.1, 1.4, 12, [10, 0.7, -21.5], mat.wall)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 10), mat.wall)
    dome.position.set(10, 1.9, -21.5)
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.6, 10), mat.gold)
    spire.position.set(10, 3.2, -21.5)
    world.add(dome, spire)

    // A dense 360-degree scenic belt sits outside the playable bounds. It is
    // especially important beside the east/west temples, where looking away
    // from the central path previously exposed an empty grass horizon.
    const backdropTreeCount = 280
    const backdropTrunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.32, 0.52, 1, 7),
      mat.trunk,
      backdropTreeCount,
    )
    const backdropCrowns = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      std('#ffffff', { flatShading: true }),
      backdropTreeCount,
    )
    const backdropDummy = new THREE.Object3D()
    const backdropColors = ['#315f2d', '#3e7132', '#4c8138', '#5b8c40']
    for (let i = 0; i < backdropTreeCount; i++) {
      const verticalSide = i < 160
      const side = i % 2 === 0 ? -1 : 1
      const x = verticalSide ? side * (91 + rand() * 25) : -102 + rand() * 204
      const z = verticalSide ? -34 + rand() * 168 : side < 0 ? -38 - rand() * 18 : 112 + rand() * 24
      const height = 5.5 + rand() * 8
      backdropDummy.position.set(x, height / 2, z)
      backdropDummy.rotation.set(0, rand() * Math.PI, 0)
      backdropDummy.scale.set(0.8 + rand() * 0.7, height, 0.8 + rand() * 0.7)
      backdropDummy.updateMatrix()
      backdropTrunks.setMatrixAt(i, backdropDummy.matrix)

      const crownWidth = 2.5 + rand() * 2.8
      backdropDummy.position.set(
        x + (rand() - 0.5) * 1.8,
        height + crownWidth * 0.55,
        z + (rand() - 0.5) * 1.8,
      )
      backdropDummy.rotation.set(rand() * 0.25, rand() * Math.PI, rand() * 0.18)
      backdropDummy.scale.set(crownWidth, crownWidth * (0.75 + rand() * 0.25), crownWidth)
      backdropDummy.updateMatrix()
      backdropCrowns.setMatrixAt(i, backdropDummy.matrix)
      backdropCrowns.setColorAt(i, new THREE.Color(backdropColors[i % backdropColors.length]))
    }
    backdropTrunks.instanceMatrix.needsUpdate = true
    backdropCrowns.instanceMatrix.needsUpdate = true
    if (backdropCrowns.instanceColor) backdropCrowns.instanceColor.needsUpdate = true
    world.add(backdropTrunks, backdropCrowns)

    // Low wooded hills bridge the visual gap between the tree belt and the
    // distant mountains, preventing a straight, empty horizon line.
    const hillMaterials = [
      std('#668455', { flatShading: true }),
      std('#728e60', { flatShading: true }),
      std('#58754d', { flatShading: true }),
    ]
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2 + rand() * 0.12
      const radiusX = 118 + rand() * 22
      const radiusZ = 104 + rand() * 24
      const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), hillMaterials[i % 3])
      const width = 13 + rand() * 16
      hill.scale.set(width, 5 + rand() * 7, width * (0.7 + rand() * 0.35))
      hill.position.set(Math.cos(angle) * radiusX, 1.5, 38 + Math.sin(angle) * radiusZ)
      hill.rotation.y = rand() * Math.PI
      hill.receiveShadow = true
      world.add(hill)
    }

    // Distant hazy mountains and clouds now wrap the entire world, rather than
    // occupying only the original temple's rear hemisphere.
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2 + rand() * 0.08
      const radius = 164 + rand() * 28
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(22 + rand() * 27, 24 + rand() * 34, 6),
        mat.mountain,
      )
      mountain.position.set(Math.cos(angle) * radius, 8, 38 + Math.sin(angle) * radius)
      mountain.rotation.y = rand() * Math.PI
      world.add(mountain)
    }
    const cloudTexture = canvasTexture(128, 64, (ctx) => {
      for (const [x, y, r] of [
        [40, 38, 22],
        [64, 30, 28],
        [90, 38, 20],
        [62, 42, 24],
      ]) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, 'rgba(255,255,255,.95)')
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, 128, 64)
      }
    })
    for (let i = 0; i < 26; i++) {
      const cloud = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: cloudTexture,
          fog: false,
          transparent: true,
          depthWrite: false,
        }),
      )
      const angle = rand() * Math.PI * 2
      const radius = 130 + rand() * 70
      cloud.position.set(Math.cos(angle) * radius, 32 + rand() * 42, 38 + Math.sin(angle) * radius)
      cloud.scale.set(48 + rand() * 52, 22 + rand() * 14, 1)
      world.add(cloud)
    }

    // Fallen leaves scattered over the courtyard.
    const leafMesh = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.2, 5),
      std('#ffffff', { side: THREE.DoubleSide }),
      110,
    )
    const leafColors = ['#e08a2c', '#e9b13d', '#c8642a']
    const dummy = new THREE.Object3D()
    for (let i = 0; i < 110; i++) {
      dummy.position.set((rand() - 0.5) * 46, 0.05, -6 + rand() * 32)
      dummy.rotation.set(-Math.PI / 2, 0, rand() * Math.PI)
      dummy.scale.set(1 + rand(), 0.6 + rand() * 0.4, 1)
      dummy.updateMatrix()
      leafMesh.setMatrixAt(i, dummy.matrix)
      leafMesh.setColorAt(i, new THREE.Color(leafColors[i % 3]))
    }
    leafMesh.receiveShadow = true
    world.add(leafMesh)

    // Chibi monks.
    type CharacterRig = {
      group: THREE.Group
      body: THREE.Group
      head: THREE.Group
      leftArm: THREE.Group
      rightArm: THREE.Group
      leftLeg: THREE.Group
      rightLeg: THREE.Group
      robe: THREE.MeshStandardMaterial
      pose: Pose
      phase: number
    }
    const skin = std('#e2bb92', { roughness: 0.62 })
    const trim = std('#f3eee3')
    const pants = std('#e6e2da')
    const shoe = std('#5a3a26', { roughness: 0.6 })
    const eye = std('#2a1c18', { roughness: 0.3 })
    const blush = new THREE.MeshBasicMaterial({
      color: '#ef9a8a',
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: '#2b1a10',
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
    const robeGeometry = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.001, 0.32),
        new THREE.Vector2(0.47, 0.32),
        new THREE.Vector2(0.48, 0.38),
        new THREE.Vector2(0.43, 0.62),
        new THREE.Vector2(0.37, 0.92),
        new THREE.Vector2(0.34, 1.1),
        new THREE.Vector2(0.32, 1.24),
        new THREE.Vector2(0.26, 1.35),
        new THREE.Vector2(0.14, 1.41),
        new THREE.Vector2(0.001, 1.42),
      ],
      36,
    )
    const sleeveGeometry = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.001, -0.46),
        new THREE.Vector2(0.15, -0.46),
        new THREE.Vector2(0.145, -0.42),
        new THREE.Vector2(0.11, -0.18),
        new THREE.Vector2(0.09, 0.03),
        new THREE.Vector2(0.001, 0.06),
      ],
      20,
    )

    function character(
      x: number,
      z: number,
      color: string,
      pose: Pose,
      phase: number,
    ): CharacterRig {
      const group = new THREE.Group()
      const body = new THREE.Group()
      const robe = std(color, { roughness: 0.7, side: THREE.DoubleSide })
      const sash = std(new THREE.Color(color).multiplyScalar(0.6).getStyle())

      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 28), shadowMaterial)
      shadow.rotation.x = -Math.PI / 2
      shadow.position.y = pose === 'sit' ? 0.18 : 0.03
      group.add(shadow)

      const robeMesh = new THREE.Mesh(robeGeometry, robe)
      robeMesh.castShadow = true
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.02), trim)
      lapel.position.set(0.05, 1.2, 0.33)
      lapel.rotation.z = 0.5
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.95, 0.02), sash)
      strap.position.set(0, 0.98, -0.36)
      strap.rotation.set(-0.12, 0, 0.55)
      body.add(robeMesh, lapel, strap)

      const head = new THREE.Group()
      head.position.y = 1.36
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.56, 40, 30), skin)
      skull.position.y = 0.5
      skull.scale.set(1, 0.95, 1)
      skull.castShadow = true
      head.add(skull)
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), skin)
        ear.scale.set(0.45, 0.8, 0.6)
        ear.position.set(side * 0.55, 0.47, 0)
        const eyeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), eye)
        eyeMesh.scale.set(1, 1.3, 0.5)
        eyeMesh.position.set(side * 0.18, 0.52, 0.535)
        const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.08, 18), blush)
        cheek.scale.y = 0.6
        cheek.position.set(side * 0.33, 0.38, 0.46)
        cheek.rotation.y = side * 0.62
        head.add(ear, eyeMesh, cheek)
      }
      body.add(head)

      function arm(side: number) {
        const pivot = new THREE.Group()
        pivot.position.set(side * 0.3, 1.26, 0)
        const sleeve = new THREE.Mesh(sleeveGeometry, robe)
        sleeve.castShadow = true
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), skin)
        hand.position.y = -0.48
        pivot.add(sleeve, hand)
        body.add(pivot)
        return pivot
      }
      function leg(side: number) {
        const pivot = new THREE.Group()
        pivot.position.set(side * 0.15, 0.34, 0)
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.1, 0.26, 12), pants)
        shin.position.y = -0.15
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), shoe)
        foot.scale.set(0.9, 0.55, 1.3)
        foot.position.set(0, -0.28, 0.05)
        foot.castShadow = true
        pivot.add(shin, foot)
        group.add(pivot)
        return pivot
      }

      const leftArm = arm(-1)
      const rightArm = arm(1)
      const leftLeg = leg(-1)
      const rightLeg = leg(1)
      group.add(body)
      if (pose === 'sit') {
        leftLeg.visible = rightLeg.visible = false
        body.position.y = -0.14
      }
      group.position.set(x, 0, z)
      world.add(group)
      return {
        group,
        body,
        head,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        robe,
        pose,
        phase,
      }
    }

    type Wanderer = {
      id: string
      name: string
      rig: CharacterRig
      points: THREE.Vector2[]
      point: number
      wait: number
      speed: number
      mode: 'walking' | 'going-to-seat' | 'sitting'
      targetSeatId: number | null
      occupiedSeatId: number | null
    }
    const wanderers: Wanderer[] = []
    const worldTourPoints: [number, number][] = [
      [0, 14],
      [-30, 14],
      [-62, 14],
      [-42, 14],
      [-20, 14],
      [0, 14],
      [30, 14],
      [62, 14],
      [42, 14],
      [20, 14],
      [0, 28],
      [-34, 35],
      [0, 36],
      [34, 35],
      [0, 48],
      [-34, 68],
      [0, 70],
      [34, 68],
      [0, 84],
      [0, 70],
      [0, 48],
      [0, 36],
    ]
    let nextWandererIdx = 0
    const addWanderer = (rig: CharacterRig, points: [number, number][], offset = 0, name?: string) => {
      const tour = offset % 2 === 0 ? worldTourPoints : [...worldTourPoints].reverse()
      const itinerary = [...points, ...tour].map(([x, z]) => new THREE.Vector2(x, z))
      const nearestPoint = itinerary.reduce(
        (nearest, point, index) => {
          const distance = point.distanceToSquared(
            new THREE.Vector2(rig.group.position.x, rig.group.position.z),
          )
          return distance < nearest.distance ? { index, distance } : nearest
        },
        { index: 0, distance: Number.POSITIVE_INFINITY },
      ).index
      nextWandererIdx++
      wanderers.push({
        id: `npc-wanderer-${nextWandererIdx}`,
        name: name || `Thiện hữu ${nextWandererIdx}`,
        rig,
        points: itinerary,
        point: (nearestPoint + offset) % itinerary.length,
        wait: rand() * 2,
        speed: 0.9 + rand() * 0.65,
        mode: 'walking',
        targetSeatId: null,
        occupiedSeatId: null,
      })
    }

    const player = character(0, 17, ROBE_COLORS[themeRef.current] ?? ROBE_COLORS.xanh, 'stand', 0)
    const rigs = [player]
    RESIDENTS.forEach((resident, index) => {
      const rig = character(
        resident.x,
        resident.z,
        resident.color,
        resident.pose,
        index * 1.3 + 0.7,
      )
      rig.group.lookAt(resident.face[0], 0, resident.face[1])
      rigs.push(rig)
      if (resident.pose === 'stand') {
        const route =
          index === 0
            ? ([
                [1, 14],
                [0, 22],
                [0, 14],
                [-18, 14],
                [-32, 14],
                [-18, 14],
              ] as [number, number][])
            : index === 1
              ? ([
                  [-2, 13],
                  [0, 14],
                  [20, 14],
                  [38, 14],
                  [20, 14],
                  [0, 14],
                ] as [number, number][])
              : ([
                  [13, 6],
                  [20, 14],
                  [40, 14],
                  [20, 14],
                  [10, 10],
                ] as [number, number][])
        addWanderer(rig, route, index)
      }
    })

    // Populate every temple and the central plaza so distant areas feel as
    // inhabited as Yên Phúc. Seated visitors align with the shared cushion rows.
    const crowdColors = ['#77838a', '#9a6648', '#c08a35', '#4976ad', '#8c5260', '#e6e0d4']
    let crowdPhase = RESIDENTS.length + 1
    for (const site of TEMPLE_SITES.filter((item) => item.kind === 'temple' && item.id !== 1)) {
      const [x, z] = site.center
      const offsets: [number, number, Pose][] = [
        [-10.1, 9, 'sit'],
        [10.1, 9, 'sit'],
        [-5.4, 12.15, 'sit'],
        [-6.8, 18.2, 'stand'],
        [6.8, 18.2, 'stand'],
      ]
      offsets.forEach(([dx, dz, pose], index) => {
        const rig = character(
          x + dx,
          z + dz,
          crowdColors[(site.id * 2 + index) % crowdColors.length],
          pose,
          crowdPhase++ * 0.73,
        )
        rig.group.lookAt(x, 0, z - 4)
        rigs.push(rig)
        if (pose === 'stand') {
          const path: [number, number][] =
            site.id === 4
              ? index === 4
                ? [
                    [x + dx, z + dz],
                    [0, 84],
                    [0, 58],
                    [0, 36],
                    [0, 14],
                    [0, 2],
                    [0, 14],
                    [0, 36],
                    [0, 58],
                    [0, 84],
                  ]
                : [
                    [x + dx, z + dz],
                    [x, z + 14],
                    [0, 58],
                    [0, 46],
                    [0, 36],
                    [0, 46],
                    [0, 58],
                    [x, z + 14],
                  ]
              : index === 4
                ? [
                    [x + dx, z + dz],
                    [x, z + 14],
                    [x / 2, 14],
                    [0, 14],
                    [-x / 2, 14],
                    [-x, 14],
                    [-x / 2, 14],
                    [0, 14],
                    [x / 2, 14],
                    [x, z + 14],
                  ]
                : [
                    [x + dx, z + dz],
                    [x, z + 14],
                    [x / 2, 14],
                    [0, 14],
                    [0, 28],
                    [0, 36],
                    [0, 28],
                    [0, 14],
                    [x / 2, 14],
                    [x, z + 14],
                  ]
          addWanderer(rig, path, index)
        }
      })
    }
    {
      const [x, z] = templeSiteById(5).center
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + 0.3
        const radius = i % 2 ? 9 : 13
        const px = x + Math.cos(angle) * radius
        const pz = z + Math.sin(angle) * radius
        const rig = character(
          px,
          pz,
          crowdColors[(i + 2) % crowdColors.length],
          'stand',
          crowdPhase++ * 0.73,
        )
        rig.group.lookAt(x, 0, z)
        rigs.push(rig)
        const loop: [number, number][] = Array.from({ length: 10 }, (_, point) => {
          const loopAngle = (point / 10) * Math.PI * 2
          return [x + Math.cos(loopAngle) * 14, z + Math.sin(loopAngle) * 14]
        })
        addWanderer(rig, loop, i)
      }
    }
    const activeWanderingRigs = new Set<CharacterRig>()
    robeRef.current = (color) => player.robe.color.set(color)

    // Incense smoke drifting up from the altar urn.
    const smokeTexture = canvasTexture(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0, 'rgba(255,255,255,.75)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 64, 64)
    })
    const smoke = Array.from({ length: 28 }, (_, i) => {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: smokeTexture,
          color: '#ece7de',
          transparent: true,
          depthWrite: false,
          opacity: 0,
        }),
      )
      sprite.userData.offset = i / 28
      world.add(sprite)
      return sprite
    })
    let incenseUntil = 0
    const incenseSource = new THREE.Vector2(0, -6.4)
    let bellStart = -100
    let activeBellSite = 1

    // Player behaviour: free walking, scripted routes, sitting and rituals.
    type Action = { kind: 'offer' | 'bow'; start: number; duration: number; done?: () => void }
    let route: THREE.Vector2[] = []
    let onArrive: (() => void) | null = null
    let action: Action | null = null
    let seated: number | null = null
    let targetSeatId: number | null = null
    let lastSiteCheck = 0
    let lastReportedSiteId = siteId
    const laneZ = SEAT_LANE_Z
    const nearestTemple = () =>
      TEMPLE_SITES.filter((site) => site.kind === 'temple').reduce((nearest, site) => {
        const nearestDistance = Math.hypot(
          player.group.position.x - nearest.center[0],
          player.group.position.z - nearest.center[1],
        )
        const siteDistance = Math.hypot(
          player.group.position.x - site.center[0],
          player.group.position.z - site.center[1],
        )
        return siteDistance < nearestDistance ? site : nearest
      })

    const setSeated = (seat: number | null) => {
      if (seat === null) {
        targetSeatId = null
        player.group.position.y = 0
      }
      if (seated === seat) return
      seated = seat
      player.pose = seat === null ? 'stand' : 'sit'
      const displaySeat = seat !== null && seat >= 100 && seat < 500 ? ((seat - 1) % 100) + 1 : seat
      seatCallbackRef.current?.(displaySeat)
    }
    // Walk via the central path and the lane in front of the cushions so the
    // player never cuts through lamps, bonsai or seated practitioners.
    const planRoute = (targetX: number, targetZ: number, viaAisle: boolean) => {
      const p = player.group.position
      const v = (x: number, z: number) => new THREE.Vector2(x, z)
      const points: THREE.Vector2[] = []
      if (p.z < laneZ - 0.4 && Math.abs(p.x) > 3.2) {
        // Leave the cushion block through the nearest aisle.
        const aisle = p.x - Math.sign(p.x) * SEAT_AISLE
        points.push(v(aisle, p.z), v(aisle, laneZ))
      } else if (p.z < laneZ) {
        points.push(v(p.x, laneZ))
      } else {
        if (Math.abs(p.x) > 2.5) points.push(v(0, p.z))
        points.push(v(0, laneZ))
      }
      if (viaAisle) {
        const aisle = targetX - Math.sign(targetX) * SEAT_AISLE
        points.push(v(aisle, laneZ), v(aisle, targetZ))
      } else {
        points.push(v(targetX, laneZ))
      }
      points.push(v(targetX, targetZ))
      return points
    }
    const sitAt = (seat: ManagedSeat) => {
      if (seated === seat.id) return true
      if (!seatManager.reserve(seat.id, 'player', 'player')) return false
      action = null
      if (seated !== null) {
        seatManager.release(seated, 'player')
        setSeated(null)
      }
      targetSeatId = seat.id
      const site = nearestTemple()
      route =
        site.id === 1 && seat.id < 100
          ? planRoute(seat.x, seat.z, true)
          : [new THREE.Vector2(seat.x, seat.z)]
      onArrive = () => {
        seatManager.occupy(seat.id, 'player', 'player')
        player.group.position.set(seat.x, seat.type === 'bench' ? 0.68 : 0, seat.z)
        heading = seat.heading
        player.group.rotation.y = seat.heading
        player.pose = 'sit'
        targetSeatId = null
        setSeated(seat.id)
      }
      return true
    }
    const isOccupied = (seatId: number) => !seatManager.isAvailable(seatId, 'player')
    const sit = (seatNo: number) => {
      const site = nearestTemple()
      const seatId =
        seatNo >= 500
          ? seatNo
          : seatNo <= SEATS.length && site.id !== 1
            ? site.id * 100 + seatNo
            : seatNo
      const seat = seatManager.getSeat(seatId)
      if (seat && !isOccupied(seat.id)) return sitAt(seat)
      return false
    }
    const sitNearest = () => {
      const seat = seatManager.getNearestAvailable(
        player.group.position.x,
        player.group.position.z,
        10,
        'player',
      )
      if (!seat) return false
      return sitAt(seat)
    }
    const hasNearestSeat = () => {
      const seat = seatManager.getNearestAvailable(
        player.group.position.x,
        player.group.position.z,
        10,
        'player',
      )
      return Boolean(seat)
    }
    const api: SceneApi = {
      sit,
      sitNearest,
      hasNearestSeat,
      stand: () => {
        if (targetSeatId !== null) {
          seatManager.release(targetSeatId, 'player')
          targetSeatId = null
        }
        route = []
        onArrive = null
        action = null
        if (seated !== null) {
          seatManager.release(seated, 'player')
          player.group.position.x += Math.sin(heading) * 0.75
          player.group.position.z += Math.cos(heading) * 0.75
          player.group.position.y = 0
          player.pose = 'stand'
          setSeated(null)
        }
      },
      offerIncense: (onOffered) => {
        const returnSeat = seated
        const site = nearestTemple()
        const targetX = site.center[0]
        const targetZ = site.id === 1 ? -5 : site.center[1] + 6.35
        action = null
        setSeated(null)
        route =
          site.id === 1 ? planRoute(targetX, targetZ, false) : [new THREE.Vector2(targetX, targetZ)]
        onArrive = () => {
          heading = Math.PI
          action = {
            kind: 'offer',
            start: clock.elapsedTime,
            duration: 2.8,
            done: () => {
              incenseUntil = clock.elapsedTime + 25
              incenseSource.set(site.center[0], site.id === 1 ? -6.4 : site.center[1] + 5)
              onOffered()
              if (returnSeat !== null) sit(returnSeat)
            },
          }
        }
      },
      bow: () => {
        if (route.length) return
        action = { kind: 'bow', start: clock.elapsedTime, duration: 2.6 }
      },
      ringBell: () => {
        activeBellSite = nearestTemple().id
        bellStart = clock.elapsedTime
      },
      travelTo: (siteId) => {
        const site = templeSiteById(siteId)
        if (targetSeatId !== null) {
          seatManager.release(targetSeatId, 'player')
          targetSeatId = null
        }
        if (seated !== null) {
          seatManager.release(seated, 'player')
        }
        route = []
        onArrive = null
        action = null
        setSeated(null)
        player.group.position.set(site.spawn[0], 0, site.spawn[1])
        player.group.position.y = 0
        player.pose = 'stand'
        heading = Math.PI
        firstFrame = true
      },
      setMove: (x, y) => {
        stick.x = x
        stick.y = y
      },
    }
    if (apiHolderRef.current) apiHolderRef.current.current = api

    // Controls.
    const keys = new Set<string>()
    const stick = { x: 0, y: 0 }
    let yaw = 0
    let pitch = 0
    let distance = 9
    let heading = Math.PI
    let dragging = false
    let previousX = 0
    let previousY = 0
    resetViewRef.current = () => {
      yaw = 0
      pitch = 0
    }

    const typing = (event: KeyboardEvent) =>
      event.target instanceof HTMLElement && event.target.closest('input, textarea, select')
    const onKeyDown = (event: KeyboardEvent) => {
      if (!typing(event)) keys.add(event.key.toLowerCase())
    }
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase())
    const onBlur = () => keys.clear()
    const onPointerDown = (event: PointerEvent) => {
      dragging = true
      previousX = event.clientX
      previousY = event.clientY
      renderer.domElement.setPointerCapture(event.pointerId)
      renderer.domElement.classList.add('is-dragging')
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return
      yaw -= (event.clientX - previousX) * 0.005
      pitch = THREE.MathUtils.clamp(pitch + (event.clientY - previousY) * 0.003, -0.35, 0.5)
      previousX = event.clientX
      previousY = event.clientY
    }
    const onPointerUp = () => {
      dragging = false
      renderer.domElement.classList.remove('is-dragging')
    }
    const onWheel = (event: WheelEvent) => {
      distance = THREE.MathUtils.clamp(distance + event.deltaY * 0.006, 5, 14)
    }
    const onResize = () => {
      fitLens()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('resize', onResize)
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true })

    const cameraTarget = new THREE.Vector3()
    const desiredCamera = new THREE.Vector3()
    const projected = new THREE.Vector3()
    const clock = new THREE.Clock()
    let frame = 0
    let firstFrame = true

    const animate = () => {
      frame = requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), 0.1)
      const elapsed = clock.elapsedTime
      const forwardX = -Math.sin(yaw)
      const forwardZ = -Math.cos(yaw)
      let moveX = 0
      let moveZ = 0
      if (keys.has('w') || keys.has('arrowup')) {
        moveX += forwardX
        moveZ += forwardZ
      }
      if (keys.has('s') || keys.has('arrowdown')) {
        moveX -= forwardX
        moveZ -= forwardZ
      }
      if (keys.has('a') || keys.has('arrowleft')) {
        moveX += forwardZ
        moveZ -= forwardX
      }
      if (keys.has('d') || keys.has('arrowright')) {
        moveX -= forwardZ
        moveZ += forwardX
      }
      if (Math.hypot(stick.x, stick.y) > 0.15) {
        moveX += forwardX * stick.y - forwardZ * stick.x
        moveZ += forwardZ * stick.y + forwardX * stick.x
      }
      const manual = moveX !== 0 || moveZ !== 0
      const position = player.group.position
      if (manual && (route.length || action || seated !== null)) {
        if (targetSeatId !== null) {
          seatManager.release(targetSeatId, 'player')
          targetSeatId = null
        }
        if (seated !== null) {
          seatManager.release(seated, 'player')
          player.group.position.x += Math.sin(heading) * 0.75
          player.group.position.z += Math.cos(heading) * 0.75
          player.group.position.y = 0
          player.pose = 'stand'
        }
        route = []
        onArrive = null
        action = null
        setSeated(null)
      }
      if (!manual && route.length) {
        const target = route[0]
        const dx = target.x - position.x
        const dz = target.y - position.z
        const d = Math.hypot(dx, dz)
        const stride = 4.6 * delta
        if (d <= stride + 0.02) {
          position.x = target.x
          position.z = target.y
          route.shift()
          if (!route.length) {
            const arrive = onArrive
            onArrive = null
            arrive?.()
          }
        } else {
          position.x += (dx / d) * stride
          position.z += (dz / d) * stride
          const turn = Math.atan2(
            Math.sin(Math.atan2(dx, dz) - heading),
            Math.cos(Math.atan2(dx, dz) - heading),
          )
          heading += turn * Math.min(1, delta * 12)
        }
      }
      const walking = manual || route.length > 0
      if (manual) {
        const length = Math.hypot(moveX, moveZ)
        // Analog joystick input can walk slower than a full key press.
        const speed = 5.2 * Math.min(1, length)
        position.x += (moveX / length) * speed * delta
        position.z += (moveZ / length) * speed * delta
        const target = Math.atan2(moveX, moveZ)
        const turn = Math.atan2(Math.sin(target - heading), Math.cos(target - heading))
        heading += turn * Math.min(1, delta * 12)
      }
      position.x = THREE.MathUtils.clamp(position.x, -82, 82)
      position.z = THREE.MathUtils.clamp(position.z, -7.4, 100)
      for (const collider of colliders) {
        if (collider.seatIds?.some((seatId) => seatId === targetSeatId || seatId === seated))
          continue
        const dx = position.x - collider.x
        const dz = position.z - collider.z
        const d = Math.hypot(dx, dz)
        if (d < collider.r) {
          if (d > 0.0001) {
            position.x = collider.x + (dx / d) * collider.r
            position.z = collider.z + (dz / d) * collider.r
          } else {
            position.x = collider.x + collider.r
          }
        }
      }
      const playerRadius = 0.48
      for (const collider of rectColliders) {
        const minX = collider.x - collider.halfX - playerRadius
        const maxX = collider.x + collider.halfX + playerRadius
        const minZ = collider.z - collider.halfZ - playerRadius
        const maxZ = collider.z + collider.halfZ + playerRadius
        if (position.x <= minX || position.x >= maxX || position.z <= minZ || position.z >= maxZ)
          continue
        const distances = [
          { axis: 'x' as const, value: minX, distance: position.x - minX },
          { axis: 'x' as const, value: maxX, distance: maxX - position.x },
          { axis: 'z' as const, value: minZ, distance: position.z - minZ },
          { axis: 'z' as const, value: maxZ, distance: maxZ - position.z },
        ]
        const nearest = distances.reduce((best, edge) =>
          edge.distance < best.distance ? edge : best,
        )
        if (nearest.axis === 'x') position.x = nearest.value
        else position.z = nearest.value
        if (route.length) {
          route = []
          onArrive = null
        }
      }
      player.group.rotation.y = heading
      // Move the daylight rig with the active area so distant temples retain
      // the same soft shadows and depth as the original courtyard.
      sunTarget.position.set(position.x, 0, position.z)
      sun.position.set(position.x + 18, 34, position.z + 22)
      sunTarget.updateMatrixWorld()

      desiredCamera.set(
        position.x + Math.sin(yaw) * distance,
        2.2 + pitch * 4 + distance * 0.2,
        position.z + Math.cos(yaw) * distance,
      )
      // Pull the camera in front of lamps, trees and other colliders that would
      // otherwise sit between it and the player (e.g. behind a cushion row).
      {
        const cdx = desiredCamera.x - position.x
        const cdz = desiredCamera.z - position.z
        const len2 = cdx * cdx + cdz * cdz
        let reach = 1
        for (const collider of colliders) {
          const r = collider.r * 0.75
          const fx = position.x - collider.x
          const fz = position.z - collider.z
          const c = fx * fx + fz * fz - r * r
          if (c <= 0) continue
          const b = fx * cdx + fz * cdz
          const disc = b * b - len2 * c
          if (disc < 0) continue
          const t = (-b - Math.sqrt(disc)) / len2
          if (t > 0 && t < reach) reach = t
        }
        if (reach < 1) {
          const k = Math.max(reach * 0.9, 3 / Math.sqrt(len2))
          desiredCamera.x = position.x + cdx * k
          desiredCamera.z = position.z + cdz * k
        }
      }
      cameraTarget.set(position.x + forwardX * 10, 2.3 - pitch * 3, position.z + forwardZ * 10)
      if (firstFrame) camera.position.copy(desiredCamera)
      else camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 9))
      camera.lookAt(cameraTarget)
      firstFrame = false

      const bellAge = elapsed - bellStart
      bellPivot.rotation.z =
        activeBellSite === 1 && bellAge < 14
          ? Math.sin(bellAge * 2.6) * 0.16 * Math.exp(-bellAge / 3.5)
          : 0
      remoteBellPivots.forEach(({ siteId, pivot }) => {
        pivot.rotation.z =
          siteId === activeBellSite && bellAge < 14
            ? Math.sin(bellAge * 2.6) * 0.16 * Math.exp(-bellAge / 3.5)
            : 0
      })
      const smokeLevel = elapsed < incenseUntil ? 1 : 0.18
      smoke.forEach((sprite, i) => {
        const life = (elapsed * 0.18 + (sprite.userData.offset as number)) % 1
        sprite.position.set(
          incenseSource.x + Math.sin(life * 6 + i) * 0.28 * life,
          1.95 + life * 3.2,
          incenseSource.y + Math.cos(life * 5 + i) * 0.16 * life,
        )
        const size = 0.25 + life * 1.1
        sprite.scale.set(size, size, 1)
        sprite.material.opacity = smokeLevel * 0.45 * Math.sin(life * Math.PI)
      })

      activeWanderingRigs.clear()
      wanderers.forEach((wanderer) => {
        if (wanderer.mode === 'sitting') {
          wanderer.wait -= delta
          if (wanderer.wait <= 0) {
            if (wanderer.occupiedSeatId !== null) {
              seatManager.release(wanderer.occupiedSeatId, wanderer.id)
            }
            wanderer.occupiedSeatId = null
            wanderer.targetSeatId = null
            wanderer.rig.pose = 'stand'
            wanderer.rig.group.position.y = 0
            wanderer.mode = 'walking'
            wanderer.point = (wanderer.point + 1) % wanderer.points.length
          }
          return
        }

        if (wanderer.wait > 0) {
          wanderer.wait -= delta
          return
        }

        let targetX = 0
        let targetZ = 0
        if (wanderer.mode === 'going-to-seat' && wanderer.targetSeatId !== null) {
          const seat = seatManager.getSeat(wanderer.targetSeatId)
          if (!seat) {
            wanderer.mode = 'walking'
            wanderer.targetSeatId = null
            return
          }
          targetX = seat.x
          targetZ = seat.z
        } else {
          const targetPoint = wanderer.points[wanderer.point]
          targetX = targetPoint.x
          targetZ = targetPoint.y
        }

        const position = wanderer.rig.group.position
        const dx = targetX - position.x
        const dz = targetZ - position.z
        const distance = Math.hypot(dx, dz)

        if (distance < 0.25) {
          if (wanderer.mode === 'going-to-seat' && wanderer.targetSeatId !== null) {
            const seat = seatManager.getSeat(wanderer.targetSeatId)
            if (seat) {
              seatManager.occupy(seat.id, 'npc', wanderer.id, wanderer.name)
              position.set(seat.x, seat.type === 'bench' ? 0.68 : 0, seat.z)
              wanderer.rig.group.rotation.y = seat.heading
              wanderer.rig.pose = 'sit'
              wanderer.occupiedSeatId = seat.id
              wanderer.targetSeatId = null
              wanderer.wait = 7 + rand() * 13
              wanderer.mode = 'sitting'
              return
            }
          }

          wanderer.point = (wanderer.point + 1) % wanderer.points.length
          const nearbySeats = seatManager.getAvailableWithin(
            [position.x, position.z],
            16,
            wanderer.id,
          )
          if (nearbySeats.length && rand() < 0.42) {
            const seat = nearbySeats[Math.floor(rand() * nearbySeats.length)]
            if (seatManager.reserve(seat.id, 'npc', wanderer.id, wanderer.name)) {
              wanderer.targetSeatId = seat.id
              wanderer.mode = 'going-to-seat'
            } else {
              wanderer.wait = 0.4 + rand() * 1.8
            }
          } else {
            wanderer.wait = 0.4 + rand() * 1.8
          }
          return
        }

        const stride = Math.min(distance, wanderer.speed * delta)
        position.x += (dx / distance) * stride
        position.z += (dz / distance) * stride
        activeWanderingRigs.add(wanderer.rig)
        const targetHeading = Math.atan2(dx, dz)
        const currentHeading = wanderer.rig.group.rotation.y
        const turn = Math.atan2(
          Math.sin(targetHeading - currentHeading),
          Math.cos(targetHeading - currentHeading),
        )
        wanderer.rig.group.rotation.y += turn * Math.min(1, delta * 7)
      })

      if (elapsed - lastSiteCheck > 0.4) {
        lastSiteCheck = elapsed
        const currentNearest = TEMPLE_SITES.reduce((nearest, s) => {
          const dNearest = Math.hypot(position.x - nearest.center[0], position.z - nearest.center[1])
          const dSite = Math.hypot(position.x - s.center[0], position.z - s.center[1])
          return dSite < dNearest ? s : nearest
        }, TEMPLE_SITES[0])
        if (currentNearest.id !== lastReportedSiteId) {
          lastReportedSiteId = currentNearest.id
          onSiteChange?.(currentNearest.id)
        }
      }

      rigs.forEach((rig, index) => {
        const moving = (index === 0 && walking) || activeWanderingRigs.has(rig)
        const pace = moving ? elapsed * 10 : elapsed * 1.5 + rig.phase
        const step = Math.sin(pace)
        rig.body.rotation.x = 0
        rig.leftLeg.visible = rig.rightLeg.visible = rig.pose !== 'sit'
        if (index === 0 && action) {
          const t = (elapsed - action.start) / action.duration
          if (t >= 1) {
            const done = action.done
            action = null
            done?.()
          } else {
            const k = Math.sin(t * Math.PI)
            const raise = Math.min(1, k * 1.8)
            rig.leftArm.rotation.set(-1.25 * raise, 0, -0.38 * raise - 0.16 * (1 - raise))
            rig.rightArm.rotation.set(-1.25 * raise, 0, 0.38 * raise + 0.16 * (1 - raise))
            rig.body.rotation.x = action.kind === 'bow' ? 0.55 * k : 0.15 * k
            rig.body.position.y = rig.pose === 'sit' ? -0.14 : 0
            rig.head.rotation.set(action.kind === 'bow' ? 0.2 * k : 0.1 * k, 0, 0)
            return
          }
        }
        if (rig.pose === 'sit') {
          rig.leftArm.rotation.set(-0.95, 0, -0.35)
          rig.rightArm.rotation.set(-0.95, 0, 0.35)
          rig.body.position.y = -0.14 + Math.sin(pace) * 0.01
          rig.head.rotation.x = 0.06 + Math.sin(pace * 0.6) * 0.02
          return
        }
        rig.leftArm.rotation.set(step * (moving ? 0.7 : 0.05), 0, -0.16)
        rig.rightArm.rotation.set(-step * (moving ? 0.7 : 0.05), 0, 0.16)
        rig.leftLeg.rotation.x = moving ? -step * 0.55 : 0
        rig.rightLeg.rotation.x = moving ? step * 0.55 : 0
        rig.body.position.y = moving ? Math.abs(step) * 0.07 : Math.sin(pace) * 0.012
        rig.body.rotation.z = moving ? step * 0.04 : 0
        rig.head.rotation.z = moving ? -step * 0.04 : Math.sin(pace * 0.5) * 0.04
      })

      // Keep name labels attached to the characters' heads.
      const width = mount.clientWidth
      const height = mount.clientHeight
      rigs.forEach((rig, index) => {
        const label = labelRefs.current[index]
        if (!label) return
        projected.copy(rig.group.position)
        projected.y += rig.pose === 'sit' ? 2.3 : 2.55
        const far = camera.position.distanceTo(projected)
        projected.project(camera)
        const visible = projected.z < 1 && far < 42 && Math.abs(projected.x) < 1.1
        label.style.opacity = visible ? String(THREE.MathUtils.clamp((42 - far) / 10, 0, 1)) : '0'
        if (visible) {
          const x = ((projected.x + 1) / 2) * width
          const y = ((1 - projected.y) / 2) * height
          label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`
          label.style.zIndex = String(1000 - Math.round(far * 10))
        }
      })
      if (needleRef.current) needleRef.current.style.transform = `rotate(${-yaw}rad)`

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      seatManager.releaseAllForActor('player')
      cancelAnimationFrame(frame)
      robeRef.current = null
      resetViewRef.current = null
      if (apiHolderRef.current) apiHolderRef.current.current = null
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('wheel', onWheel)
      const textures = new Set<THREE.Texture>()
      if (scene.background instanceof THREE.Texture) textures.add(scene.background)
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => {
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture) textures.add(value)
            }
            material.dispose()
          })
        }
      })
      textures.forEach((texture) => texture.dispose())
      renderer.dispose()
      mount.classList.remove('is-webgl')
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="scene-3d" ref={mountRef}>
      <div className="temple-fallback" aria-hidden="true">
        <div className="fallback-sun" />
        <div className="fallback-mountains" />
        <div className="fallback-tree fallback-tree--left">
          <i />
          <i />
          <i />
        </div>
        <div className="fallback-tree fallback-tree--right">
          <i />
          <i />
          <i />
        </div>
        <div className="fallback-temple">
          <div className="fallback-roof fallback-roof--top" />
          <div className="fallback-upper">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="fallback-roof fallback-roof--main" />
          <div className="fallback-hall">
            {Array.from({ length: 9 }).map((_, index) => (
              <i key={index} />
            ))}
            <span className="fallback-shrine" />
          </div>
          <div className="fallback-stairs">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="fallback-wing fallback-wing--left">
          <i />
        </div>
        <div className="fallback-wing fallback-wing--right">
          <i />
        </div>
        <div className="fallback-courtyard" />
        <Chibi variant="player" back />
        <Chibi variant="friend" />
        <Chibi variant="monk" />
      </div>

      <div className="scene-labels" aria-hidden="true">
        <div
          className="scene-label scene-label--self"
          ref={(element) => {
            labelRefs.current[0] = element
          }}
        >
          <strong>
            <i className="scene-label__avatar" />
            {playerName}
            <span className="scene-label__level">Cấp {level}</span>
          </strong>
        </div>
        {RESIDENTS.map((resident, index) => (
          <div
            className="scene-label"
            key={resident.id}
            ref={(element) => {
              labelRefs.current[index + 1] = element
            }}
          >
            <strong>
              {resident.name}
              <span className="scene-label__level">
                <svg viewBox="0 0 24 24" width="9" height="9" aria-hidden="true">
                  <path
                    d="m5 12 4 4L19 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Cấp {resident.level}
              </span>
            </strong>
            {resident.status && <small>{resident.status}</small>}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="scene-compass"
        aria-label="Đặt lại hướng nhìn về chính điện"
        onClick={() => resetViewRef.current?.()}
      >
        <span ref={needleRef}>
          <i />
        </span>
      </button>

      <div className="scene-controls-hint">
        <span>Kéo chuột để nhìn quanh</span>
        <i />
        <span>WASD để di chuyển</span>
      </div>
    </div>
  )
}

function Chibi({ variant, back = false }: { variant: string; back?: boolean }) {
  return (
    <div className={`chibi chibi--${variant}${back ? ' chibi--back' : ''}`} aria-hidden="true">
      <span className="chibi__shadow" />
      <span className="chibi__feet">
        <i />
        <i />
      </span>
      <span className="chibi__robe">
        <i className="chibi__collar" />
        <i className="chibi__belt" />
      </span>
      <span className="chibi__arm chibi__arm--left" />
      <span className="chibi__arm chibi__arm--right" />
      <span className="chibi__head">
        <i className="chibi__eye chibi__eye--left" />
        <i className="chibi__eye chibi__eye--right" />
        <i className="chibi__blush chibi__blush--left" />
        <i className="chibi__blush chibi__blush--right" />
        <i className="chibi__mouth" />
      </span>
    </div>
  )
}
