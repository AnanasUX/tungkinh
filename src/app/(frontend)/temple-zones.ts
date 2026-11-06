export type TempleZoneId = 'central' | 'yen-phuc' | 'phuc-duyen' | 'thien-phu' | 'tinh-gia'

export type TempleZone = {
  id: TempleZoneId
  name: string
  shortName: string
  subtitle: string
  description: string
  accent: string
  roof: string
  skyTop: string
  skyMid: string
  fog: string
  landmark: 'gate' | 'lantern' | 'lotus' | 'tower' | 'bamboo'
}

export const DEFAULT_ZONE: TempleZoneId = 'yen-phuc'

export const TEMPLE_ZONES: Record<TempleZoneId, TempleZone> = {
  central: {
    id: 'central', name: 'Sân Đạo Tràng Trung Tâm', shortName: 'Đạo Tràng',
    subtitle: 'Nơi kết nối bốn ngôi chùa',
    description: 'Quảng trường rộng, cổng đá bốn hướng và trạm dịch chuyển tới các chùa.',
    accent: '#d5a84c', roof: '#7f3024', skyTop: '#537fba', skyMid: '#a8c9df', fog: '#dce7e8', landmark: 'gate',
  },
  'yen-phuc': {
    id: 'yen-phuc', name: 'Chùa Yên Phúc', shortName: 'Yên Phúc',
    subtitle: 'Chánh điện trang nghiêm',
    description: 'Mái ngói đỏ, đèn sen và sân lễ Phật trung tâm.',
    accent: '#e2b33c', roof: '#a8291f', skyTop: '#4f8fd8', skyMid: '#8fc0ea', fog: '#d9e7ee', landmark: 'lantern',
  },
  'phuc-duyen': {
    id: 'phuc-duyen', name: 'Chùa Phúc Duyên', shortName: 'Phúc Duyên',
    subtitle: 'Hồ sen và cầu nguyện',
    description: 'Không gian hồ sen, đá xanh và cảnh quan nuôi dưỡng thiện duyên.',
    accent: '#e8a6b8', roof: '#8a3e50', skyTop: '#6d8fc5', skyMid: '#c2b9d5', fog: '#e6dce6', landmark: 'lotus',
  },
  'thien-phu': {
    id: 'thien-phu', name: 'Chùa Thiên Phú', shortName: 'Thiên Phú',
    subtitle: 'Tháp chuông trên đồi',
    description: 'Hai tháp chuông cao, sân đá sáng và tầm nhìn rộng về núi.',
    accent: '#e3c469', roof: '#7b4e24', skyTop: '#557dae', skyMid: '#c2d2df', fog: '#dce5e6', landmark: 'tower',
  },
  'tinh-gia': {
    id: 'tinh-gia', name: 'Chùa Tịnh Gia', shortName: 'Tịnh Gia',
    subtitle: 'Rừng trúc thiền hành',
    description: 'Lối thiền hành giữa rừng trúc, màu xanh trầm tĩnh và yên lặng.',
    accent: '#8fb66b', roof: '#3f6044', skyTop: '#517d77', skyMid: '#aac7b6', fog: '#d5e3da', landmark: 'bamboo',
  },
}

export const TEMPLE_ZONE_LIST = Object.values(TEMPLE_ZONES)

export function isTempleZone(value: unknown): value is TempleZoneId {
  return typeof value === 'string' && value in TEMPLE_ZONES
}
