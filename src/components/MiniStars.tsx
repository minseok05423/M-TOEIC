import { Star } from 'lucide-react'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { layout } from '../ui/styles.ts'

/** 별 0~3개 (작게) */
export function MiniStars({ n }: { n: number }) {
  return (
    <HStack gap={0} aria-label={`별 ${n}개`}>
      {[0, 1, 2].map((k) => (
        <Icon key={k} icon={Star} size="xsm" xstyle={k < n ? layout.starOn : layout.starOff} />
      ))}
    </HStack>
  )
}

