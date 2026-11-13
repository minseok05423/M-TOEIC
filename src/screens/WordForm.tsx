import { useMemo, useRef, useState } from 'react'
import { CircleCheck, ChevronDown, Trash2, TriangleAlert } from 'lucide-react'
import { deleteWord, getState, newId, saveWord, startWords, useStore } from '../lib/store.ts'
import { decks } from '../lib/words.ts'
import { go, href } from '../lib/router.ts'
import { TopBar } from '../components/TopBar.tsx'

export function WordForm({ id }: { id?: string }) {
  const words = useStore((s) => s.words)
  const existing = id ? words[id] : undefined
  const deckList = useMemo(() => decks(words), [words])
  const blank = () => ({ en: '', ko: '', exEn: '', exKo: '', tip: '', deck: getState().settings.lastDeck })
  const [f, setF] = useState(() =>
    existing
      ? { en: existing.en, ko: existing.ko, exEn: existing.exEn ?? '', exKo: existing.exKo ?? '', tip: existing.tip ?? '', deck: existing.deck }
      : blank(),
  )
  const [saved, setSaved] = useState(0)
  const enRef = useRef<HTMLInputElement>(null)

  if (id && !existing)
    return (
      <div className="page">
        <TopBar back={href('words')} title="단어 수정" />
        <p className="empty">단어를 찾을 수 없어요.</p>
      </div>
    )

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const valid = f.en.trim() && f.ko.trim()
  const dup =
    !existing &&
    f.en.trim() &&
    Object.values(words).find((w) => !w.deleted && w.en.trim().toLowerCase() === f.en.trim().toLowerCase())

  function save(more: boolean) {
    if (!valid) return
    const wid = existing?.id ?? newId()
    saveWord({
      id: wid,
      en: f.en.trim(),
      ko: f.ko.trim(),
      exEn: f.exEn.trim() || undefined,
      exKo: f.exKo.trim() || undefined,
      tip: f.tip.trim() || undefined,
      deck: f.deck.trim() || '내 단어',
      createdAt: existing?.createdAt,
    })
    if (!existing) startWords([`c:${wid}`])
    if (more) {
      setF({ ...blank(), deck: f.deck.trim() || '내 단어' })
      setSaved(saved + 1)
      enRef.current?.focus()
    } else go('words')
  }

  return (
    <div className="page">
      <TopBar back={href('words')} title={existing ? '단어 수정' : '단어 추가'} />
      <form
        className="card form"
        onSubmit={(e) => {
          e.preventDefault()
          save(!existing)
        }}
      >
        {saved > 0 && (
          <p className="toast">
            <CircleCheck size={18} /> {saved}개 저장했어요. 다음 단어!
          </p>
        )}
        <label>
          <span>
            영어 <span className="req">*</span>
          </span>
          <input ref={enRef} className="input" value={f.en} onChange={set('en')} autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="예: postpone" autoFocus={!existing} />
        </label>
        {dup && (
          <p className="warn small">
            <TriangleAlert size={16} />
            <span>
              이미 "{dup.deck}"에 있는 단어예요: {dup.ko}
            </span>
          </p>
        )}
        <label>
          <span>
            뜻 <span className="req">*</span>
          </span>
          <input className="input" value={f.ko} onChange={set('ko')} placeholder="예: 연기하다, 미루다" />
        </label>
        <label>
          묶음
          <input className="input" value={f.deck} onChange={set('deck')} list="decks" placeholder="내 단어" />
          <datalist id="decks">
            {deckList.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <span className="hint">예: 내 단어, Day 3, 해커스 Part 5 … 같은 묶음끼리 카드로 외울 수 있어요</span>
        </label>
        <details open={!!(f.exEn || f.exKo || f.tip)}>
          <summary>
            예문 · 메모 (선택) <ChevronDown size={16} />
          </summary>
          <label>
            예문 (영어)
            <input className="input" value={f.exEn} onChange={set('exEn')} autoCapitalize="off" placeholder="The meeting was postponed." />
          </label>
          <label>
            예문 해석
            <input className="input" value={f.exKo} onChange={set('exKo')} placeholder="회의가 연기되었다." />
          </label>
          <label>
            메모
            <input className="input" value={f.tip} onChange={set('tip')} placeholder="= put off" />
          </label>
        </details>
        {existing ? (
          <div className="form-actions">
            <button type="submit" className="btn primary block big" disabled={!valid}>
              저장
            </button>
            <button
              type="button"
              className="btn danger block"
              onClick={() => {
                if (confirm(`"${existing.en}" 을(를) 지울까요?`)) {
                  deleteWord(existing.id)
                  go('words')
                }
              }}
            >
              <Trash2 size={17} /> 삭제
            </button>
          </div>
        ) : (
          <div className="form-actions">
            <button type="submit" className="btn primary block big" disabled={!valid}>
              저장하고 하나 더 추가
            </button>
            <button type="button" className="btn block" disabled={!valid} onClick={() => save(false)}>
              저장하고 끝내기
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
