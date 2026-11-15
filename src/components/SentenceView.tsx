import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { Card } from '@astryxdesign/core/Card'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { StackItem } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Token } from '@astryxdesign/core/Token'
import { Icon } from '@astryxdesign/core/Icon'
import { Divider } from '@astryxdesign/core/Divider'
import type { AnalyzedSentence } from '../content/types.ts'
import { parseMarkup, plainText, tagInfo, TAG_KEYS } from '../content/markup.ts'
import { hueFill, hueText, hueUnderline, layout, type as t } from '../ui/styles.ts'
import { Speak } from './Speak.tsx'
import { Inline } from './RichText.tsx'

export interface ViewOpts {
  skeleton: boolean
  ko: boolean
  slash: boolean
}

/** 문장 분석 카드: 색칠된 조각을 누르면 역할(주어·동사…)과 설명이 나와요 */
export function SentenceView({ s, opts, index }: { s: AnalyzedSentence; opts: ViewOpts; index: number }) {
  const [sel, setSel] = useState<number | null>(null)
  const tokens = parseMarkup(s.text)
  const plain = plainText(s.text)
  const picked = sel !== null ? tokens[sel] : null
  const info = picked?.tag ? tagInfo(picked.tag) : null

  return (
    <Card>
      <VStack gap={3}>
        <HStack gap={1} vAlign="center">
          <StackItem size="fill">
            {index >= 0 && (
              <Text type="label" color="secondary" hasTabularNumbers>
                {String(index + 1).padStart(2, '0')}
              </Text>
            )}
          </StackItem>
          <Speak text={plain} />
          <Speak text={plain} slow />
        </HStack>
        <HStack as="p" gap={1} wrap="wrap" vAlign="end">
          {tokens.map((tk, i) => {
            if (!tk.tag)
              return tk.text.trim() ? (
                <Text key={i} type="large" xstyle={[t.enLarge, opts.skeleton && layout.tokFaded]}>
                  {tk.text}
                </Text>
              ) : null
            const ti = tagInfo(tk.tag)
            const clause = tk.tag !== tk.tag.toUpperCase()
            return (
              <Button
                key={i}
                label={`${tk.text} (${ti.label})`}
                variant="ghost"
                onClick={() => setSel(sel === i ? null : i)}
                aria-pressed={sel === i}
                xstyle={[layout.tok, hueFill[ti.hue], hueUnderline[ti.hue], clause && layout.tokClause, opts.skeleton && !ti.core && layout.tokFaded]}
              >
                <HStack as="span" gap={0.5} vAlign="start">
                  <Text type="large" xstyle={[t.enLarge, hueText[ti.hue]]} weight={ti.core ? 'semibold' : 'normal'}>
                    {tk.text}
                  </Text>
                  <Text type="supporting" size="xsm" weight="bold" xstyle={hueText[ti.hue]}>
                    {tk.tag.toUpperCase()}
                  </Text>
                </HStack>
              </Button>
            )
          })}
        </HStack>
        {picked && info && (
          <Card variant={info.hue} padding={3}>
            <VStack gap={1}>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Text type="body" weight="semibold" xstyle={t.en}>
                  {picked.text}
                </Text>
                <Token label={info.label} color={info.hue} />
              </HStack>
              {picked.note && <Text type="body">{picked.note}</Text>}
            </VStack>
          </Card>
        )}
        {opts.slash && s.slash && (
          <Text type="body" color="secondary" xstyle={t.en}>
            {s.slash.split('/').map((part, i, arr) => (
              <Text key={i} type="inherit">
                {part.trim()}
                {i < arr.length - 1 && (
                  <Text type="inherit" color="accent" weight="bold">
                    {' / '}
                  </Text>
                )}
              </Text>
            ))}
          </Text>
        )}
        {opts.ko && (
          <>
            <Divider />
            <Text type="body" xstyle={t.keepAll}>
              {s.ko}
            </Text>
          </>
        )}
        {opts.ko && s.note && (
          <HStack gap={1} vAlign="start">
            <Icon icon={Lightbulb} size="sm" color="warning" />
            <Text type="supporting">
              <Inline text={s.note} />
            </Text>
          </HStack>
        )}
      </VStack>
    </Card>
  )
}

/** 색깔 설명 */
export function TagLegend() {
  return (
    <HStack gap={1} wrap="wrap">
      {TAG_KEYS.map((k) => {
        const ti = tagInfo(k.toUpperCase())
        return <Token key={k} label={`${k.toUpperCase()} ${ti.label}`} color={ti.hue} size="sm" />
      })}
      <Token label="점선 밑줄 = 덩어리(절) 안" size="sm" />
    </HStack>
  )
}
