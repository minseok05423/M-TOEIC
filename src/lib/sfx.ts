import { getState } from './store.ts'

/**
 * 짧은 효과음. 파일 없이 Web Audio 로 바로 만들어요 (무료, 오프라인).
 * 설정 > 효과음 으로 끌 수 있어요.
 */
let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  if (!getState().settings.sfx) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.16) {
  const c = ac()
  if (!c) return
  const t = c.currentTime + start
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export const sfx = {
  right() {
    tone(784, 0, 0.12, 'triangle')
    tone(1175, 0.07, 0.18, 'triangle')
  },
  wrong() {
    tone(196, 0, 0.16, 'square', 0.05)
    tone(147, 0.08, 0.2, 'square', 0.05)
    navigator.vibrate?.(60)
  },
  combo(n: number) {
    const base = 660 + Math.min(n, 10) * 40
    tone(base, 0, 0.08, 'triangle')
    tone(base * 1.25, 0.06, 0.08, 'triangle')
    tone(base * 1.5, 0.12, 0.16, 'triangle')
  },
  pop() {
    tone(520, 0, 0.06, 'sine', 0.1)
  },
  done() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.14))
  },
}
