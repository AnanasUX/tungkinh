import config from '@payload-config'
import { getPayload } from 'payload'
import ChuaSenApp from './ChuaSenApp'
import type { CalendarItem, PracticeItem } from './types'

export const dynamic = 'force-static'

export default async function HomePage() {
  const payload = await getPayload({ config })
  const [practiceResult, calendarResult] = await Promise.all([
    payload.find({
      collection: 'practice-content',
      limit: 50,
      pagination: false,
      sort: 'order',
      overrideAccess: false,
    }),
    payload.find({
      collection: 'calendar-events',
      limit: 30,
      pagination: false,
      sort: 'order',
      overrideAccess: false,
    }),
  ])

  return (
    <ChuaSenApp
      practices={practiceResult.docs as unknown as PracticeItem[]}
      calendar={calendarResult.docs as unknown as CalendarItem[]}
    />
  )
}
