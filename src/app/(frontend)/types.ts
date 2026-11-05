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
