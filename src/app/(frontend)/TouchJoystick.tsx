'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'

const RADIUS = 42

const arrows = [
  { rotate: 0, className: 'left-1/2 top-1.5 -translate-x-1/2' },
  { rotate: 90, className: 'right-1.5 top-1/2 -translate-y-1/2' },
  { rotate: 180, className: 'bottom-1.5 left-1/2 -translate-x-1/2' },
  { rotate: 270, className: 'left-1.5 top-1/2 -translate-y-1/2' },
]

/**
 * Semi-transparent virtual joystick for touch screens. Reports x (right) and
 * y (forward) in the -1..1 range; keyboard users keep WASD / arrow keys.
 */
export default function TouchJoystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)

  useEffect(() => () => onMove(0, 0), [onMove])

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const rect = baseRef.current!.getBoundingClientRect()
    let dx = event.clientX - (rect.left + rect.width / 2)
    let dy = event.clientY - (rect.top + rect.height / 2)
    const length = Math.hypot(dx, dy)
    if (length > RADIUS) {
      dx = (dx / length) * RADIUS
      dy = (dy / length) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    onMove(dx / RADIUS, -dy / RADIUS)
  }

  const release = () => {
    pointerRef.current = null
    setActive(false)
    setKnob({ x: 0, y: 0 })
    onMove(0, 0)
  }

  return (
    <div
      ref={baseRef}
      role="group"
      aria-label="Cần điều khiển di chuyển"
      className={`absolute bottom-[136px] left-3.5 z-[9] hidden size-[124px] touch-none select-none rounded-full border border-[#f6dca0]/35 bg-[radial-gradient(circle,rgba(40,18,8,.38),rgba(20,10,5,.22)_70%)] shadow-[0_8px_26px_rgba(0,0,0,.25),inset_0_0_0_6px_rgba(255,236,190,.06)] backdrop-blur-[3px] transition-opacity duration-200 max-[950px]:block [@media(max-height:560px)]:block [@media(max-height:560px)]:bottom-[84px] [@media(max-height:560px)]:size-[112px] [@media(pointer:coarse)]:block ${
        active ? 'opacity-95' : 'opacity-60'
      }`}
      onPointerDown={(event) => {
        pointerRef.current = event.pointerId
        setActive(true)
        event.currentTarget.setPointerCapture(event.pointerId)
        track(event)
      }}
      onPointerMove={(event) => {
        if (pointerRef.current === event.pointerId) track(event)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      {arrows.map((arrow) => (
        <svg
          key={arrow.rotate}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`pointer-events-none absolute size-[18px] fill-none stroke-[#fbe6b4]/80 stroke-[2.4] ${arrow.className}`}
          style={{ rotate: `${arrow.rotate}deg` }}
        >
          <path d="m7 14 5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[52px] rounded-full border border-[#ffe7ae]/70 bg-[radial-gradient(circle_at_35%_30%,rgba(255,236,190,.85),rgba(214,160,72,.75)_55%,rgba(130,70,24,.8))] shadow-[0_4px_14px_rgba(0,0,0,.35)]"
        style={{
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          transition: active ? 'none' : 'transform .18s ease-out',
        }}
      />
    </div>
  )
}
