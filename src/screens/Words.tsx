import { useMemo, useState } from 'react'
import { BookPlus, ClipboardPaste, Layers, Plus, Search } from 'lucide-react'
import { setImportant, useStore } from '../lib/store.ts'
import { customWords, lessonWordList, type StudyWord } from '../lib/words.ts'
import { boxLabel } from '../lib/srs.ts'
import { go, href, replace } from '../lib/router.ts'
import { TopBar } from '../components/TopBar.tsx'
import { HideKoSwitch, WordRow } from '../components/WordRow.tsx'

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
  const userChapters = useStore((s) => s.userChapters)
  const mine = useMemo(() => customWords(custom), [custom])
  const lessonList = useMemo(() => lessonWordList(), [userChapters])
  const list = view === 'mine' ? mine : lessonList
  const filtered = useMemo(() => {
    const n = norm(q)
    return n ? list.filter((w) => norm(w.en).includes(n) || w.ko.includes(q.trim())) : list
  }, [list, q])
  // 내 단어: 묶음은 최근 것부터, 묶음 안에서는 넣은 순서대로
  const groups = groupBy(filtered, (w) => (view === 'mine' ? w.group : (w.lessonTitle ?? ''))).map(
    ([g, ws]): [string, StudyWord[]] => [g, view === 'mine' ? [...ws].reverse() : ws],
  )

  return (
    <div className="page">
      <TopBar title="단어장" />
      <div className="seg">
        <button type="button" className={view === 'mine' ? 'on' : ''} onClick={() => replace('words')}>
          내 단어 {mine.length}
        </button>
        <button type="button" className={view === 'lesson' ? 'on' : ''} onClick={() => replace('words', 'lesson')}>
          수업 단어 {lessonList.length}
        </button>
      </div>

      {view === 'mine' && (
        <div className="row-gap">
          <a className="btn primary grow" href={href('words', 'new')}>
            <Plus size={19} strokeWidth={2.4} /> 단어 추가
          </a>
          <a className="btn tonal grow" href={href('words', 'bulk')}>
            <ClipboardPaste size={18} /> 여러 개 붙여넣기
          </a>
        </div>
      )}

      {list.length > 0 && (
        <>
          <div className="search">
            <Search size={18} />
            <input className="input" type="search" placeholder="영어나 뜻으로 찾기" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="row-between" style={{ padding: '0 4px', marginTop: -4 }}>
            <span className="small muted">{filtered.length}개</span>
            <HideKoSwitch value={hideKo} onChange={setHideKo} />
          </div>
        </>
      )}

      {view === 'mine' && mine.length === 0 && (
        <div className="card empty-card">
          <div className="badge-ico">
            <BookPlus size={30} strokeWidth={2} />
          </div>
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
        <section key={g} className="card word-card">
          <div className="row-between">
            <h3 className="group-title">
              {g} · {ws.length}
            </h3>
            {view === 'mine' && !q && (
              <a className="btn small tonal" href={href('words', 'cards', g)}>
                <Layers size={14} /> 외우기
              </a>
            )}
            {view === 'lesson' && ws[0]?.chapterId && (
              <a className="btn small tonal" href={href('l', ws[0].chapterId, ws[0].lessonId!, 'words')}>
                <Layers size={14} /> 외우기
              </a>
            )}
          </div>
          <ul className="word-list">
            {ws.map((w) => (
              <WordRow
                key={w.key}
                en={w.en}
                ko={w.ko}
                pos={w.pos}
                tip={w.tip}
                ex={w.ex}
                box={srs[w.key]?.box}
                level={boxLabel(srs[w.key])}
                hideKo={hideKo}
                onEdit={w.customId ? () => go('words', 'edit', w.customId!) : undefined}
                important={w.important}
                onStar={w.customId ? () => setImportant(w.customId!, !w.important) : undefined}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
