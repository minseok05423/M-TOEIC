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

export function speak(text: string, rate = getState().settings.rate) {
  if (!ttsSupported) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/[*_]/g, ''))
  u.lang = 'en-US'
  const v = pickVoice()
  if (v) u.voice = v
  u.rate = rate
  speechSynthesis.speak(u)
}
