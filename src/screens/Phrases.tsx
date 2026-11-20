import { useMemo, useRef, useState } from 'react'
import { ArrowRight, BookMarked, Check, CircleHelp, Eye, EyeOff, Mic, PenLine, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { deleteMyPhrase, getState, hidePhrase, reviewPhrase, saveMyPhrase, useStore, type PhraseCard } from '../lib/store.ts'
import { useMyWritings } from '../lib/writing.ts'
import {
  buildLibrary,
  checkBlank,
  checkOrder,
  chooseForm,
  clozeParts,
  FORM_LABEL,
  orderTokens,
  phrasesFromWriting,
  planTest,
  practicePick,
  rightOptions,
  shuffle,
  shuffleOrder,
  SOURCE_LABEL,
  status,
  STATUS_LABEL,
  weak,
  type Form,
  type Phrase,
} from '../lib/phrases.ts'
import { formatDate } from '../lib/date.ts'
import { href, replace } from '../lib/router.ts'
import { speak } from '../lib/tts.ts'
import { sfx } from '../lib/sfx.ts'
import { stars } from '../lib/game.ts'
import { useImmersive } from '../lib/ui.ts'
import { TopBar } from '../components/TopBar.tsx'
import { RunHead } from '../components/RunHead.tsx'
import { GameDone } from '../components/GameDone.tsx'
import { Speak } from '../components/Speak.tsx'

/** 표현집 전체 (작문 검수 + 내가 넣은 것) + 테스트 기록 */
export function usePhrases() {
  const m = useMyWritings()
  const writings = m.state === 'ready' || m.state === 'error' ? m.writings : []
  const mine = useStore((s) => s.progress.myPhrases)
  const cards = useStore((s) => s.progress.phrases)
  const lib = useMemo(() => buildLibrary(writings, mine, cards), [writings, mine, cards])
  return { ...lib, cards: cards ?? {}, loading: m.state === 'loading' || m.state === 'idle' }
}

const KIND_TONE: Record<Phrase['kind'], string> = { fix: 'fix', better: 'better', useful: 'ai', mine: 'mine' }

type Filter = 'all' | 'fix' | 'ai' | 'mine' | 'weak'
const FILTERS: { k: Filter; label: string; test: (p: Phrase, c: PhraseCard | undefined) => boolean }[] = [
  { k: 'all', label: '전체', test: () => true },
  { k: 'fix', label: '틀린 표현', test: (p) => p.kind === 'fix' },
  { k: 'ai', label: 'AI 추천', test: (p) => p.kind === 'better' || p.kind === 'useful' },
  { k: 'mine', label: '내가 넣음', test: (p) => p.kind === 'mine' },
  { k: 'weak', label: '자주 틀림', test: (_, c) => weak(c) },
]

/** 회화 탭 첫 화면의 표현집 카드 */
export function PhraseHomeCard() {
  const { shown, cards } = usePhrases()
  const plan = planTest(shown, cards)
  return (
    <section className="card ph-home">
      <div className="ph-home-head">
        <BookMarked size={20} />
        <b>내 표현집</b>
        <span className="rv-count">{shown.length}</span>
      </div>
      <p className="small muted">
        {shown.length
          ? plan.items.length
            ? `오늘 테스트할 표현 ${plan.items.length}개 (복습 ${Math.min(plan.due, plan.items.length)} · 새 표현 ${Math.max(0, plan.items.length - plan.due)})`
            : '오늘 볼 표현은 다 봤어요. 내일 다시 나와요.'
          : '작문을 검수받으면 틀린 표현과 AI 추천 표현이 여기 모여요. 직접 넣어도 돼요.'}
      </p>
      <div className="row-gap">
        {plan.items.length > 0 && (
          <a className="btn primary small" href={href('talk', 'phrases', 'test')}>
            테스트 {plan.items.length}문제 <ArrowRight size={16} />
          </a>
        )}
        <a className="btn tonal small" href={href('talk', 'phrases')}>
          표현집 보기
        </a>
      </div>
    </section>
  )
}

/** 표현집 (#/talk/phrases) */
export function PhraseLibrary() {
  const { shown, hidden, cards, loading } = usePhrases()
  const [filter, setFilter] = useState<Filter>('all')
  const plan = planTest(shown, cards)
  const f = FILTERS.find((x) => x.k === filter)!
  const list = shown.filter((p) => f.test(p, cards[p.id]))

  return (
    <div className="page">
      <TopBar
        back={href('talk')}
        title="표현집"
        right={
          <a className="btn small tonal" href={href('talk', 'phrases', 'new')}>
            <Plus size={15} /> 넣기
          </a>
        }
      />

      {plan.items.length ? (
        <div className="review-card">
          <p className="rc-label">오늘의 표현 테스트</p>
          <p className="rc-num">
            {plan.items.length}
            <small>문제</small>
          </p>
          <ul className="test-plan">
            {plan.due > 0 && (
              <li>
                <b>복습할 차례 {Math.min(plan.due, plan.items.length)}개</b>
                <span>전에 틀렸거나, 다시 볼 날이 된 표현</span>
              </li>
            )}
            {plan.items.length > plan.due && (
              <li>
                <b>새 표현 {plan.items.length - plan.due}개</b>
                <span>아직 테스트 안 본 표현 (최근 것부터)</span>
              </li>
            )}
          </ul>
          <a className="btn primary block big" href={href('talk', 'phrases', 'test')}>
            시작 <ArrowRight size={19} />
          </a>
          <p className="muted small">바른 문장 고르기 · 빈칸 채우기 · 순서 맞추기 · 말해 보기가 섞여 나와요. 잘 외운 표현일수록 어려운 문제가 나와요.</p>
        </div>
      ) : shown.length ? (
        <div className="review-card calm">
          <p className="rc-label">오늘 볼 표현은 다 봤어요</p>
          <p className="muted small">맞힌 표현은 1일 → 3일 → 7일 … 뒤에 다시 나와요.</p>
          <a className="btn block" href={href('talk', 'phrases', 'test', 'practice')}>
            <RotateCcw size={17} /> 그래도 연습하기
          </a>
        </div>
      ) : (
        !loading && (
          <div className="review-card calm">
            <p className="rc-label">아직 표현이 없어요</p>
            <p className="muted small">작문을 AI 에게 검수받으면 내가 틀린 표현, 더 자연스러운 표현, 써먹을 만한 표현이 여기 자동으로 모여요.</p>
            <a className="btn primary block" href={href('talk', 'write')}>
              <PenLine size={18} /> 작문 쓰기
            </a>
          </div>
        )
      )}

      {shown.length > 0 && (
        <div className="chips" role="group" aria-label="골라 보기">
          {FILTERS.map((x) => {
            const n = shown.filter((p) => x.test(p, cards[p.id])).length
            if (x.k !== 'all' && !n) return null
            return (
              <button key={x.k} type="button" className={`chip ${filter === x.k ? 'on' : ''}`} aria-pressed={filter === x.k} onClick={() => setFilter(x.k)}>
                {x.label} {n}
              </button>
            )
          })}
        </div>
      )}

      {list.length > 0 && (
        <ul className="ph-list">
          {list.map((p) => (
            <PhraseItem key={p.id} p={p} c={cards[p.id]} />
          ))}
        </ul>
      )}
      {loading && !shown.length && <p className="empty">불러오는 중…</p>}

      {hidden.length > 0 && (
        <details className="ph-hidden">
          <summary className="small muted">숨긴 표현 {hidden.length}개</summary>
          <ul className="ph-list">
            {hidden.map((p) => (
              <PhraseItem key={p.id} p={p} c={cards[p.id]} />
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function PhraseItem({ p, c }: { p: Phrase; c: PhraseCard | undefined }) {
  const st = status(c)
  return (
    <li className={`ph-item ${c?.hidden ? 'is-hidden' : ''}`}>
      <div className="ph-head">
        <span className={`ph-kind ${KIND_TONE[p.kind]}`}>{SOURCE_LABEL[p.kind]}</span>
        <span className={`ph-status ${st}`}>{STATUS_LABEL[st]}</span>
        {weak(c) && <span className="ph-status again">{c!.lapses}번 틀림</span>}
        <span className="grow" />
        {p.kind === 'mine' ? (
          <a className="ph-act" href={href('talk', 'phrases', 'edit', p.id.slice(2))} aria-label="고치기">
            <PenLine size={16} />
          </a>
        ) : (
          <button type="button" className="ph-act" aria-label={c?.hidden ? '다시 보이기' : '숨기기'} onClick={() => hidePhrase(p.id, !c?.hidden)}>
            {c?.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        )}
      </div>
      <p className="ph-en en-serif">
        <span className="grow">{p.en}</span>
        <Speak text={p.en} />
      </p>
      {p.ko && <p className="ph-ko">{p.ko}</p>}
      {p.wrong && (
        <p className="ph-wrong small">
          <span>내가 쓴 것</span> <s className="en-serif">{p.wrong}</s>
        </p>
      )}
      {p.why && <p className="rv-why">{p.why}</p>}
      {p.note && <p className="rv-why">{p.note}</p>}
      <p className="ph-from small muted">
        {p.writingId ? (
          <a href={href('talk', 'w', p.writingId)}>
            {formatDate(p.day)} 작문{p.topic ? ` · ${p.topic}` : ''}
          </a>
        ) : (
          `${formatDate(p.day)}에 넣음`
        )}
        {c?.reps ? ` · ${c.reps}번 풀어 봄` : ''}
      </p>
    </li>
  )
}

// ───────── 직접 넣기 · 고치기 ─────────

const LIMIT = { en: 200, ko: 120, note: 200 }

/** 표현 넣기 (#/talk/phrases/new) · 고치기 (#/talk/phrases/edit/<id>) */
export function PhraseForm({ id }: { id?: string }) {
  const existing = useStore((s) => (id ? s.progress.myPhrases?.[id] : undefined))
  const [en, setEn] = useState(existing?.en ?? '')
  const [ko, setKo] = useState(existing?.ko ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const problem = !/[A-Za-z]/.test(en) ? '영어 표현을 써 주세요.' : !ko.trim() ? '한국어 뜻을 써 주세요.' : null

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (problem) return
    saveMyPhrase({ id, en, ko, note })
    replace('talk', 'phrases')
  }

  if (id && !existing)
    return (
      <div className="page">
        <TopBar back={href('talk', 'phrases')} title="표현 고치기" />
        <p className="empty">이 표현을 찾을 수 없어요.</p>
      </div>
    )

  return (
    <div className="page">
      <TopBar back={href('talk', 'phrases')} title={id ? '표현 고치기' : '표현 넣기'} />
      <form className="ph-form" onSubmit={save}>
        <label className="talk-field">
          <span className="label-row">
            <span>영어 표현</span>
          </span>
          <textarea
            className="input en-serif"
            rows={2}
            maxLength={LIMIT.en}
            value={en}
            onChange={(e) => setEn(e.target.value)}
            placeholder="I'm looking forward to it."
            autoCapitalize="sentences"
            autoCorrect="off"
            spellCheck={false}
            lang="en"
            autoFocus={!id}
          />
        </label>
        <label className="talk-field">
          <span className="label-row">
            <span>뜻</span>
          </span>
          <input className="input" maxLength={LIMIT.ko} value={ko} onChange={(e) => setKo(e.target.value)} placeholder="그거 기대돼요." />
        </label>
        <label className="talk-field">
          <span className="label-row">
            <span>메모 (선택)</span>
          </span>
          <input className="input" maxLength={LIMIT.note} value={note} onChange={(e) => setNote(e.target.value)} placeholder="언제 쓰는지, 어디서 들었는지" />
        </label>
        <p className="hint">짧은 문장 하나가 좋아요. 테스트에서 빈칸 채우기 · 순서 맞추기 · 말해 보기로 나와요.</p>
        <div className="form-actions">
          <button type="submit" className="btn primary block big" disabled={!!problem}>
            {id ? '저장' : '표현집에 넣기'}
          </button>
          {existing && (
            <button
              type="button"
              className="btn danger block"
              onClick={() => {
                if (confirm(`"${existing.en}" 을(를) 지울까요?`)) {
                  deleteMyPhrase(existing.id)
                  replace('talk', 'phrases')
                }
              }}
            >
              <Trash2 size={17} /> 지우기
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

// ───────── 테스트 ─────────

interface Q {
  p: Phrase
  form: Form
  /** 고르기 문제의 보기 */
  opts: string[]
  answer: string
  /** 순서 맞추기 조각 (섞인 것) */
  tiles: string[]
}

function makeQ(p: Phrase, c: PhraseCard | undefined, i: number): Q | null {
  const form = chooseForm(p, c, i)
  if (!form) return null
  if (form === 'pick-right') return { p, form, opts: shuffle(rightOptions(p)), answer: p.en, tiles: [] }
  if (form === 'cloze-pick') return { p, form, opts: shuffle([p.blank, ...p.choices]), answer: p.blank, tiles: [] }
  if (form === 'order') return { p, form, opts: [], answer: p.en, tiles: shuffleOrder(orderTokens(p.en)) }
  return { p, form, opts: [], answer: form === 'cloze-type' ? p.blank : p.en, tiles: [] }
}

type Result = { p: Phrase; form: Form; ok: boolean }

/**
 * 표현 테스트 (#/talk/phrases/test[/practice | /<작문 id>]).
 * 없으면 오늘 볼 표현, practice = 그래도 연습, 작문 id = 그 작문의 표현 전부.
 */
export function PhraseTest({ scope }: { scope?: string }) {
  const { shown, cards, loading } = usePhrases()
  const [done, setDone] = useState<Result[] | null>(null)
  const back = scope && scope !== 'practice' ? href('talk', 'w', scope) : href('talk', 'phrases')

  // 문제는 처음 정한 그대로 (풀면서 기록이 바뀌어도, 뒤에서 작문을 새로 받아도 안 바뀌게)
  const now = !scope ? planTest(shown, cards).items : scope === 'practice' ? practicePick(shown, cards) : shown.filter((p) => p.writingId === scope)
  const frozen = useRef<Phrase[] | null>(null)
  if (!frozen.current && now.length) frozen.current = now
  const items = frozen.current ?? now

  if (done) {
    const right = done.filter((r) => r.ok).length
    const wrong = done.filter((r) => !r.ok)
    return (
      <div className="page">
        <GameDone
          stars={stars(right, done.length)}
          title="표현 테스트 끝!"
          line={`${done.length}문제 중 ${right}개 맞혔어요. ${wrong.length ? '틀린 표현은 내일 다시 나와요.' : '완벽해요!'}`}
          stats={[
            { label: '맞힘', value: `${right}/${done.length}` },
            { label: '틀림', value: wrong.length },
          ]}
        >
          <a className="btn primary block big" href={href('talk', 'phrases')}>
            표현집으로
          </a>
          <a className="btn block big" href={href('talk')}>
            회화 탭으로
          </a>
        </GameDone>
        {wrong.length > 0 && (
          <section className="rv-sec">
            <h2 className="rv-h">다시 볼 표현 · {wrong.length}</h2>
            <ul className="ph-list">
              {wrong.map((r) => (
                <PhraseItem key={r.p.id} p={r.p} c={getState().progress.phrases?.[r.p.id]} />
              ))}
            </ul>
          </section>
        )}
      </div>
    )
  }

  if (loading && !items.length) return <p className="empty">불러오는 중…</p>
  if (!items.length)
    return (
      <div className="page">
        <TopBar back={back} title="표현 테스트" />
        <p className="empty">지금 테스트할 표현이 없어요.</p>
        <a className="btn block" href={href('talk', 'phrases')}>
          표현집 보기
        </a>
      </div>
    )

  // 바로 시작 (표현집 · 검수 화면의 버튼이 이미 "시작" 이에요)
  return <PhraseRun items={items} exitHref={back} onDone={setDone} />
}

type Ans = { ok: boolean; skip?: boolean; pick?: number; typed?: string; typo?: boolean }

function PhraseRun({ items, exitHref, onDone }: { items: Phrase[]; exitHref: string; onDone: (r: Result[]) => void }) {
  useImmersive()
  const [qs] = useState<Q[]>(() => {
    const cards = getState().progress.phrases
    return shuffle(items)
      .map((p, i) => makeQ(p, cards?.[p.id], i))
      .filter((q): q is Q => !!q)
  })
  const [pos, setPos] = useState(0)
  const [res, setRes] = useState<Ans | null>(null)
  const [text, setText] = useState('')
  const [built, setBuilt] = useState<number[]>([])
  const [shownAnswer, setShownAnswer] = useState(false)
  const results = useRef<Result[]>([])
  const advanced = useRef(-1)
  const q = qs[pos]

  if (!q) return null

  function finish(a: Ans) {
    if (res) return
    setRes(a)
    results.current.push({ p: q.p, form: q.form, ok: a.ok })
    reviewPhrase(q.p.id, a.ok)
    if (a.ok) {
      sfx.right()
      speak(q.p.en)
    } else sfx.wrong()
  }

  function next() {
    if (advanced.current === pos) return
    advanced.current = pos
    if (pos + 1 >= qs.length) {
      sfx.done()
      onDone(results.current)
      return
    }
    setPos(pos + 1)
    setRes(null)
    setText('')
    setBuilt([])
    setShownAnswer(false)
    window.scrollTo(0, 0)
  }

  const answered = res !== null
  const ok = !!res?.ok
  const p = q.p

  function tapTile(i: number) {
    if (answered) return
    const b = built.includes(i) ? built.filter((x) => x !== i) : [...built, i]
    setBuilt(b)
    if (!built.includes(i)) sfx.pop()
    if (b.length === q.tiles.length) finish({ ok: checkOrder(b.map((k) => q.tiles[k]), p.en) })
  }

  function submitTyped(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    const v = checkBlank(text, p.blank)
    finish({ ok: !!v, typed: text.trim(), typo: v === 'typo' })
  }

  /** 문제 위에 보여 줄 힌트: 한국어 뜻, 없으면 (예전 검수) 내가 쓴 문장 */
  const hint = p.ko ? (
    <p className="ph-q-ko">{p.ko}</p>
  ) : p.wrong && q.form !== 'pick-right' ? (
    <p className="ph-q-ko small">
      <span className="muted">내가 쓴 문장 · </span>
      <span className="en-serif">{p.wrong}</span>
    </p>
  ) : null

  const [before, after] = q.form === 'cloze-pick' || q.form === 'cloze-type' ? clozeParts(p.en, p.blank) : ['', '']
  const cloze = (
    <p className="q-text en-serif ph-cloze">
      {before}
      <span className={`blank ${answered ? 'filled' : ''}`}>{answered ? p.blank : ' '}</span>
      {after}
    </p>
  )

  const choiceList = (
    <div className="choices en">
      {q.opts.map((o, i) => {
        const right = o === q.answer
        const cls = !answered ? '' : right ? 'right' : i === res?.pick ? 'wrong' : 'dim'
        return (
          <button key={i} type="button" className={`choice en-serif ${cls}`} onClick={() => finish({ ok: right, pick: i })} disabled={answered && !right && i !== res?.pick}>
            <span className="choice-n">{i + 1}</span>
            <span>{o}</span>
            {answered && right && <Check className="mark" size={20} strokeWidth={2.6} />}
            {answered && i === res?.pick && !right && <X className="mark" size={20} strokeWidth={2.6} />}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="game">
      <RunHead exitHref={exitHref} progress={(pos + (answered ? 1 : 0)) / qs.length} count={`${pos + 1}/${qs.length}`} />
      <div className="game-body ph-run" key={pos}>
        <p className="game-prompt">
          <span className="tag-retry tag-type">{FORM_LABEL[q.form]}</span>
          {q.form === 'pick-right'
            ? '바른 문장은?'
            : q.form === 'cloze-pick'
              ? '빈칸에 알맞은 말은?'
              : q.form === 'order'
                ? '눌러서 문장을 만드세요'
                : q.form === 'cloze-type'
                  ? '빈칸에 들어갈 말을 쓰세요'
                  : '영어로 소리 내어 말해 보세요'}
        </p>

        {q.form === 'pick-right' && (
          <>
            {p.ko && <p className="ph-q-ko">{p.ko}</p>}
            {choiceList}
          </>
        )}

        {q.form === 'cloze-pick' && (
          <>
            {hint}
            {cloze}
            {choiceList}
          </>
        )}

        {q.form === 'order' && (
          <>
            {hint}
            <div className={`ph-built en-serif ${answered ? (ok ? 'right' : 'wrong') : ''}`} aria-label="만든 문장">
              {built.length ? (
                built.map((k) => (
                  <button key={k} type="button" className="tap-word en-serif" onClick={() => tapTile(k)} disabled={answered}>
                    {q.tiles[k]}
                  </button>
                ))
              ) : (
                <span className="muted small">아래 조각을 순서대로 눌러요. 잘못 누르면 여기서 다시 눌러 빼요.</span>
              )}
            </div>
            <div className="tap-words ph-tiles">
              {q.tiles.map((t, k) => (
                <button key={k} type="button" className={`tap-word en-serif ${built.includes(k) ? 'ph-used' : ''}`} onClick={() => tapTile(k)} disabled={answered || built.includes(k)}>
                  {t}
                </button>
              ))}
            </div>
          </>
        )}

        {q.form === 'cloze-type' && (
          <>
            {hint}
            {cloze}
            <form className="type-form" onSubmit={submitTyped}>
              <input
                className={`input type-input en-serif ${!res ? '' : ok ? 'right' : 'wrong'}`}
                placeholder={`${p.blank[0] ?? ''}…`}
                aria-label="빈칸에 들어갈 말"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={answered}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                lang="en"
              />
              {!answered && (
                <button type="submit" className="btn primary block big" disabled={!text.trim()}>
                  확인
                </button>
              )}
            </form>
            {!answered && <p className="muted small">첫 글자는 "{p.blank[0]}" 예요. {p.blank.split(' ').length > 1 ? `${p.blank.split(' ').length}단어예요.` : ''}</p>}
          </>
        )}

        {q.form === 'speak' && (
          <>
            <div className="q-stage">
              <div className="q-word ko">{p.ko}</div>
            </div>
            {!shownAnswer ? (
              <button
                type="button"
                className="btn primary block big"
                onClick={() => {
                  setShownAnswer(true)
                  speak(p.en)
                }}
              >
                <Mic size={19} /> 말해 봤어요 · 정답 보기
              </button>
            ) : (
              !answered && (
                <>
                  <p className="ph-reveal en-serif">
                    <span className="grow">{p.en}</span>
                    <Speak text={p.en} />
                  </p>
                  <p className="small muted center">내가 말한 것과 같았나요? 단어 한두 개 달라도 뜻이 같으면 맞아요.</p>
                  <div className="row-gap ph-self">
                    <button type="button" className="btn good block big" onClick={() => finish({ ok: true })}>
                      <Check size={19} /> 맞게 말했어요
                    </button>
                    <button type="button" className="btn block big" onClick={() => finish({ ok: false })}>
                      <X size={19} /> 틀렸어요
                    </button>
                  </div>
                </>
              )
            )}
          </>
        )}

        {!answered && q.form !== 'speak' && (
          <button type="button" className="btn block test-skip" onClick={() => finish({ ok: false, skip: true })}>
            <CircleHelp size={18} /> 모르겠어요
          </button>
        )}
      </div>

      {answered && (
        <div className={`feedback ${ok ? 'ok' : 'no'}`} role="status">
          <div className="fb-row">
            <span className="fb-stamp">{ok ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}</span>
            <div className="fb-text">
              <b>{res.typo ? `거의 맞았어요! 철자는 ${p.blank}` : ok ? '맞았어요' : res.skip ? '괜찮아요, 정답은' : '정답은'}</b>
              <span className="en-serif">{p.en}</span>
            </div>
            <Speak text={p.en} />
          </div>
          {(p.ko || p.why || (!ok && p.wrong)) && (
            <p className="fb-ex">
              {p.ko && <span>{p.ko}</span>}
              {!ok && p.wrong && (
                <span>
                  내가 쓴 것: <s className="en-serif">{p.wrong}</s>
                </span>
              )}
              {p.why && <span>{p.why}</span>}
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

/** 검수 화면 아래: 이 작문에서 표현집에 들어간 표현 */
export function WritingPhrases({ writing, teacher }: { writing: Parameters<typeof phrasesFromWriting>[0]; teacher?: boolean }) {
  const list = useMemo(() => phrasesFromWriting(writing), [writing])
  if (!list.length) return null
  return (
    <section className="rv-sec">
      <h2 className="rv-h">
        <BookMarked size={19} />
        표현집에 담긴 표현
        <span className="rv-count">{list.length}</span>
      </h2>
      <p className="small muted">{teacher ? '학생 표현집에 들어간 표현이에요. 학생은 이걸로 테스트를 봐요.' : '이 글에서 다시 공부할 표현이에요. 테스트로 바로 확인해 봐요.'}</p>
      <ul className="rv-list ph-mini">
        {list.map((p) => (
          <li key={p.id}>
            <span className={`ph-kind ${KIND_TONE[p.kind]}`}>{SOURCE_LABEL[p.kind]}</span>
            <p className="rv-better en-serif">
              <span className="grow">{p.en}</span>
              <Speak text={p.en} />
            </p>
            {p.ko && <p className="small">{p.ko}</p>}
          </li>
        ))}
      </ul>
      {!teacher && (
        <a className="btn primary block" href={href('talk', 'phrases', 'test', writing.id)}>
          이 표현으로 테스트 <ArrowRight size={18} />
        </a>
      )}
    </section>
  )
}
