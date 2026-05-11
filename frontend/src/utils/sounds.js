// Initialize audio context (cross-browser compatible)
let audioContext = null

const initAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      console.log('Web Audio API not supported')
    }
  }
  return audioContext
}

// Dice roll sound - quick ascending tone
export const playDiceSound = () => {
  const ctx = initAudioContext()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2)
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
    osc.start(now)
    osc.stop(now + 0.2)
  } catch (e) {
    // Sound failed silently
  }
}

// Success sound - three ascending notes
export const playSuccessSound = () => {
  const ctx = initAudioContext()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const notes = [523, 659, 784] // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(freq, now + i * 0.1)
      gain.gain.setValueAtTime(0.08, now + i * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3)
      osc.start(now + i * 0.1)
      osc.stop(now + i * 0.1 + 0.3)
    })
  } catch (e) {
    // Sound failed silently
  }
}

// Fail sound - descending low tone
export const playFailSound = () => {
  const ctx = initAudioContext()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(200, now)
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.4)
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
    osc.start(now)
    osc.stop(now + 0.4)
  } catch (e) {
    // Sound failed silently
  }
}

// Card reveal sound - quick pop
export const playCardSound = () => {
  const ctx = initAudioContext()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1)
    gain.gain.setValueAtTime(0.05, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
    osc.start(now)
    osc.stop(now + 0.1)
  } catch (e) {
    // Sound failed silently
  }
}

// Scoring/point sound - clear ding
export const playPointSound = () => {
  const ctx = initAudioContext()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(800, now)
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
    osc.start(now)
    osc.stop(now + 0.4)
  } catch (e) {
    // Sound failed silently
  }
}
