import { useMemo, useState } from 'react'
import { NotebookPen } from 'lucide-react'
import { useStore } from '../lib/store.ts'
import { TopBar } from '../components/TopBar.tsx'
import { NoteItem } from '../components/NoteList.tsx'
import { useFreeNote } from '../components/NoteSheet.tsx'

type Filter = 'all' | 'lesson' | 'word' | 'general'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'lesson', label: '레슨' },
  { id: 'word', label: '단어' },
  { id: 'general', label: '그냥 메모' },
]

/** 내 메모 (#/notes): 레슨 · 단어 · 그냥 메모를 한곳에서 보고, 그냥 메모를 새로 써요 */
export function Notes() {
  const all = useStore((s) => s.notes)
  const [filter, setFilter] = useState<Filter>('all')
  const { noteGeneral, sheet } = useFreeNote('내 메모')
  const notes = useMemo(
    () =>
      Object.values(all)
        .filter((n) => filter === 'all' || (n.scope ?? 'lesson') === filter)
        .sort((a, b) => b.createdAt - a.createdAt),
    [all, filter],
  )
  const total = Object.keys(all).length

  return (
    <div className="page">
      <TopBar back="#/" title="내 메모" />
      <button type="button" className="note-cta" onClick={noteGeneral}>
        <NotebookPen size={22} />
        <span className="grow">
          <b>그냥 메모 남기기</b>
          <span>레슨·단어와 상관없이 궁금한 것, 기억할 것</span>
        </span>
      </button>
      <p className="small muted pad-x">레슨 메모는 레슨 화면의 "메모" 버튼, 단어 메모는 단어장에서 단어를 눌러 남겨요. 모두 선생님께 전달돼요.</p>

      {total > 0 && (
        <div className="seg">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {notes.length ? (
        <section className="my-notes">
          {notes.map((n) => (
            <NoteItem key={n.id} n={n} showWhere />
          ))}
        </section>
      ) : (
        <p className="empty">{total ? '이 종류의 메모는 아직 없어요.' : '아직 남긴 메모가 없어요.'}</p>
      )}
      {sheet}
    </div>
  )
}
