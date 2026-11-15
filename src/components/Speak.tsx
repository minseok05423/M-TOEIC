import { Snail, Volume2 } from 'lucide-react'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { speak, ttsSupported } from '../lib/tts.ts'

/** 발음 듣기 (휴대폰 내장 음성). slow 면 천천히 */
export function Speak({ text, slow, label, showLabel, size = 'md' }: { text: string; slow?: boolean; label?: string; showLabel?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  if (!ttsSupported) return null
  const name = label ?? (slow ? '천천히' : '발음 듣기')
  const icon = <Icon icon={slow ? Snail : Volume2} />
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    speak(text, slow ? 0.6 : undefined)
  }
  return showLabel ? (
    <Button label={name} variant="secondary" size={size} icon={icon} onClick={onClick} />
  ) : (
    <IconButton label={name} variant="ghost" size={size} icon={icon} onClick={onClick} />
  )
}
