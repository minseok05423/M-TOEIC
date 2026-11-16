import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Headphones } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Icon } from '@astryxdesign/core/Icon'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { List, ListItem } from '@astryxdesign/core/List'
import { getState, useStore } from '../lib/store.ts'
import { allWords, dueWords, type StudyWord } from '../lib/words.ts'
import { MAX_BOX, type SrsCard } from '../lib/srs.ts'
import { addDays, formatDate, today } from '../lib/date.ts'
import { href } from '../lib/router.ts'
import { stars } from '../lib/game.ts'
import { PageTitle, Screen } from '../components/Screen.tsx'
import { WordGame, type GameResult } from '../components/WordGame.tsx'
import { GameDone } from '../components/GameDone.tsx'

const SESSION = 15

/** 상자(box) 별 단어 수: 새 · 1 … 5 · 완벽 */
function Shelf({ cards }: { cards: SrsCard[] }) {
  const counts = Array.from({ length: MAX_BOX + 1 }, (_, b) => cards.filter((c) => c.box === b).length)
  const max = Math.max(1, ...counts)
  return (
    <List edge="outset" density="compact" header={<Heading level={3}>외운 정도</Heading>}>
      {counts.map((n, b) => {
        const name = b === 0 ? '새' : b === MAX_BOX ? '완벽' : `${b}칸`
        return (
          <ListItem
            key={b}
            label={
              <HStack gap={3} vAlign="center">
                <Text type="label" color="secondary">
                  {name}
                </Text>
              </HStack>
            }
            description={
              <ProgressBar label={`${name} ${n}개`} isLabelHidden value={n} max={max} variant={b === MAX_BOX ? 'success' : b === 0 ? 'neutral' : 'accent'} />
            }
            endContent={
              <Text type="label" hasTabularNumbers>
                {n}
              </Text>
            }
          />
        )
      })}
    </List>
  )
}

export function Review() {
  const srs = useStore((s) => s.progress.srs)
  const words = useStore((s) => s.words)
  const map = useMemo(() => allWords(words), [words])
  const due = useMemo(() => dueWords(srs, map), [srs, map])
  const [session, setSession] = useState<StudyWord[] | null>(null)
  const [snap, setSnap] = useState(srs)
  const [result, setResult] = useState<GameResult | null>(null)
  const [round, setRound] = useState(0)

  const stats = useMemo(() => {
    const cards = Object.entries(srs).filter(([k]) => map.has(k))
    const tomorrow = addDays(today(), 1)
    const upcoming = cards.filter(([, c]) => c.due > today()).sort((a, b) => a[1].due.localeCompare(b[1].due))
    return {
      cards: cards.map(([, c]) => c),
      total: cards.length,
      mastered: cards.filter(([, c]) => c.box >= MAX_BOX).length,
      tomorrow: cards.filter(([, c]) => c.due === tomorrow).length,
      next: upcoming[0]?.[1].due,
    }
  }, [srs, map])

  const start = () => {
    setSnap(getState().progress.srs)
    setSession(due.slice(0, SESSION))
    setResult(null)
    setRound(round + 1)
  }

  if (session && !result)
    return (
      <WordGame
        key={round}
        words={session}
        pool={[...map.values()]}
        isNew={(w) => !snap[w.key] || snap[w.key].reps === 0}
        exitHref="#/review"
        onDone={setResult}
      />
    )

  if (result)
    return (
      <Screen>
        <GameDone
          stars={stars(result.right, result.right + result.wrong)}
          title="복습 끝!"
          line="맞힌 단어는 더 나중에, 틀린 단어는 내일 다시 나와요."
          stats={[
            { label: '한 번에 맞힘', value: `${result.right}/${result.total}` },
            { label: '최고 연속', value: result.bestCombo },
          ]}
        >
          {due.length > 0 ? (
            <Button label={`남은 ${due.length}개 계속하기`} variant="primary" size="lg" width="100%" onClick={start} />
          ) : (
            <Button label="홈으로" variant="primary" size="lg" width="100%" href="#/" />
          )}
          <Button label="복습 기록 보기" variant="secondary" size="lg" width="100%" onClick={() => (setSession(null), setResult(null))} />
        </GameDone>
      </Screen>
    )

  return (
    <Screen nav>
      <VStack gap={6}>
        <PageTitle>복습</PageTitle>
        {due.length ? (
          <Card padding={6}>
            <VStack gap={4}>
              <VStack gap={1}>
                <Text type="label" color="secondary">
                  오늘 복습할 단어
                </Text>
                <Heading level={2} type="display-1">
                  {due.length}개
                </Heading>
                <Text type="supporting">{due.length > SESSION ? `한 판에 ${SESSION}개씩 해요. 5분이면 끝나요.` : '잊기 직전에 한 번 더 보면 오래가요.'}</Text>
              </VStack>
              <Button label="복습 시작" variant="primary" size="lg" width="100%" endContent={<Icon icon={ArrowRight} />} onClick={start} />
            </VStack>
          </Card>
        ) : (
          <EmptyState
            title="오늘 복습 끝"
            description={stats.next ? `다음 복습은 ${formatDate(stats.next)}이에요.` : '레슨에서 단어 게임을 하거나 내 단어를 추가하면 여기에 나와요.'}
            actions={<Button label="단어장 가기" variant="secondary" icon={<Icon icon={BookOpen} />} href={href('words')} />}
          />
        )}

        <List edge="outset" hasDividers>
          <ListItem
            href={href('part1')}
            startContent={<Icon icon={Headphones} color="accent" />}
            label="토익 Part 1 사진 묘사 듣기"
            description="장면을 보고 네 문장을 들은 뒤 맞는 것 고르기"
            endContent={<Icon icon={ArrowRight} color="secondary" />}
          />
        </List>

        <MetadataList orientation="horizontal" label={{ position: 'top' }}>
          <MetadataListItem label="외우는 단어">
            <Heading level={2}>{stats.total}</Heading>
          </MetadataListItem>
          <MetadataListItem label="완벽히 외움">
            <Heading level={2}>{stats.mastered}</Heading>
          </MetadataListItem>
          <MetadataListItem label="내일 복습">
            <Heading level={2}>{stats.tomorrow}</Heading>
          </MetadataListItem>
        </MetadataList>

        {stats.total > 0 && (
          <VStack gap={2}>
            <Shelf cards={stats.cards} />
            <Text type="supporting">맞힐 때마다 아래 칸으로 한 칸씩, 틀리면 "새" 칸으로 돌아가요.</Text>
          </VStack>
        )}
      </VStack>
    </Screen>
  )
}
