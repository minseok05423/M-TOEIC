import { useEffect, useMemo, useState } from 'react'
import { findLesson } from '../lib/content.ts'
import { lessonKey, markLesson, recordQuiz, useStore } from '../lib/store.ts'
import { href, replace } from '../lib/router.ts'
import { lessonWords } from '../lib/words.ts'
import { boxLabel } from '../lib/srs.ts'
import { TopBar } from '../components/TopBar.tsx'
import { RichText } from '../components/RichText.tsx'
import { Speak } from '../components/Speak.tsx'
import { SentenceView, TagLegend, type ViewOpts } from '../components/SentenceView.tsx'
import { QuizRunner } from '../components/QuizRunner.tsx'
import type { Lesson as LessonT } from '../content/types.ts'

type Tab = 'learn' | 'words' | 'sentences' | 'quiz'

export function Lesson({ chapterId, lessonId, tab }: { chapterId: string; lessonId: string; tab?: string }) {
  const found = findLesson(chapterId, lessonId)
  if (!found) return <NotFound />
  const { lesson } = found
  const tabs: { id: Tab; label: string }[] = [
    { id: 'learn', label: '설명' },
    ...(lesson.words.length ? [{ id: 'words' as Tab, label: `단어 ${lesson.words.length}` }] : []),
    { id: 'sentences', label: `문장 ${lesson.sentences.length}` },
    { id: 'quiz', label: `퀴즈 ${lesson.quiz.length}` },
  ]
  const cur: Tab = tabs.some((t) => t.id === tab) ? (tab as Tab) : 'learn'
  const idx = tabs.findIndex((t) => t.id === cur)
  const nextTab = tabs[idx + 1]

  return (
    <div className="page lesson">
      <TopBar back="#/" title={`${lesson.emoji} ${lesson.title}`} />
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === cur}
            className={t.id === cur ? 'on' : ''}
            onClick={() => replace('l', chapterId, lessonId, t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {cur === 'learn' && <LearnTab chapterId={chapterId} lesson={lesson} />}
      {cur === 'words' && <WordsTab chapterId={chapterId} lesson={lesson} />}
      {cur === 'sentences' && <SentencesTab chapterId={chapterId} lesson={lesson} />}
      {cur === 'quiz' && <QuizTab key={lesson.id} chapterId={chapterId} lesson={lesson} />}

      {nextTab && cur !== 'quiz' && (
        <button type="button" className="btn primary block next-tab" onClick={() => replace('l', chapterId, lessonId, nextTab.id)}>
          다음: {nextTab.label.replace(/\s\d+$/, '')} →
        </button>
      )}
    </div>
  )
}

function NotFound() {
  return (
    <div className="page">
      <TopBar back="#/" title="레슨을 찾을 수 없어요" />
      <p className="empty">
        <a href="#/">홈으로</a>
      </p>
    </div>
  )
}

function LearnTab({ chapterId, lesson }: { chapterId: string; lesson: LessonT }) {
  useEffect(() => markLesson(chapterId, lesson.id, { read: true }), [chapterId, lesson.id])
  return (
    <div className="stack">
      {lesson.sections.map((s, i) => (
        <section key={i} className="card section">
          <h3>{s.heading}</h3>
          <RichText text={s.body} />
          {s.table && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {s.table[0].map((c, j) => (
                      <th key={j}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.slice(1).map((row, r) => (
                    <tr key={r}>
                      {row.map((c, j) => (
                        <td key={j}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {s.examples?.map((ex, j) => (
            <div key={j} className="example">
              <Speak text={ex.en} />
              <div>
                <p className="ex-en">{ex.en}</p>
                <p className="ex-ko">{ex.ko}</p>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

function WordsTab({ chapterId, lesson }: { chapterId: string; lesson: LessonT }) {
  const srs = useStore((s) => s.progress.srs)
  const words = useMemo(() => lessonWords(chapterId, lesson.id), [chapterId, lesson.id])
  const [hideKo, setHideKo] = useState(false)
  const groups = useMemo(() => {
    const m = new Map<string, typeof words>()
    for (const w of words) m.set(w.group, [...(m.get(w.group) ?? []), w])
    return [...m]
  }, [words])
  const started = words.filter((w) => srs[w.key]).length

  return (
    <div className="stack">
      <a className="btn primary block big" href={href('l', chapterId, lesson.id, 'cards')}>
        🃏 카드로 외우기 ({words.length}개)
      </a>
      <div className="row-between">
        <span className="small muted">
          외우기 시작한 단어 {started}/{words.length}
        </span>
        <label className="toggle small">
          <input type="checkbox" checked={hideKo} onChange={(e) => setHideKo(e.target.checked)} /> 뜻 가리기
        </label>
      </div>
      {groups.map(([g, ws]) => (
        <section key={g} className="card">
          <h3 className="group-title">{g}</h3>
          <ul className="word-list">
            {ws.map((w) => (
              <WordRow key={w.key} en={w.en} ko={w.ko} tip={w.tip} ex={w.ex} level={boxLabel(srs[w.key])} box={srs[w.key]?.box} hideKo={hideKo} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function WordRow({
  en,
  ko,
  tip,
  ex,
  level,
  box,
  hideKo,
  onEdit,
}: {
  en: string
  ko: string
  tip?: string
  ex?: { en: string; ko: string }
  level?: string
  box?: number
  hideKo?: boolean
  onEdit?: () => void
}) {
  const [open, setOpen] = useState(false)
  const shown = !hideKo || open
  return (
    <li className="word-row" onClick={() => setOpen(!open)}>
      <div className="word-main">
        <Speak text={en} />
        <div className="word-text">
          <b className="word-en">{en}</b>
          <span className={`word-ko ${shown ? '' : 'hidden'}`}>{shown ? ko : '탭해서 보기'}</span>
        </div>
        {box !== undefined && <span className={`dots b${box}`} title={level} />}
      </div>
      {open && (ex || tip || onEdit) && (
        <div className="word-more">
          {ex && (
            <p>
              <Speak text={ex.en} /> {ex.en}
              <br />
              <span className="muted">{ex.ko}</span>
            </p>
          )}
          {tip && <p className="small">💡 {tip}</p>}
          {level && <p className="small muted">상태: {level}</p>}
          {onEdit && (
            <button
              type="button"
              className="btn small"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              ✏️ 수정
            </button>
          )}
        </div>
      )}
    </li>
  )
}

function SentencesTab({ chapterId, lesson }: { chapterId: string; lesson: LessonT }) {
  useEffect(() => markLesson(chapterId, lesson.id, { sentences: true }), [chapterId, lesson.id])
  const [opts, setOpts] = useState<ViewOpts>({ skeleton: false, ko: false, slash: false })
  const [legend, setLegend] = useState(false)
  const toggle = (k: keyof ViewOpts) => setOpts({ ...opts, [k]: !opts[k] })
  return (
    <div className="stack">
      <p className="small muted">색칠된 단어를 누르면 역할이 나와요. 먼저 해석 없이 뼈대를 찾아보세요!</p>
      <div className="seg toggles sticky">
        <button type="button" className={opts.skeleton ? 'on' : ''} onClick={() => toggle('skeleton')}>
          🦴 뼈대만
        </button>
        <button type="button" className={opts.slash ? 'on' : ''} onClick={() => toggle('slash')}>
          ✂️ 끊어 읽기
        </button>
        <button type="button" className={opts.ko ? 'on' : ''} onClick={() => toggle('ko')}>
          🇰🇷 해석
        </button>
      </div>
      <button type="button" className="link small" onClick={() => setLegend(!legend)}>
        {legend ? '색깔 설명 닫기 ▲' : '색깔이 뭐예요? ▼'}
      </button>
      {legend && <TagLegend />}
      {lesson.sentences.map((s, i) => (
        <SentenceView key={s.id} s={s} opts={opts} index={i} />
      ))}
    </div>
  )
}

function QuizTab({ chapterId, lesson }: { chapterId: string; lesson: LessonT }) {
  const lp = useStore((s) => s.progress.lessons[lessonKey(chapterId, lesson.id)])
  const [mode, setMode] = useState<'intro' | 'run' | 'result'>('intro')
  const [set, setSet] = useState(lesson.quiz)
  const [full, setFull] = useState(true)
  const [result, setResult] = useState<{ score: number; total: number; wrong: string[] } | null>(null)
  const [round, setRound] = useState(0)
  const wrongQs = lesson.quiz.filter((q) => lp?.wrong?.includes(q.id))

  function start(qs: typeof lesson.quiz, isFull: boolean) {
    setSet(qs)
    setFull(isFull)
    setRound(round + 1)
    setMode('run')
  }

  if (mode === 'run')
    return (
      <QuizRunner
        key={round}
        questions={set}
        onFinish={(score, wrong) => {
          recordQuiz(chapterId, lesson.id, score, set.length, wrong, full)
          setResult({ score, total: set.length, wrong })
          setMode('result')
          window.scrollTo(0, 0)
        }}
      />
    )

  if (mode === 'result' && result) {
    const pct = result.score / result.total
    const emoji = pct === 1 ? '🏆' : pct >= 0.8 ? '🎉' : pct >= 0.5 ? '💪' : '🌱'
    const msg = pct === 1 ? '완벽해요!' : pct >= 0.8 ? '거의 다 맞았어요!' : pct >= 0.5 ? '좋아요, 조금만 더!' : '괜찮아요, 설명을 한 번 더 보고 다시 해 봐요'
    const again = lesson.quiz.filter((q) => result.wrong.includes(q.id))
    return (
      <div className="done">
        {pct === 1 && <Confetti />}
        <div className="done-emoji">{emoji}</div>
        <h2>
          {result.score} / {result.total}
        </h2>
        <p>{msg}</p>
        <div className="done-actions">
          {again.length > 0 && (
            <button type="button" className="btn primary block" onClick={() => start(again, false)}>
              틀린 {again.length}문제만 다시
            </button>
          )}
          <button type="button" className="btn block" onClick={() => start(lesson.quiz, true)}>
            처음부터 다시
          </button>
          <a className="btn block" href="#/">
            레슨 목록으로
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="card quiz-intro">
        <p className="done-emoji">📝</p>
        <p>
          문제 <b>{lesson.quiz.length}</b>개
        </p>
        {lp?.quizTotal ? (
          <p className="muted">
            최고 점수 {lp.quizBest}/{lp.quizTotal} · 지난번 {lp.quizLast}/{lp.quizTotal}
          </p>
        ) : (
          <p className="muted">틀려도 괜찮아요. 해설을 읽는 게 진짜 공부!</p>
        )}
        <button type="button" className="btn primary block big" onClick={() => start(lesson.quiz, true)}>
          시작하기
        </button>
        {wrongQs.length > 0 && (
          <button type="button" className="btn block" onClick={() => start(wrongQs, false)}>
            지난번 틀린 {wrongQs.length}문제만
          </button>
        )}
      </div>
    </div>
  )
}

function Confetti() {
  const bits = ['🎉', '⭐', '✨', '🎊', '💯']
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 18 }, (_, i) => (
        <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.12}s` }}>
          {bits[i % bits.length]}
        </span>
      ))}
    </div>
  )
}
