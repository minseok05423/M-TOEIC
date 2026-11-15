import type { ReactNode } from 'react'
import * as stylex from '@stylexjs/stylex'
import { Star } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Icon } from '@astryxdesign/core/Icon'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { layout, motion, type as t } from '../ui/styles.ts'

const s = stylex.create({
  star: { width: 'var(--spacing-12)', height: 'var(--spacing-12)' },
  starMid: { width: 'calc(var(--spacing-12) + var(--spacing-4))', height: 'calc(var(--spacing-12) + var(--spacing-4))' },
  off: { opacity: 0.25 },
})

/** 한 판 끝난 화면: 별 + 한 줄 + 숫자 몇 개 + 버튼 */
export function GameDone({
  stars,
  title,
  line,
  stats,
  children,
}: {
  stars: number
  title: string
  line: string
  stats: { label: string; value: ReactNode }[]
  children?: ReactNode
}) {
  return (
    <VStack gap={6} hAlign="center" paddingBlock={6}>
      <HStack gap={2} vAlign="end" aria-label={`별 ${stars}개`}>
        {[0, 1, 2].map((i) => (
          <Icon
            key={i}
            icon={Star}
            xstyle={[i === 1 ? s.starMid : s.star, i < stars ? layout.starOn : [layout.starOff, s.off], motion.pop, i === 1 && motion.delay1, i === 2 && motion.delay2]}
          />
        ))}
      </HStack>
      <VStack gap={2} hAlign="center">
        <Heading level={1} type="display-3" justify="center">
          {title}
        </Heading>
        <Text type="large" color="secondary" justify="center" xstyle={t.keepAll}>
          {line}
        </Text>
      </VStack>
      <MetadataList orientation="horizontal" label={{ position: 'top' }}>
        {stats.map((st) => (
          <MetadataListItem key={st.label} label={st.label}>
            <Heading level={2}>{st.value}</Heading>
          </MetadataListItem>
        ))}
      </MetadataList>
      <VStack gap={2} width="100%">
        {children}
      </VStack>
    </VStack>
  )
}
