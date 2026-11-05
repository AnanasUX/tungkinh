import React, { useEffect, useRef, useState, type PointerEvent } from 'react'

const RADIUS = 42

const arrows = [
  { rotate: 0, className: 'arrow-top' },
  { rotate: 90, className: 'arrow-right' },
  { rotate: 180, className: 'arrow-bottom' },
  { rotate: 270, className: 'arrow-left' },
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
      className={`touch-joystick ${active ? 'is-active' : ''}`}
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
          className={`touch-joystick-arrow ${arrow.className}`}
          style={{ transform: `rotate(${arrow.rotate}deg)` }}
        >
          <path d="m7 14 5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
      <span
        aria-hidden="true"
        className="touch-joystick-knob"
        style={{
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          transition: active ? 'none' : 'transform .18s ease-out',
        }}
      />
    </div>
  )
}
