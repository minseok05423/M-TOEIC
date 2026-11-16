import { getState } from './store.ts'

/** 기기에 내장된 음성(무료, 오프라인)으로 영어 발음 */
export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

let voice: SpeechSynthesisVoice | null = null

function pickVoice(): SpeechSynthesisVoice | null {
  if (voice) return voice
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').startsWith('en'))
  const us = vs.filter((v) => v.lang.replace('_', '-') === 'en-US')
  const pref = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny']
  voice =
    us.find((v) => pref.some((p) => v.name.includes(p))) ?? us.find((v) => v.localService) ?? us[0] ?? vs[0] ?? null
  return voice
}

if (ttsSupported) speechSynthesis.addEventListener?.('voiceschanged', () => (voice = null))

function utter(text: string, rate: number): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text.replace(/[*_]/g, ''))
  u.lang = 'en-US'
  const v = pickVoice()
  if (v) u.voice = v
  u.rate = rate
  return u
}

/** 지금 읽는 차례 (새로 읽기 시작하면 앞의 것의 알림은 무시) */
let seq = 0

export function speak(text: string, rate = getState().settings.rate) {
  if (!ttsSupported) return
  seq++
  speechSynthesis.cancel()
  speechSynthesis.speak(utter(text, rate))
}

/**
 * 여러 문장을 차례로 읽기 (Part 1 듣기: "A. … B. …").
 * onIndex 는 i 번째를 읽기 시작할 때, 다 읽으면 -1 로 불려요. speak 나 다른 sequence 가 시작되면 멈춰요.
 */
export function speakSequence(texts: string[], onIndex?: (i: number) => void, rate = getState().settings.rate) {
  if (!ttsSupported) return
  const my = ++seq
  speechSynthesis.cancel()
  texts.forEach((text, i) => {
    const u = utter(text, rate)
    u.onstart = () => my === seq && onIndex?.(i)
    if (i === texts.length - 1) u.onend = () => my === seq && onIndex?.(-1)
    speechSynthesis.speak(u)
  })
}

/** 읽던 것 멈추기 */
export function stopSpeaking() {
  if (!ttsSupported) return
  seq++
  speechSynthesis.cancel()
}
