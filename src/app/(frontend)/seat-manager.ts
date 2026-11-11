import { SEATS, SEAT_OCCUPANTS } from './temple-data'
import { TEMPLE_SITES } from './temple-world'

export type SeatType = 'cushion' | 'bench'
export type OccupantType = 'player' | 'npc' | 'resident' | null

export type ManagedSeat = {
  id: number
  displayNo: number
  siteId: number
  type: SeatType
  x: number
  y: number
  z: number
  heading: number
  occupantType: OccupantType
  occupantId: string | null
  occupantName?: string | null
  reservedBy: string | null
}

export type SeatChangeEvent = CustomEvent<{
  seatId: number
  seat: ManagedSeat
}>

export function createDefaultSeats(): ManagedSeat[] {
  const seats: ManagedSeat[] = []

  // 1. Chùa Yên Phúc (site 1) - 24 bồ đoàn (id 1..24)
  for (const seat of SEATS) {
    const occupantName = SEAT_OCCUPANTS[seat.no]
    const isResident = Boolean(occupantName)
    seats.push({
      id: seat.no,
      displayNo: seat.no,
      siteId: 1,
      type: 'cushion',
      x: seat.x,
      y: 0.1,
      z: seat.z,
      heading: Math.PI,
      occupantType: isResident ? 'resident' : null,
      occupantId: isResident ? `resident-${seat.no}` : null,
      occupantName: occupantName ?? null,
      reservedBy: null,
    })
  }

  // 2, 3, 4. Chùa Phúc Duyên (2), Chùa Thiên Phú (3), Chùa Tịnh Gia (4)
  for (const site of TEMPLE_SITES.filter((item) => item.kind === 'temple' && item.id !== 1)) {
    const [cx, cz] = site.center
    for (const seat of SEATS) {
      const id = site.id * 100 + seat.no
      const seatX = cx + seat.x
      const seatZ = cz + 9 + seat.row * 3.15
      seats.push({
        id,
        displayNo: seat.no,
        siteId: site.id,
        type: 'cushion',
        x: seatX,
        y: 0.1,
        z: seatZ,
        heading: Math.PI,
        occupantType: null,
        occupantId: null,
        reservedBy: null,
      })
    }
  }

  // 5. Sân Đạo Tràng Trung Tâm (site 5) - 12 ghế quanh đài sen (id 500..511)
  const plaza = TEMPLE_SITES.find((s) => s.id === 5)!
  const [pxCenter, pzCenter] = plaza.center
  let nextBenchId = 500
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2
    const px = pxCenter + Math.cos(angle) * 12
    const pz = pzCenter + Math.sin(angle) * 12
    const seatId = nextBenchId++
    seats.push({
      id: seatId,
      displayNo: i + 1,
      siteId: 5,
      type: 'bench',
      x: px - Math.cos(angle) * 0.35,
      y: 0.68,
      z: pz - Math.sin(angle) * 0.35,
      heading: Math.atan2(-Math.cos(angle), -Math.sin(angle)),
      occupantType: null,
      occupantId: null,
      reservedBy: null,
    })
  }

  // 6. Ghế tại 4 đình nghỉ (id 512..527)
  const pavilions: [number, number, number][] = [
    [-34, 35, 5],
    [34, 35, 5],
    [-34, 68, 4],
    [34, 68, 4],
  ]
  pavilions.forEach(([pavX, pavZ, siteId]) => {
    for (const side of [-1, 1]) {
      const seatIds = [nextBenchId++, nextBenchId++]
      seatIds.forEach((id, index) => {
        seats.push({
          id,
          displayNo: id - 500 + 1,
          siteId,
          type: 'bench',
          x: pavX + (index === 0 ? -0.82 : 0.82),
          y: 0.68,
          z: pavZ + side * 2.1,
          heading: side > 0 ? Math.PI : 0,
          occupantType: null,
          occupantId: null,
          reservedBy: null,
        })
      })
    }
  })

  return seats
}

export class SeatManager extends EventTarget {
  private seats: Map<number, ManagedSeat>

  constructor(initialSeats?: ManagedSeat[]) {
    super()
    const list = initialSeats ?? createDefaultSeats()
    this.seats = new Map(list.map((seat) => [seat.id, { ...seat }]))
  }

  public getSeat(id: number): ManagedSeat | undefined {
    return this.seats.get(id)
  }

  public getAllSeats(): ManagedSeat[] {
    return Array.from(this.seats.values())
  }

  public getSeatsAtSite(siteId: number): ManagedSeat[] {
    return this.getAllSeats().filter((s) => s.siteId === siteId)
  }

  public isAvailable(id: number, actorId?: string): boolean {
    const seat = this.seats.get(id)
    if (!seat) return false
    if (seat.occupantType === 'resident') return false
    if (seat.occupantId !== null && seat.occupantId !== actorId) return false
    if (seat.reservedBy !== null && seat.reservedBy !== actorId) return false
    return true
  }

  public reserve(
    id: number,
    actorType: OccupantType,
    actorId: string,
    actorName?: string,
  ): boolean {
    const seat = this.seats.get(id)
    if (!seat) return false
    if (!this.isAvailable(id, actorId)) return false

    seat.reservedBy = actorId
    if (actorName) seat.occupantName = actorName
    this.emitChange(seat)
    return true
  }

  public occupy(
    id: number,
    actorType: OccupantType,
    actorId: string,
    actorName?: string,
  ): boolean {
    const seat = this.seats.get(id)
    if (!seat) return false
    if (seat.occupantId === actorId) return true
    if (!this.isAvailable(id, actorId) && seat.reservedBy !== actorId) return false

    seat.occupantType = actorType
    seat.occupantId = actorId
    if (actorName) seat.occupantName = actorName
    seat.reservedBy = null
    this.emitChange(seat)
    return true
  }

  public release(id: number, actorId: string): boolean {
    const seat = this.seats.get(id)
    if (!seat) return false
    if (seat.occupantType === 'resident') return false
    if (seat.occupantId !== actorId && seat.reservedBy !== actorId) return false

    seat.occupantType = null
    seat.occupantId = null
    seat.occupantName = null
    seat.reservedBy = null
    this.emitChange(seat)
    return true
  }

  public releaseAllForActor(actorId: string): void {
    for (const seat of this.seats.values()) {
      if (seat.occupantType === 'resident') continue
      if (seat.occupantId === actorId || seat.reservedBy === actorId) {
        seat.occupantType = null
        seat.occupantId = null
        seat.occupantName = null
        seat.reservedBy = null
        this.emitChange(seat)
      }
    }
  }

  public getNearestAvailable(
    x: number,
    z: number,
    maxDistance = 10,
    actorId?: string,
  ): ManagedSeat | undefined {
    let nearest: ManagedSeat | undefined
    let minDistance = maxDistance

    for (const seat of this.seats.values()) {
      if (!this.isAvailable(seat.id, actorId)) continue
      const dist = Math.hypot(x - seat.x, z - seat.z)
      if (dist <= minDistance) {
        minDistance = dist
        nearest = seat
      }
    }
    return nearest
  }

  public getAvailableWithin(
    position: { x: number; z: number } | [number, number],
    radius = 16,
    actorId?: string,
  ): ManagedSeat[] {
    const px = Array.isArray(position) ? position[0] : position.x
    const pz = Array.isArray(position) ? position[1] : position.z
    const list: ManagedSeat[] = []

    for (const seat of this.seats.values()) {
      if (!this.isAvailable(seat.id, actorId)) continue
      const dist = Math.hypot(px - seat.x, pz - seat.z)
      if (dist <= radius) {
        list.push(seat)
      }
    }
    return list
  }

  private emitChange(seat: ManagedSeat) {
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { seatId: seat.id, seat: { ...seat } },
      }),
    )
  }
}

export const seatManager = new SeatManager()

if (typeof window !== 'undefined') {
  ;(window as any).seatManager = seatManager
}
