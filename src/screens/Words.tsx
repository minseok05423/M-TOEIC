import { useMemo, useState } from 'react'
import { useStore } from '../lib/store.ts'
import { customWords, LESSON_WORDS, type StudyWord } from '../lib/words.ts'
import { boxLabel } from '../lib/srs.ts'
import { go, href, replace } from '../lib/router.ts'
import { TopBar } from '../components/TopBar.tsx'
import { WordRow } from './Lesson.tsx'

function groupBy(ws: StudyWord[], key: (w: StudyWord) => string): [string, StudyWord[]][] {
  const m = new Map<string, StudyWord[]>()
  for (const w of ws) m.set(key(w), [...(m.get(key(w)) ?? []), w])
  return [...m]
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

export function Words({ view }: { view: 'mine' | 'lesson' }) {
  const custom = useStore((s) => s.words)
  const srs = useStore((s) => s.progress.srs)
  const [q, setQ] = useState('')
  const [hideKo, setHideKo] = useState(false)
  const mine = useMemo(() => customWords(custom), [custom])
  const list = view === 'mine' ? mine : LESSON_WORDS
  const filtered = useMemo(() => {
    const n = norm(q)
    return n ? list.filter((w) => norm(w.en).includes(n) || w.ko.includes(q.trim())) : list
  }, [list, q])
  const groups = groupBy(filtered, (w) => (view === 'mine' ? w.group : (w.lessonTitle ?? '')))

  return (
    <div className="page">
      <TopBar title="📒 단어장" />
      <div className="seg">
        <button type="button" className={view === 'mine' ? 'on' : ''} onClick={() => replace('words')}>
          내 단어 {mine.length}
        </button>
        <button type="button" className={view === 'lesson' ? 'on' : ''} onClick={() => replace('words', 'lesson')}>
          수업 단어 {LESSON_WORDS.length}
        </button>
      </div>

      {view === 'mine' && (
        <div className="row-gap">
          <a className="btn primary grow" href={href('words', 'new')}>
            ＋ 단어 추가
          </a>
          <a className="btn grow" href={href('words', 'bulk')}>
            📋 붙여넣기
          </a>
        </div>
      )}

      {list.length > 0 && (
        <div className="row-gap">
          <input
            className="input grow"
            type="search"
            placeholder="🔍 영어나 뜻으로 찾기"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="toggle small">
            <input type="checkbox" checked={hideKo} onChange={(e) => setHideKo(e.target.checked)} /> 뜻 가리기
          </label>
        </div>
      )}

      {view === 'mine' && mine.length === 0 && (
        <div className="card empty-card">
          <p className="done-emoji">📚</p>
          <p>
            <b>책이나 수업에서 모르는 단어</b>를 여기에 추가하세요.
          </p>
          <p className="muted small">
            추가한 단어는 자동으로 복습 목록에 들어가요. 단어책 목록은 "여러 개 붙여넣기"로 한 번에 넣을 수 있어요.
          </p>
        </div>
      )}

      {q && filtered.length === 0 && <p className="empty">"{q}" 검색 결과가 없어요.</p>}

      {groups.map(([g, ws]) => (
        <section key={g} className="card">
          <div className="row-between">
            <h3 className="group-title">
              {g} <span className="muted small">{ws.length}</span>
            </h3>
            {view === 'mine' && !q && (
              <a className="btn small" href={href('words', 'cards', g)}>
                🃏 외우기
              </a>
            )}
            {view === 'lesson' && ws[0]?.chapterId && (
              <a className="btn small" href={href('l', ws[0].chapterId, ws[0].lessonId!, 'cards')}>
                🃏 외우기
              </a>
            )}
          </div>
          <ul className="word-list">
            {ws.map((w) => (
              <WordRow
                key={w.key}
                en={w.en}
                ko={w.ko}
                tip={w.tip}
                ex={w.ex}
                box={srs[w.key]?.box}
                level={boxLabel(srs[w.key])}
                hideKo={hideKo}
                onEdit={w.customId ? () => go('words', 'edit', w.customId!) : undefined}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
