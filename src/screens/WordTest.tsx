import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronDown, CircleHelp, ClipboardPaste, Plus, X } from 'lucide-react'
import { newId, reviewWord, saveTest, useStore, type WordTest as Test, type WordTestItem } from '../lib/store.ts'
import { allWords, lessonWordList, type StudyWord } from '../lib/words.ts'
import { planTest, WHY_LABEL, type PlannedItem, type Why } from '../lib/wordtest.ts'
import { distractors, shuffle, stars } from '../lib/game.ts'
import { formatDate, today } from '../lib/date.ts'
import { href } from '../lib/router.ts'
import { speak } from '../lib/tts.ts'
import { sfx } from '../lib/sfx.ts'
import { useImmersive } from '../lib/ui.ts'
import { TopBar } from '../components/TopBar.tsx'
import { RunHead } from '../components/RunHead.tsx'
import { GameDone } from '../components/GameDone.tsx'
import { Speak } from '../components/Speak.tsx'
import { WordRow } from '../components/WordRow.tsx'

const partScore = (t: Test, part: WordTestItem['part']) => {
  const xs = t.items.filter((x) => x.part === part)
  return `${xs.filter((x) => x.ok).length}/${xs.length}`
}

export function WordTest() {
  const words = useStore((s) => s.words)
  const srs = useStore((s) => s.progress.srs)
  const tests = useStore((s) => s.tests)
  const userChapters = useStore((s) => s.userChapters)
  const plan = useMemo(() => planTest(words, srs, tests, lessonWordList()), [words, srs, tests, userChapters])
  const pool = useMemo(() => [...allWords(words).values()], [words, userChapters])
  const history = useMemo(() => Object.values(tests).sort((a, b) => b.finishedAt - a.finishedAt), [tests])
  const [run, setRun] = useState<{ items: PlannedItem[]; n: number } | null>(null)
  const [result, setResult] = useState<Test | null>(null)

  if (run && !result)
    return (
      <TestRun
        key={run.n}
        items={run.items}
        pool={pool}
        onDone={(t) => {
          saveTest(t)
          setResult(t)
        }}
      />
    )

  if (result) {
    const wrong = result.items.filter((x) => !x.ok)
    return (
      <div className="page">
        <GameDone
          stars={stars(result.score, result.total)}
          title="단어 테스트 끝!"
          line={`${result.total}문제 중 ${result.score}개 맞혔어요. ${wrong.length ? '틀린 단어는 다음 테스트에 다시 나와요.' : '완벽해요!'}`}
          stats={[
            { label: '새 단어', value: partScore(result, 'new') },
            { label: '복습', value: partScore(result, 'review') },
          ]}
        >
          <a className="btn primary block big" href="#/">
            홈으로
          </a>
          <button type="button" className="btn block big" onClick={() => (setRun(null), setResult(null))}>
            테스트 기록 보기
          </button>
        </GameDone>
        {wrong.length > 0 && <WrongList items={wrong} />}
      </div>
    )
  }

  const todays = history.filter((t) => t.day === today())
  const notToday = plan.latestDay !== today()
  const reasons = (Object.keys(plan.why) as Why[]).filter((k) => plan.why[k])

  return (
    <div className="page">
      <TopBar title="단어 테스트" back="#/" />
      {plan.items.length ? (
        <div className="review-card">
          <p className="rc-label">{todays.length ? `오늘 ${todays.length}번 봤어요 · 한 번 더?` : '오늘의 단어 테스트'}</p>
          <p className="rc-num">
            {plan.items.length}
            <small>문제</small>
          </p>
          <ul className="test-plan">
            {plan.newCount > 0 && (
              <li>
                <b>새 단어 {plan.newCount}개</b>
                <span>
                  {plan.latestDay && `${formatDate(plan.latestDay)}에 넣은 단어${plan.latestCount < plan.newCount ? ` ${plan.latestCount}개` : ''}`}
                  {plan.latestCount < plan.newCount && ` + 아직 시험 안 본 단어 ${plan.newCount - plan.latestCount}개`}
                </span>
              </li>
            )}
            {plan.reviewCount > 0 && (
              <li>
                <b>복습 {plan.reviewCount}개</b>
                <span>{reasons.map((k) => `${WHY_LABEL[k]} ${plan.why[k]}`).join(' · ')}</span>
              </li>
            )}
          </ul>
          {notToday && plan.newCount > 0 && (
            <p className="test-hint small">
              오늘 외운 단어를 아직 안 넣었어요. 먼저 넣으면 오늘 단어로 시험 봐요.
              <span className="row-gap">
                <a className="btn small tonal" href={href('words', 'bulk')}>
                  <ClipboardPaste size={14} /> 여러 개 붙여넣기
                </a>
                <a className="btn small tonal" href={href('words', 'new')}>
                  <Plus size={14} /> 하나씩
                </a>
              </span>
            </p>
          )}
          <button type="button" className="btn primary block big" onClick={() => setRun({ items: shuffle(plan.items), n: (run?.n ?? 0) + 1 })}>
            시작 <ArrowRight size={19} />
          </button>
          <p className="muted small">뜻을 고르는 4지선다예요. 모르면 찍지 말고 "모르겠어요"를 눌러요.</p>
        </div>
      ) : (
        <div className="review-card calm">
          <p className="rc-label">아직 시험 볼 단어가 없어요</p>
          <p className="muted">오늘 외운 단어를 단어장에 넣으면 여기서 시험 봐요.</p>
          <a className="btn primary block" href={href('words', 'bulk')}>
            <ClipboardPaste size={18} /> 단어 넣기
          </a>
        </div>
      )}

      {history.length > 0 && (
        <section className="card">
          <h3 className="group-title">지난 테스트</h3>
          <ul className="test-history">
            {history.slice(0, 14).map((t) => {
              const wrong = t.items.filter((x) => !x.ok)
              return (
                <li key={t.id}>
                  <details>
                    <summary>
                      <span className="th-day">{formatDate(t.day)}</span>
                      <b className={t.score === t.total ? 'good' : ''}>
                        {t.score}/{t.total}
                      </b>
                      <span className="muted small">{wrong.length ? `틀림 ${wrong.length}` : '만점'}</span>
                      {wrong.length > 0 && <ChevronDown size={16} />}
                    </summary>
                    {wrong.length > 0 && (
                      <p className="small th-wrong">
                        {wrong.map((x) => (
                          <span key={x.key}>
                            <span className="en-serif">{x.en}</span> {x.ko}
                          </span>
                        ))}
                      </p>
                    )}
                  </details>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function WrongList({ items }: { items: WordTestItem[] }) {
  return (
    <section className="card word-card">
      <h3 className="group-title">다시 볼 단어 · {items.length}</h3>
      <ul className="word-list">
        {items.map((x) => (
          <WordRow key={x.key} en={x.en} ko={x.ko} level={x.skip ? '모르겠어요' : '틀림'} />
        ))}
      </ul>
    </section>
  )
}

type Q = PlannedItem & { choices: StudyWord[] }

/** 한 단어에 한 번씩, 다시 풀기 없음. 답할 때마다 복습 기록(SRS)에도 반영 */
function TestRun({ items, pool, onDone }: { items: PlannedItem[]; pool: StudyWord[]; onDone: (t: Test) => void }) {
  useImmersive()
  const [qs] = useState<Q[]>(() => items.map((it) => ({ ...it, choices: shuffle([it.w, ...distractors(it.w, pool)]) })))
  const [pos, setPos] = useState(0)
  /** 고른 보기 번호, -1 = 모르겠어요 */
  const [picked, setPicked] = useState<number | null>(null)
  const results = useRef<WordTestItem[]>([])
  const startedAt = useRef(Date.now())
  const advanced = useRef(-1)
  const q = qs[pos]
  const ok = picked !== null && picked >= 0 && q.choices[picked] === q.w

  function answer(i: number) {
    if (picked !== null) return
    setPicked(i)
    const right = i >= 0 && q.choices[i] === q.w
    results.current.push({ key: q.w.key, en: q.w.en, ko: q.w.ko, part: q.part, why: q.why, ok: right, skip: i < 0 || undefined })
    reviewWord(q.w.key, right)
    if (right) {
      sfx.right()
      speak(q.w.en)
    } else sfx.wrong()
  }

  function next() {
    if (advanced.current === pos) return
    advanced.current = pos
    if (pos + 1 >= qs.length) {
      sfx.done()
      const r = results.current
      onDone({ id: newId(), day: today(), startedAt: startedAt.current, finishedAt: Date.now(), items: r, score: r.filter((x) => x.ok).length, total: r.length })
      return
    }
    setPos(pos + 1)
    setPicked(null)
  }

  useEffect(() => {
    if (!ok) return
    const t = setTimeout(next, 800)
    return () => clearTimeout(t)
  })

  const answered = picked !== null
  return (
    <div className="game">
      <RunHead exitHref="#/" progress={(pos + (answered ? 1 : 0)) / qs.length} count={`${pos + 1}/${qs.length}`} />
      <div className="game-body" key={pos}>
        <p className="game-prompt">
          {q.part === 'review' && <span className="tag-retry">복습</span>}이 단어의 뜻은?
        </p>
        <div className="q-stage">
          <div className="q-word">
            <span className="en-serif">{q.w.en}</span>
            <Speak text={q.w.en} />
          </div>
        </div>
        <div className="choices ko">
          {q.choices.map((c, i) => {
            const cls = !answered ? '' : c === q.w ? 'right' : i === picked ? 'wrong' : 'dim'
            return (
              <button key={c.key} type="button" className={`choice ${cls}`} onClick={() => answer(i)} disabled={answered && c !== q.w && i !== picked}>
                <span className="choice-n">{i + 1}</span>
                <span>{c.ko}</span>
                {answered && c === q.w && <Check className="mark" size={20} strokeWidth={2.6} />}
                {answered && i === picked && c !== q.w && <X className="mark" size={20} strokeWidth={2.6} />}
              </button>
            )
          })}
        </div>
        {!answered && (
          <button type="button" className="btn block test-skip" onClick={() => answer(-1)}>
            <CircleHelp size={18} /> 모르겠어요
          </button>
        )}
      </div>
      {answered && (
        <div className={`feedback ${ok ? 'ok' : 'no'}`} role="status">
          <div className="fb-row">
            <span className="fb-stamp">{ok ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}</span>
            <div className="fb-text">
              <b>{ok ? '맞았어요' : picked! < 0 ? '괜찮아요, 정답은' : '정답은'}</b>
              {!ok && (
                <span>
                  <span className="en-serif">{q.w.en}</span> = {q.w.ko}
                </span>
              )}
            </div>
            {!ok && <Speak text={q.w.en} />}
          </div>
          {!ok && q.w.ex && (
            <p className="fb-ex">
              <span className="en-serif">{q.w.ex.en}</span>
              <span>{q.w.ex.ko}</span>
            </p>
          )}
          <button type="button" className={`btn block big ${ok ? 'good' : 'primary'}`} onClick={next}>
            계속 <ArrowRight size={19} />
          </button>
        </div>
      )}
    </div>
  )
}
