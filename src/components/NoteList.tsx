import { useMemo } from 'react'
import { CircleHelp, Lightbulb, NotebookPen } from 'lucide-react'
import type { Lesson } from '../content/types.ts'
import { useStore, type LessonNote } from '../lib/store.ts'
import { CATEGORIES } from '../lib/notes.ts'
import { formatDate } from '../lib/date.ts'

function statusOf(n: LessonNote): { cls: string; text: string } {
  if (n.status === 'done') return { cls: 'done', text: '레슨에 반영됨' }
  if (n.synced) return { cls: 'sent', text: '선생님께 전달됨' }
  return { cls: 'wait', text: '보내는 중' }
}

const ymd = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 레슨 첫 화면 아래: 이 레슨에 남긴 내 메모 + 새 메모 버튼 */
export function NoteList({ chapterId, lesson, onNew }: { chapterId: string; lesson: Lesson; onNew: () => void }) {
  const all = useStore((s) => s.notes)
  const notes = useMemo(
    () => Object.values(all).filter((n) => n.chapterId === chapterId && n.lessonId === lesson.id).sort((a, b) => b.createdAt - a.createdAt),
    [all, chapterId, lesson.id],
  )

  return (
    <section className="my-notes">
      <p className="section-label">내 메모</p>
      <button type="button" className="note-cta" onClick={onNew}>
        <NotebookPen size={22} />
        <span className="grow">
          <b>중요한 점 · 헷갈리는 점 남기기</b>
          <span>선생님이 보고 나만의 레슨을 만들어 줘요</span>
        </span>
      </button>
      {notes.map((n) => {
        const st = statusOf(n)
        return (
          <article key={n.id} className={`note-item ${n.kind}`}>
            <header>
              {n.kind === 'important' ? <Lightbulb size={16} /> : <CircleHelp size={16} />}
              <b>{n.kind === 'important' ? '중요한 점' : `헷갈리는 점 · ${CATEGORIES.find((c) => c.id === n.category)?.label ?? ''}`}</b>
              <span className={`note-status ${st.cls}`}>{st.text}</span>
            </header>
            {n.targetLabel && <p className="note-target">{n.targetLabel}</p>}
            <p>{n.point}</p>
            {n.question && <p className="note-q">{n.question}</p>}
            {n.reply && (
              <p className="note-reply">
                <span>선생님</span> {n.reply}
              </p>
            )}
            <p className="note-date">{formatDate(ymd(n.createdAt))}</p>
          </article>
        )
      })}
    </section>
  )
}
