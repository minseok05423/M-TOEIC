import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, ChevronRight, LoaderCircle, MessagesSquare, PenLine, TriangleAlert, X } from 'lucide-react'
import { checkInput, charCount, LIMITS, textStats } from '../../supabase/functions/review-writing/review.ts'
import { loadDraft, saveDraft, SELF_CHECK, submitDraft, TOPICS, useMyWritings, writtenToday, type Draft, type Talk, type Writing } from '../lib/writing.ts'
import { supabase } from '../lib/supabase.ts'
import { formatDate } from '../lib/date.ts'
import { href, replace } from '../lib/router.ts'
import { TopBar } from '../components/TopBar.tsx'
import { ReviewView } from '../components/ReviewView.tsx'
import { PhraseHomeCard, WritingPhrases } from './Phrases.tsx'

const STEPS = [
  { title: '영어로 쓰기', desc: '오늘 있었던 일, 5문장 이상' },
  { title: '최종 확인', desc: '스스로 한 번 점검하고 제출' },
  { title: 'AI 검수', desc: '문법 · 아쉬운 표현 · 오늘 기억할 것' },
  { title: '소리 내어 읽기', desc: '고친 글을 듣고 세 번 따라 읽기' },
  { title: '선생님과 프리토킹', desc: '쓴 내용으로 대화' },
]

/** 지금 몇 번째 단계인지 (0부터) */
function stepNow(w: Writing | undefined, talk: Talk | undefined, draft: Draft | null): number {
  if (talk) return 5
  if (w) return 3
  return draft?.text.trim() ? 1 : 0
}

function Steps({ now }: { now: number }) {
  return (
    <ol className="talk-steps">
      {STEPS.map((s, i) => (
        <li key={s.title} className={i < now ? 'done' : i === now ? 'now' : ''}>
          <span className="talk-step-num">{i < now ? <Check size={14} strokeWidth={3.2} /> : i + 1}</span>
          <span className="talk-step-text">
            <b>{s.title}</b>
            <span>{s.desc}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function NeedLogin() {
  return (
    <div className="warn small">
      <TriangleAlert size={16} />
      <div>AI 검수는 로그인해야 쓸 수 있어요. 설정에서 로그인해 주세요.</div>
    </div>
  )
}

/** 회화 탭 (#/talk) */
export function TalkHome() {
  const m = useMyWritings()
  const writings = m.state === 'ready' || m.state === 'error' ? m.writings : []
  const talks = m.state === 'ready' || m.state === 'error' ? m.talks : {}
  const draft = useMemo(loadDraft, [])
  const todayW = writtenToday(writings)
  const now = stepNow(todayW, todayW && talks[todayW.id], draft)
  const stats = draft ? textStats(draft.text) : null

  return (
    <div className="page">
      <TopBar title="회화" />
      {!supabase && <NeedLogin />}

      <section className="talk-today card">
        <p className="eyebrow">매일 작문 → 프리토킹</p>
        <Steps now={now} />
        {todayW ? (
          <a className="btn primary block big" href={href('talk', 'w', todayW.id)}>
            오늘 검수 결과 보기 <ArrowRight size={20} />
          </a>
        ) : draft?.text.trim() ? (
          <a className="btn primary block big" href={href('talk', 'write')}>
            이어 쓰기 · {stats!.sentences}문장 <ArrowRight size={20} />
          </a>
        ) : (
          <a className="btn primary block big" href={href('talk', 'write')}>
            <PenLine size={20} /> 오늘 작문 쓰기
          </a>
        )}
        {todayW && (
          <a className="link small talk-more" href={href('talk', 'write')}>
            {draft?.text.trim() ? '쓰던 글 이어 쓰기' : '한 편 더 쓰기'}
          </a>
        )}
      </section>

      <PhraseHomeCard />

      {m.state === 'error' && (
        <div className="warn small">
          <TriangleAlert size={16} />
          <div>
            지난 작문을 못 불러왔어요. {m.error}{' '}
            <button type="button" className="link small" onClick={m.reload}>
              다시
            </button>
          </div>
        </div>
      )}

      {writings.length > 0 ? (
        <section className="group">
          <p className="section-label">지난 작문 · {writings.length}편</p>
          <div className="group-card">
            {writings.map((w) => {
              const fixes = w.review.sentences.reduce((a, s) => a + s.issues.length, 0)
              return (
                <a key={w.id} className="row" href={href('talk', 'w', w.id)}>
                  <span className="row-text">
                    <b>
                      {formatDate(w.day)}
                      {w.topic ? ` · ${w.topic}` : ''}
                    </b>
                    <span className="sub">
                      {w.review.sentences.length}문장 · 고칠 곳 {fixes}개{talks[w.id] ? ' · 프리토킹 함' : ''}
                    </span>
                  </span>
                  {talks[w.id] ? <span className="t-pill ok">대화 끝</span> : <span className="t-pill new">대화 전</span>}
                  <ChevronRight size={18} className="muted" />
                </a>
              )
            })}
          </div>
        </section>
      ) : (
        m.state === 'loading' && <p className="empty">불러오는 중…</p>
      )}
    </div>
  )
}

type Phase = { k: 'edit' } | { k: 'confirm' } | { k: 'sending' } | { k: 'error'; msg: string }

/** 작문 쓰기 (#/talk/write) */
export function TalkWrite() {
  const [d, setD] = useState<Draft>(() => loadDraft() ?? saveDraft({}))
  const [phase, setPhase] = useState<Phase>({ k: 'edit' })
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const st = textStats(d.text)
  const n = charCount(d.text)
  const problem = checkInput(d.text, d.topic.trim() || null)
  const sheetOpen = phase.k !== 'edit'

  useEffect(() => {
    document.body.classList.toggle('sheet-open', sheetOpen)
    return () => document.body.classList.remove('sheet-open')
  }, [sheetOpen])

  const edit = (patch: Partial<Pick<Draft, 'topic' | 'text'>>) => setD(saveDraft(patch))

  async function send() {
    setPhase({ k: 'sending' })
    try {
      const w = await submitDraft(d)
      replace('talk', 'w', w.id)
    } catch (e) {
      setPhase({ k: 'error', msg: (e as Error).message })
    }
  }

  return (
    <div className="page">
      <TopBar back={href('talk')} title="오늘의 작문" />
      {!supabase && <NeedLogin />}

      <label className="talk-field">
        <span className="label-row">
          <span>주제 (선택)</span>
        </span>
        <input className="input" maxLength={LIMITS.topicChars} value={d.topic} onChange={(e) => edit({ topic: e.target.value })} placeholder="예: 오늘 있었던 일" />
      </label>
      <div className="chips talk-topics">
        {TOPICS.map((t) => (
          <button key={t} type="button" className={`chip ${d.topic === t ? 'on' : ''}`} aria-pressed={d.topic === t} onClick={() => edit({ topic: d.topic === t ? '' : t })}>
            {t}
          </button>
        ))}
      </div>

      <label className="talk-field">
        <span className="label-row">
          <span>영어로 써 보세요</span>
          <span className={`count ${n >= LIMITS.minChars ? 'ok' : ''}`}>
            {st.sentences}문장 · {st.words}단어
          </span>
        </span>
        <textarea
          className="input en-serif talk-text"
          rows={11}
          value={d.text}
          onChange={(e) => edit({ text: e.target.value })}
          placeholder={'Today I went to work early.\nI was very busy.\n...'}
          autoCapitalize="sentences"
          autoCorrect="off"
          spellCheck={false}
          lang="en"
        />
      </label>
      <p className="hint">
        자동 저장돼요. 모르는 단어는 한국어로 써도 괜찮아요 (예: I went to 은행). 자동 고침은 꺼 뒀어요, 내 실력 그대로 써야 검수가 정확해요.
      </p>

      <div className="form-actions">
        {problem && d.text.trim() && <p className="hint ns-missing">{problem}</p>}
        <button type="button" className="btn primary block big" disabled={!!problem || !supabase} onClick={() => setPhase({ k: 'confirm' })}>
          다 썼어요 · 검수 받기
        </button>
      </div>

      {sheetOpen && (
        <div className="sheet-backdrop" onClick={() => phase.k !== 'sending' && setPhase({ k: 'edit' })}>
          <div className="note-sheet talk-sheet" role="dialog" aria-modal="true" aria-label="최종본 확인" onClick={(e) => e.stopPropagation()}>
            {phase.k === 'sending' ? (
              <div className="talk-sending">
                <LoaderCircle size={40} className="spin" />
                <b>AI 선생님이 검수하고 있어요</b>
                <p className="small muted">문장마다 문법 → 단어 → 자연스러움 순서로 봐요. 보통 20~40초 걸려요. 화면을 닫지 말고 기다려 주세요.</p>
              </div>
            ) : (
              <>
                <div className="ns-head">
                  <h2>이게 최종본인가요?</h2>
                  <button type="button" className="ns-x" aria-label="닫기" onClick={() => setPhase({ k: 'edit' })}>
                    <X size={22} />
                  </button>
                </div>
                {phase.k === 'error' && (
                  <div className="warn small">
                    <TriangleAlert size={16} />
                    <div>
                      <b>검수를 못 받았어요</b>
                      <br />
                      {phase.msg}
                    </div>
                  </div>
                )}
                <p className="small">
                  제출하면 이 글은 <b>더 고칠 수 없어요.</b> 검수 결과는 선생님도 보고, 프리토킹 때 써요. 보내기 전에 한 번만 점검해 봐요.
                </p>
                <ul className="talk-check">
                  {SELF_CHECK.map((c, i) => (
                    <li key={c}>
                      <button
                        type="button"
                        className={checked.has(i) ? 'on' : ''}
                        aria-pressed={checked.has(i)}
                        onClick={() =>
                          setChecked((s) => {
                            const x = new Set(s)
                            if (x.has(i)) x.delete(i)
                            else x.add(i)
                            return x
                          })
                        }
                      >
                        <span className="talk-box">{checked.has(i) && <Check size={14} strokeWidth={3.2} />}</span>
                        {c}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="talk-preview en-serif">{d.text.trim()}</p>
                <div className="form-actions">
                  <button type="button" className="btn primary block big" onClick={() => void send()}>
                    {phase.k === 'error' ? '다시 보내기' : '네, 최종본이에요 · 검수 받기'}
                  </button>
                  <button type="button" className="btn tonal block" onClick={() => setPhase({ k: 'edit' })}>
                    아니요, 더 고칠게요
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** 검수 결과 (#/talk/w/<id>) */
export function TalkView({ id }: { id: string }) {
  const m = useMyWritings()
  const w = m.state === 'ready' || m.state === 'error' ? m.writings.find((x) => x.id === id) : undefined
  const talk = m.state === 'ready' || m.state === 'error' ? m.talks[id] : undefined
  return (
    <div className="page">
      <TopBar back={href('talk')} title="작문 검수" />
      {w ? (
        <>
          <ReviewView w={w} talk={talk} />
          <WritingPhrases writing={w} />
          {!talk && (
            <div className="talk-next card">
              <MessagesSquare size={22} />
              <p className="small">
                <b>다음: 선생님과 프리토킹</b>
                <br />
                고친 글을 소리 내어 읽고, "프리토킹 준비" 질문에 입으로 대답해 보세요.
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="empty">{m.state === 'loading' || m.state === 'idle' ? '불러오는 중…' : '이 작문을 찾을 수 없어요.'}</p>
      )}
    </div>
  )
}
