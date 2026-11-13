import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bone, BookText, Check, ChevronDown, ChevronUp, Languages, NotebookText, RotateCcw, Scissors, Star } from 'lucide-react'
import { findLesson } from '../lib/content.ts'
import { getState, lessonKey, markLesson, recordQuiz, useStore, type LessonProgress } from '../lib/store.ts'
import { href, replace } from '../lib/router.ts'
import { allWords, lessonWords, type StudyWord } from '../lib/words.ts'
import { boxLabel, isDue } from '../lib/srs.ts'
import { shuffle, stars } from '../lib/game.ts'
import type { Lesson as LessonT } from '../content/types.ts'
import { TopBar } from '../components/TopBar.tsx'
import { SentenceView, TagLegend, type ViewOpts } from '../components/SentenceView.tsx'
import { QuizRunner } from '../components/QuizRunner.tsx'
import { WordGame, type GameResult } from '../components/WordGame.tsx'
import { SentenceGame } from '../components/SentenceGame.tsx'
import { ConceptPlayer } from '../components/ConceptPlayer.tsx'
import { GameDone } from '../components/GameDone.tsx'
import { HideKoSwitch, WordRow } from '../components/WordRow.tsx'
import { useNoteSheet } from '../components/NoteSheet.tsx'
import { NoteList } from '../components/NoteList.tsx'

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
      <div className="page">
        <TopBar back="#/" title="레슨을 찾을 수 없어요" />
        <p className="empty">
          <a href="#/">홈으로</a>
        </p>
      </div>
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

// ───────── 개념 ─────────

function LearnStage({ chapterId, lesson, home }: StageP) {
  const { openNote, sheet } = useNoteSheet(chapterId, lesson)
  return (
    <>
      <ConceptPlayer
        sections={lesson.sections}
        exitHref={home}
        onNote={(t) => openNote(t)}
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

interface StageInfo {
  id: string
  title: string
  desc: string
  meta: string
  done: boolean
  stars?: number
}

export function stageList(lesson: LessonT, lp: LessonProgress | undefined, started: number): StageInfo[] {
  const out: StageInfo[] = [
    { id: 'learn', title: '개념 익히기', desc: '한 장씩 넘기며 읽어요', meta: `${lesson.sections.length}장`, done: !!lp?.read },
  ]
  if (lesson.words.length)
    out.push({
      id: 'words',
      title: '단어 게임',
      desc: '뜻 고르기 · 듣기 · 짝 맞추기',
      meta: `${started}/${lesson.words.length}단어`,
      done: !!lp?.cards || started === lesson.words.length,
    })
  out.push(
    { id: 'sentences', title: '뼈대 찾기', desc: '진짜 동사와 주어를 직접 찾아요', meta: `${lesson.sentences.length}문장`, done: !!lp?.sentences },
    {
      id: 'quiz',
      title: '실전 퀴즈',
      desc: '토익처럼 빈칸 채우기',
      meta: lp?.quizTotal ? `최고 ${lp.quizBest}/${lp.quizTotal}` : `${lesson.quiz.length}문제`,
      done: !!lp?.quizTotal,
      stars: lp?.quizTotal ? stars(lp.quizBest ?? 0, lp.quizTotal) : undefined,
    },
  )
  return out
}

export function useLessonStages(chapterId: string, lesson: LessonT) {
  const lp = useStore((s) => s.progress.lessons[lessonKey(chapterId, lesson.id)])
  const srs = useStore((s) => s.progress.srs)
  const words = useMemo(() => lessonWords(chapterId, lesson.id), [chapterId, lesson.id])
  const started = words.filter((w) => srs[w.key]).length
  const list = stageList(lesson, lp, started)
  const next = list.find((s) => !s.done)
  return { list, next, lp }
}

function Overview({ chapterId, lesson }: StageP) {
  const { list, next, lp } = useLessonStages(chapterId, lesson)
  const { openNote, sheet } = useNoteSheet(chapterId, lesson)
  const wrong = lesson.quiz.filter((q) => lp?.wrong?.includes(q.id)).length

  return (
    <div className="page lesson">
      <TopBar back="#/" title="" />
      <header className="lesson-hero">
        <h1>{lesson.title}</h1>
        <p>{lesson.summary}</p>
      </header>

      <ol className="path">
        {list.map((s, i) => {
          const isNext = s === next
          return (
            <li key={s.id} className={`${s.done ? 'done' : ''} ${isNext ? 'next' : ''}`}>
              <a className="path-row" href={href('l', chapterId, lesson.id, s.id)}>
                <span className="path-dot">{s.done ? <Check size={20} strokeWidth={3} /> : i + 1}</span>
                <span className="path-text">
                  <b>{s.title}</b>
                  <span>{s.desc}</span>
                </span>
                <span className="path-meta">
                  {s.stars !== undefined ? (
                    <span className="mini-stars" aria-label={`별 ${s.stars}개`}>
                      {[0, 1, 2].map((k) => (
                        <Star key={k} size={14} className={k < s.stars! ? 'on' : ''} />
                      ))}
                    </span>
                  ) : null}
                  {s.meta}
                </span>
              </a>
              {isNext && (
                <a className="btn primary block big path-go" href={href('l', chapterId, lesson.id, s.id)}>
                  {i === 0 ? '시작하기' : '이어서 하기'} <ArrowRight size={19} />
                </a>
              )}
            </li>
          )
        })}
      </ol>

      {!next && (
        <div className="note-box">
          <b>이 레슨 끝!</b> 단어는 이제 <a href={href('review')}>복습</a>에서 날짜에 맞춰 다시 나와요.
          {wrong > 0 && (
            <>
              {' '}
              지난 퀴즈에서 틀린 <a href={href('l', chapterId, lesson.id, 'quiz', 'wrong')}>{wrong}문제만 다시</a> 풀어 볼까요?
            </>
          )}
        </div>
      )}

      <div className="refs">
        <p className="section-label">펼쳐 보기</p>
        {lesson.words.length > 0 && (
          <a className="ref-row" href={href('l', chapterId, lesson.id, 'list')}>
            <BookText size={19} /> <span className="grow">단어 목록</span> <span className="muted">{lesson.words.length}</span>
          </a>
        )}
        <a className="ref-row" href={href('l', chapterId, lesson.id, 'notes')}>
          <NotebookText size={19} /> <span className="grow">문장 분석 노트</span> <span className="muted">{lesson.sentences.length}</span>
        </a>
        <a className="ref-row" href={href('l', chapterId, lesson.id, 'learn')}>
          <RotateCcw size={18} /> <span className="grow">개념 다시 읽기</span>
        </a>
      </div>

      <NoteList chapterId={chapterId} lesson={lesson} onNew={() => openNote()} />
      {sheet}
    </div>
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
      <div className="page">
        <GameDone
          stars={st}
          title={st === 3 ? '하나도 안 틀렸어요!' : '한 판 끝!'}
          line={left ? `아직 안 배운 단어 ${left}개 남았어요.` : '이 레슨 단어를 모두 시작했어요. 이제 복습에서 다시 만나요.'}
          stats={[
            { label: '한 번에 맞힘', value: `${result.right}/${result.total}` },
            { label: '최고 연속', value: result.bestCombo },
          ]}
        >
          <button
            type="button"
            className="btn primary block big"
            onClick={() => {
              setResult(null)
              setRound(round + 1)
            }}
          >
            {left ? `다음 판 (${Math.min(left, PER_ROUND)}단어)` : '한 판 더 연습'}
          </button>
          <a className="btn block big" href={home}>
            레슨으로
          </a>
        </GameDone>
      </div>
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
        onNote={(t, confusing) => openNote(t, confusing ? 'confusing' : undefined)}
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
      <div className="page">
        <GameDone
          stars={st}
          title={st === 3 ? '뼈대 박사!' : '문장 분석 끝!'}
          line="긴 문장도 동사부터 찾으면 뼈대가 보여요."
          stats={[
            { label: '한 번에 찾음', value: `${result.clean}/${result.total}` },
            { label: '문장', value: result.total },
          ]}
        >
          <a className="btn primary block big" href={home}>
            레슨으로
          </a>
          <button
            type="button"
            className="btn block big"
            onClick={() => {
              setResult(null)
              setRound(round + 1)
            }}
          >
            <RotateCcw size={18} /> 다시 하기
          </button>
        </GameDone>
      </div>
    )
  }
  return (
    <>
      <SentenceGame
        key={round}
        sentences={lesson.sentences}
        exitHref={home}
        onNote={(t) => openNote(t)}
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
    window.scrollTo(0, 0)
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
      <div className="page">
        <GameDone
          stars={st}
          title={`${result.score} / ${result.total}`}
          line={msg}
          stats={[
            { label: '틀린 문제', value: result.wrong.length },
            { label: '최고 연속', value: result.combo },
          ]}
        >
          {again.length > 0 && (
            <button type="button" className="btn primary block big" onClick={() => start(again)}>
              틀린 {again.length}문제만 다시
            </button>
          )}
          <button type="button" className={`btn block big ${again.length ? '' : 'primary'}`} onClick={() => start(lesson.quiz)}>
            <RotateCcw size={18} /> 처음부터 다시
          </button>
          <a className="btn block big" href={home}>
            레슨으로
          </a>
          {again.length > 0 && (
            <button type="button" className="link small center" onClick={() => openNote(`quiz:${again[0].id}`, 'confusing')}>
              해설을 봐도 헷갈렸다면 · 메모 남기기
            </button>
          )}
        </GameDone>
        {sheet}
      </div>
    )
  }

  return (
    <div className="page">
      <QuizRunner
        key={round}
        questions={set}
        exitHref={home}
        onNote={(t, confusing) => openNote(t, confusing ? 'confusing' : undefined)}
        onFinish={(score, wrong, combo) => {
          recordQuiz(chapterId, lesson.id, score, set.length, wrong, full)
          setResult({ score, total: set.length, wrong, combo })
          window.scrollTo(0, 0)
        }}
      />
      {sheet}
    </div>
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
    <div className="page">
      <TopBar back={home} title={`${lesson.title} · 단어`} />
      <div className="row-between pad-x">
        <span className="small muted">외우기 시작 {words.filter((w) => srs[w.key]).length}/{words.length}</span>
        <HideKoSwitch value={hideKo} onChange={setHideKo} />
      </div>
      {groups.map(([g, ws]) => (
        <section key={g} className="card word-card">
          <h3 className="group-title">{g}</h3>
          <ul className="word-list">
            {ws.map((w) => (
              <WordRow key={w.key} en={w.en} ko={w.ko} tip={w.tip} ex={w.ex} level={boxLabel(srs[w.key])} box={srs[w.key]?.box} hideKo={hideKo} />
            ))}
          </ul>
        </section>
      ))}
      <a className="btn primary block big" href={href('l', chapterId, lesson.id, 'words')}>
        단어 게임 하기 <ArrowRight size={19} />
      </a>
    </div>
  )
}

function Notes({ chapterId, lesson, home }: StageP) {
  useEffect(() => markLesson(chapterId, lesson.id, { sentences: true }), [chapterId, lesson.id])
  const [opts, setOpts] = useState<ViewOpts>({ skeleton: false, ko: false, slash: false })
  const [legend, setLegend] = useState(false)
  const toggle = (k: keyof ViewOpts) => setOpts({ ...opts, [k]: !opts[k] })
  const chip = (k: keyof ViewOpts, Icon: typeof Bone, label: string) => (
    <button type="button" className={`chip ${opts[k] ? 'on' : ''}`} aria-pressed={opts[k]} onClick={() => toggle(k)}>
      <Icon size={15} strokeWidth={2.2} /> {label}
    </button>
  )
  return (
    <div className="page">
      <TopBar back={home} title={`${lesson.title} · 문장`} />
      <p className="small muted pad-x">색칠된 단어를 누르면 역할이 나와요.</p>
      <div className="chips">
        {chip('skeleton', Bone, '뼈대만')}
        {chip('slash', Scissors, '끊어 읽기')}
        {chip('ko', Languages, '해석')}
      </div>
      <button type="button" className="link small" onClick={() => setLegend(!legend)}>
        색깔 설명 {legend ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {legend && <TagLegend />}
      {lesson.sentences.map((s, i) => (
        <SentenceView key={s.id} s={s} opts={opts} index={i} />
      ))}
    </div>
  )
}
