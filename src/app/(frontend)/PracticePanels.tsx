'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { appFontFamily, whenAppFontReady } from './app-font'
import { LEVELS, SEATS, SEAT_OCCUPANTS, levelFor } from './temple-data'

export type PracticePanelId =
  | 'seats'
  | 'breath'
  | 'teaching'
  | 'petition'
  | 'certificate'
  | 'profile'
  | 'lantern'
  | 'release'

export const practicePanelTitles: Record<PracticePanelId, string> = {
  seats: `Sơ đồ ${SEATS.length} bồ đoàn`,
  breath: 'Thiền thở 4 · 2 · 6',
  teaching: 'Lời Phật dạy theo tâm trạng',
  petition: 'Sớ cầu an · cầu siêu',
  certificate: 'Bằng công đức tu học',
  profile: 'Hồ sơ tu tập',
  lantern: 'Gửi lời chúc · Thả hoa đăng',
  release: 'Phóng sanh',
}

export function isPracticePanel(panel: string): panel is PracticePanelId {
  return panel in practicePanelTitles
}

export type Petition = {
  kind: 'an' | 'sieu'
  name: string
  address: string
  wish: string
  date: string
}

export type PracticeContext = {
  playerName: string
  dharmaName: string
  merit: number
  knocks: number
  beads: number
  seat: number | null
  petitions: Petition[]
  onSeat: (seat: number) => void
  onStand: () => void
  onName: (name: string) => void
  onDharma: (name: string) => void
  onPetition: (petition: Petition) => void
  onMerit: (amount: number, message: string) => void
  onWish: (wish: string) => void
  onNavigate: (panel: 'wardrobe' | 'meditate' | 'seats' | 'certificate') => void
  onClose: () => void
}

const gold = 'text-[#f2c766]'
const primaryButton =
  'h-10 rounded-full bg-gradient-to-b from-[#f4d27e] to-[#d9a83f] px-5 text-sm font-bold text-[#2a1b0c] shadow-[0_6px_16px_rgba(217,168,63,.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50'
const ghostButton =
  'h-9 rounded-full border border-[#e2bd6e]/25 bg-[#e2bd6e]/[.06] px-4 text-xs font-semibold text-white/85 transition hover:bg-[#e2bd6e]/15'
const fieldClass =
  'w-full rounded-xl border border-[#e2bd6e]/25 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#f2c766]/60'

function dailyCount(key: string) {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const saved = JSON.parse(window.localStorage.getItem(key) ?? 'null') as {
      day: string
      count: number
    } | null
    return { today, count: saved?.day === today ? saved.count : 0 }
  } catch {
    return { today, count: 0 }
  }
}
function bumpDaily(key: string) {
  const { today, count } = dailyCount(key)
  window.localStorage.setItem(key, JSON.stringify({ day: today, count: count + 1 }))
  return count + 1
}

export default function PracticeBody({
  panel,
  ctx,
}: {
  panel: PracticePanelId
  ctx: PracticeContext
}) {
  if (panel === 'seats') return <SeatsView ctx={ctx} />
  if (panel === 'breath') return <BreathView ctx={ctx} />
  if (panel === 'teaching') return <TeachingView />
  if (panel === 'petition') return <PetitionView ctx={ctx} />
  if (panel === 'certificate') return <CertificateView ctx={ctx} />
  if (panel === 'profile') return <ProfileView ctx={ctx} />
  if (panel === 'lantern') return <LanternView ctx={ctx} />
  return <ReleaseView ctx={ctx} />
}

function SeatsView({ ctx }: { ctx: PracticeContext }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-[#f2c766]/25 bg-gradient-to-b from-[#8a3214]/55 to-[#8a3214]/5 px-4 py-3 text-center">
        <p className="font-serif text-sm font-bold text-[#ffe09a]">Tam Bảo · Chánh Điện</p>
        <p className="mt-0.5 text-[13px] text-white/60">Bàn thờ Phật · Lư hương · Đèn nến</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
        {(['left', 'right'] as const).map((side, index) => (
          <Fragment key={side}>
            {index === 1 && (
              <div className="hidden w-6 place-items-center rounded-full bg-[repeating-linear-gradient(180deg,rgba(226,189,110,.18)_0_6px,transparent_6px_12px)] sm:grid">
                <span className="sr-only">Lối đi giữa</span>
              </div>
            )}
            <section aria-label={side === 'left' ? 'Dãy bên trái' : 'Dãy bên phải'}>
              <p className="mb-1.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#e2bd6e]/80">
                {side === 'left' ? 'Dãy tả' : 'Dãy hữu'}
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {SEATS.filter((seat) => (side === 'left' ? seat.x < 0 : seat.x > 0)).map((seat) => {
                  const remoteDevotees = (window as any).sanctuarySeats || []
                  const remoteSeat = remoteDevotees.find((s: any) => s.seatNo === seat.no)
                  const remoteOccupant = (remoteSeat && remoteSeat.occupied && !remoteSeat.isUser && remoteSeat.remoteClientId)
                    ? (remoteSeat.name || 'Đồng Tu')
                    : null
                  const occupant = SEAT_OCCUPANTS[seat.no] || remoteOccupant
                  const mine = ctx.seat === seat.no
                  return (
                    <button
                      key={seat.no}
                      type="button"
                      disabled={Boolean(occupant) || mine}
                      aria-label={`Bồ đoàn số ${seat.no}, hàng ${seat.row + 1}${
                        mine
                          ? ', bạn đang ngồi'
                          : occupant
                            ? `, ${occupant} đang ngồi`
                            : ', còn trống'
                      }`}
                      onClick={() => {
                        ctx.onSeat(seat.no)
                        ctx.onClose()
                      }}
                      className={`flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1.5 transition ${
                        mine
                          ? 'border-[#f2c766]/70 bg-[#f2c766]/15'
                          : occupant
                            ? 'cursor-default border-white/8 bg-white/[.03] opacity-70'
                            : 'border-[#e2bd6e]/25 bg-[#e2bd6e]/[.06] hover:border-[#f2c766]/50 hover:bg-[#e2bd6e]/15'
                      }`}
                    >
                      <span className="text-xs font-semibold text-white/55">#{seat.no}</span>
                      <span
                        className={`h-3.5 w-7 rounded-[50%] shadow-[inset_0_-3px_0_rgba(0,0,0,.25)] ${
                          occupant ? 'bg-[#6d3a2c]' : 'bg-[#a8453a]'
                        }`}
                      />
                      <span
                        className={`max-w-full truncate px-0.5 text-[11px] font-semibold ${
                          mine ? gold : occupant ? 'text-white/75' : 'text-white/50'
                        }`}
                      >
                        {mine ? 'Bạn' : occupant ? occupant.replace('Thích ', '') : 'Trống'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          </Fragment>
        ))}
      </div>
      <p className="text-center text-[13px] text-white/55">
        {SEATS.length - Object.keys(SEAT_OCCUPANTS).length - (ctx.seat ? 1 : 0)} bồ đoàn còn trống ·
        hàng trên cùng gần Tam Bảo nhất. Di chuyển (phím hoặc cần điều khiển) để đứng dậy.
      </p>
      {ctx.seat !== null && (
        <button
          type="button"
          className={`${ghostButton} justify-self-center`}
          onClick={() => {
            ctx.onStand()
            ctx.onClose()
          }}
        >
          Đứng dậy rời bồ đoàn #{ctx.seat}
        </button>
      )}
    </div>
  )
}

const breathPhases = [
  { label: 'Hít vào', note: 'Tĩnh lặng', seconds: 4, scale: 1 },
  { label: 'Giữ hơi', note: 'An trú', seconds: 2, scale: 1 },
  { label: 'Thở ra', note: 'Mỉm cười', seconds: 6, scale: 0.55 },
]

function BreathView({ ctx }: { ctx: PracticeContext }) {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState(2)
  const [remaining, setRemaining] = useState(0)
  const [cycles, setCycles] = useState(0)
  const onMerit = useRef(ctx.onMerit)
  onMerit.current = ctx.onMerit

  useEffect(() => {
    if (!running) return
    const current = breathPhases[phase]
    setRemaining(current.seconds)
    const tick = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    const next = window.setTimeout(() => {
      if (phase === 2) {
        setCycles((count) => {
          const done = count + 1
          if (done % 3 === 0) onMerit.current(5, `Đã thở chánh niệm ${done} vòng · +5 công đức`)
          return done
        })
      }
      setPhase((value) => (value + 1) % breathPhases.length)
    }, current.seconds * 1000)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(next)
    }
  }, [running, phase])

  const current = breathPhases[phase]
  return (
    <div className="grid justify-items-center gap-5 py-2">
      <div className="relative grid size-60 place-items-center">
        <div className="absolute inset-0 rounded-full border border-[#f2c766]/20" />
        <div
          className="absolute inset-3 rounded-full bg-[radial-gradient(circle_at_40%_35%,rgba(255,226,160,.55),rgba(217,168,63,.18)_60%,transparent_72%)] shadow-[0_0_60px_rgba(242,199,102,.25)]"
          style={{
            transform: `scale(${running ? current.scale : 0.7})`,
            transition: `transform ${running ? current.seconds : 0.6}s ease-in-out`,
          }}
        />
        <div className="relative text-center">
          <p className="font-serif text-2xl font-bold text-[#ffe7b0]">
            {running ? current.label : 'Sẵn sàng'}
          </p>
          <p className="mt-1 text-xs text-white/65">
            {running ? `${current.note} · ${remaining}s` : 'Ngồi thẳng, thả lỏng vai'}
          </p>
        </div>
      </div>
      <p className="text-center text-xs text-white/65">
        Hít vào 4 giây · Giữ 2 giây · Thở ra 6 giây. Mỗi 3 vòng nhận +5 công đức.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            if (!running) setPhase(0)
            setRunning(!running)
          }}
        >
          {running ? 'Tạm dừng' : 'Bắt đầu hơi thở'}
        </button>
        <span className="text-xs text-white/60">
          Đã thở <b className={gold}>{cycles}</b> vòng
        </span>
      </div>
    </div>
  )
}

const teachings = [
  {
    mood: 'Lo âu',
    quote:
      'Người có tâm không bị tham ái thấm ướt, không bị sân hận chi phối, vượt qua thiện ác, người tỉnh thức ấy không còn sợ hãi.',
    source: 'Kinh Pháp Cú · kệ 39',
    practice:
      'Thở chậm ba hơi thật sâu. Nhận biết thân đang ngồi yên, tâm đang quan sát và nhắc mình: hiện tại này tôi đang an toàn.',
  },
  {
    mood: 'Giận dữ',
    quote:
      'Hận thù không bao giờ dập tắt được hận thù. Chỉ có tình thương mới dập tắt được hận thù. Đó là định luật ngàn đời.',
    source: 'Kinh Pháp Cú · kệ 5',
    practice:
      'Đặt tay lên ngực, thở vào biết cơn giận đang có mặt, thở ra ôm ấp nó như ôm một em bé. Chưa nói gì cho tới khi hơi thở dịu lại.',
  },
  {
    mood: 'Buồn bã',
    quote:
      'Từ ái luyến sinh sầu, từ ái luyến sinh sợ. Ai thoát khỏi ái luyến, không sầu, đâu sợ hãi.',
    source: 'Kinh Pháp Cú · kệ 212',
    practice:
      'Cho phép nỗi buồn được có mặt mà không xua đuổi. Đi thiền hành vài bước chậm, mỗi bước chạm đất là một lần trở về.',
  },
  {
    mood: 'Mệt mỏi',
    quote:
      'Hãy tự mình là hòn đảo của chính mình, hãy nương tựa nơi chính mình, không nương tựa một ai khác.',
    source: 'Kinh Trường Bộ · Kinh Đại Bát Niết Bàn',
    practice:
      'Nằm hoặc ngồi tựa lưng, buông lỏng từ đỉnh đầu xuống bàn chân. Mỗi hơi thở ra là một lần buông bớt gánh nặng.',
  },
  {
    mood: 'Cầu an',
    quote:
      'Tâm dẫn đầu các pháp, tâm làm chủ, tâm tạo. Nếu với tâm thanh tịnh mà nói hay làm, an lạc bước theo sau như bóng không rời hình.',
    source: 'Kinh Pháp Cú · kệ 2',
    practice:
      'Niệm danh hiệu Phật A Di Đà mười lần, mỗi câu một hơi thở, rồi hồi hướng sự an lành ấy đến người thân.',
  },
  {
    mood: 'Tri ân',
    quote: 'Có hai hạng người khó tìm được ở đời: người làm ơn trước và người biết ơn, nhớ ơn.',
    source: 'Kinh Tăng Chi Bộ · Chương Hai Pháp',
    practice:
      'Nghĩ đến ba người đã giúp bạn trong tuần này. Gửi đến mỗi người một lời cảm ơn, dù chỉ trong tâm.',
  },
]

function TeachingView() {
  const [index, setIndex] = useState(0)
  const item = teachings[index]
  return (
    <div className="grid gap-4">
      <p className="text-sm text-white/70">Hôm nay tâm trạng bạn thế nào?</p>
      <div className="flex flex-wrap gap-2">
        {teachings.map((entry, i) => (
          <button
            key={entry.mood}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-8 rounded-full border px-3.5 text-xs font-semibold transition ${
              i === index
                ? 'border-[#f2c766]/70 bg-[#f2c766]/15 text-[#ffe09a]'
                : 'border-[#e2bd6e]/25 bg-[#e2bd6e]/[.06] text-white/80 hover:bg-[#e2bd6e]/15'
            }`}
          >
            {entry.mood}
          </button>
        ))}
      </div>
      <blockquote className="rounded-2xl border border-[#f2c766]/20 bg-gradient-to-b from-[#f2c766]/10 to-transparent p-5">
        <p className="font-serif text-[17px] leading-relaxed text-[#fff1d0]">“{item.quote}”</p>
        <footer className="mt-3 text-xs text-[#f2c766]/80">— {item.source}</footer>
      </blockquote>
      <div className="rounded-xl bg-[#e2bd6e]/[.06] p-4 text-sm leading-relaxed text-white/80">
        <b className={gold}>Gợi ý thực hành: </b>
        {item.practice}
      </div>
    </div>
  )
}

const quickWishes = {
  an: ['Bình an, sức khỏe', 'Gia đạo an khang', 'Phước huệ tăng trưởng', 'Thi cử hanh thông'],
  sieu: [
    'Hương linh siêu thoát',
    'Vãng sanh Tịnh Độ',
    'Nghiệp chướng tiêu trừ',
    'Cửu huyền thất tổ',
  ],
}

function PetitionView({ ctx }: { ctx: PracticeContext }) {
  const [kind, setKind] = useState<'an' | 'sieu'>('an')
  const [name, setName] = useState(ctx.playerName)
  const [address, setAddress] = useState('')
  const [wish, setWish] = useState('')
  const [error, setError] = useState('')
  const latest = ctx.petitions[ctx.petitions.length - 1]

  const submit = () => {
    if (name.trim().length < 2) return setError('Vui lòng ghi họ tên (ít nhất 2 ký tự).')
    if (wish.trim().length < 4) return setError('Vui lòng ghi tâm nguyện chí thành.')
    setError('')
    ctx.onPetition({
      kind,
      name: name.trim().slice(0, 80),
      address: address.trim().slice(0, 120),
      wish: wish.trim().slice(0, 400),
      date: new Date().toISOString(),
    })
    setWish('')
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-black/25 p-1">
        {(
          [
            ['an', 'Sớ cầu an'],
            ['sieu', 'Sớ cầu siêu'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`h-9 rounded-full text-xs font-bold transition ${
              kind === value ? 'bg-[#f2c766] text-[#2a1b0c]' : 'text-white/75 hover:bg-[#e2bd6e]/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="grid gap-1.5 text-xs font-semibold text-white/75">
        {kind === 'an' ? 'Họ tên, năm sinh người cầu an' : 'Họ tên, năm mất hương linh'}
        <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-white/75">
        Địa chỉ · Bản quán
        <input
          className={fieldClass}
          value={address}
          placeholder="Tỉnh, thành phố"
          onChange={(e) => setAddress(e.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-white/75">
        Tâm nguyện chí thành
        <textarea
          className={`${fieldClass} min-h-20 resize-none`}
          value={wish}
          onChange={(e) => setWish(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {quickWishes[kind].map((item) => (
          <button
            key={item}
            type="button"
            className="h-7 rounded-full border border-[#e2bd6e]/25 bg-[#e2bd6e]/[.06] px-3 text-[13px] text-white/80 hover:bg-[#e2bd6e]/15"
            onClick={() => setWish(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-[#ff9b8a]">{error}</p>}
      <button type="button" className={primaryButton} onClick={submit}>
        Dâng sớ lên Tam Bảo · +25 công đức
      </button>
      {latest && (
        <article className="relative overflow-hidden rounded-2xl border-2 border-[#a3261c]/60 bg-[#f4e6c6] p-5 text-[#3a2414]">
          <p className="text-center font-serif text-sm font-bold tracking-wide text-[#9c2a1d]">
            {latest.kind === 'an' ? 'SỚ CẦU AN' : 'SỚ CẦU SIÊU'}
          </p>
          <p className="mt-3 text-sm">
            <b>{latest.name}</b>
            {latest.address && <> · {latest.address}</>}
          </p>
          <p className="mt-2 font-serif text-[15px] italic leading-relaxed">“{latest.wish}”</p>
          <p className="mt-3 text-[13px] text-[#6b4a2c]">
            Dâng ngày {new Date(latest.date).toLocaleDateString('vi-VN')}
          </p>
          <span className="absolute bottom-3 right-4 grid size-16 rotate-[-12deg] place-items-center rounded-full border-[3px] border-[#b3261e] text-center font-serif text-[11px] font-bold leading-tight text-[#b3261e]">
            CHÙA
            <br />
            AN NHIÊN
          </span>
        </article>
      )}
      {ctx.petitions.length > 1 && (
        <p className="text-center text-[13px] text-white/55">
          Đã dâng {ctx.petitions.length} lá sớ trong thời gian tu tập.
        </p>
      )}
    </div>
  )
}

function drawCertificate(
  canvas: HTMLCanvasElement,
  data: { name: string; dharma: string; merit: number; knocks: number; beads: number },
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const font = appFontFamily()
  const w = (canvas.width = 1200)
  const h = (canvas.height = 840)
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#f8ecd2')
  bg.addColorStop(1, '#ead6ac')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#9c2a1d'
  ctx.lineWidth = 14
  ctx.strokeRect(28, 28, w - 56, h - 56)
  ctx.strokeStyle = '#c99a35'
  ctx.lineWidth = 3
  ctx.strokeRect(52, 52, w - 104, h - 104)
  const level = levelFor(data.merit)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#9c2a1d'
  ctx.font = `700 30px ${font}`
  ctx.fillText('CHÙA AN NHIÊN · CHỨNG NHẬN', w / 2, 140)
  ctx.font = `700 68px ${font}`
  ctx.fillText('BẰNG CÔNG ĐỨC TU HỌC', w / 2, 230)
  ctx.fillStyle = '#5b3a1e'
  ctx.font = `26px ${font}`
  ctx.fillText('Trân trọng ghi nhận hành giả', w / 2, 300)
  ctx.fillStyle = '#2f1d0e'
  ctx.font = `700 60px ${font}`
  ctx.fillText(data.name, w / 2, 380)
  if (data.dharma) {
    ctx.font = `italic 400 30px ${font}`
    ctx.fillStyle = '#7a4a24'
    ctx.fillText(`Pháp danh: ${data.dharma}`, w / 2, 428)
  }
  ctx.font = `28px ${font}`
  ctx.fillStyle = '#3a2414'
  ctx.fillText(`Đạt bậc Cấp ${level.level} · ${level.name}`, w / 2, 500)
  ctx.fillText(
    `${data.merit.toLocaleString('vi-VN')} công đức · ${data.knocks.toLocaleString('vi-VN')} tiếng mõ · ${data.beads} hạt niệm`,
    w / 2,
    548,
  )
  ctx.font = `italic 400 24px ${font}`
  ctx.fillStyle = '#6b4a2c'
  ctx.fillText('Nguyện đem công đức này hướng về khắp tất cả', w / 2, 612)
  const now = new Date()
  ctx.textAlign = 'left'
  ctx.font = `22px ${font}`
  ctx.fillText(
    `Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`,
    120,
    730,
  )
  ctx.save()
  ctx.translate(w - 220, 690)
  ctx.rotate(-0.18)
  ctx.strokeStyle = '#b3261e'
  ctx.fillStyle = 'rgba(179,38,30,.08)'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(0, 0, 82, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, 68, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#b3261e'
  ctx.textAlign = 'center'
  ctx.font = `700 24px ${font}`
  ctx.fillText('CHÙA', 0, -8)
  ctx.fillText('AN NHIÊN', 0, 24)
  ctx.restore()
}

function CertificateView({ ctx }: { ctx: PracticeContext }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState('')
  const name = ctx.playerName || 'Đạo hữu'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    const render = () => {
      if (cancelled) return
      drawCertificate(canvas, {
        name,
        dharma: ctx.dharmaName,
        merit: ctx.merit,
        knocks: ctx.knocks,
        beads: ctx.beads,
      })
      setImage(canvas.toDataURL('image/png'))
    }
    render()
    // Canvas text needs the web font loaded; redraw once it is available.
    whenAppFontReady(['400', '700', 'italic 400']).then(render)
    return () => {
      cancelled = true
    }
  }, [name, ctx.dharmaName, ctx.merit, ctx.knocks, ctx.beads])

  return (
    <div className="grid gap-4">
      <canvas ref={canvasRef} className="hidden" />
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- generated data URL preview
        <img
          src={image}
          alt="Xem trước bằng công đức"
          className="w-full rounded-xl shadow-[0_10px_30px_rgba(0,0,0,.35)]"
        />
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <a
          className={`${primaryButton} inline-flex items-center`}
          href={image || undefined}
          download={`bang-cong-duc-${name.replace(/\s+/g, '-').toLowerCase()}.png`}
        >
          Tải bằng (PNG)
        </a>
        <button type="button" className={ghostButton} onClick={() => ctx.onNavigate('meditate')}>
          Hẹn giờ khóa lễ
        </button>
      </div>
      <p className="text-center text-[13px] text-white/55">
        Bằng cập nhật theo công đức, số tiếng mõ và hạt niệm hiện tại của bạn.
      </p>
    </div>
  )
}

const dharmaNames = [
  'Tâm An',
  'Diệu Hạnh',
  'Minh Tuệ',
  'Thiện Tâm',
  'Nhật Tâm',
  'Diệu Liên',
  'Chơn Tịnh',
  'Hạnh Nguyên',
  'Từ Quang',
  'Quảng Hiền',
]

function ProfileView({ ctx }: { ctx: PracticeContext }) {
  const [name, setName] = useState(ctx.playerName)
  const [dharma, setDharma] = useState(ctx.dharmaName)
  const level = levelFor(ctx.merit)
  const stats = [
    ['Công đức', ctx.merit.toLocaleString('vi-VN')],
    ['Tiếng mõ', ctx.knocks.toLocaleString('vi-VN')],
    ['Chuỗi niệm', `${ctx.beads}/108`],
    ['Lá sớ', String(ctx.petitions.length)],
  ]
  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-4">
        <span className="player-portrait !size-14">
          <i />
          <b />
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{ctx.playerName}</p>
          <p className="text-xs text-white/65">
            {ctx.dharmaName ? `Pháp danh ${ctx.dharmaName} · ` : ''}Cấp {level.level} · {level.name}
          </p>
          <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
            <i
              className="block h-full rounded-full bg-gradient-to-r from-[#f2c766] to-[#ffe3a0]"
              style={{ width: `${Math.round(level.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[12.5px] text-white/50">
            {level.next === null
              ? 'Đã viên mãn bậc cao nhất'
              : `Còn ${level.next - ctx.merit} công đức để lên cấp`}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-[#e2bd6e]/[.06] px-2 py-3 text-center">
            <p className={`text-base font-bold ${gold}`}>{value}</p>
            <p className="text-[12.5px] text-white/55">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-semibold text-white/75">
          Họ và tên đạo hữu
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-white/75">
          Pháp danh
          <span className="flex gap-2">
            <input
              className={fieldClass}
              value={dharma}
              placeholder="Chưa có"
              onChange={(e) => setDharma(e.target.value)}
            />
            <button
              type="button"
              className={`${ghostButton} shrink-0`}
              onClick={() => setDharma(dharmaNames[Math.floor(Math.random() * dharmaNames.length)])}
            >
              Gợi ý
            </button>
          </span>
        </label>
      </div>
      <button
        type="button"
        className={`${primaryButton} justify-self-start`}
        onClick={() => {
          if (name.trim().length >= 2) ctx.onName(name.trim().slice(0, 40))
          ctx.onDharma(dharma.trim().slice(0, 40))
          ctx.onMerit(0, 'Đã lưu hồ sơ tu tập')
        }}
      >
        Lưu thông tin
      </button>
      <div className="grid gap-2">
        <p className="text-xs font-bold tracking-wide text-white/70">CÁC BẬC TU HỌC</p>
        {LEVELS.map((item, index) => {
          const reached = ctx.merit >= item.min
          const current = level.level === index + 1
          return (
            <div
              key={item.name}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                current ? 'bg-[#f2c766]/12 ring-1 ring-[#f2c766]/40' : 'bg-white/[.04]'
              }`}
            >
              <span
                className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                  reached ? 'bg-[#f2c766] text-[#2a1b0c]' : 'bg-white/10 text-white/50'
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-[13px] text-white/55">
                  {item.note} · từ {item.min} công đức
                </p>
              </div>
              <span className="text-[13px] text-white/60">
                {current ? 'Đang tu tập' : reached ? 'Đã đạt' : ''}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={ghostButton} onClick={() => ctx.onNavigate('wardrobe')}>
          Y phục tu tập
        </button>
        <button type="button" className={ghostButton} onClick={() => ctx.onNavigate('seats')}>
          {ctx.seat ? `Bồ đoàn #${ctx.seat}` : 'Chọn bồ đoàn'}
        </button>
        <button type="button" className={ghostButton} onClick={() => ctx.onNavigate('certificate')}>
          Bằng công đức
        </button>
      </div>
    </div>
  )
}

const lanternTiers = [
  { name: 'Tâm Hương', merit: 10, blessing: 'Thân tâm an tịnh', color: '#f0c070' },
  { name: 'Sen Vàng', merit: 20, blessing: 'Phước lành vô lượng', color: '#f2c766' },
  { name: 'Hoa Đăng', merit: 30, blessing: 'Gia đạo an khang', color: '#f08a6a' },
  { name: 'Tràng Hạt', merit: 50, blessing: 'Bồ đề tâm kiên cố', color: '#c79a5b' },
]

function LanternView({ ctx }: { ctx: PracticeContext }) {
  const [tier, setTier] = useState(2)
  const [wish, setWish] = useState('')
  const [released, setReleased] = useState(0)
  const selected = lanternTiers[tier]

  const release = () => {
    const count = bumpDaily('chua-an-nhien-lantern')
    const text = wish.trim() || selected.blessing
    ctx.onWish(`${selected.name}: ${text}`.slice(0, 200))
    if (count <= 5)
      ctx.onMerit(selected.merit, `Đã thả ${selected.name} · +${selected.merit} công đức`)
    else
      ctx.onMerit(0, 'Đèn đã thả. Hôm nay đã đủ công đức từ hoa đăng, tâm thành vẫn được ghi nhận.')
    setReleased((value) => value + 1)
    setWish('')
  }

  return (
    <div className="grid gap-4">
      <div className="relative h-40 overflow-hidden rounded-2xl bg-gradient-to-b from-[#0f2133] via-[#1b3954] to-[#2a5a6e]">
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0b2a3a] to-transparent" />
        {released > 0 && (
          <span
            key={released}
            className="lantern-rise absolute bottom-6 left-1/2 block h-9 w-8 -translate-x-1/2 rounded-[40%_40%_30%_30%]"
            style={{
              background: `radial-gradient(circle at 50% 60%, #fff3c4, ${selected.color})`,
              boxShadow: `0 0 26px ${selected.color}`,
            }}
          />
        )}
        <p className="absolute left-4 top-3 text-[13px] text-white/60">Hồ sen An Nhiên</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {lanternTiers.map((item, index) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setTier(index)}
            className={`rounded-xl border px-2 py-3 text-center transition ${
              index === tier
                ? 'border-[#f2c766]/70 bg-[#f2c766]/12'
                : 'border-[#e2bd6e]/25 bg-[#e2bd6e]/[.06] hover:bg-[#e2bd6e]/15'
            }`}
          >
            <p className="text-sm font-bold">{item.name}</p>
            <p className={`text-xs font-semibold ${gold}`}>+{item.merit} công đức</p>
            <p className="mt-0.5 text-[12.5px] text-white/55">{item.blessing}</p>
          </button>
        ))}
      </div>
      <input
        className={fieldClass}
        value={wish}
        maxLength={160}
        placeholder={`Lời chúc kèm theo (mặc định: ${selected.blessing})`}
        onChange={(e) => setWish(e.target.value)}
      />
      <button type="button" className={primaryButton} onClick={release}>
        Thả đèn
      </button>
    </div>
  )
}

const creatures = [
  { id: 'bird', name: 'Chim bồ câu', note: 'Bay về trời xanh tự do' },
  { id: 'fish', name: 'Cá chép', note: 'Bơi về dòng nước trong' },
  { id: 'turtle', name: 'Rùa vàng', note: 'Trở về hồ sen an lành' },
]

function ReleaseView({ ctx }: { ctx: PracticeContext }) {
  const [choice, setChoice] = useState(0)
  const [run, setRun] = useState(0)
  const creature = creatures[choice]
  const flock = useMemo(() => Array.from({ length: 6 }, (_, i) => i), [])

  const release = () => {
    setRun((value) => value + 1)
    const count = bumpDaily('chua-an-nhien-release')
    if (count === 1) ctx.onMerit(15, `Phóng sanh ${creature.name.toLowerCase()} · +15 công đức`)
    else
      ctx.onMerit(
        0,
        `${creature.name} đã về với tự nhiên. Công đức phóng sanh nhận mỗi ngày một lần.`,
      )
  }

  return (
    <div className="grid gap-4">
      <div
        className={`relative h-44 overflow-hidden rounded-2xl ${
          creature.id === 'bird'
            ? 'bg-gradient-to-b from-[#6fa7dc] to-[#cfe5f2]'
            : 'bg-gradient-to-b from-[#3d7f8f] to-[#1d4c5c]'
        }`}
      >
        {run > 0 &&
          flock.map((i) => (
            <span
              key={`${run}-${i}`}
              className={creature.id === 'bird' ? 'release-fly' : 'release-swim'}
              style={{ left: `${30 + i * 7}%`, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        <p className="absolute bottom-3 left-4 text-xs font-semibold text-white/85">
          {creature.note}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {creatures.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setChoice(index)}
            className={`rounded-xl border px-2 py-3 text-sm font-semibold transition ${
              index === choice
                ? 'border-[#f2c766]/70 bg-[#f2c766]/12 text-[#ffe09a]'
                : 'border-[#e2bd6e]/25 bg-[#e2bd6e]/[.06] text-white/85 hover:bg-[#e2bd6e]/15'
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-white/60">
        Phóng sanh là nuôi dưỡng lòng từ bi với mọi loài. Công đức +15 mỗi ngày.
      </p>
      <button type="button" className={primaryButton} onClick={release}>
        Phóng sanh
      </button>
    </div>
  )
}
