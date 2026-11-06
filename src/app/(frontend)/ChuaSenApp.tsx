'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TempleScene, { type SceneApi } from './TempleScene'
import SystemPanel, { type PanelId } from './SystemPanel'
import TouchJoystick from './TouchJoystick'
import CommunityOverlay, { VideoCallOverlay } from './CommunityOverlay'
import type { PracticeContext, Petition } from './PracticePanels'
import { levelFor } from './temple-data'
import { playChime, playTempleBell, playWoodblock, setAmbient } from './audio'
import type { CalendarItem, PracticeItem } from './types'

type IconName =
  | 'lotus'
  | 'users'
  | 'volume'
  | 'mute'
  | 'expand'
  | 'settings'
  | 'sparkles'
  | 'wave'
  | 'chevron'
  | 'circle'
  | 'flame'
  | 'hand'
  | 'moon'
  | 'bell'
  | 'leaf'
  | 'broom'
  | 'beads'
  | 'trophy'
  | 'more'
  | 'message'
  | 'close'
  | 'check'
  | 'fish'
  | 'incense'
  | 'book'
  | 'stick'
  | 'lantern'
  | 'bird'
  | 'wind'
  | 'quote'
  | 'scroll'
  | 'seal'
  | 'list'
  | 'music'
  | 'seat'
  | 'video'

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    lotus: (
      <>
        <path d="M12 21c-2.2-1.1-3.5-3-3.5-5.2 0-1.6.8-3 3.5-4.8 2.7 1.8 3.5 3.2 3.5 4.8 0 2.2-1.3 4.1-3.5 5.2Z" />
        <path d="M12 11c-1.8-1.2-2.7-2.6-2.7-4.2 0-1.5.9-3 2.7-4.8 1.8 1.8 2.7 3.3 2.7 4.8 0 1.6-.9 3-2.7 4.2ZM8.7 13.1C6.4 13 4.6 12.2 3.5 10.7c-.7-1-.9-2.2-.6-3.7 3.8.2 5.9 1.6 6.4 4.3M15.3 13.1c2.3-.1 4.1-.9 5.2-2.4.7-1 .9-2.2.6-3.7-3.8.2-5.9 1.6-6.4 4.3" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M16 5.3a3 3 0 0 1 0 5.7M18 13.7c1.7.7 2.5 2.1 2.5 4.3v2" />
      </>
    ),
    volume: (
      <>
        <path d="M5 9H2v6h3l5 4V5L5 9Z" />
        <path d="M14 9.5a4 4 0 0 1 0 5M17 7a7.5 7.5 0 0 1 0 10" />
      </>
    ),
    mute: (
      <>
        <path d="M5 9H2v6h3l5 4V5L5 9Z" />
        <path d="m15 10 6 6m0-6-6 6" />
      </>
    ),
    expand: (
      <>
        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
        <path d="m3 8 5-5m8 0 5 5M3 16l5 5m8 0 5-5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.1 3.1L16 7.5l-2.9 1.4L12 12l-1.1-3.1L8 7.5l2.9-1.4L12 3ZM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13ZM19 11l.7 2.3L22 14l-2.3.7L19 17l-.7-2.3L16 14l2.3-.7L19 11Z" />
      </>
    ),
    wave: (
      <>
        <path d="M3 12h2m2-4v8m3-11v14m4-11v8m3-6v4m3-2h1" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    circle: <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />,
    flame: (
      <path d="M12 22c4 0 7-2.8 7-7 0-3.3-1.9-6.6-5.6-10.1.1 2.6-1.2 4.4-2.6 5.6.2-2.9-1.3-4.7-2.2-5.5C6.4 7.5 5 10.6 5 14.2 5 18.5 8 22 12 22Zm0-1c-2 0-3.2-1.5-3.2-3.3 0-1.3.6-2.6 1.8-3.9.1 1.2.7 1.9 1.4 2.5.7-.7 1.4-1.8 1.4-3.4 1.2 1.4 1.8 3 1.8 4.5C15.2 19.4 14 21 12 21Z" />
    ),
    hand: (
      <path d="M7 11V7.5a1.5 1.5 0 0 1 3 0V10m0-4.5a1.5 1.5 0 0 1 3 0V10m0-3a1.5 1.5 0 0 1 3 0v4m0-2a1.5 1.5 0 0 1 3 0v5c0 4.5-2.8 7-7 7-3.3 0-5.1-1.7-7.4-5.3a1.6 1.6 0 0 1 .5-2.2c.7-.4 1.5-.2 2 .3L9 16" />
    ),
    moon: <path d="M20.5 15.3A8.5 8.5 0 0 1 8.7 3.5 8.7 8.7 0 1 0 20.5 15.3Z" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 4C11 4 5 8 5 14c0 3 2 5 5 5 6 0 10-6 10-15Z" />
        <path d="M4 21c3-5 7-8 12-11" />
      </>
    ),
    broom: (
      <>
        <path d="m18 3-7 11" />
        <path d="M12 12c-4 0-7 2-8 6 3.5 2.5 7.5 3 11 2 1-4 .2-6.5-3-8Z" />
        <path d="m7 15 7 4" />
      </>
    ),
    beads: (
      <>
        <path d="M12 3a8 8 0 1 0 8 8" />
        <circle cx="12" cy="3" r="1.2" />
        <circle cx="5.5" cy="6" r="1.2" />
        <circle cx="4" cy="12" r="1.2" />
        <circle cx="7" cy="18" r="1.2" />
        <circle cx="14" cy="19" r="1.2" />
        <path d="m20 11 1.5 7-3-1-2 2" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM10 15h4M9 21h6M12 13v8" />
        <path d="M8 6H4v2c0 2.2 1.5 4 4.2 4M16 6h4v2c0 2.2-1.5 4-4.2 4" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </>
    ),
    message: <path d="M21 12a8.5 8.5 0 0 1-9 8 10 10 0 0 1-4-.8L3 21l1.5-4A8 8 0 1 1 21 12Z" />,
    close: <path d="m7 7 10 10M17 7 7 17" />,
    check: <path d="m5 12 4 4L19 6" />,
    fish: (
      <>
        <path d="M3.5 13.5C3.5 8.8 7.3 5 12 5s8.5 3.8 8.5 8.5c0 2.5-2 4.5-4.5 4.5H8c-2.5 0-4.5-2-4.5-4.5Z" />
        <path d="M7 12.5h7.5M16.5 9.5h.01M12 18v2M9 20h6" />
      </>
    ),
    incense: (
      <>
        <path d="M5 21h14M7 21l1-5h8l1 5M9 16V8M12 16V6M15 16V8" />
        <path d="M9 5c-.8-.8-.8-1.7 0-2.5M12 3.5c-.8-.8-.8-1.7 0-2.5M15 5c-.8-.8-.8-1.7 0-2.5" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
        <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M8 7h8M8 11h6" />
      </>
    ),
    stick: (
      <>
        <path d="M7 10h10l-1.5 11h-7L7 10Z" />
        <path d="M9.5 10 8 2.5M12 10V2M14.5 10l2-6.5" />
      </>
    ),
    lantern: (
      <>
        <path d="M12 2v2M8 4h8M7 7.5C7 5.6 9.2 4 12 4s5 1.6 5 3.5v7c0 1.9-2.2 3.5-5 3.5s-5-1.6-5-3.5v-7Z" />
        <path d="M10 18v2h4v-2M12 20v2M7 11h10" />
      </>
    ),
    bird: (
      <path d="M3 13c3 0 5-1.5 6.5-4C11 6.5 13 5 16 5c1.7 0 3 1 3.6 2.3L22 8l-2.2 1c-.3 4.7-4 8-8.8 8H8l-3 3v-4c-1.3-.7-2-1.8-2-3Z" />
    ),
    wind: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8a2.5 2.5 0 1 1-2.5 2.5" />,
    quote: <path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6M7 11h4M14 11h4" />,
    scroll: (
      <>
        <path d="M6 3h11a3 3 0 0 1 3 3v1h-3M6 3a3 3 0 0 0-3 3v1h3M6 3v15a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-1H9" />
        <path d="M10 8h6M10 12h6" />
      </>
    ),
    seal: (
      <>
        <circle cx="12" cy="9" r="6" />
        <path d="m8.5 14-1.5 8 5-3 5 3-1.5-8M12 6.5v5M9.5 9h5" />
      </>
    ),
    list: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />,
    music: (
      <>
        <path d="M9 18V5l11-2v13" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="17.5" cy="16" r="2.5" />
      </>
    ),
    seat: (
      <>
        <ellipse cx="12" cy="16" rx="8" ry="3.5" />
        <path d="M4 16v1.5C4 19.4 7.6 21 12 21s8-1.6 8-3.5V16" />
        <circle cx="12" cy="7" r="3" />
      </>
    ),
    video: (
      <>
        <rect x="3" y="6" width="14" height="12" rx="3" />
        <path d="m17 10 4-2v8l-4-2" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

const tasks = [
  { id: 'beads', icon: 'circle' as IconName, title: 'Lần 27 hạt', target: 27, action: 'Mở' },
  {
    id: 'incense',
    icon: 'incense' as IconName,
    title: 'Dâng một nén hương',
    target: 1,
    action: 'Đi',
  },
  { id: 'buddha', icon: 'hand' as IconName, title: 'Lạy Phật một lạy', target: 1, action: 'Lạy' },
]

type ActionId =
  | 'quests'
  | 'knock'
  | 'bow'
  | 'incense'
  | 'chant'
  | 'bell'
  | 'fortune'
  | 'lantern'
  | 'release'
  | 'breath'
  | 'teaching'
  | 'petition'
  | 'certificate'
  | 'video'
  | 'more'

// Core rituals first so thumbs reach them without scrolling on phones.
const actions: { id: ActionId; icon: IconName; label: string; hint?: string }[] = [
  { id: 'quests', icon: 'list', label: 'Việc lành' },
  { id: 'knock', icon: 'fish', label: 'Gõ mõ', hint: 'Space' },
  { id: 'bow', icon: 'hand', label: 'Lễ Phật' },
  { id: 'incense', icon: 'incense', label: 'Dâng hương' },
  { id: 'chant', icon: 'book', label: 'Kinh thư', hint: 'K' },
  { id: 'bell', icon: 'bell', label: 'Chuông' },
  { id: 'fortune', icon: 'stick', label: 'Xin xăm' },
  { id: 'lantern', icon: 'lantern', label: 'Hoa đăng' },
  { id: 'release', icon: 'bird', label: 'Phóng sanh' },
  { id: 'breath', icon: 'wind', label: 'Thiền thở' },
  { id: 'teaching', icon: 'quote', label: 'Pháp cú' },
  { id: 'petition', icon: 'scroll', label: 'Dâng sớ' },
  { id: 'certificate', icon: 'seal', label: 'Công đức' },
  { id: 'video', icon: 'video', label: 'Gọi Video' },
  { id: 'more', icon: 'more', label: 'Thêm' },
]

type Props = {
  practices: PracticeItem[]
  calendar: CalendarItem[]
}

type SavedProgress = {
  playerName: string
  dharmaName: string
  merit: number
  beads: number
  knocks: number
  done: Record<string, number>
  wishes: string[]
  petitions: Petition[]
  room: number
  theme: string
  muted: boolean
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(target.closest('input, textarea, select, [contenteditable]'))

export default function ChuaSenApp({ practices, calendar }: Props) {
  const [collapsed, setCollapsed] = useState(true)
  const [muted, setMuted] = useState(false)
  const [meditating, setMeditating] = useState(false)
  const [ambientOn, setAmbientOn] = useState(true)
  const [activeAction, setActiveAction] = useState<ActionId>('knock')
  const [done, setDone] = useState<Record<string, number>>({})
  const [toast, setToast] = useState('')
  const [panel, setPanel] = useState<PanelId | null>(null)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [callOpen, setCallOpen] = useState(false)
  const [playerName, setPlayerName] = useState('Tuệ Phúc')
  const [dharmaName, setDharmaName] = useState('')
  const [merit, setMerit] = useState(0)
  const [beads, setBeads] = useState(0)
  const [knocks, setKnocks] = useState(0)
  const [knockPulse, setKnockPulse] = useState(0)
  const [autoKnock, setAutoKnock] = useState(false)
  const [wishes, setWishes] = useState<string[]>([])
  const [petitions, setPetitions] = useState<Petition[]>([])
  const [room, setRoom] = useState(4)
  const [theme, setTheme] = useState('xanh')
  const [phrase, setPhrase] = useState('')
  const [seat, setSeat] = useState<number | null>(null)
  const [onlineCount, setOnlineCount] = useState(1)
  const seatRef = useRef(seat)
  seatRef.current = seat
  const [hydrated, setHydrated] = useState(false)
  const sceneRef = useRef<SceneApi | null>(null)
  const moveScene = useCallback((x: number, y: number) => sceneRef.current?.setMove(x, y), [])
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const doneRef = useRef(done)
  doneRef.current = done
  const knocksRef = useRef(knocks)
  knocksRef.current = knocks

  useEffect(() => {
    const updateCount = (e?: any) => {
      const list = e?.detail || ((window as any).SupabaseSanctuary?.activeDevotees
        ? Array.from((window as any).SupabaseSanctuary.activeDevotees.values())
        : [])
      setOnlineCount(1 + list.length)
    }
    window.addEventListener('sanctuary_devotees_updated', updateCount)
    updateCount()
    const timer = setInterval(updateCount, 2000)
    return () => {
      window.removeEventListener('sanctuary_devotees_updated', updateCount)
      clearInterval(timer)
    }
  }, [])
  useEffect(() => {
    const prof = (window as any).currentUserProfile
    if (prof) {
      if (prof.fullName) setPlayerName(prof.fullName)
      if (prof.dharmaName) setDharmaName(prof.dharmaName)
      if (typeof prof.assignedSeatNo === 'number') {
        setSeat(prof.assignedSeatNo)
      }
    }
  }, [])

  useEffect(() => {
    const prof = (window as any).currentUserProfile
    if (prof) {
      prof.fullName = playerName
      prof.dharmaName = dharmaName
      ;(window as any).SupabaseSanctuary?.trackCurrentUserPresence?.()
    }
  }, [playerName, dharmaName])

  const completed = useMemo(() => Object.values(done).filter(Boolean).length, [done])
  const rank = levelFor(merit)
  const level = rank.level

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('chua-sen-progress')
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SavedProgress>
        if (saved.playerName) setPlayerName(saved.playerName)
        if (typeof saved.dharmaName === 'string') setDharmaName(saved.dharmaName)
        if (typeof saved.merit === 'number') setMerit(saved.merit)
        if (typeof saved.beads === 'number') setBeads(saved.beads)
        if (typeof saved.knocks === 'number') setKnocks(saved.knocks)
        if (saved.done) setDone(saved.done)
        if (Array.isArray(saved.wishes)) setWishes(saved.wishes)
        if (Array.isArray(saved.petitions)) setPetitions(saved.petitions.slice(-20))
        if (typeof saved.room === 'number') setRoom(saved.room)
        if (saved.theme) setTheme(saved.theme === 'nau' ? 'xanh' : saved.theme)
        if (typeof saved.muted === 'boolean') setMuted(saved.muted)
      }
    } catch {
      // Keep safe defaults if browser storage is unavailable or malformed.
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const data: SavedProgress = {
      playerName,
      dharmaName,
      merit,
      beads,
      knocks,
      done,
      wishes,
      petitions,
      room,
      theme,
      muted,
    }
    window.localStorage.setItem('chua-sen-progress', JSON.stringify(data))
  }, [
    beads,
    dharmaName,
    done,
    hydrated,
    knocks,
    merit,
    muted,
    petitions,
    playerName,
    room,
    theme,
    wishes,
  ])

  useEffect(() => {
    if (muted && ambientOn) {
      setAmbient(false)
      setAmbientOn(false)
    }
  }, [muted, ambientOn])
  useEffect(() => {
    // Tự động bật nhạc thiền nền khi vào trang
    setAmbient(true, 0.3)
    return () => setAmbient(false)
  }, [])

  const addMerit = useCallback((amount: number, message: string) => {
    if (amount) setMerit((current) => current + amount)
    setToast(message)
    if (!mutedRef.current && amount) playChime()
  }, [])

  const knock = useCallback(() => {
    if (!mutedRef.current) playWoodblock()
    setKnockPulse((value) => value + 1)
    const next = knocksRef.current + 1
    knocksRef.current = next
    setKnocks(next)
    if (next % 108 === 0) {
      setMerit((current) => current + 10)
      setToast(`Đã gõ ${next} tiếng mõ · +10 công đức`)
    }
    ;(window as any).SupabaseSanctuary?.broadcast?.('WOODEN_FISH', {
      seatNo: seatRef.current,
      phrase: 'Nam Mô A Di Đà Phật',
    })
  }, [])

  useEffect(() => {
    if (!autoKnock) return
    const timer = window.setInterval(knock, 1100)
    return () => window.clearInterval(timer)
  }, [autoKnock, knock])

  const completeTask = useCallback(
    (id: string, target: number, title: string) => {
      if (doneRef.current[id]) return
      doneRef.current = { ...doneRef.current, [id]: target }
      setDone(doneRef.current)
      addMerit(30, `Đã hoàn thành “${title}” · +30 công đức`)
    },
    [addMerit],
  )

  const offerIncense = useCallback(() => {
    const scene = sceneRef.current
    const award = () => {
      addMerit(20, 'Đã dâng 3 nén tâm hương lên Tam Bảo · +20 công đức')
      completeTask('incense', 1, 'Dâng một nén hương')
    }
    ;(window as any).SupabaseSanctuary?.broadcast?.('OFFER_INCENSE', {
      seatNo: seatRef.current,
    })
    if (scene) {
      setToast('Đang đi lên bàn thờ dâng hương…')
      scene.offerIncense(award)
    } else award()
  }, [addMerit, completeTask])

  const bow = useCallback(() => {
    sceneRef.current?.bow()
    if (!mutedRef.current) playTempleBell()
    ;(window as any).SupabaseSanctuary?.broadcast?.('BOW_BUDDHA', {
      seatNo: seatRef.current,
    })
    addMerit(5, 'Thành kính đảnh lễ Tam Bảo · +5 công đức')
    completeTask('buddha', 1, 'Lạy Phật một lạy')
  }, [addMerit, completeTask])

  const ringBell = useCallback(() => {
    sceneRef.current?.ringBell()
    if (!mutedRef.current) playTempleBell()
    ;(window as any).SupabaseSanctuary?.broadcast?.('TEMPLE_BELL', {
      seatNo: seatRef.current,
    })
    addMerit(5, 'Tiếng chuông ngân xa, thân tâm an trú · +5 công đức')
  }, [addMerit])

  const toggleSeat = useCallback(() => {
    if (seat !== null) sceneRef.current?.stand()
    else setPanel('seats')
  }, [seat])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.code === 'Space') {
        event.preventDefault()
        if (event.repeat) return
        if (event.target instanceof HTMLElement && event.target.tagName === 'BUTTON')
          event.target.blur()
        knock()
        return
      }
      if (panel) return
      const key = event.key.toLowerCase()
      if (key === 'f') toggleSeat()
      else if (key === 'k') setPanel('chant')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [knock, panel, toggleSeat])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.()
    else void document.exitFullscreen?.()
  }

  const toggleAmbient = () => {
    const next = !ambientOn
    if (next && muted) setMuted(false)
    setAmbient(next, 0.3)
    setAmbientOn(next)
  }

  const chooseAction = (id: ActionId) => {
    setActiveAction(id)
    if (id === 'quests') setCollapsed((value) => !value)
    else if (id === 'knock') knock()
    else if (id === 'bow') bow()
    else if (id === 'incense') offerIncense()
    else if (id === 'bell') ringBell()
    else if (id === 'video') {
      setPanel(null)
      setCommunityOpen(false)
      setCallOpen(true)
    } else setPanel(id)
  }

  const runTask = (id: string, target: number, title: string) => {
    if (id === 'beads') setPanel('beads')
    else if (id === 'incense') offerIncense()
    else if (id === 'buddha') bow()
    else completeTask(id, target, title)
  }

  const updateBeads = (count: number) => {
    setBeads(count)
    if (count >= 27 && !done.beads) completeTask('beads', 27, 'Lần 27 hạt')
  }

  const practiceContext: PracticeContext = {
    playerName,
    dharmaName,
    merit,
    knocks,
    beads,
    seat,
    petitions,
    onSeat: (no) => {
      sceneRef.current?.sit(no)
      setToast(`Đang đi tới bồ đoàn #${no}…`)
    },
    onStand: () => sceneRef.current?.stand(),
    onName: setPlayerName,
    onDharma: setDharmaName,
    onPetition: (petition) => {
      setPetitions((current) => [...current, petition].slice(-20))
      addMerit(25, `Đã dâng ${petition.kind === 'an' ? 'sớ cầu an' : 'sớ cầu siêu'} · +25 công đức`)
    },
    onMerit: addMerit,
    onWish: (wish) => setWishes((current) => [...current, wish].slice(-20)),
    onNavigate: setPanel,
    onClose: () => setPanel(null),
  }

  return (
    <main className={`game-shell theme-${theme}`}>
      <TempleScene
        theme={theme}
        playerName={playerName}
        level={level}
        apiRef={sceneRef}
        onSeatChange={(next) => {
          setSeat(next)
          if ((window as any).currentUserProfile) {
            ;(window as any).currentUserProfile.assignedSeatNo = next
          }
          if (next !== null) {
            setToast(`Đã an tọa bồ đoàn #${next}. Nam mô A Di Đà Phật`)
            ;(window as any).SupabaseSanctuary?.broadcast?.('SANCTUARY_SIT_DOWN', { seatNo: next })
          } else {
            ;(window as any).SupabaseSanctuary?.broadcast?.('SANCTUARY_STAND_UP', {})
          }
          ;(window as any).SupabaseSanctuary?.trackCurrentUserPresence?.()
        }}
      />
      <div className="atmosphere" aria-hidden="true" />

      <header className="topbar">
        <button className="brand glass" onClick={() => setPanel('rooms')}>
          <span className="lotus-mark">
            <Icon name="lotus" size={17} />
          </span>
          <strong>Chùa An Nhiên</strong>
          <span className="online-dot" />
          <span className="room-name">Phòng {room}</span>
          <Icon name="chevron" size={14} />
        </button>

        <div className="top-actions">
          <div className="status-pill glass">
            <button
              className="visitor-count"
              type="button"
              aria-label="Xem người trong chùa"
              onClick={() => setPanel('people')}
            >
              <Icon name="users" size={16} /> {onlineCount}
            </button>
            <span className="divider" />
            <button type="button" aria-label="Hồ sơ tu tập" onClick={() => setPanel('profile')}>
              <Icon name="scroll" size={16} />
            </button>
            <button
              type="button"
              aria-label="Mở Đạo Tràng Chung"
              onClick={() => {
                setPanel(null)
                setCommunityOpen(true)
              }}
            >
              <Icon name="message" size={16} />
            </button>
            <button
              type="button"
              aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              onClick={() => setMuted(!muted)}
            >
              <Icon name={muted ? 'mute' : 'volume'} size={16} />
            </button>
            <button type="button" aria-label="Toàn màn hình" onClick={toggleFullscreen}>
              <Icon name="expand" size={15} />
            </button>
            <button type="button" aria-label="Cài đặt" onClick={() => setPanel('settings')}>
              <Icon name="settings" size={16} />
            </button>
          </div>
          <div className="quick-links">
            <button
              type="button"
              className={`mini-pill glass ${ambientOn ? 'active' : ''}`}
              aria-pressed={ambientOn}
              onClick={toggleAmbient}
            >
              <Icon name="music" size={15} /> {ambientOn ? 'Nhạc thiền 30%' : 'Nhạc thiền'}
            </button>
            <button
              type="button"
              className={`mini-pill glass ${meditating ? 'active' : ''}`}
              onClick={() => {
                setMeditating(!meditating)
                setPanel('chant')
              }}
            >
              <Icon name="wave" size={15} /> {meditating ? 'Đang niệm Phật' : 'Nghe niệm Phật'}
            </button>
          </div>
        </div>
      </header>

      <aside className={`quest-panel glass ${collapsed ? 'collapsed' : ''}`}>
        <div className="quest-heading">
          <button
            type="button"
            className={`player-portrait portrait-${theme}`}
            aria-label="Mở hồ sơ tu tập"
            onClick={() => setPanel('profile')}
          >
            <i />
            <b />
          </button>
          <div>
            <h1>{playerName}</h1>
            <p>
              Cấp {level} · {rank.name} · {merit.toLocaleString('vi-VN')} công đức
            </p>
          </div>
          <button
            type="button"
            className="collapse-button"
            aria-label={collapsed ? 'Mở việc lành hôm nay' : 'Thu gọn việc lành'}
            onClick={() => setCollapsed(!collapsed)}
          >
            <Icon name="chevron" size={16} />
          </button>
        </div>

        {!collapsed && (
          <div className="quest-content">
            <div className="daily-row">
              <strong>
                Việc lành hôm nay <b>{completed}/3</b>
              </strong>
              <span>{completed * 30}/90</span>
            </div>
            <div className="progress">
              <i style={{ width: `${(completed / 3) * 100}%` }} />
            </div>
            <div className="task-list">
              {tasks.map((task) => {
                const isDone = Boolean(done[task.id])
                return (
                  <article className={`task ${isDone ? 'done' : ''}`} key={task.id}>
                    <span className="task-icon">
                      <Icon name={isDone ? 'check' : task.icon} size={18} />
                    </span>
                    <div className="task-copy">
                      <strong>{task.title}</strong>
                      <small>
                        {isDone ? task.target : 0}/{task.target} <b>· +30</b>
                      </small>
                    </div>
                    <button
                      type="button"
                      disabled={isDone}
                      onClick={() => runTask(task.id, task.target, task.title)}
                    >
                      {isDone ? 'Xong' : task.action}
                    </button>
                  </article>
                )
              })}
            </div>
            <p className="reward">
              <Icon name="sparkles" size={14} /> Xong cả 3 · <b>90 công đức</b>
            </p>
            <div className="lotus-tracker">
              <div className="tracker-title">
                <strong>Bảy đoá sen</strong>
                <span>{completed}/7</span>
              </div>
              <div className="lotus-row">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Icon key={i} name="lotus" size={17} />
                ))}
              </div>
            </div>
            <p className="event-row">
              <Icon name="moon" size={14} /> {calendar[0]?.title ?? 'Mùng một sắp tới'}
            </p>
            <p className="event-row">
              <Icon name="bell" size={14} /> Công phu chung{' '}
              <b>{calendar.find((item) => item.eventType === 'practice')?.time ?? '18:00'}</b>
            </p>
          </div>
        )}
      </aside>

      <TouchJoystick onMove={moveScene} />

      <div className="hud-chips">
        <button type="button" className="hud-chip glass" onClick={toggleSeat}>
          <kbd>F</kbd> {seat !== null ? `Đứng dậy · #${seat}` : 'Chọn bồ đoàn'}
        </button>
        <button
          type="button"
          className="hud-chip glass"
          onClick={() => {
            setPanel(null)
            setCommunityOpen(true)
          }}
        >
          <Icon name="message" size={14} /> Đạo tràng
        </button>
      </div>

      <nav className="action-dock glass" aria-label="Pháp môn tu tập">
        <div className="action-dock__scroll">
          {actions.map((action) => (
            <button
              type="button"
              className={activeAction === action.id ? 'selected' : ''}
              key={action.id}
              title={action.hint ? `${action.label} (${action.hint})` : action.label}
              onClick={() => chooseAction(action.id)}
            >
              <Icon name={action.icon} size={18} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <aside className="mo-widget glass" aria-label="Mõ tụng kinh">
        <button
          type="button"
          className="mo-widget__fish"
          aria-label="Gõ mõ (phím Space)"
          onClick={knock}
        >
          <span key={knockPulse} className={knockPulse ? 'is-knocked' : ''}>
            <Icon name="fish" size={26} />
          </span>
          {knockPulse > 0 && (
            <em key={`plus-${knockPulse}`} aria-hidden="true">
              +1
            </em>
          )}
        </button>
        <div className="mo-widget__stats">
          <strong>
            Mõ <b>{knocks.toLocaleString('vi-VN')}</b>
          </strong>
          <small>Tràng hạt {beads}/108</small>
          <button
            type="button"
            className={autoKnock ? 'on' : ''}
            aria-pressed={autoKnock}
            onClick={() => setAutoKnock(!autoKnock)}
          >
            Tự gõ: {autoKnock ? 'Bật' : 'Tắt'}
          </button>
        </div>
      </aside>

      <button type="button" className="feedback-tab" onClick={() => setPanel('feedback')}>
        Góp ý, báo lỗi
      </button>

      {meditating && (
        <div className="chant-indicator">
          <span />
          <span />
          <span />
          <span /> Nam mô A Di Đà Phật
        </div>
      )}
      {phrase && (
        <div className="speech-bubble">
          <strong>{playerName}</strong>
          <span>{phrase}</span>
          <button type="button" aria-label="Đóng câu nói" onClick={() => setPhrase('')}>
            ×
          </button>
        </div>
      )}
      <CommunityOverlay
        playerName={playerName}
        open={communityOpen}
        onClose={() => setCommunityOpen(false)}
        onCall={() => {
          setCommunityOpen(false)
          setCallOpen(true)
        }}
      />
      <VideoCallOverlay
        playerName={playerName}
        open={callOpen}
        onClose={() => setCallOpen(false)}
        onMinimize={() => {
          setCallOpen(false)
          setCommunityOpen(true)
        }}
      />
      {panel && (
        <SystemPanel
          panel={panel}
          practices={practices}
          calendar={calendar}
          playerName={playerName}
          merit={merit}
          beads={beads}
          muted={muted}
          room={room}
          theme={theme}
          wishes={wishes}
          onClose={() => setPanel(null)}
          onNavigate={setPanel}
          onMerit={addMerit}
          onBeads={updateBeads}
          onName={setPlayerName}
          onMuted={setMuted}
          onRoom={setRoom}
          onTheme={setTheme}
          onWish={(wish) => setWishes((current) => [...current, wish].slice(-20))}
          onPhrase={setPhrase}
          onKnock={knock}
          practice={practiceContext}
        />
      )}
      {toast && <div className="toast glass">{toast}</div>}
    </main>
  )
}
