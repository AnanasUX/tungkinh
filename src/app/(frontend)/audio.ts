/**
 * Chùa An Nhiên — High-Fidelity Audio Engine
 * Tích hợp toàn diện 3 file âm thanh gốc trong thư mục "nhac/":
 * 1. nhac/tieng_go_mo.mp3       -> Tiếng gõ mõ thanh tịnh (Web Audio Buffer + Rapid HTML5 Audio Pool)
 * 2. nhac/tieng_chuong_chua.mp3 -> Tiếng chuông Đại Hồng Chung ngân vang sâu lắng
 * 3. nhac/nhac_thien_nen.mp3   -> Nhạc thiền nền tịnh tâm, tự động lặp vô tận, mở khóa tương tác trình duyệt
 *
 * Tự động có âm tổng hợp (synthesizer) làm phương án dự phòng (fallback) nếu mạng hoặc thiết bị gặp sự cố.
 */

const AUDIO_FILES = {
  woodblock: 'nhac/tieng_go_mo.mp3',
  templeBell: 'nhac/tieng_chuong_chua.mp3',
  ambient: 'nhac/nhac_thien_nen.mp3',
}

let context: AudioContext | null = null
let masterGain: GainNode | null = null

// Pre-decoded Web Audio buffers for instant 0ms latency playback
let woodblockBuffer: AudioBuffer | null = null
let bellBuffer: AudioBuffer | null = null
let audioPreloadStarted = false

// HTML5 Audio fallback pool for rapid wooden fish knocks
let moAudioPool: HTMLAudioElement[] = []
let moPoolIndex = 0
let bellAudioFallback: HTMLAudioElement | null = null

// Background ambient meditation music stream
let ambientAudio: HTMLAudioElement | null = null
let ambientTargetVolume = 0.3
let ambientDesiredState = false
let gestureUnlockAttached = false

function getAudioContext(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined') return null
  if (!context) {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return null
    context = new AudioContextClass()
    masterGain = context.createGain()
    masterGain.gain.value = 0.95
    masterGain.connect(context.destination)
  }
  if (context.state === 'suspended') {
    void context.resume().catch(() => {})
  }
  return { ctx: context, out: masterGain! }
}

/**
 * Preload and decode audio buffers early so sounds play with 0ms delay.
 */
function preloadAssets() {
  if (typeof window === 'undefined' || audioPreloadStarted) return
  audioPreloadStarted = true

  // 1. Initialize HTML5 Audio elements
  try {
    moAudioPool = Array.from({ length: 8 }, () => {
      const a = new Audio(AUDIO_FILES.woodblock)
      a.preload = 'auto'
      return a
    })
    bellAudioFallback = new Audio(AUDIO_FILES.templeBell)
    bellAudioFallback.preload = 'auto'
  } catch (_) {}

  // 2. Pre-fetch and decode Web Audio Buffers
  const setupBuffers = () => {
    const engine = getAudioContext()
    if (!engine || !window.fetch) return

    fetch(AUDIO_FILES.woodblock)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject('woodblock 404')))
      .then((buf) => engine.ctx.decodeAudioData(buf))
      .then((decoded) => {
        woodblockBuffer = decoded
      })
      .catch(() => {})

    fetch(AUDIO_FILES.templeBell)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject('bell 404')))
      .then((buf) => engine.ctx.decodeAudioData(buf))
      .then((decoded) => {
        bellBuffer = decoded
      })
      .catch(() => {})
  }

  setupBuffers()
  attachGestureUnlock()
}

/**
 * Auto-unlock AudioContext and Ambient Music on first user interaction.
 */
function attachGestureUnlock() {
  if (typeof window === 'undefined' || gestureUnlockAttached) return
  gestureUnlockAttached = true

  const unlock = () => {
    if (context && context.state === 'suspended') {
      void context.resume().catch(() => {})
    }
    // If user requested ambient music before permission was granted, start it now
    if (ambientDesiredState && ambientAudio && ambientAudio.paused) {
      ambientAudio.play().catch(() => {})
    }
  }

  ['pointerdown', 'touchstart', 'keydown', 'click'].forEach((event) => {
    window.addEventListener(event, unlock, { once: true, passive: true })
  })
}

// Auto-preload on file load in browser
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', preloadAssets, { once: true })
  } else {
    preloadAssets()
  }
}

/**
 * Fallback tone synthesis if audio files cannot be loaded.
 */
function synthTone(
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

/**
 * Tiếng gõ mõ (Wooden Fish strike):
 * Ưu tiên 1: Web Audio Buffer từ nhac/tieng_go_mo.mp3 (chuẩn 0ms, không cắt tiếng cũ)
 * Ưu tiên 2: HTML5 Audio Pool từ nhac/tieng_go_mo.mp3 (gõ siêu tốc 10 lần/giây)
 * Dự phòng 3: Âm tổng hợp vật lý nếu file bị mất hoặc lỗi mạng
 */
export function playWoodblock() {
  preloadAssets()
  const engine = getAudioContext()

  // 1. Web Audio Buffer Source (Chất lượng cao nhất & không độ trễ)
  if (engine && woodblockBuffer) {
    try {
      const source = engine.ctx.createBufferSource()
      source.buffer = woodblockBuffer
      const gain = engine.ctx.createGain()
      gain.gain.value = 0.95
      source.connect(gain).connect(engine.out)
      source.start(0)
      return
    } catch (_) {}
  }

  // 2. HTML5 Audio Pool (Hỗ trợ nhấp chuột liên tục)
  if (moAudioPool.length > 0) {
    try {
      const audio = moAudioPool[moPoolIndex]
      moPoolIndex = (moPoolIndex + 1) % moAudioPool.length
      audio.currentTime = 0
      audio.volume = 0.9
      const playPromise = audio.play()
      if (playPromise) {
        playPromise.catch(() => {})
      }
      return
    } catch (_) {}
  }

  // 3. Fallback Synthesizer
  if (engine) {
    const { ctx, out } = engine
    const now = ctx.currentTime
    const body = synthTone(ctx, out, 760, 0.55, 0.22, 'triangle', now)
    body.frequency.exponentialRampToValueAtTime(430, now + 0.09)
    synthTone(ctx, out, 1520, 0.12, 0.06, 'sine', now)
  }
}

/**
 * Tiếng Chuông Chùa / Đại Hồng Chung:
 * Ưu tiên 1: Web Audio Buffer từ nhac/tieng_chuong_chua.mp3 (ngân vang 12-15s chân thực)
 * Ưu tiên 2: HTML5 Audio từ nhac/tieng_chuong_chua.mp3
 * Dự phòng 3: Bộ tổng hợp sóng đa hài chuông đồng
 */
export function playTempleBell() {
  preloadAssets()
  const engine = getAudioContext()

  // 1. Web Audio Buffer
  if (engine && bellBuffer) {
    try {
      const source = engine.ctx.createBufferSource()
      source.buffer = bellBuffer
      const gain = engine.ctx.createGain()
      gain.gain.value = 1.0
      source.connect(gain).connect(engine.out)
      source.start(0)
      return
    } catch (_) {}
  }

  // 2. HTML5 Audio
  if (bellAudioFallback) {
    try {
      bellAudioFallback.currentTime = 0
      bellAudioFallback.volume = 0.95
      const p = bellAudioFallback.play()
      if (p) p.catch(() => {})
      return
    } catch (_) {}
  } else {
    try {
      const a = new Audio(AUDIO_FILES.templeBell)
      a.volume = 0.95
      a.play().catch(() => {})
      return
    } catch (_) {}
  }

  // 3. Fallback Metallic Synthesis
  if (engine) {
    const { ctx, out } = engine
    const now = ctx.currentTime
    const base = 98
    const partials: [number, number, number][] = [
      [0.5, 0.32, 14],
      [1, 0.5, 12],
      [1.006, 0.3, 11],
      [2, 0.26, 8],
      [2.4, 0.18, 6],
      [3, 0.14, 5],
    ]
    partials.forEach(([ratio, peak, decay]) =>
      synthTone(ctx, out, base * ratio, peak, decay, 'sine', now),
    )
  }
}

/**
 * Tiếng khánh / chuông nhỏ báo công đức.
 */
export function playChime() {
  preloadAssets()
  const engine = getAudioContext()
  if (!engine) return
  const { ctx, out } = engine
  const now = ctx.currentTime
  synthTone(ctx, out, 880, 0.09, 1.6, 'sine', now)
  synthTone(ctx, out, 1320, 0.05, 1.2, 'sine', now + 0.04)
}

/**
 * Nhạc thiền nền tĩnh tâm (nhac/nhac_thien_nen.mp3):
 * - Tự động lặp vô tận (loop = true)
 * - Mở khóa Autoplay thông minh khi người dùng chạm vào màn hình
 * - Tăng/giảm âm lượng êm dịu, không giật
 */
export function setAmbient(on: boolean, volume = 0.3) {
  preloadAssets()
  ambientDesiredState = on
  ambientTargetVolume = volume

  if (!ambientAudio) {
    try {
      ambientAudio = new Audio(AUDIO_FILES.ambient)
      ambientAudio.loop = true
      ambientAudio.preload = 'metadata'
    } catch (_) {}
  }

  if (!ambientAudio) return

  if (!on) {
    // Fade out smoothly
    const curVol = ambientAudio.volume
    let step = 0
    const fadeTimer = window.setInterval(() => {
      step++
      if (ambientAudio && ambientAudio.volume > 0.05) {
        ambientAudio.volume = Math.max(0, curVol * (1 - step / 10))
      } else {
        window.clearInterval(fadeTimer)
        if (ambientAudio) {
          ambientAudio.pause()
          ambientAudio.currentTime = 0
        }
      }
    }, 50)
    return
  }

  // Turn ON: Resume AudioContext and play ambient track
  if (context && context.state === 'suspended') {
    void context.resume().catch(() => {})
  }

  ambientAudio.volume = volume
  const playPromise = ambientAudio.play()
  if (playPromise) {
    playPromise.catch((_err) => {
      // Browser blocked autoplay without user gesture yet; wait for gesture unlock
      attachGestureUnlock()
    })
  }
}
