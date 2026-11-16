import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronDown, CircleHelp, ClipboardPaste, Plus, X } from 'lucide-react'
import { newId, reviewWord, saveTest, useStore, type WordTest as Test, type WordTestItem } from '../lib/store.ts'
import { allWords, lessonWordList, type StudyWord } from '../lib/words.ts'
import { planTest, typingKeys, WHY_LABEL, type PlannedItem, type Why } from '../lib/wordtest.ts'
import { checkTyped, distractorPicker, oneSense, shuffle, stars } from '../lib/game.ts'
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
import { Meaning, PosTag } from '../components/Pos.tsx'

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
  const typing = useMemo(() => typingKeys(tests), [tests])
  const history = useMemo(() => Object.values(tests).sort((a, b) => b.finishedAt - a.finishedAt), [tests])
  const [run, setRun] = useState<{ items: PlannedItem[]; n: number } | null>(null)
  const [result, setResult] = useState<Test | null>(null)

  if (run && !result)
    return (
      <TestRun
        key={run.n}
        items={run.items}
        pool={pool}
        typing={typing}
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
  const typeCount = plan.items.filter((x) => typing.has(x.w.key)).length
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
          <p className="muted small">
            뜻을 고르는 4지선다예요. 모르면 찍지 말고 "모르겠어요"를 눌러요.
            {typeCount > 0 && ` 두 번 이상 틀린 단어 ${typeCount}개는 영어로 직접 써요.`}
          </p>
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
          <WordRow key={x.key} en={x.en} ko={x.ko} pos={x.pos} level={x.skip ? '모르겠어요' : '틀림'} />
        ))}
      </ul>
    </section>
  )
}

/** shown = 이 문제에서 묻는 뜻 (뜻이 여럿이면 하나, lib/game.ts oneSense). type = 영어로 직접 쓰기 */
type Q = PlannedItem & { shown: StudyWord; choices: StudyWord[]; type: boolean }

/** 답한 결과. pick = 고른 보기 번호, typed = 쓴 답, typo = 한 글자만 틀려서 정답으로 친 것 */
type Answer = { ok: boolean; skip?: boolean; pick?: number; typed?: string; typo?: boolean }

/** 한 단어에 한 번씩, 다시 풀기 없음. 답할 때마다 복습 기록(SRS)에도 반영 */
function TestRun({ items, pool, typing, onDone }: { items: PlannedItem[]; pool: StudyWord[]; typing: Set<string>; onDone: (t: Test) => void }) {
  useImmersive()
  const [qs] = useState<Q[]>(() => {
    // 오답 보기는 테스트 전체에서 고르게 돌려 써요 (lib/game.ts)
    const pick = distractorPicker(pool, items.map((it) => it.w))
    return items.map((it) => {
      const shown = oneSense(it.w)
      const type = typing.has(it.w.key)
      return { ...it, shown, type, choices: type ? [] : shuffle([shown, ...pick(shown)]) }
    })
  })
  const [pos, setPos] = useState(0)
  const [res, setRes] = useState<Answer | null>(null)
  const [text, setText] = useState('')
  const results = useRef<WordTestItem[]>([])
  const startedAt = useRef(Date.now())
  const advanced = useRef(-1)
  const q = qs[pos]

  function finish(a: Answer) {
    if (res) return
    setRes(a)
    results.current.push({ key: q.w.key, en: q.w.en, ko: q.w.ko, pos: q.w.pos, part: q.part, why: q.why, ok: a.ok, skip: a.skip || undefined })
    reviewWord(q.w.key, a.ok)
    if (a.ok) {
      sfx.right()
      speak(q.w.en)
    } else sfx.wrong()
  }

  const pickAnswer = (i: number) => finish({ ok: q.choices[i] === q.shown, pick: i })
  const skip = () => finish({ ok: false, skip: true })
  function submitTyped(e?: React.FormEvent) {
    e?.preventDefault()
    if (!text.trim()) return
    const v = checkTyped(text, q.w.en)
    finish({ ok: !!v, typed: text.trim(), typo: v === 'typo' })
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
    setRes(null)
    setText('')
  }

  // 정답이면 잠깐 보여 주고 넘어가기 (철자를 봐야 하는 typo 는 직접 넘기기)
  useEffect(() => {
    if (!res?.ok || res.typo) return
    const t = setTimeout(next, 800)
    return () => clearTimeout(t)
  })

  const answered = res !== null
  const ok = !!res?.ok
  return (
    <div className="game">
      <RunHead exitHref="#/" progress={(pos + (answered ? 1 : 0)) / qs.length} count={`${pos + 1}/${qs.length}`} />
      <div className="game-body" key={pos}>
        <p className="game-prompt">
          {q.part === 'review' && <span className="tag-retry">복습</span>}
          {q.type && <span className="tag-retry tag-type">직접 쓰기</span>}
          {q.type ? '영어로 써 보세요' : '이 단어의 뜻은?'}
        </p>
        {q.type ? (
          <>
            <div className="q-stage">
              <div className="q-word ko">{q.shown.ko}</div>
              <PosTag pos={q.shown.pos} />
            </div>
            <form className="type-form" onSubmit={submitTyped}>
              <input
                className={`input type-input ${!res ? '' : ok ? 'right' : 'wrong'}`}
                placeholder="영어로 쓰기"
                aria-label="영어"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={answered}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                autoFocus
              />
              {!answered && (
                <button type="submit" className="btn primary block big" disabled={!text.trim()}>
                  확인
                </button>
              )}
            </form>
            {!answered && <p className="muted small">두 번 이상 틀린 단어라서 직접 써 봐요. 괄호 안은 써도 안 써도 돼요.</p>}
          </>
        ) : (
          <>
            <div className="q-stage">
              <div className="q-word">
                <span className="en-serif">{q.w.en}</span>
                <Speak text={q.w.en} />
              </div>
              <PosTag pos={q.shown.pos} />
            </div>
            <div className="choices ko">
              {q.choices.map((c, i) => {
                const right = c === q.shown
                const cls = !answered ? '' : right ? 'right' : i === res?.pick ? 'wrong' : 'dim'
                return (
                  <button key={c.key} type="button" className={`choice ${cls}`} onClick={() => pickAnswer(i)} disabled={answered && !right && i !== res?.pick}>
                    <span className="choice-n">{i + 1}</span>
                    <span>{c.ko}</span>
                    {answered && right && <Check className="mark" size={20} strokeWidth={2.6} />}
                    {answered && i === res?.pick && !right && <X className="mark" size={20} strokeWidth={2.6} />}
                  </button>
                )
              })}
            </div>
          </>
        )}
        {!answered && (
          <button type="button" className="btn block test-skip" onClick={skip}>
            <CircleHelp size={18} /> 모르겠어요
          </button>
        )}
      </div>
      {answered && (
        <div className={`feedback ${ok ? 'ok' : 'no'}`} role="status">
          <div className="fb-row">
            <span className="fb-stamp">{ok ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}</span>
            <div className="fb-text">
              <b>{res.typo ? '거의 맞았어요! 철자는' : ok ? '맞았어요' : res.skip ? '괜찮아요, 정답은' : '정답은'}</b>
              {(!ok || res.typo) && (
                <span>
                  <span className="en-serif">{q.w.en}</span> = <Meaning ko={q.w.ko} pos={q.w.pos} />
                </span>
              )}
            </div>
            {(!ok || res.typo) && <Speak text={q.w.en} />}
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
