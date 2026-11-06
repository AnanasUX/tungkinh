'use client'

import { useMemo, useState, type FormEvent } from 'react'

export const PROFILE_STORAGE_KEY = 'chua_an_nhien_user_profile'

export type DevoteeProfile = {
  registered: true
  fullName: string
  birthDate: string
  hometown: string
  age: number
  dharmaName: string
  assignedSeatNo: number | null
  avatarType: 'monk'
  meritScore: number
  wish: string
}

export function calculateAge(birthDate: string, today = new Date()) {
  if (!birthDate) return null
  const date = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(date.getTime()) || date > today) return null
  let age = today.getFullYear() - date.getFullYear()
  const month = today.getMonth() - date.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < date.getDate())) age--
  return age >= 0 && age <= 130 ? age : null
}

export function loadDevoteeProfile(): DevoteeProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.registered || !data.fullName || !data.birthDate || !data.hometown) return null
    const age = calculateAge(data.birthDate)
    if (age === null) return null
    return { ...data, age }
  } catch {
    return null
  }
}

export default function OnboardingGate({
  open,
  onComplete,
}: {
  open: boolean
  onComplete: (profile: DevoteeProfile) => void
}) {
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [hometown, setHometown] = useState('')
  const [error, setError] = useState('')
  const age = useMemo(() => calculateAge(birthDate), [birthDate])

  if (!open) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const name = fullName.trim().replace(/\s+/g, ' ')
    const home = hometown.trim().replace(/\s+/g, ' ')
    if (name.length < 2) return setError('Vui lòng nhập đầy đủ họ và tên.')
    if (age === null) return setError('Ngày sinh không hợp lệ hoặc nằm trong tương lai.')
    if (home.length < 2) return setError('Vui lòng nhập quê quán.')

    const profile: DevoteeProfile = {
      registered: true,
      fullName: name,
      birthDate,
      hometown: home,
      age,
      dharmaName: '',
      assignedSeatNo: (window as any).pickBestAvailableSeat?.(null) ?? null,
      avatarType: 'monk',
      meritScore: 0,
      wish: '',
    }
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
      sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
    } catch {
      // The session still works if storage is blocked.
    }
    ;(window as any).currentUserProfile = profile
    if (profile.assignedSeatNo) (window as any).assignUserToSeat?.(profile.assignedSeatNo)
    onComplete(profile)

    // Fullscreen and orientation lock are only valid inside this user gesture.
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.()
    } catch {}
    try {
      await (screen.orientation as any)?.lock?.('landscape')
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[radial-gradient(circle_at_50%_20%,rgba(113,42,17,.72),rgba(10,4,2,.96)_68%)] p-4 backdrop-blur-xl">
      <form
        onSubmit={submit}
        aria-labelledby="onboarding-title"
        className="my-auto w-[min(560px,100%)] overflow-hidden rounded-[24px] border border-[#e2bd6e]/55 bg-[linear-gradient(160deg,#3c180e,#1e0b06_64%,#130704)] text-[#f8eddb] shadow-[0_30px_100px_rgba(0,0,0,.7),0_0_0_5px_rgba(30,12,6,.9),0_0_0_6px_rgba(226,189,110,.2)]"
      >
        <header className="border-b border-[#e2bd6e]/25 px-5 py-5 text-center sm:px-8">
          <span className="mx-auto grid size-12 place-items-center rounded-full border border-[#e2bd6e]/45 bg-[#e2bd6e]/10 text-2xl">✦</span>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[.22em] text-[#d7b86f]">Sớ ghi danh</p>
          <h1 id="onboarding-title" className="mt-1 text-xl font-extrabold text-[#ffe6aa] sm:text-2xl">
            Kính chào đạo hữu đến Chùa Yên Phúc
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#c1ad90]">
            Thông tin được lưu trên trình duyệt này để lần sau bạn vào thẳng Chánh Điện.
          </p>
        </header>
        <div className="grid gap-4 px-5 py-5 sm:px-8">
          <label className="grid gap-1.5 text-xs font-bold text-[#e4cc9b]">
            Họ và tên <span className="sr-only">bắt buộc</span>
            <input
              required
              autoFocus
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ví dụ: Nguyễn Bá Ngọc"
              maxLength={60}
              className="h-12 rounded-xl border border-[#e2bd6e]/30 bg-black/25 px-4 text-sm font-normal text-white outline-none placeholder:text-white/30 focus:border-[#f2c766]"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <label className="grid gap-1.5 text-xs font-bold text-[#e4cc9b]">
              Ngày tháng năm sinh
              <input
                required
                type="date"
                autoComplete="bday"
                value={birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setBirthDate(event.target.value)}
                className="h-12 rounded-xl border border-[#e2bd6e]/30 bg-black/25 px-4 text-sm font-normal text-white outline-none focus:border-[#f2c766]"
              />
            </label>
            <div className="grid gap-1.5 text-xs font-bold text-[#e4cc9b]">
              Tuổi
              <output className="grid h-12 place-items-center rounded-xl border border-[#e2bd6e]/25 bg-[#e2bd6e]/[.07] text-base text-[#ffe29e]">
                {age ?? '—'}
              </output>
            </div>
          </div>
          <label className="grid gap-1.5 text-xs font-bold text-[#e4cc9b]">
            Quê quán
            <input
              required
              autoComplete="address-level1"
              value={hometown}
              onChange={(event) => setHometown(event.target.value)}
              placeholder="Ví dụ: Thái Bình"
              maxLength={80}
              className="h-12 rounded-xl border border-[#e2bd6e]/30 bg-black/25 px-4 text-sm font-normal text-white outline-none placeholder:text-white/30 focus:border-[#f2c766]"
            />
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
          <button className="mt-1 h-12 rounded-full bg-gradient-to-b from-[#f7d783] to-[#d69b2c] text-sm font-extrabold text-[#2c1508] shadow-[0_8px_24px_rgba(215,160,50,.25)]">
            Ghi danh và vào Chánh Điện
          </button>
          <p className="text-center text-[10px] leading-relaxed text-white/40">
            Trên điện thoại và tablet, hệ thống sẽ yêu cầu xoay ngang sau khi ghi danh.
          </p>
        </div>
      </form>
    </div>
  )
}
