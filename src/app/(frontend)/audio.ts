// Synthesised temple sounds (no audio files). The AudioContext is only created
// or resumed from user gestures to respect browser autoplay policies.

let context: AudioContext | null = null
let master: GainNode | null = null
let ambient: { gain: GainNode; nodes: AudioScheduledSourceNode[] } | null = null

function engine() {
  if (typeof window === 'undefined') return null
  if (!context) {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return null
    context = new AudioContextClass()
    master = context.createGain()
    master.gain.value = 0.9
    master.connect(context.destination)
  }
  if (context.state === 'suspended') void context.resume()
  return { ctx: context, out: master! }
}

function tone(
  ctx: AudioContext,
  out: AudioNode,
  frequency: number,
  peak: number,
  decay: number,
  type: OscillatorType = 'sine',
  start = ctx.currentTime,
) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + decay)
  oscillator.connect(gain).connect(out)
  oscillator.start(start)
  oscillator.stop(start + decay + 0.05)
  return oscillator
}

/** Wooden fish (mõ): a short resonant knock around 420–800 Hz. */
export function playWoodblock() {
  const audio = engine()
  if (!audio) return
  const { ctx, out } = audio
  const now = ctx.currentTime
  const body = tone(ctx, out, 760, 0.55, 0.22, 'triangle', now)
  body.frequency.exponentialRampToValueAtTime(430, now + 0.09)
  tone(ctx, out, 1520, 0.12, 0.06, 'sine', now)
  const noise = ctx.createBufferSource()
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  noise.buffer = buffer
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 1900
  band.Q.value = 3
  const gain = ctx.createGain()
  gain.gain.value = 0.35
  noise.connect(band).connect(gain).connect(out)
  noise.start(now)
}

/** Great temple bell (Đại Hồng Chung): layered metallic partials ringing ~14 s. */
export function playTempleBell() {
  const audio = engine()
  if (!audio) return
  const { ctx, out } = audio
  const now = ctx.currentTime
  const base = 98
  const partials: [number, number, number][] = [
    [0.5, 0.32, 15],
    [1, 0.5, 14],
    [1.006, 0.3, 13],
    [2, 0.26, 9],
    [2.4, 0.18, 7],
    [3, 0.14, 6],
    [4.2, 0.09, 4],
    [5.4, 0.06, 3],
  ]
  partials.forEach(([ratio, peak, decay]) => tone(ctx, out, base * ratio, peak, decay, 'sine', now))
  const strike = tone(ctx, out, 620, 0.12, 0.25, 'triangle', now)
  strike.frequency.exponentialRampToValueAtTime(180, now + 0.2)
}

/** Small bright chime used for merit rewards. */
export function playChime() {
  const audio = engine()
  if (!audio) return
  const { ctx, out } = audio
  const now = ctx.currentTime
  tone(ctx, out, 880, 0.09, 1.6, 'sine', now)
  tone(ctx, out, 1320, 0.05, 1.2, 'sine', now + 0.04)
}

/** Soft meditative drone loop. */
export function setAmbient(on: boolean, volume = 0.3) {
  const audio = engine()
  if (!audio) return
  const { ctx, out } = audio
  if (!on) {
    if (ambient) {
      const { gain, nodes } = ambient
      gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6)
      window.setTimeout(() => nodes.forEach((node) => node.stop()), 2500)
      ambient = null
    }
    return
  }
  if (ambient) {
    ambient.gain.gain.setTargetAtTime(volume * 0.16, ctx.currentTime, 0.4)
    return
  }
  const gain = ctx.createGain()
  gain.gain.value = 0.0001
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 900
  gain.connect(filter).connect(out)
  const nodes: AudioScheduledSourceNode[] = []
  for (const [frequency, level] of [
    [73.42, 0.5],
    [110, 0.35],
    [146.83, 0.18],
    [220.5, 0.08],
  ]) {
    const oscillator = ctx.createOscillator()
    const voice = ctx.createGain()
    oscillator.frequency.value = frequency
    voice.gain.value = level
    const lfo = ctx.createOscillator()
    const depth = ctx.createGain()
    lfo.frequency.value = 0.05 + frequency / 4000
    depth.gain.value = level * 0.4
    lfo.connect(depth).connect(voice.gain)
    oscillator.connect(voice).connect(gain)
    oscillator.start()
    lfo.start()
    nodes.push(oscillator, lfo)
  }
  gain.gain.setTargetAtTime(volume * 0.16, ctx.currentTime, 1.2)
  ambient = { gain, nodes }
}
