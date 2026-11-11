export type TempleSite = {
  id: number
  name: string
  shortName: string
  description: string
  center: readonly [number, number]
  spawn: readonly [number, number]
  accent: string
  kind: 'temple' | 'plaza'
}

/**
 * Shared world coordinates. Every destination is part of the same walkable
 * Three.js scene; the destination picker only provides an optional shortcut.
 */
export const TEMPLE_SITES: readonly TempleSite[] = [
  {
    id: 1,
    name: 'Chùa Yên Phúc',
    shortName: 'Yên Phúc',
    description: 'Chánh điện và sân lễ chính',
    center: [0, -16],
    spawn: [0, 17],
    accent: '#b72d25',
    kind: 'temple',
  },
  {
    id: 2,
    name: 'Chùa Phúc Duyên',
    shortName: 'Phúc Duyên',
    description: 'Vườn sen phía tây',
    center: [-62, 0],
    spawn: [-62, 14],
    accent: '#b8653a',
    kind: 'temple',
  },
  {
    id: 3,
    name: 'Chùa Thiên Phú',
    shortName: 'Thiên Phú',
    description: 'Tháp chuông phía đông',
    center: [62, 0],
    spawn: [62, 14],
    accent: '#9c3f30',
    kind: 'temple',
  },
  {
    id: 4,
    name: 'Chùa Tịnh Gia',
    shortName: 'Tịnh Gia',
    description: 'Thiền viện cuối đường bắc',
    center: [0, 70],
    spawn: [0, 84],
    accent: '#85602c',
    kind: 'temple',
  },
  {
    id: 5,
    name: 'Sân Đạo Tràng Trung Tâm',
    shortName: 'Đạo Tràng',
    description: 'Quảng trường hội tụ năm khu',
    center: [0, 36],
    spawn: [0, 32],
    accent: '#9b7136',
    kind: 'plaza',
  },
]

export const templeSiteById = (id: number) =>
  TEMPLE_SITES.find((site) => site.id === id) ?? TEMPLE_SITES[0]
