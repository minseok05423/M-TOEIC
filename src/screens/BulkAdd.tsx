import { useMemo, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { getState, newId, saveWords, startWords, useStore } from '../lib/store.ts'
import { decks } from '../lib/words.ts'
import { go, href } from '../lib/router.ts'
import { TopBar } from '../components/TopBar.tsx'
import { Meaning, takePos } from '../components/Pos.tsx'

/**
 * 한 줄에 단어 하나. 구분: 탭 / = / : / " - " / 쉼표, 또는 구분 없이 "postpone 연기하다" (한글 앞에서 나눔)
 */
export function parseLine(line: string): { en: string; ko: string; pos?: string } | null {
  const t = line.replace(/^\s*\d+\s*[.)]\s*/, '').trim()
  if (!t) return null
  const m = t.match(/^(.+?)\s*(?:\t|=|:|\s[-–—]\s|,)\s*(.+)$/) ?? t.match(/^([^가-힣]+?)\s+([가-힣~(\[].*)$/)
  if (!m) return null
  const en = m[1].trim()
  const ko = m[2].trim()
  return en && ko && /[a-zA-Z]/.test(en) ? { en, ...takePos(ko) } : null
}

export function BulkAdd() {
  const words = useStore((s) => s.words)
  const deckList = useMemo(() => decks(words), [words])
  const [text, setText] = useState('')
  const [deck, setDeck] = useState(getState().settings.lastDeck)
  const lines = text.split('\n').filter((l) => l.trim())
  const parsed = lines.map((l) => ({ line: l, w: parseLine(l) }))
  const ok = parsed.filter((p) => p.w)
  const bad = parsed.filter((p) => !p.w)

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
          <code>postpone 연기하다</code> · <code>postpone = 연기하다</code> · <code>postpone - 연기하다</code>
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
        <button type="button" className="btn primary block big" disabled={!ok.length} onClick={save}>
          {ok.length ? `${ok.length}개 추가` : '추가'}
        </button>
      </div>
    </div>
  )
}
