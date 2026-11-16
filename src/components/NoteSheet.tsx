import { useEffect, useRef, useState } from 'react'
import { CircleCheck, Lightbulb, CircleHelp, X, CloudOff } from 'lucide-react'
import type { Lesson } from '../content/types.ts'
import { addNote, type NoteCategory, type NoteKind } from '../lib/store.ts'
import { CATEGORIES, findTarget, LEVELS, lessonTargets, MIN_CHARS, textLen, WHOLE } from '../lib/notes.ts'
import { supabase, useSession } from '../lib/supabase.ts'
import { sfx } from '../lib/sfx.ts'

/** 무엇에 대한 메모인지: 레슨 (안의 한 곳을 고름) · 단어 하나 · 그냥 메모 */
export type NoteAbout =
  | { scope: 'lesson'; chapterId: string; lesson: Lesson; /** 처음에 골라 둘 곳 (lib/notes.ts 의 NoteTarget id) */ targetId?: string }
  | { scope: 'word'; word: { key: string; en: string; ko: string } }
  | { scope: 'general' }

interface Props {
  about: NoteAbout
  /** 지금 화면 이름 (선생님이 "어디서 썼는지" 봄). 예: '실전 퀴즈', '단어장' */
  place: string
  kind?: NoteKind
  onClose: () => void
}

/**
 * 메모 남기기. 자유 글 대신 칸을 정해 두고, 다 채워야 보낼 수 있음
 * (선생님이 Claude Code 로 맞춤 레슨을 만들 때 그대로 읽을 수 있게).
 */
export function NoteSheet({ about, place, kind: kind0, onClose }: Props) {
  const session = useSession()
  const [kind, setKind] = useState<NoteKind | undefined>(kind0)
  const [target, setTarget] = useState(about.scope === 'lesson' ? findTarget(about.lesson, about.targetId).id : '')
  const [category, setCategory] = useState<NoteCategory>()
  const [level, setLevel] = useState<1 | 2 | 3>()
  const [point, setPoint] = useState('')
  const [question, setQuestion] = useState('')
  const [example, setExample] = useState('')
  const [sent, setSent] = useState(false)
  const sheet = useRef<HTMLDivElement>(null)

  const dirty = !!(point || question || example)
  const close = () => {
    if (!sent && dirty && !confirm('쓰던 메모를 지우고 닫을까요?')) return
    onClose()
  }

  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    document.body.classList.add('sheet-open')
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    sheet.current?.focus()
    return () => {
      document.body.classList.remove('sheet-open')
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const missing: string[] = []
  if (!kind) missing.push('종류 고르기')
  if (kind === 'confusing') {
    if (!category) missing.push('어디서 막혔는지')
    if (textLen(point) < MIN_CHARS) missing.push(`이해한 것 ${MIN_CHARS}자 이상`)
    if (textLen(question) < MIN_CHARS) missing.push(`헷갈리는 부분 ${MIN_CHARS}자 이상`)
    if (!level) missing.push('얼마나 헷갈리는지')
  }
  if (kind === 'important' && textLen(point) < MIN_CHARS) missing.push(`내 말로 정리 ${MIN_CHARS}자 이상`)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (missing.length || !kind) return
    const where =
      about.scope === 'lesson'
        ? (() => {
            const t = findTarget(about.lesson, target)
            return {
              chapterId: about.chapterId,
              lessonId: about.lesson.id,
              lessonTitle: about.lesson.title,
              stage: t.stage,
              targetId: t.id || undefined,
              targetLabel: t.id ? t.label : undefined,
            }
          })()
        : about.scope === 'word'
          ? { stage: 'words' as const, targetId: `words:${about.word.key}`, targetLabel: `${about.word.en} · ${about.word.ko}` }
          : { stage: 'lesson' as const }
    addNote({
      scope: about.scope,
      place,
      ...where,
      kind,
      category: kind === 'confusing' ? category : undefined,
      level: kind === 'confusing' ? level : undefined,
      point: point.trim(),
      question: kind === 'confusing' ? question.trim() : undefined,
      example: example.trim() || undefined,
    })
    sfx.done()
    setSent(true)
  }

  const offline = !supabase || !session
  const counter = (s: string) => {
    const n = textLen(s)
    return <span className={`count ${n >= MIN_CHARS ? 'ok' : ''}`}>{n >= MIN_CHARS ? <CircleCheck size={13} /> : `${n}/${MIN_CHARS}`}</span>
  }

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="note-sheet" role="dialog" aria-modal="true" aria-label="메모 남기기" tabIndex={-1} ref={sheet}>
        <div className="ns-head">
          <h2>{sent ? '보냈어요' : '메모 남기기'}</h2>
          <button type="button" className="ns-x" onClick={close} aria-label="닫기">
            <X size={22} />
          </button>
        </div>

        {sent ? (
          <div className="ns-done">
            <span className="badge-ico">
              <CircleCheck size={30} />
            </span>
            <p>
              {offline
                ? '이 휴대폰에 저장했어요. 설정에서 로그인하면 선생님께 전달돼요.'
                : about.scope === 'lesson'
                  ? '선생님께 전달돼요. 이 내용으로 나만의 레슨을 만들어 줄 거예요.'
                  : '선생님께 전달돼요. 답장은 내 메모에서 볼 수 있어요.'}
            </p>
            <button type="button" className="btn primary block big" onClick={onClose}>
              계속 공부하기
            </button>
          </div>
        ) : (
          <form className="form" onSubmit={submit}>
            {offline && (
              <p className="warn small">
                <CloudOff size={16} />
                <span>로그인하지 않아서 이 휴대폰에만 저장돼요. 로그인하면 그때 선생님께 보내져요.</span>
              </p>
            )}

            <fieldset className="ns-kind">
              <legend>
                어떤 메모예요? <span className="req">*</span>
              </legend>
              <button type="button" className={`kind-btn ${kind === 'important' ? 'on' : ''}`} aria-pressed={kind === 'important'} onClick={() => setKind('important')}>
                <Lightbulb size={22} />
                <b>중요한 점</b>
                <span>꼭 기억할 것</span>
              </button>
              <button type="button" className={`kind-btn confusing ${kind === 'confusing' ? 'on' : ''}`} aria-pressed={kind === 'confusing'} onClick={() => setKind('confusing')}>
                <CircleHelp size={22} />
                <b>헷갈리는 점</b>
                <span>잘 모르겠는 것</span>
              </button>
            </fieldset>

            {about.scope === 'word' && (
              <p className="ns-about">
                <span className="muted small">단어</span> <b className="en-serif">{about.word.en}</b> <span>{about.word.ko}</span>
              </p>
            )}
            {about.scope === 'general' && <p className="ns-about small muted">레슨이나 단어와 상관없이 궁금한 것, 기억할 것을 적어요.</p>}
            {about.scope === 'lesson' && (
            <label>
              어디에 대한 메모예요?
              <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value={WHOLE.id}>{WHOLE.label}</option>
                {lessonTargets(about.lesson).map((g) => (
                  <optgroup key={g.stage} label={g.title}>
                    {g.items.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            )}

            {kind === 'confusing' && (
              <>
                <fieldset className="ns-group">
                  <legend>
                    어디서 막혔어요? <span className="req">*</span>
                  </legend>
                  <div className="chips">
                    {CATEGORIES.map((c) => (
                      <button key={c.id} type="button" className={`chip ${category === c.id ? 'on' : ''}`} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {category && CATEGORIES.find((c) => c.id === category)!.hint && (
                    <span className="hint">{CATEGORIES.find((c) => c.id === category)!.hint}</span>
                  )}
                </fieldset>
                <label>
                  <span className="label-row">
                    <span>
                      지금 내가 이해한 건 <span className="req">*</span>
                    </span>
                    {counter(point)}
                  </span>
                  <textarea className="input" rows={2} maxLength={600} value={point} onChange={(e) => setPoint(e.target.value)} placeholder="예: 동사 뒤에 -ing 가 오면 다 진행형인 줄 알았어요" />
                </label>
                <label>
                  <span className="label-row">
                    <span>
                      그런데 이게 헷갈려요 <span className="req">*</span>
                    </span>
                    {counter(question)}
                  </span>
                  <textarea className="input" rows={2} maxLength={600} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="예: enjoy reading 에서 reading 은 왜 진행형이 아니에요?" />
                </label>
                <fieldset className="ns-group">
                  <legend>
                    얼마나 헷갈려요? <span className="req">*</span>
                  </legend>
                  <div className="chips">
                    {LEVELS.map((l) => (
                      <button key={l.id} type="button" className={`chip ${level === l.id ? 'on' : ''}`} aria-pressed={level === l.id} onClick={() => setLevel(l.id)}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label>
                  헷갈린 문장 (선택)
                  <input className="input en-serif" maxLength={300} value={example} onChange={(e) => setExample(e.target.value)} autoCapitalize="off" placeholder="I enjoy reading books." />
                </label>
              </>
            )}

            {kind === 'important' && (
              <>
                <label>
                  <span className="label-row">
                    <span>
                      내 말로 정리하면 <span className="req">*</span>
                    </span>
                    {counter(point)}
                  </span>
                  <textarea className="input" rows={3} maxLength={600} value={point} onChange={(e) => setPoint(e.target.value)} placeholder="예: 문장에서 진짜 동사는 하나! 먼저 동사를 찾고 그 앞이 주어" />
                </label>
                <label>
                  기억할 예문 (선택)
                  <input className="input en-serif" maxLength={300} value={example} onChange={(e) => setExample(e.target.value)} autoCapitalize="off" placeholder="The meeting will start at 9." />
                </label>
              </>
            )}

            <div className="form-actions">
              {missing.length > 0 && kind && <p className="hint ns-missing">남은 것: {missing.join(' · ')}</p>}
              <button type="submit" className="btn primary block big" disabled={missing.length > 0}>
                보내기
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/** 레슨 화면에서 메모 창을 열고 닫기 위한 작은 도우미. place = 지금 화면 이름 */
export function useNoteSheet(chapterId: string, lesson: Lesson, place: string) {
  const [open, setOpen] = useState<{ targetId?: string; kind?: NoteKind } | null>(null)
  const sheet = open && (
    <NoteSheet about={{ scope: 'lesson', chapterId, lesson, targetId: open.targetId }} place={place} kind={open.kind} onClose={() => setOpen(null)} />
  )
  return { openNote: (targetId?: string, kind?: NoteKind) => setOpen({ targetId, kind }), sheet }
}

/** 레슨 밖 (단어 · 그냥 메모) 에서 메모 창 열기 */
export function useFreeNote(place: string) {
  const [open, setOpen] = useState<{ about: NoteAbout; kind?: NoteKind } | null>(null)
  const sheet = open && <NoteSheet about={open.about} place={place} kind={open.kind} onClose={() => setOpen(null)} />
  return {
    noteWord: (word: { key: string; en: string; ko: string }, kind?: NoteKind) => setOpen({ about: { scope: 'word', word }, kind }),
    noteGeneral: () => setOpen({ about: { scope: 'general' } }),
    sheet,
  }
}
