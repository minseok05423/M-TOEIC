import { useMemo, useState } from 'react'
import { Info, TriangleAlert } from 'lucide-react'
import { getState, newId, saveWords, startWords, useStore } from '../lib/store.ts'
import { decks } from '../lib/words.ts'
import { go, href } from '../lib/router.ts'
import { TopBar } from '../components/TopBar.tsx'
import { Meaning } from '../components/Pos.tsx'
import { normEn, parseLine } from '../lib/wordline.ts'

export function BulkAdd() {
  const words = useStore((s) => s.words)
  const deckList = useMemo(() => decks(words), [words])
  const [text, setText] = useState('')
  const [deck, setDeck] = useState(getState().settings.lastDeck)
  const lines = text.split('\n').filter((l) => l.trim())
  const parsed = lines.map((l) => ({ line: l, w: parseLine(l) }))
  const bad = parsed.filter((p) => !p.w)
  // 이미 단어장에 있거나 붙여넣은 목록 안에서 겹치는 단어는 건너뜀 (같은 단어가 두 번 있으면 복습·테스트에 두 번 나와요)
  const have = useMemo(() => new Map(Object.values(words).filter((w) => !w.deleted).map((w) => [normEn(w.en), w.deck])), [words])
  const seen = new Set<string>()
  const ok: typeof parsed = []
  const dupes: { en: string; deck: string }[] = []
  for (const p of parsed) {
    if (!p.w) continue
    const k = normEn(p.w.en)
    if (have.has(k) || seen.has(k)) dupes.push({ en: p.w.en, deck: have.get(k) ?? '위 목록' })
    else ok.push(p)
    seen.add(k)
  }

  function save() {
    const list = ok.map((p) => ({ id: newId(), en: p.w!.en, ko: p.w!.ko, pos: p.w!.pos, deck: deck.trim() || '내 단어' }))
    saveWords(list)
    startWords(list.map((w) => `c:${w.id}`))
    go('words')
  }

  return (
    <div className="page">
      <TopBar back={href('words')} title="여러 개 붙여넣기" />
      <div className="card form">
        <p className="small muted">
          한 줄에 단어 하나씩. 이렇게 쓰면 돼요:
          <br />
          <code>postpone 연기하다</code> · <code>postpone = 연기하다</code> · <code>postpone - 연기하다</code> · <code>set up 설치하다, 설립하다</code> ·{' '}
          <code>look forward to ~ing ~을 고대하다</code>
          <br />
          품사는 뜻 앞에 괄호로: <code>hold - (동) 들다, 잡다</code> · <code>shade - (동) 그늘지게 하다 / (명) 그늘</code>
        </p>
        <textarea
          className="input"
          rows={9}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={'postpone (동) 연기하다\nrequire = (동) 요구하다\nin advance - (숙) 미리'}
        />
        <label>
          묶음
          <input className="input" value={deck} onChange={(e) => setDeck(e.target.value)} list="decks2" />
          <datalist id="decks2">
            {deckList.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </label>
        {ok.length > 0 && (
          <div className="preview">
            <p className="small">
              <b>{ok.length}</b>개 인식됨
            </p>
            <ul>
              {ok.slice(0, 50).map((p, i) => (
                <li key={i}>
                  <b>{p.w!.en}</b> — <Meaning ko={p.w!.ko} pos={p.w!.pos} />
                </li>
              ))}
              {ok.length > 50 && <li className="muted">… 외 {ok.length - 50}개</li>}
            </ul>
          </div>
        )}
        {bad.length > 0 && (
          <div className="warn small">
            <TriangleAlert size={16} />
            <div>
              인식 못 한 줄 {bad.length}개 (영어와 뜻 사이에 = 를 넣어 보세요)
              <ul>
                {bad.slice(0, 5).map((p, i) => (
                  <li key={i}>{p.line}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {dupes.length > 0 && (
          <div className="note small">
            <Info size={16} />
            <div>
              이미 있는 단어 {dupes.length}개는 건너뛰어요:{' '}
              {dupes
                .slice(0, 8)
                .map((d) => `${d.en} (${d.deck})`)
                .join(', ') + (dupes.length > 8 ? ` 외 ${dupes.length - 8}개` : '')}
            </div>
          </div>
        )}
        <button type="button" className="btn primary block big" disabled={!ok.length} onClick={save}>
          {ok.length ? `${ok.length}개 추가` : '추가'}
        </button>
      </div>
    </div>
  )
}
