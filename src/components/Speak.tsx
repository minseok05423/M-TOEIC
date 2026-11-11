import { speak, ttsSupported } from '../lib/tts.ts'

export function Speak({ text, slow, label }: { text: string; slow?: boolean; label?: string }) {
  if (!ttsSupported) return null
  return (
    <button
      type="button"
      className="speak"
      aria-label={label ?? '발음 듣기'}
      onClick={(e) => {
        e.stopPropagation()
        speak(text, slow ? 0.6 : undefined)
      }}
    >
      {slow ? '🐢' : '🔊'}
    </button>
  )
}
