'use client'

import { TEMPLE_ZONE_LIST, type TempleZoneId } from './temple-zones'

export default function ZoneNavigator({
  open,
  current,
  onClose,
  onTravel,
}: {
  open: boolean
  current: TempleZoneId
  onClose: () => void
  onTravel: (zone: TempleZoneId) => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-[#080402]/65 p-3 backdrop-blur-md" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="zone-title" className="w-[min(920px,100%)] max-h-[calc(100svh-24px)] overflow-y-auto rounded-[24px] border border-[#e2bd6e]/50 bg-[linear-gradient(160deg,#37160d,#1c0b06_65%,#120604)] p-4 text-[#f8eddb] shadow-[0_30px_100px_rgba(0,0,0,.7)] sm:p-6">
        <header className="flex items-start gap-4 border-b border-[#e2bd6e]/20 pb-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#d7b76c]">Bản đồ hành hương</p>
            <h2 id="zone-title" className="mt-1 text-xl font-extrabold text-[#ffe5aa]">Năm khu tu tập</h2>
            <p className="mt-1 text-xs text-[#bda98b]">Chọn khu để dịch chuyển. Tiến trình công đức được giữ nguyên.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng bản đồ" className="grid size-9 place-items-center rounded-full border border-[#e2bd6e]/30 text-[#e5c989]">×</button>
        </header>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TEMPLE_ZONE_LIST.map((zone) => {
            const active = zone.id === current
            return (
              <button key={zone.id} type="button" disabled={active} onClick={() => onTravel(zone.id)} className={`group min-h-48 rounded-2xl border p-4 text-left transition ${active ? 'border-[#f2c766]/70 bg-[#e2bd6e]/15' : 'border-[#e2bd6e]/20 bg-black/20 hover:-translate-y-1 hover:border-[#e2bd6e]/55'}`}>
                <span className="grid size-10 place-items-center rounded-full border border-current/30 text-lg" style={{ color: zone.accent }}>✦</span>
                <strong className="mt-4 block text-sm text-[#ffe9bc]">{zone.name}</strong>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: zone.accent }}>{zone.subtitle}</span>
                <p className="mt-3 text-[11px] leading-relaxed text-[#a99374]">{zone.description}</p>
                <span className="mt-4 block text-[10px] font-bold text-[#e2bd6e]">{active ? 'Đang ở đây' : 'Dịch chuyển →'}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
