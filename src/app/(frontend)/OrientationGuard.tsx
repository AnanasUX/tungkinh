'use client'

import { useEffect, useState } from 'react'

export default function OrientationGuard({ active }: { active: boolean }) {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (!active) return
    const update = () => {
      const portrait = matchMedia('(orientation: portrait)').matches
      const mobileOrTablet = matchMedia('(pointer: coarse)').matches || innerWidth < 1024
      setBlocked(portrait && mobileOrTablet)
    }
    update()
    window.addEventListener('resize', update)
    screen.orientation?.addEventListener?.('change', update)
    return () => {
      window.removeEventListener('resize', update)
      screen.orientation?.removeEventListener?.('change', update)
    }
  }, [active])

  if (!active || !blocked) return null

  const enterLandscape = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.()
    } catch {}
    try {
      await (screen.orientation as any)?.lock?.('landscape')
    } catch {}
  }

  return (
    <section className="fixed inset-0 z-[110] grid place-items-center bg-[radial-gradient(circle_at_50%_40%,#4a1b0d,#120604_70%)] p-6 text-center text-[#f8eddb]">
      <div className="max-w-sm">
        <div className="mx-auto flex h-24 w-16 animate-[pulse_2s_ease-in-out_infinite] items-center justify-center rounded-2xl border-2 border-[#e2bd6e]/70 bg-[#e2bd6e]/10 text-[#f4d17e] shadow-[0_0_35px_rgba(226,189,110,.2)]">
          <span className="rotate-90 text-3xl">↻</span>
        </div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[.22em] text-[#d9b86e]">Không gian Chánh Điện</p>
        <h2 className="mt-2 text-xl font-extrabold text-[#ffe5aa]">Vui lòng xoay ngang thiết bị</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#c2ae91]">
          Giao diện tu tập được thiết kế ưu tiên chế độ ngang để nhìn trọn bản đồ và thanh nghi lễ.
        </p>
        <button onClick={enterLandscape} className="mt-6 h-12 w-full rounded-full bg-gradient-to-b from-[#f6d47d] to-[#d89b2a] text-sm font-extrabold text-[#2a1408]">
          Xoay ngang và bật toàn màn hình
        </button>
      </div>
    </section>
  )
}
