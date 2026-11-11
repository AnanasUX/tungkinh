export type PracticeItem = {
  id: string
  title: string
  slug: string
  kind: 'chant' | 'talk' | 'recitation'
  summary?: string | null
  body: string
  teacher?: string | null
  durationMinutes?: number | null
  featured?: boolean | null
}

export type CalendarItem = {
  id: string
  title: string
  lunarDate: string
  eventType: 'lunar' | 'festival' | 'practice'
  time?: string | null
  description?: string | null
}

export type OnlineDevotee = {
  clientId?: string
  id?: string
  name?: string
  fullName?: string
  dharmaName?: string
  dharma?: string
  seatNo?: number
  avatarType?: string
  merit?: number
  meritScore?: number
}

