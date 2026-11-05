// Shared layout and progression data for the temple scene and HUD panels.

export type Seat = { no: number; x: number; z: number; row: number }

/** Cushion columns: four on each side of the central stone path. */
export const SEAT_COLUMNS = [-12.4, -10.1, -7.75, -5.4, 5.4, 7.75, 10.1, 12.4]
/** Row depths, front row (closest to the altar) first. */
export const SEAT_ROWS = [-6.6, -5.1, -3.6]
/** Walking lane in front of the last row, used by the route planner. */
export const SEAT_LANE_Z = -2.2
/** Half the column spacing: aisles between cushions sit this far from a column. */
export const SEAT_AISLE = 1.17

/** Twenty-four meditation cushions in front of the main hall: three rows of eight. */
export const SEATS: Seat[] = SEAT_ROWS.flatMap((z, row) =>
  SEAT_COLUMNS.map((x, column) => ({
    no: row * SEAT_COLUMNS.length + column + 1,
    x,
    z,
    row,
  })),
)

/** Cushions already taken by resident practitioners (must match TempleScene residents). */
export const SEAT_OCCUPANTS: Record<number, string> = {
  2: 'Thích Đào Đào',
  7: 'Thích Từ Bế',
  12: 'An Hiền',
}

export const LEVELS = [
  { min: 0, name: 'Hạt Sen Sơ Khởi', note: 'Khởi tâm quy hướng Phật Pháp' },
  { min: 30, name: 'Tịnh Thức Bát Nhã', note: 'Tâm an thanh thản' },
  { min: 100, name: 'An Nhiên Tự Tại', note: 'Ý niệm thanh tịnh' },
  { min: 250, name: 'Giác Ngộ Bồ Đề', note: 'Trí tuệ hiển lộ' },
  { min: 500, name: 'Viên Mãn Bồ Đề', note: 'Viên dung vô ngại' },
]

export function levelFor(merit: number) {
  let index = 0
  LEVELS.forEach((level, i) => {
    if (merit >= level.min) index = i
  })
  const next = LEVELS[index + 1]
  return {
    level: index + 1,
    name: LEVELS[index].name,
    next: next?.min ?? null,
    progress: next
      ? Math.min(1, Math.max(0, (merit - LEVELS[index].min) / (next.min - LEVELS[index].min)))
      : 1,
  }
}
