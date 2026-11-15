import { useMemo, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Code } from '@astryxdesign/core/Code'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { TextArea } from '@astryxdesign/core/TextArea'
import { TextInput } from '@astryxdesign/core/TextInput'
import { ToggleButton } from '@astryxdesign/core/ToggleButton'
import { Banner } from '@astryxdesign/core/Banner'
import { List, ListItem } from '@astryxdesign/core/List'
import { getState, newId, saveWords, startWords, useStore } from '../lib/store.ts'
import { decks } from '../lib/words.ts'
import { go, href } from '../lib/router.ts'
import { AppBar, Screen } from '../components/Screen.tsx'
import { Meaning, takePos } from '../components/Pos.tsx'
import { type as t } from '../ui/styles.ts'

/**
 * 한 줄에 단어 하나. 구분: 탭 / = / : / " - " / 쉼표, 또는 구분 없이 "postpone 연기하다" (한글 앞에서 나눔)
 */
export function parseLine(line: string): { en: string; ko: string; pos?: string } | null {
  const tx = line.replace(/^\s*\d+\s*[.)]\s*/, '').trim()
  if (!tx) return null
  const m = tx.match(/^(.+?)\s*(?:\t|=|:|\s[-–—]\s|,)\s*(.+)$/) ?? tx.match(/^([^가-힣]+?)\s+([가-힣~(\[].*)$/)
  if (!m) return null
  const en = m[1].trim()
  const ko = m[2].trim()
  return en && ko && /[a-zA-Z]/.test(en) ? { en, ...takePos(ko) } : null
}

export function BulkAdd() {
  const words = useStore((s) => s.words)
  const deckList = useMemo(() => decks(words), [words])
  const [text, setText] = useState('')
  const [deck, setDeck] = useState(getState().settings.lastDeck)
  const lines = text.split('\n').filter((l) => l.trim())
  const parsed = lines.map((l) => ({ line: l, w: parseLine(l) }))
  const ok = parsed.filter((p) => p.w)
  const bad = parsed.filter((p) => !p.w)

  function save() {
    const list = ok.map((p) => ({ id: newId(), en: p.w!.en, ko: p.w!.ko, pos: p.w!.pos, deck: deck.trim() || '내 단어' }))
    saveWords(list)
    startWords(list.map((w) => `c:${w.id}`))
    go('words')
  }

  return (
    <Screen
      header={<AppBar back={href('words')} title="여러 개 붙여넣기" />}
      footer={<Button label={ok.length ? `${ok.length}개 추가` : '추가'} variant="primary" size="lg" width="100%" isDisabled={!ok.length} onClick={save} />}
    >
      <VStack gap={5}>
        <VStack gap={1}>
          <Text type="supporting">한 줄에 단어 하나씩. 이렇게 쓰면 돼요:</Text>
          <HStack gap={1} wrap="wrap">
            <Code>postpone 연기하다</Code>
            <Code>postpone = 연기하다</Code>
            <Code>postpone - 연기하다</Code>
          </HStack>
          <Text type="supporting">품사는 뜻 앞에 괄호로:</Text>
          <HStack gap={1} wrap="wrap">
            <Code>hold - (동) 들다, 잡다</Code>
            <Code>shade - (동) 그늘지게 하다 / (명) 그늘</Code>
          </HStack>
        </VStack>
        <TextArea
          label="단어 목록"
          isLabelHidden
          rows={9}
          value={text}
          onChange={setText}
          hasAutoCorrect={false}
          hasSpellCheck={false}
          placeholder={'postpone (동) 연기하다\nrequire = (동) 요구하다\nin advance - (숙) 미리'}
        />
        <VStack gap={2}>
          <TextInput label="묶음" value={deck} onChange={setDeck} />
          {deckList.length > 0 && (
            <HStack gap={1} wrap="wrap">
              {deckList.slice(0, 8).map((d) => (
                <ToggleButton key={d} label={d} size="sm" isPressed={deck === d} onPressedChange={() => setDeck(d)}>
                  {d}
                </ToggleButton>
              ))}
            </HStack>
          )}
        </VStack>
        {bad.length > 0 && (
          <Banner
            status="warning"
            icon={<Icon icon={TriangleAlert} />}
            title={`인식 못 한 줄 ${bad.length}개`}
            description="영어와 뜻 사이에 = 를 넣어 보세요."
            collapsible={{ defaultIsOpen: true }}
          >
            <VStack gap={1}>
              {bad.slice(0, 5).map((p, i) => (
                <Text key={i} type="supporting">
                  {p.line}
                </Text>
              ))}
            </VStack>
          </Banner>
        )}
        {ok.length > 0 && (
          <List edge="outset"
            hasDividers
            density="compact"
            header={
              <Heading level={3}>
                {ok.length}개 인식됨
              </Heading>
            }
          >
            {ok.slice(0, 50).map((p, i) => (
              <ListItem
                key={i}
                label={
                  <Text type="body" weight="semibold" xstyle={t.en}>
                    {p.w!.en}
                  </Text>
                }
                description={<Meaning ko={p.w!.ko} pos={p.w!.pos} />}
              />
            ))}
            {ok.length > 50 && <ListItem label={`… 외 ${ok.length - 50}개`} />}
          </List>
        )}
      </VStack>
    </Screen>
  )
}
