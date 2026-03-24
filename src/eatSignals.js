/**
 * Short cues for the default audio output (OS-routed: use your interface as system default,
 * or pick a device below when the browser supports setSinkId).
 */

let ctxSingleton = null

export const getEatAudioContext = () => {
  if (typeof window === 'undefined' || !window.AudioContext) return null
  if (!ctxSingleton) {
    ctxSingleton = new AudioContext()
  }
  return ctxSingleton
}

export const resumeEatAudio = async () => {
  const ctx = getEatAudioContext()
  if (ctx?.state === 'suspended') {
    await ctx.resume()
  }
}

/**
 * "Good" = clean wins: bright, rising partials.
 * @param {AudioContext} ctx
 */
export const playGoodEat = (ctx) => {
  const t0 = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, t0)
  master.gain.exponentialRampToValueAtTime(0.22, t0 + 0.012)
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22)
  master.connect(ctx.destination)

  const freqs = [523.25, 659.25, 783.99] // C5, E5, G5
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t0 + i * 0.028)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(0.35, t0 + 0.02 + i * 0.028)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2)
    osc.connect(g)
    g.connect(master)
    osc.start(t0 + i * 0.028)
    osc.stop(t0 + 0.25)
  })
}

/**
 * "Bad" = filthy wins: harsh, falling buzz.
 * @param {AudioContext} ctx
 */
export const playBadEat = (ctx) => {
  const t0 = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, t0)
  master.gain.exponentialRampToValueAtTime(0.28, t0 + 0.015)
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18)
  master.connect(ctx.destination)

  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(220, t0)
  osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.16)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1200, t0)
  filter.frequency.exponentialRampToValueAtTime(200, t0 + 0.14)

  osc.connect(filter)
  filter.connect(master)
  osc.start(t0)
  osc.stop(t0 + 0.2)
}

const MAX_STACK = 6
const STACK_GAP_MS = 38

/**
 * Fire one cue per eat event, staggered so they don’t clip.
 * @param {'good' | 'bad'} kind
 * @param {number} count
 */
export const playEatBursts = async (kind, count) => {
  const ctx = getEatAudioContext()
  if (!ctx) return
  await resumeEatAudio()
  const n = Math.min(Math.max(0, count), MAX_STACK)
  for (let i = 0; i < n; i += 1) {
    const delay = i * STACK_GAP_MS
    window.setTimeout(() => {
      if (kind === 'good') playGoodEat(ctx)
      else playBadEat(ctx)
    }, delay)
  }
}

/** Chrome/Edge: list output devices that expose deviceId for setSinkId */
export const getAudioOutputDevices = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  const list = await navigator.mediaDevices.enumerateDevices()
  return list.filter((d) => d.kind === 'audiooutput' && d.deviceId)
}

/**
 * Route Web Audio to a specific output (e.g. your interface), when supported.
 * @param {string} deviceId empty string = default
 */
export const setEatAudioOutputDevice = async (deviceId) => {
  const ctx = getEatAudioContext()
  if (!ctx) return false
  await resumeEatAudio()
  if (typeof ctx.setSinkId !== 'function') return false
  try {
    await ctx.setSinkId(deviceId || '')
    return true
  } catch {
    return false
  }
}
