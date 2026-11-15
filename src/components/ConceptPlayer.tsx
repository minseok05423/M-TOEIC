import { useState } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { LayoutHeader } from '@astryxdesign/core/Layout'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { StackItem } from '@astryxdesign/core/Stack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Icon } from '@astryxdesign/core/Icon'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Card } from '@astryxdesign/core/Card'
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table'
import type { Section } from '../content/types.ts'
import { scrollToTop } from '../lib/ui.ts'
import { sfx } from '../lib/sfx.ts'
import { motion, type as t } from '../ui/styles.ts'
import { RichText } from './RichText.tsx'
import { NoteButton, Screen } from './Screen.tsx'
import { Speak } from './Speak.tsx'

/** 설명을 한 장씩 넘겨 보기 */
export function ConceptPlayer({
  sections,
  exitHref,
  onDone,
  onNote,
}: {
  sections: Section[]
  exitHref: string
  onDone: () => void
  /** 지금 장의 메모 대상 id ('learn:s<번호>') */
  onNote?: (targetId: string) => void
}) {
  const [i, setI] = useState(0)
  const s = sections[i]
  const last = i === sections.length - 1
  const go = (n: number) => {
    setI(n)
    scrollToTop()
  }

  return (
    <Screen
      header={
        <LayoutHeader padding={2}>
          <HStack gap={2} vAlign="center">
            <IconButton label="그만하기" variant="ghost" size="lg" href={exitHref} icon={<Icon icon={X} size="lg" />} />
            <StackItem size="fill">
              <ProgressBar label="읽은 장" isLabelHidden value={i + 1} max={sections.length} />
            </StackItem>
            <Text type="label" color="secondary" hasTabularNumbers>
              {i + 1}/{sections.length}
            </Text>
            {onNote && <NoteButton onClick={() => onNote(`learn:s${i}`)} />}
          </HStack>
        </LayoutHeader>
      }
      footer={
        <HStack gap={2}>
          {i > 0 && <IconButton label="이전" variant="secondary" size="lg" icon={<Icon icon={ArrowLeft} />} onClick={() => go(i - 1)} />}
          <StackItem size="fill">
            <Button
              label={last ? '다 읽었어요' : '다음 장'}
              variant="primary"
              size="lg"
              width="100%"
              endContent={<Icon icon={ArrowRight} />}
              onClick={() => {
                if (last) {
                  sfx.done()
                  onDone()
                } else {
                  sfx.pop()
                  go(i + 1)
                }
              }}
            />
          </StackItem>
        </HStack>
      }
    >
      <Card key={i} xstyle={motion.rise}>
        <VStack gap={4}>
          <VStack gap={1}>
            <Text type="label" color="accent" hasTabularNumbers>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <Heading level={2} xstyle={t.keepAll}>
              {s.heading}
            </Heading>
          </VStack>
          <RichText text={s.body} />
          {s.table && (
            <Table density="compact" dividers="rows" textOverflow="wrap">
              <TableHeader>
                <TableRow>
                  {s.table[0].map((c, j) => (
                    <TableHeaderCell key={j}>{c}</TableHeaderCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.table.slice(1).map((row, r) => (
                  <TableRow key={r}>
                    {row.map((c, j) => (
                      <TableCell key={j}>{c}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {s.examples?.map((ex, j) => (
            <HStack key={j} gap={1} vAlign="start">
              <Speak text={ex.en} />
              <VStack gap={0.5}>
                <Text type="large" xstyle={t.en}>
                  {ex.en}
                </Text>
                <Text type="supporting">{ex.ko}</Text>
              </VStack>
            </HStack>
          ))}
        </VStack>
      </Card>
    </Screen>
  )
}
