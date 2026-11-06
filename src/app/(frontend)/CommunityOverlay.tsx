'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

type Props = {
  playerName: string
  open: boolean
  onClose: () => void
  onCall: () => void
}

type CallProps = {
  playerName: string
  open: boolean
  onClose: () => void
  onMinimize: () => void
}

type GlyphName =
  | 'bell'
  | 'camera'
  | 'chat'
  | 'close'
  | 'copy'
  | 'invite'
  | 'lotus'
  | 'mic'
  | 'phone'
  | 'screen'
  | 'shield'
  | 'switch'
  | 'users'

function Glyph({ name, size = 18 }: { name: GlyphName; size?: number }) {
  const shapes: Record<GlyphName, ReactNode> = {
    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
    camera: (
      <>
        <rect x="3" y="6" width="14" height="12" rx="3" />
        <path d="m17 10 4-2v8l-4-2" />
      </>
    ),
    chat: <path d="M21 12a8.5 8.5 0 0 1-9 8 10 10 0 0 1-4-.8L3 21l1.5-4A8 8 0 1 1 21 12Z" />,
    close: <path d="m7 7 10 10M17 7 7 17" />,
    copy: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>
    ),
    invite: <path d="M12 5v14M5 12h14" />,
    lotus: (
      <>
        <path d="M12 21c-2.4-1.1-4-3-4-5.3 0-1.7 1-3.4 4-5.5 3 2.1 4 3.8 4 5.5 0 2.3-1.6 4.2-4 5.3Z" />
        <path d="M8.5 13C5.2 11.5 3 12 2 13.2c1.2 4 4.5 6.8 10 7.8M15.5 13c3.3-1.5 5.5-1 6.5.2-1.2 4-4.5 6.8-10 7.8" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
      </>
    ),
    phone: (
      <path d="M7.5 4.5 10 9 8 11c1.2 2.4 2.6 3.8 5 5l2-2 4.5 2.5c.4 2-1 4-3.2 4C9.8 20.5 3.5 14.2 3.5 7.7c0-2.2 2-3.6 4-3.2Z" />
    ),
    screen: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
    shield: <path d="M12 3 5 6v5c0 5 2.8 8.3 7 10 4.2-1.7 7-5 7-10V6l-7-3Z" />,
    switch: (
      <>
        <path d="m8 7 3-3 3 3M11 4v11M16 17l-3 3-3-3M13 20V9" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M16 5.5a3 3 0 0 1 0 5.5M17 14c2 .8 3 2.2 3 4.5V20" />
      </>
    ),
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shapes[name]}
    </svg>
  )
}

const quickPhrases = ['A Di Đà Phật', 'Tùy hỷ công đức', 'Thân tâm an lạc', 'Nguyện cầu bình an']
const presentPeople = [
  ['T', 'Thích Đào Đào', 'Đang thiền'],
  ['A', 'An Hiền', 'An tọa'],
  ['B', 'Thích Từ Bế', 'Đang niệm Phật'],
]

export default function CommunityOverlay({ playerName, open, onClose, onCall }: Props) {
  const [tab, setTab] = useState<'common' | 'private' | 'people'>('common')
  const [draft, setDraft] = useState('')
  const [micReady, setMicReady] = useState(false)
  const [onlineDevotees, setOnlineDevotees] = useState<any[]>([])

  useEffect(() => {
    const updateList = (e?: any) => {
      const list = e?.detail || ((window as any).SupabaseSanctuary?.activeDevotees
        ? Array.from((window as any).SupabaseSanctuary.activeDevotees.values())
        : [])
      setOnlineDevotees(list)
    }
    window.addEventListener('sanctuary_devotees_updated', updateList)
    updateList()
    return () => window.removeEventListener('sanctuary_devotees_updated', updateList)
  }, [])
  const [messages, setMessages] = useState([
    {
      id: 1,
      author: 'Chùa An Nhiên',
      body: 'Chào mừng bạn đến Đạo Tràng Chung. Gửi một lời lành để cùng nhau thực tập chánh niệm.',
      time: 'Bây giờ',
      system: true,
    },
  ])

  useEffect(() => {
    const onIncoming = (e: any) => {
      const msg = e.detail
      if (!msg) return
      const text = (msg.text || msg.body || '').trim()
      if (!text) return
      const myId = (window as any).SANCTUARY_CLIENT_ID || (window as any).SupabaseSanctuary?.getClientId?.() || ''
      if (msg.senderId && msg.senderId === myId && !msg.isSelf) return
      const author = msg.author || msg.name || msg.fullName || msg.senderName || 'Đồng Tu'
      setMessages((current) => {
        if (msg.id && current.some((m) => m.id === msg.id)) return current
        return [
          ...current,
          {
            id: msg.id || Date.now(),
            author,
            body: text,
            time: 'Vừa xong',
            system: false,
          },
        ]
      })
    }
    window.addEventListener('community_chat_message', onIncoming)
    return () => window.removeEventListener('community_chat_message', onIncoming)
  }, [])
  const micRef = useRef<MediaStream | null>(null)

  useEffect(
    () => () => {
      micRef.current?.getTracks().forEach((track) => track.stop())
    },
    [],
  )

  useEffect(() => {
    if (open || !micRef.current) return
    micRef.current.getTracks().forEach((track) => track.stop())
    micRef.current = null
    setMicReady(false)
  }, [open])

  if (!open) return null

  const send = (text = draft) => {
    const body = text.trim()
    if (!body) return
    const myId = (window as any).SANCTUARY_CLIENT_ID || (window as any).SupabaseSanctuary?.getClientId?.() || ''
    const msg = {
      id: Date.now(),
      author: playerName,
      name: playerName,
      fullName: playerName,
      body,
      text: body,
      time: 'Vừa xong',
      system: false,
      senderId: myId,
      clientId: myId,
    }
    setMessages((current) => [...current, msg])
    setDraft('')

    // 1. Broadcast to all clients via Supabase Realtime
    ;(window as any).SupabaseSanctuary?.broadcast?.('ROOM_CHAT', msg)

    // 2. Dispatch locally for 3D speech bubble and room-chat history
    window.dispatchEvent(new CustomEvent('community_chat_message', { detail: { ...msg, isSelf: true } }))
    window.dispatchEvent(new CustomEvent('room-realtime-message', { detail: { type: 'ROOM_CHAT', ...msg } }))
  }

  const toggleMic = async () => {
    if (micReady) {
      micRef.current?.getTracks().forEach((track) => track.stop())
      micRef.current = null
      setMicReady(false)
      return
    }
    try {
      micRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicReady(true)
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: Date.now(),
          author: 'Hệ thống',
          body: 'Không thể mở micro. Hãy kiểm tra quyền micro trong trình duyệt.',
          time: 'Vừa xong',
          system: true,
        },
      ])
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-[#080402]/60 p-3 backdrop-blur-md sm:p-6"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-title"
        className="relative flex h-[min(720px,calc(100svh-32px))] w-[min(980px,100%)] flex-col overflow-hidden rounded-[22px] border border-[#e2bd6e]/55 bg-[radial-gradient(circle_at_50%_0%,rgba(137,44,18,.32),transparent_45%),linear-gradient(160deg,#35150c,#1d0b06_62%,#140704)] text-[#f8eddb] shadow-[0_35px_100px_rgba(0,0,0,.7),0_0_0_5px_rgba(30,12,6,.9),0_0_0_6px_rgba(226,189,110,.2)]"
      >
        <header className="flex min-h-[66px] items-center gap-3 border-b border-[#e2bd6e]/25 px-4 sm:px-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#e2bd6e]/50 bg-[#a75b16]/25 text-[#f5cf76] shadow-[0_0_18px_rgba(226,189,110,.2)]">
            <Glyph name="bell" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="community-title" className="font-display text-lg font-bold text-[#ffe5aa]">
                Đạo Tràng Chung
              </h2>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                {1 + onlineDevotees.length} Đồng Tu Trực Tuyến
              </span>
            </div>
            <p className="truncate text-xs text-[#cbb28f]">Cùng niệm Phật · Cùng gieo lời lành</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof (window as any).startZaloVideoCall === 'function') {
                (window as any).startZaloVideoCall()
                onClose()
              } else {
                onCall()
              }
            }}
            className="hidden h-9 items-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-600/80 px-4 text-xs font-bold text-white shadow-[0_5px_18px_rgba(5,150,105,.22)] transition hover:bg-emerald-500 sm:flex"
          >
            <Glyph name="camera" size={15} /> Gọi Video
          </button>
          <button
            type="button"
            onClick={toggleMic}
            aria-pressed={micReady}
            className={`hidden h-9 items-center gap-2 rounded-full border px-4 text-xs font-bold transition sm:flex ${
              micReady
                ? 'border-emerald-300/40 bg-emerald-600/25 text-emerald-200'
                : 'border-[#e2bd6e]/35 bg-black/20 text-[#e7d2a9] hover:bg-[#e2bd6e]/10'
            }`}
          >
            <Glyph name="mic" size={15} /> {micReady ? 'Tắt mic' : 'Bật mic'}
          </button>
          <button
            type="button"
            aria-label="Đóng Đạo Tràng Chung"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[#e2bd6e]/35 bg-black/20 text-[#e7d2a9] transition hover:bg-[#e2bd6e] hover:text-[#2a1408]"
          >
            <Glyph name="close" size={16} />
          </button>
        </header>

        <nav
          className="flex shrink-0 overflow-x-auto border-b border-[#e2bd6e]/18 bg-black/10 px-3"
          aria-label="Khu vực Đạo Tràng"
        >
          {[
            ['common', 'Đạo Tràng Chung', 'chat'],
            ['private', 'Nhắn tin riêng', 'shield'],
            ['people', `Hiện diện (${onlineDevotees.length + 1})`, 'users'],
          ].map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id as typeof tab)}
              className={`flex h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-xs font-bold transition ${
                tab === id
                  ? 'border-[#f2c766] bg-[#e2bd6e]/10 text-[#ffe5a3]'
                  : 'border-transparent text-[#bba889] hover:text-white'
              }`}
            >
              <Glyph name={icon as GlyphName} size={14} /> {label}
            </button>
          ))}
          <span className="ml-auto hidden items-center gap-2 self-center px-3 text-[11px] text-emerald-300 sm:flex">
            <i className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /> Cục bộ
          </span>
        </nav>

        <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_270px]">
          <div className="flex min-h-0 flex-col border-[#e2bd6e]/18 md:border-r">
            {tab === 'common' && (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                  <p className="flex items-center gap-2 border-b border-[#e2bd6e]/15 pb-3 text-xs font-bold text-[#e4c47f]">
                    <Glyph name="users" size={14} /> Đạo hữu cùng thực tập
                  </p>
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={`ml-auto max-w-[88%] rounded-2xl border p-3.5 ${
                        message.system
                          ? 'mr-auto ml-0 border-[#e2bd6e]/20 bg-[#e2bd6e]/[.07]'
                          : 'border-[#f0b849]/55 bg-gradient-to-br from-[#a86218] to-[#6c310e] shadow-[0_8px_22px_rgba(91,42,10,.24)]'
                      }`}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-5">
                        <strong className="text-xs text-[#ffe7af]">{message.author}</strong>
                        <time className="text-[10px] text-white/45">{message.time}</time>
                      </div>
                      <p className="text-sm leading-relaxed text-[#fff4df]">{message.body}</p>
                    </article>
                  ))}
                </div>
                <div className="border-t border-[#e2bd6e]/18 bg-black/10 p-3">
                  <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
                    {quickPhrases.map((phrase) => (
                      <button
                        type="button"
                        key={phrase}
                        onClick={() => send(phrase)}
                        className="shrink-0 rounded-full border border-[#e2bd6e]/25 bg-[#e2bd6e]/[.06] px-3 py-1.5 text-[11px] text-[#dbc59d] transition hover:bg-[#e2bd6e]/15 hover:text-white"
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                  <form
                    className="flex gap-2"
                    onSubmit={(event: FormEvent) => {
                      event.preventDefault()
                      send()
                    }}
                  >
                    <label className="sr-only" htmlFor="community-message">
                      Gửi lời lành
                    </label>
                    <input
                      id="community-message"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      maxLength={240}
                      placeholder="Gửi lời lành, niệm Phật cùng Đạo Tràng…"
                      className="h-11 min-w-0 flex-1 rounded-full border border-[#e2bd6e]/35 bg-black/25 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#f2c766]"
                    />
                    <button
                      type="submit"
                      className="h-11 rounded-full bg-gradient-to-b from-[#f5cb68] to-[#d8941e] px-5 text-xs font-extrabold text-[#2c1408] shadow-[0_5px_18px_rgba(222,157,32,.22)]"
                    >
                      Gửi
                    </button>
                  </form>
                </div>
              </>
            )}
            {tab === 'private' && (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div className="max-w-sm">
                  <span className="mx-auto grid size-16 place-items-center rounded-full border border-[#e2bd6e]/30 bg-[#e2bd6e]/[.07] text-[#e2bd6e]">
                    <Glyph name="shield" size={26} />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-[#ffe4aa]">Nhắn tin riêng tư</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#bca98a]">
                    Tính năng nhắn riêng sẽ xuất hiện khi có hệ thống tài khoản và đồng bộ thời gian
                    thực.
                  </p>
                </div>
              </div>
            )}
            {tab === 'people' && (
              <div className="grid content-start gap-2 overflow-y-auto p-4 sm:p-5">
                {/* Local user */}
                <article className="flex items-center gap-3 rounded-2xl border border-[#e2bd6e]/40 bg-[#e2bd6e]/[.08] p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#e2bd6e]/50 bg-[#7a3515] font-bold text-[#f4d17f]">
                    {playerName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-[#fff0ce]">{playerName}</strong>
                    <p className="mt-0.5 text-xs text-[#a99474]">Đang tu tập tại chùa · Bản thân</p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                    <i className="size-1.5 rounded-full bg-emerald-400" /> Bạn
                  </span>
                </article>

                {/* Remote live devotees */}
                {onlineDevotees.map((devotee: any) => {
                  const dName = devotee.name || devotee.fullName || 'Đồng Tu'
                  const dDharma = devotee.dharma || devotee.dharmaName || 'Tịnh Niệm'
                  const dSeat = devotee.seatNo || devotee.assignedSeatNo
                  const dId = devotee.id || devotee.clientId
                  return (
                    <article
                      key={dId || dName}
                      className="flex items-center gap-3 rounded-2xl border border-[#e2bd6e]/18 bg-[#e2bd6e]/[.05] p-3 hover:bg-[#e2bd6e]/[.08]"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#e2bd6e]/30 bg-[#5c2810] font-bold text-[#f4d17f]">
                        {dName.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-[#fff0ce]">{dName}</strong>
                        <p className="mt-0.5 text-xs text-[#a99474]">
                          {dDharma ? `PD: ${dDharma} · ` : ''}
                          {dSeat ? `Bồ đoàn #${dSeat}` : 'Sân Chùa'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof (window as any).startZaloVideoCall === 'function') {
                            (window as any).startZaloVideoCall(dId)
                          } else {
                            onCall()
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-600/75 px-3 py-1 text-xs font-bold text-white transition hover:bg-emerald-500"
                        title={`Gọi video cùng ${dName}`}
                      >
                        <Glyph name="camera" size={13} />
                        Gọi Video
                      </button>
                    </article>
                  )
                })}

                {/* Resident monks */}
                {presentPeople.map(([initial, name, status]) => (
                  <article
                    key={name}
                    className="flex items-center gap-3 rounded-2xl border border-[#e2bd6e]/10 bg-black/20 p-3 opacity-75"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#e2bd6e]/20 bg-[#421c0b] text-xs font-bold text-[#d8b86d]">
                      {initial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-[#e8dcc4]">{name}</strong>
                      <p className="mt-0.5 text-xs text-[#8a775d]">{status}</p>
                    </div>
                    <span className="text-[11px] text-amber-200/60">Tịnh tu</span>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="hidden min-h-0 overflow-y-auto bg-black/10 p-4 md:block">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#ebcf91]">
              Đạo hữu hiện diện
            </h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#9f8c70]">
              Những nhân vật đang hiện diện trong cảnh Chánh Điện.
            </p>
            <div className="mt-4 space-y-2">
              {onlineDevotees.map((d: any) => {
                const name = d.name || d.fullName || 'Đồng Tu'
                const seatStr = d.seatNo ? `Bồ đoàn #${d.seatNo}` : 'Sân Chùa'
                return (
                  <div key={d.clientId || d.id || name} className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-full border border-[#f2c766]/30 bg-[#5c2810] text-xs font-bold text-[#f1c86d]">
                      {name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-xs text-[#f5e4c5]">{name}</strong>
                      <span className="text-[10px] text-emerald-300">Trực tuyến · {seatStr}</span>
                    </div>
                  </div>
                )
              })}
              {presentPeople.slice(0, Math.max(1, 3 - onlineDevotees.length)).map(([initial, name, status]) => (
                <div key={name} className="flex items-center gap-2.5 opacity-70">
                  <span className="grid size-8 place-items-center rounded-full bg-[#6f3013] text-xs font-bold text-[#f1c86d]">
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-xs text-[#f5e4c5]">{name}</strong>
                    <span className="text-[10px] text-[#cbb28f]">{status}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof (window as any).startZaloVideoCall === 'function') {
                  (window as any).startZaloVideoCall()
                } else {
                  onCall()
                }
              }}
              className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-600/75 text-xs font-extrabold text-white transition hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,.35)]"
            >
              <Glyph name="camera" size={15} /> Gọi Video Đạo Tràng
            </button>
            <button
              type="button"
              onClick={toggleMic}
              className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#e2bd6e]/30 bg-[#e2bd6e]/[.06] text-xs font-bold text-[#e7d1a5]"
            >
              <Glyph name="mic" size={15} /> {micReady ? 'Tắt mic đàm thoại' : 'Bật mic đàm thoại'}
            </button>
            <div className="mt-5 rounded-2xl border border-[#e2bd6e]/18 bg-black/20 p-3">
              <p className="text-xs font-bold text-[#dfc186]">Phiên thực hành cá nhân</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#9c896e]">
                Tin nhắn chỉ được lưu trong phiên trình duyệt này, chưa đồng bộ đa thiết bị.
              </p>
            </div>
          </aside>
        </div>

        <div className="flex gap-2 border-t border-[#e2bd6e]/18 p-3 sm:hidden">
          <button
            type="button"
            onClick={() => {
              if (typeof (window as any).startZaloVideoCall === 'function') {
                (window as any).startZaloVideoCall()
                onClose()
              } else {
                onCall()
              }
            }}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 text-xs font-bold text-white"
          >
            <Glyph name="camera" size={15} /> Gọi Video
          </button>
          <button
            type="button"
            onClick={toggleMic}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-[#e2bd6e]/30 text-xs font-bold text-[#e6cfa3]"
          >
            <Glyph name="mic" size={15} /> {micReady ? 'Tắt mic' : 'Bật mic'}
          </button>
        </div>
      </section>
    </div>
  )
}

export function VideoCallOverlay({ playerName, open, onClose, onMinimize }: CallProps) {
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [micOn, setMicOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [shieldOn, setShieldOn] = useState(true)
  const [screenOn, setScreenOn] = useState(false)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [seconds, setSeconds] = useState(0)
  const [notice, setNotice] = useState('Đang chờ đạo hữu tham gia…')
  const [lotusKey, setLotusKey] = useState(0)

  const stopAll = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setMicOn(false)
    setCameraOn(false)
    setScreenOn(false)
  }, [])

  useEffect(() => {
    if (!open) return
    setSeconds(0)
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [open])

  useEffect(() => stopAll, [stopAll])

  useEffect(() => {
    if (!open) stopAll()
  }, [open, stopAll])

  const attach = (stream: MediaStream) => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      void videoRef.current.play().catch(() => undefined)
    }
  }

  const openCamera = async (nextFacing = facing) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
        audio: micOn,
      })
      attach(stream)
      setCameraOn(true)
      setScreenOn(false)
      setNotice('Camera của bạn đã sẵn sàng')
    } catch {
      setNotice('Không thể mở camera. Hãy kiểm tra quyền camera trong trình duyệt.')
    }
  }

  const toggleCamera = async () => {
    if (cameraOn || screenOn) {
      streamRef.current?.getVideoTracks().forEach((track) => track.stop())
      streamRef.current?.removeTrack(streamRef.current.getVideoTracks()[0])
      setCameraOn(false)
      setScreenOn(false)
      setNotice('Camera đang tắt · Đang chờ đạo hữu tham gia…')
      return
    }
    await openCamera()
  }

  const toggleMic = async () => {
    const audio = streamRef.current?.getAudioTracks()[0]
    if (audio) {
      audio.enabled = !micOn
      setMicOn(!micOn)
      return
    }
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const track = audioStream.getAudioTracks()[0]
      if (streamRef.current) streamRef.current.addTrack(track)
      else attach(audioStream)
      setMicOn(true)
      setNotice('Micro đã bật')
    } catch {
      setNotice('Không thể mở micro. Hãy kiểm tra quyền micro trong trình duyệt.')
    }
  }

  const shareScreen = async () => {
    if (screenOn) {
      stopAll()
      setNotice('Đã dừng chia sẻ màn hình')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      attach(stream)
      setScreenOn(true)
      setCameraOn(false)
      setMicOn(false)
      setNotice('Đang chia sẻ màn hình')
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setScreenOn(false)
        setNotice('Đã dừng chia sẻ màn hình')
      })
    } catch {
      setNotice('Bạn chưa chọn màn hình để chia sẻ')
    }
  }

  const invite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setNotice('Đã sao chép liên kết mời')
    } catch {
      setNotice('Mở trang này trên thiết bị của đạo hữu để cùng tham gia')
    }
  }

  if (!open) return null

  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  const callButton = (
    label: string,
    icon: GlyphName,
    action: () => void,
    active = false,
    danger = false,
  ) => (
    <button
      type="button"
      onClick={action}
      className="group flex min-w-[62px] flex-col items-center gap-1.5"
    >
      <span
        className={`grid size-11 place-items-center rounded-full border shadow-lg transition group-hover:-translate-y-0.5 ${
          danger
            ? 'border-red-300/30 bg-red-600 text-white'
            : active
              ? 'border-emerald-300/50 bg-emerald-500 text-white'
              : 'border-white/15 bg-white/10 text-[#f4e4c8] backdrop-blur-md'
        }`}
      >
        <Glyph name={icon} size={18} />
      </span>
      <span className="text-[10px] font-semibold text-white/70">{label}</span>
    </button>
  )

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-title"
      className="fixed inset-0 z-[80] overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#3f190c,#190905_60%,#080302)] text-white"
    >
      <header className="absolute inset-x-0 top-0 z-10 flex items-start gap-3 p-3 sm:p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#e2bd6e]/50 bg-[#a95a16]/35 text-[#f5cf76] shadow-[0_0_22px_rgba(226,189,110,.24)]">
          <Glyph name="bell" size={18} />
        </span>
        <div className="min-w-0">
          <h2
            id="call-title"
            className="truncate text-sm font-extrabold text-[#fff0cc] sm:text-base"
          >
            Đạo Tràng Chung — Gọi Video Đạo Hữu
          </h2>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-[#bca587]">
            <span>Trình duyệt trực tiếp</span>
            <span className="text-emerald-300">Local preview</span>
            <span>1 người</span>
          </p>
        </div>
        <span className="absolute left-1/2 top-14 -translate-x-1/2 rounded-full border border-[#e2bd6e]/30 bg-black/30 px-3 py-1 text-[11px] font-bold tabular-nums text-[#f2ce76] sm:top-4">
          {time}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => {
              stopAll()
              onMinimize()
            }}
            className="hidden h-9 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-xs font-semibold text-white/75 sm:flex"
          >
            Thu nhỏ
          </button>
          <button
            type="button"
            aria-label="Đóng cuộc gọi"
            onClick={() => {
              stopAll()
              onClose()
            }}
            className="grid size-9 place-items-center rounded-full border border-white/15 bg-white/10 text-white/70"
          >
            <Glyph name="close" size={16} />
          </button>
        </div>
      </header>

      <div className="absolute left-1/2 top-[76px] z-10 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-300/25 bg-[#073b31]/65 px-4 py-1.5 text-[10px] text-emerald-100 backdrop-blur-md sm:flex">
        <Glyph name="shield" size={13} /> Chống hú đang bật · Dùng tai nghe khi hai máy ở gần nhau
      </div>

      <div className="absolute inset-0 grid place-items-center px-5 pb-28 pt-20">
        {(cameraOn || screenOn) && (
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label={screenOn ? 'Màn hình đang chia sẻ' : 'Camera của bạn'}
            className={`h-full w-full object-cover ${cameraOn && facing === 'user' ? '-scale-x-100' : ''}`}
          />
        )}
        {!cameraOn && !screenOn && (
          <div className="text-center">
            <span className="relative mx-auto grid size-24 place-items-center rounded-full border border-[#e2bd6e]/30 bg-[#e2bd6e]/[.05] text-[#efc96d] shadow-[0_0_0_18px_rgba(226,189,110,.025)]">
              <Glyph name="lotus" size={34} />
              <i className="absolute inset-[-1px] animate-[spin_14s_linear_infinite] rounded-full border border-dashed border-emerald-400/35" />
            </span>
            <h3 className="mt-6 text-base font-extrabold text-[#fff0ce]">{notice}</h3>
            <p className="mt-2 text-xs text-emerald-300/80">
              Nhấn “Mời bạn” để sao chép liên kết trang
            </p>
          </div>
        )}
        {(cameraOn || screenOn) && (
          <div className="absolute bottom-32 right-4 w-28 overflow-hidden rounded-2xl border border-[#e2bd6e]/60 bg-black/60 p-2 shadow-xl sm:right-6 sm:top-16 sm:bottom-auto sm:h-36">
            <div className="grid h-full place-items-center rounded-xl bg-black/35 text-center">
              <span className="text-xs font-bold text-[#ffe2a1]">{playerName}</span>
              <small className="text-[10px] text-white/55">
                {screenOn ? 'Đang chia sẻ' : 'Bạn'}
              </small>
            </div>
          </div>
        )}
        {lotusKey > 0 && (
          <span
            key={lotusKey}
            className="pointer-events-none absolute bottom-28 left-1/2 animate-[lantern-rise_3s_ease-out_forwards] text-pink-300"
          >
            <Glyph name="lotus" size={32} />
          </span>
        )}
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-10 flex justify-start overflow-x-auto bg-gradient-to-t from-black/80 via-black/45 to-transparent px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-9 [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2 sm:gap-3">
          {callButton(micOn ? 'Tắt mic' : 'Mic', 'mic', () => void toggleMic(), micOn)}
          {callButton('Chống hú', 'shield', () => setShieldOn((value) => !value), shieldOn)}
          {callButton(
            cameraOn ? 'Tắt camera' : 'Camera',
            'camera',
            () => void toggleCamera(),
            cameraOn,
          )}
          {callButton(
            screenOn ? 'Dừng chia sẻ' : 'Chia sẻ',
            'screen',
            () => void shareScreen(),
            screenOn,
          )}
          {callButton('Đổi cam', 'switch', () => {
            const next = facing === 'user' ? 'environment' : 'user'
            setFacing(next)
            if (cameraOn) void openCamera(next)
          })}
          {callButton('Mời bạn', 'invite', () => void invite())}
          {callButton('Thả sen', 'lotus', () => {
            setLotusKey((value) => value + 1)
            setNotice('Một đóa sen đã được thả vào Đạo Tràng')
          })}
          {callButton(
            'Kết thúc',
            'phone',
            () => {
              stopAll()
              onClose()
            },
            false,
            true,
          )}
        </div>
      </footer>
    </section>
  )
}
