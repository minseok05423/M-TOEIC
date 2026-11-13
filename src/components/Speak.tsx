import { Snail, Volume2 } from 'lucide-react'
import { speak, ttsSupported } from '../lib/tts.ts'

export function Speak({ text, slow, label, showLabel }: { text: string; slow?: boolean; label?: string; showLabel?: boolean }) {
  if (!ttsSupported) return null
  const name = label ?? (slow ? '천천히' : '발음 듣기')
  const Icon = slow ? Snail : Volume2
  return (
    <button
      type="button"
      className={`speak ${slow ? 'slow' : ''}`}
      aria-label={name}
      onClick={(e) => {
        e.stopPropagation()
        speak(text, slow ? 0.6 : undefined)
      }}
    >
      <Icon size={17} strokeWidth={2.2} />
      {showLabel && name}
    </button>
  )
}
