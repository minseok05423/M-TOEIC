import { useMemo, type ReactNode } from 'react'
import { Check, ChevronRight, Circle, CircleCheck } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Center } from '@astryxdesign/core/Center'
import { Heading, Text } from '@astryxdesign/core/Text'
import { List, ListItem } from '@astryxdesign/core/List'
import { Icon } from '@astryxdesign/core/Icon'
import { Token } from '@astryxdesign/core/Token'
import { Blockquote } from '@astryxdesign/core/Blockquote'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Card } from '@astryxdesign/core/Card'
import { TOTAL_TARGET } from '../lib/wordtest.ts'
import { useChapters, type ShownChapter } from '../lib/content.ts'
import { lessonKey, useStore, type Progress } from '../lib/store.ts'
import { addDays, formatDate, streak, today } from '../lib/date.ts'
import { href } from '../lib/router.ts'
import { lessonWords, useDueCount } from '../lib/words.ts'
import { stars } from '../lib/game.ts'
import { MiniStars } from '../components/MiniStars.tsx'
import { stageList } from '../lib/stages.ts'
import { LogoMark } from '../components/Logo.tsx'
import { Screen } from '../components/Screen.tsx'
import { layout, type as t } from '../ui/styles.ts'

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function lessonStages(progress: Progress, chapterId: string, lesson: ShownChapter['lessons'][number]) {
  const started = lessonWords(chapterId, lesson.id).filter((w) => progress.srs[w.key]).length
  return stageList(lesson, progress.lessons[lessonKey(chapterId, lesson.id)], started)
}

/** 다음에 할 레슨 단계 (최신 챕터부터, 레슨 순서대로) */
function nextUp(progress: Progress, chapters: ShownChapter[]) {
  for (const ch of chapters)
    for (const l of ch.lessons) {
      const next = lessonStages(progress, ch.id, l).find((s) => !s.done)
      if (next) return { ch, l, stage: next }
    }
  return null
}

/** 동그란 번호·도장 */
export function Dot({ children, done, next, today: isToday, empty }: { children: ReactNode; done?: boolean; next?: boolean; today?: boolean; empty?: boolean }) {
  return (
    <Center xstyle={[layout.dot, empty && layout.dotEmpty, isToday && layout.dotToday, next && layout.dotNext, done && layout.dotDone]}>
      {children}
    </Center>
  )
}

/** 최근 7일: 공부한 날에 도장 */
function Week({ days }: { days: Record<string, number> }) {
  const tday = today()
  const list = Array.from({ length: 7 }, (_, i) => addDays(tday, i - 6))
  return (
    <HStack hAlign="between" aria-label="최근 7일 공부 기록">
      {list.map((d) => {
        const [y, m, dd] = d.split('-').map(Number)
        const wd = new Date(y, m - 1, dd).getDay()
        return (
          <VStack key={d} gap={1} hAlign="center">
            <Text type="supporting" size="2xs">
              {WEEKDAY[wd]}
            </Text>
            <Dot done={!!days[d]} today={d === tday} empty={!days[d]}>
              {days[d] ? (
                <Icon icon={Check} size="sm" />
              ) : (
                <Text type="label" size="xsm" hasTabularNumbers color="inherit">
                  {dd}
                </Text>
              )}
            </Dot>
          </VStack>
        )
      })}
    </HStack>
  )
}

function Todo({ done, href: to, label, sub }: { done: boolean; href?: string; label: ReactNode; sub: string }) {
  return (
    <ListItem
      href={to}
      startContent={<Icon icon={done ? CircleCheck : Circle} color={done ? 'success' : 'secondary'} />}
      label={
        <Text type="body" weight="medium" color={done ? 'secondary' : 'primary'} hasStrikethrough={done}>
          {label}
        </Text>
      }
      description={sub}
      endContent={to && !done ? <Icon icon={ChevronRight} color="secondary" /> : undefined}
    />
  )
}

export function Home() {
  const progress = useStore((s) => s.progress)
  const due = useDueCount()
  const days = streak(progress.days)
  const studiedToday = !!progress.days[today()]
  const chapters = useChapters()
  const up = useMemo(() => nextUp(progress, chapters), [progress, chapters])
  const tests = useStore((s) => s.tests)
  const testToday = useMemo(
    () => Object.values(tests).filter((x) => x.day === today()).sort((a, b) => b.finishedAt - a.finishedAt)[0],
    [tests],
  )

  return (
    <Screen nav>
      <VStack gap={8}>
        <VStack gap={4}>
          <HStack gap={3} vAlign="center">
            <LogoMark />
            <VStack gap={0}>
              <Text type="supporting">
                {formatDate(today())} {WEEKDAY[new Date().getDay()]}요일
              </Text>
              <Heading level={1} type="display-3" xstyle={t.en}>
                M-TOEIC
              </Heading>
            </VStack>
          </HStack>
          <Text type="large">
            {days > 0 ? (
              <>
                <Text type="inherit" weight="bold">
                  {days}일
                </Text>{' '}
                연속 공부 중{studiedToday ? '' : ' · 오늘도 이어 가요'}
              </>
            ) : (
              '오늘 첫 도장을 찍어 봐요'
            )}
          </Text>
          <Week days={progress.days} />
        </VStack>

        <Card>
          <List edge="outset" hasDividers header={<Heading level={2}>오늘 할 일</Heading>}>
            <Todo
              done={!!testToday}
              href={href('test')}
              label={testToday ? `단어 테스트 ${testToday.score}/${testToday.total}` : `단어 테스트 ${TOTAL_TARGET}문제`}
              sub={testToday ? '틀린 단어는 다음 테스트에 다시 나와요' : '오늘 외운 단어 + 이전 단어 복습'}
            />
            <Todo done={!due} href={href('review')} label={due ? `단어 복습 ${due}개` : '단어 복습 끝'} sub={due ? '잊기 직전에 다시 보기' : '내일 또 만나요'} />
            {up ? (
              <Todo done={false} href={href('l', up.ch.id, up.l.id, up.stage.id)} label={`${up.l.title} · ${up.stage.title}`} sub={up.stage.desc} />
            ) : (
              <Todo done label="모든 레슨 완료" sub="다음 수업 뒤에 새 챕터가 생겨요" />
            )}
          </List>
        </Card>

        {chapters.map((ch, ci) => {
          const done = ch.lessons.filter((l) => progress.lessons[lessonKey(ch.id, l.id)]?.quizTotal).length
          return (
            <VStack key={ch.id} gap={4} as="section">
              <VStack gap={2}>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Text type="supporting">
                    {formatDate(ch.date)} {ch.personal && !ch.modified ? '맞춤' : '수업'}
                  </Text>
                  {ci === 0 && <Token size="sm" color="red" label="NEW" />}
                  {ch.personal && <Token size="sm" color="purple" label={ch.modified ? '맞춤 수정' : '나만의 챕터'} />}
                </HStack>
                <Heading level={2} xstyle={t.keepAll}>
                  {ch.title}
                </Heading>
                {ch.subtitle && <Text type="supporting">{ch.subtitle}</Text>}
              </VStack>
              <Blockquote cite={ch.personal && !ch.modified ? '내 메모에서' : '선생님 메모'}>
                <Text type="body" xstyle={t.keepAll}>
                  {ch.reason}
                </Text>
              </Blockquote>
              <List edge="outset"
                hasDividers
                header={
                  <Text type="label" color="secondary">
                    레슨 {done}/{ch.lessons.length} 완료
                  </Text>
                }
              >
                {ch.lessons.map((l, i) => {
                  const st = lessonStages(progress, ch.id, l)
                  const lp = progress.lessons[lessonKey(ch.id, l.id)]
                  const all = st.every((s) => s.done)
                  const n = st.filter((s) => s.done).length
                  return (
                    <ListItem
                      key={l.id}
                      href={href('l', ch.id, l.id)}
                      isSelected={up?.l === l}
                      align="first-line"
                      startContent={
                        <Dot done={all} next={up?.l === l}>
                          {all ? <Icon icon={Check} size="sm" /> : i + 1}
                        </Dot>
                      }
                      label={
                        <Text type="body" weight="semibold" xstyle={t.keepAll}>
                          {l.title}
                        </Text>
                      }
                      description={
                        <VStack gap={2}>
                          <Text type="supporting" maxLines={1}>
                            {l.summary}
                          </Text>
                          <ProgressBar label={`${n}/${st.length} 단계`} isLabelHidden value={n} max={st.length} variant={all ? 'success' : 'accent'} />
                        </VStack>
                      }
                      endContent={lp?.quizTotal ? <MiniStars n={stars(lp.quizBest ?? 0, lp.quizTotal)} /> : undefined}
                    />
                  )
                })}
              </List>
            </VStack>
          )
        })}
      </VStack>
    </Screen>
  )
}
