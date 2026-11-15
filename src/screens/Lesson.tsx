import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bone, BookText, Check, Languages, NotebookText, Palette, RotateCcw, Scissors } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Stepper, Step } from '@astryxdesign/core/Stepper'
import { List, ListItem } from '@astryxdesign/core/List'
import { Banner } from '@astryxdesign/core/Banner'
import { Link } from '@astryxdesign/core/Link'
import { Badge } from '@astryxdesign/core/Badge'
import { ToggleButton } from '@astryxdesign/core/ToggleButton'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { findLesson } from '../lib/content.ts'
import { getState, lessonKey, markLesson, recordQuiz, useStore } from '../lib/store.ts'
import { go, href, replace } from '../lib/router.ts'
import { allWords, lessonWords, type StudyWord } from '../lib/words.ts'
import { boxLabel, isDue } from '../lib/srs.ts'
import { shuffle, stars } from '../lib/game.ts'
import { scrollToTop } from '../lib/ui.ts'
import type { Lesson as LessonT } from '../content/types.ts'
import { AppBar, Screen } from '../components/Screen.tsx'
import { MiniStars } from '../components/MiniStars.tsx'
import { useLessonStages } from '../lib/stages.ts'
import { SentenceView, TagLegend, type ViewOpts } from '../components/SentenceView.tsx'
import { QuizRunner } from '../components/QuizRunner.tsx'
import { WordGame, type GameResult } from '../components/WordGame.tsx'
import { SentenceGame } from '../components/SentenceGame.tsx'
import { ConceptPlayer } from '../components/ConceptPlayer.tsx'
import { GameDone } from '../components/GameDone.tsx'
import { HideKoSwitch, WordRow } from '../components/WordRow.tsx'
import { useNoteSheet } from '../components/NoteSheet.tsx'
import { NoteList } from '../components/NoteList.tsx'
import { type as t } from '../ui/styles.ts'

interface Props {
  chapterId: string
  lessonId: string
  stage?: string
  sub?: string
}

export function Lesson({ chapterId, lessonId, stage, sub }: Props) {
  const found = findLesson(chapterId, lessonId)
  if (!found)
    return (
      <Screen header={<AppBar back="#/" />}>
        <EmptyState title="레슨을 찾을 수 없어요" actions={<Button label="홈으로" href="#/" variant="primary" />} />
      </Screen>
    )
  const { lesson } = found
  const home = href('l', chapterId, lessonId)
  const p = { chapterId, lesson, home }

  if (stage === 'learn') return <LearnStage {...p} />
  if ((stage === 'words' || stage === 'cards') && lesson.words.length) return <WordsStage {...p} />
  if (stage === 'sentences') return <SentencesStage {...p} />
  if (stage === 'quiz') return <QuizStage {...p} onlyWrong={sub === 'wrong'} />
  if (stage === 'list') return <WordList {...p} />
  if (stage === 'notes') return <Notes {...p} />
  return <Overview {...p} />
}

type StageP = { chapterId: string; lesson: LessonT; home: string }

/** 한 판 끝난 화면 (단어·뼈대·퀴즈 공통) */
function DoneScreen({ children }: { children: React.ReactNode }) {
  return <Screen>{children}</Screen>
}

// ───────── 개념 ─────────

function LearnStage({ chapterId, lesson, home }: StageP) {
  const { openNote, sheet } = useNoteSheet(chapterId, lesson)
  return (
    <>
      <ConceptPlayer
        sections={lesson.sections}
        exitHref={home}
        onNote={(tg) => openNote(tg)}
        onDone={() => {
          markLesson(chapterId, lesson.id, { read: true })
          replace('l', chapterId, lesson.id)
        }}
      />
      {sheet}
    </>
  )
}

// ───────── 레슨 첫 화면: 4단계 길 ─────────

function Overview({ chapterId, lesson }: StageP) {
  const { list, next, lp } = useLessonStages(chapterId, lesson)
  const { openNote, sheet } = useNoteSheet(chapterId, lesson)
  const wrong = lesson.quiz.filter((q) => lp?.wrong?.includes(q.id)).length
  const nextIdx = next ? list.indexOf(next) : list.length

  return (
    <Screen header={<AppBar back="#/" />}>
      <VStack gap={6}>
        <VStack gap={2}>
          <Heading level={1} type="display-3" xstyle={t.keepAll}>
            {lesson.title}
          </Heading>
          <Text type="large" color="secondary" xstyle={t.keepAll}>
            {lesson.summary}
          </Text>
        </VStack>

        <Stepper orientation="vertical" activeStep={nextIdx} label="레슨 단계" onStepClick={(i) => go('l', chapterId, lesson.id, list[i].id)}>
          {list.map((s, i) => (
            <Step
              key={s.id}
              step={i}
              label={s.title}
              description={s.desc}
              status={s.done ? 'success' : undefined}
              indicator={s.done ? <Icon icon={Check} size="sm" /> : 'number'}
              endContent={
                <HStack gap={1} vAlign="center">
                  {s.stars !== undefined && <MiniStars n={s.stars} />}
                  <Text type="supporting" hasTabularNumbers>
                    {s.meta}
                  </Text>
                </HStack>
              }
            >
              {s === next && (
                <Button
                  label={i === 0 ? '시작하기' : '이어서 하기'}
                  variant="primary"
                  size="lg"
                  width="100%"
                  href={href('l', chapterId, lesson.id, s.id)}
                  endContent={<Icon icon={ArrowRight} />}
                />
              )}
            </Step>
          ))}
        </Stepper>

        {!next && (
          <Banner
            status="success"
            title="이 레슨 끝!"
            description={
              <Text type="inherit">
                단어는 이제 <Link href={href('review')}>복습</Link>에서 날짜에 맞춰 다시 나와요.
                {wrong > 0 && (
                  <>
                    {' '}
                    지난 퀴즈에서 틀린 <Link href={href('l', chapterId, lesson.id, 'quiz', 'wrong')}>{wrong}문제만 다시</Link> 풀어 볼까요?
                  </>
                )}
              </Text>
            }
          />
        )}

        <VStack gap={2}>
          <Heading level={3} color="secondary">
            펼쳐 보기
          </Heading>
          <List edge="outset" hasDividers>
            {lesson.words.length > 0 && (
              <ListItem
                href={href('l', chapterId, lesson.id, 'list')}
                startContent={<Icon icon={BookText} />}
                label="단어 목록"
                endContent={<Badge variant="neutral" label={`${lesson.words.length}`} />}
              />
            )}
            <ListItem
              href={href('l', chapterId, lesson.id, 'notes')}
              startContent={<Icon icon={NotebookText} />}
              label="문장 분석 노트"
              endContent={<Badge variant="neutral" label={`${lesson.sentences.length}`} />}
            />
            <ListItem href={href('l', chapterId, lesson.id, 'learn')} startContent={<Icon icon={RotateCcw} />} label="개념 다시 읽기" />
          </List>
        </VStack>

        <NoteList chapterId={chapterId} lesson={lesson} onNew={() => openNote()} />
      </VStack>
      {sheet}
    </Screen>
  )
}

// ───────── 단어 게임 ─────────

const PER_ROUND = 10

function pickRound(words: StudyWord[]): StudyWord[] {
  const srs = getState().progress.srs
  const fresh = words.filter((w) => !srs[w.key])
  const due = words.filter((w) => srs[w.key] && isDue(srs[w.key]))
  const rest = shuffle(words.filter((w) => srs[w.key] && !isDue(srs[w.key])))
  return [...fresh, ...due, ...rest].slice(0, PER_ROUND)
}

function WordsStage({ chapterId, lesson, home }: StageP) {
  const { openNote, sheet } = useNoteSheet(chapterId, lesson)
  const words = useMemo(() => lessonWords(chapterId, lesson.id), [chapterId, lesson.id])
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<GameResult | null>(null)
  const pool = useMemo(() => [...allWords(getState().words).values()], [])
  const session = useMemo(() => pickRound(words), [words, round])
  // 이번 판을 시작할 때의 기록으로 '새 단어'(소개 카드 필요)인지 판단
  const snap = useMemo(() => getState().progress.srs, [round])

  if (result) {
    const srs = getState().progress.srs
    const left = words.filter((w) => !srs[w.key]).length
    const st = stars(result.right, result.right + result.wrong)
    return (
      <DoneScreen>
        <GameDone
          stars={st}
          title={st === 3 ? '하나도 안 틀렸어요!' : '한 판 끝!'}
          line={left ? `아직 안 배운 단어 ${left}개 남았어요.` : '이 레슨 단어를 모두 시작했어요. 이제 복습에서 다시 만나요.'}
          stats={[
            { label: '한 번에 맞힘', value: `${result.right}/${result.total}` },
            { label: '최고 연속', value: result.bestCombo },
          ]}
        >
          <Button
            label={left ? `다음 판 (${Math.min(left, PER_ROUND)}단어)` : '한 판 더 연습'}
            variant="primary"
            size="lg"
            width="100%"
            onClick={() => {
              setResult(null)
              setRound(round + 1)
            }}
          />
          <Button label="레슨으로" variant="secondary" size="lg" width="100%" href={home} />
        </GameDone>
      </DoneScreen>
    )
  }

  return (
    <>
      <WordGame
        key={round}
        words={session}
        pool={pool}
        isNew={(w) => !snap[w.key] || snap[w.key].reps === 0}
        exitHref={home}
        onNote={(tg, confusing) => openNote(tg, confusing ? 'confusing' : undefined)}
        onDone={(r) => {
          const srs = getState().progress.srs
          if (words.every((w) => srs[w.key])) markLesson(chapterId, lesson.id, { cards: true })
          setResult(r)
        }}
      />
      {sheet}
    </>
  )
}

// ───────── 뼈대 찾기 ─────────

function SentencesStage({ chapterId, lesson, home }: StageP) {
  const { openNote, sheet } = useNoteSheet(chapterId, lesson)
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<{ clean: number; total: number } | null>(null)
  if (result) {
    const st = stars(result.clean, result.total)
    return (
      <DoneScreen>
        <GameDone
          stars={st}
          title={st === 3 ? '뼈대 박사!' : '문장 분석 끝!'}
          line="긴 문장도 동사부터 찾으면 뼈대가 보여요."
          stats={[
            { label: '한 번에 찾음', value: `${result.clean}/${result.total}` },
            { label: '문장', value: result.total },
          ]}
        >
          <Button label="레슨으로" variant="primary" size="lg" width="100%" href={home} />
          <Button
            label="다시 하기"
            variant="secondary"
            size="lg"
            width="100%"
            icon={<Icon icon={RotateCcw} />}
            onClick={() => {
              setResult(null)
              setRound(round + 1)
            }}
          />
        </GameDone>
      </DoneScreen>
    )
  }
  return (
    <>
      <SentenceGame
        key={round}
        sentences={lesson.sentences}
        exitHref={home}
        onNote={(tg) => openNote(tg)}
        onDone={(clean, total) => {
          markLesson(chapterId, lesson.id, { sentences: true })
          setResult({ clean, total })
        }}
      />
      {sheet}
    </>
  )
}

// ───────── 퀴즈 ─────────

function QuizStage({ chapterId, lesson, home, onlyWrong }: StageP & { onlyWrong: boolean }) {
  const { openNote, sheet } = useNoteSheet(chapterId, lesson)
  const [set, setSet] = useState(() => {
    const wrong = getState().progress.lessons[lessonKey(chapterId, lesson.id)]?.wrong ?? []
    const w = lesson.quiz.filter((q) => wrong.includes(q.id))
    return onlyWrong && w.length ? w : lesson.quiz
  })
  const full = set.length === lesson.quiz.length
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<{ score: number; total: number; wrong: string[]; combo: number } | null>(null)

  function start(qs: typeof lesson.quiz) {
    setSet(qs)
    setResult(null)
    setRound(round + 1)
    scrollToTop()
  }

  if (result) {
    const st = stars(result.score, result.total)
    const again = lesson.quiz.filter((q) => result.wrong.includes(q.id))
    const msg =
      st === 3
        ? '완벽해요!'
        : st === 2
          ? '거의 다 맞았어요'
          : result.score / result.total >= 0.5
            ? '좋아요, 조금만 더!'
            : '괜찮아요. 틀린 문제의 해설이 진짜 공부예요'
    return (
      <DoneScreen>
        <GameDone
          stars={st}
          title={`${result.score} / ${result.total}`}
          line={msg}
          stats={[
            { label: '틀린 문제', value: result.wrong.length },
            { label: '최고 연속', value: result.combo },
          ]}
        >
          {again.length > 0 && <Button label={`틀린 ${again.length}문제만 다시`} variant="primary" size="lg" width="100%" onClick={() => start(again)} />}
          <Button
            label="처음부터 다시"
            variant={again.length ? 'secondary' : 'primary'}
            size="lg"
            width="100%"
            icon={<Icon icon={RotateCcw} />}
            onClick={() => start(lesson.quiz)}
          />
          <Button label="레슨으로" variant="secondary" size="lg" width="100%" href={home} />
          {again.length > 0 && (
            <Button label="해설을 봐도 헷갈렸다면 · 메모 남기기" variant="ghost" width="100%" onClick={() => openNote(`quiz:${again[0].id}`, 'confusing')} />
          )}
        </GameDone>
        {sheet}
      </DoneScreen>
    )
  }

  return (
    <>
      <QuizRunner
        key={round}
        questions={set}
        exitHref={home}
        onNote={(tg, confusing) => openNote(tg, confusing ? 'confusing' : undefined)}
        onFinish={(score, wrong, combo) => {
          recordQuiz(chapterId, lesson.id, score, set.length, wrong, full)
          setResult({ score, total: set.length, wrong, combo })
          scrollToTop()
        }}
      />
      {sheet}
    </>
  )
}

// ───────── 펼쳐 보기: 단어 목록 · 문장 노트 ─────────

function WordList({ chapterId, lesson, home }: StageP) {
  const srs = useStore((s) => s.progress.srs)
  const words = useMemo(() => lessonWords(chapterId, lesson.id), [chapterId, lesson.id])
  const [hideKo, setHideKo] = useState(false)
  const groups = useMemo(() => {
    const m = new Map<string, StudyWord[]>()
    for (const w of words) m.set(w.group, [...(m.get(w.group) ?? []), w])
    return [...m]
  }, [words])

  return (
    <Screen
      header={<AppBar back={home} title={`${lesson.title} · 단어`} />}
      footer={
        <Button
          label="단어 게임 하기"
          variant="primary"
          size="lg"
          width="100%"
          href={href('l', chapterId, lesson.id, 'words')}
          endContent={<Icon icon={ArrowRight} />}
        />
      }
    >
      <VStack gap={5}>
        <HStack hAlign="between" vAlign="center">
          <Text type="supporting">
            외우기 시작 {words.filter((w) => srs[w.key]).length}/{words.length}
          </Text>
          <HideKoSwitch value={hideKo} onChange={setHideKo} />
        </HStack>
        {groups.map(([g, ws]) => (
          <List edge="outset" key={g} hasDividers header={<Heading level={3}>{g}</Heading>}>
            {ws.map((w) => (
              <WordRow key={w.key} en={w.en} ko={w.ko} pos={w.pos} tip={w.tip} ex={w.ex} level={boxLabel(srs[w.key])} box={srs[w.key]?.box} hideKo={hideKo} />
            ))}
          </List>
        ))}
      </VStack>
    </Screen>
  )
}

function Notes({ chapterId, lesson, home }: StageP) {
  useEffect(() => markLesson(chapterId, lesson.id, { sentences: true }), [chapterId, lesson.id])
  const [opts, setOpts] = useState<ViewOpts>({ skeleton: false, ko: false, slash: false })
  const chip = (k: keyof ViewOpts, icon: typeof Bone, label: string) => (
    <ToggleButton label={label} size="sm" icon={<Icon icon={icon} />} isPressed={opts[k]} onPressedChange={(v) => setOpts({ ...opts, [k]: v })}>
      {label}
    </ToggleButton>
  )
  return (
    <Screen header={<AppBar back={home} title={`${lesson.title} · 문장`} />}>
      <VStack gap={4}>
        <Text type="supporting">색칠된 단어를 누르면 역할이 나와요.</Text>
        <HStack gap={2} wrap="wrap">
          {chip('skeleton', Bone, '뼈대만')}
          {chip('slash', Scissors, '끊어 읽기')}
          {chip('ko', Languages, '해석')}
        </HStack>
        <Collapsible
          trigger={
            <HStack gap={1} vAlign="center">
              <Icon icon={Palette} size="sm" />
              <Text type="label">색깔 설명</Text>
            </HStack>
          }
        >
          <TagLegend />
        </Collapsible>
        {lesson.sentences.map((s, i) => (
          <SentenceView key={s.id} s={s} opts={opts} index={i} />
        ))}
      </VStack>
    </Screen>
  )
}
