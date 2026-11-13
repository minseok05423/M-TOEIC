import { Flame, NotebookPen, X } from 'lucide-react'

/** 게임·퀴즈 위쪽: 나가기 · 진행 막대 · 연속 정답 */
export function RunHead({
  exitHref,
  progress,
  combo = 0,
  count,
  onNote,
}: {
  exitHref: string
  progress: number
  combo?: number
  count?: string
  /** 있으면 오른쪽에 '메모' 버튼 */
  onNote?: () => void
}) {
  return (
    <div className="run-head">
      <a className="run-exit" href={exitHref} aria-label="그만하기">
        <X size={24} strokeWidth={2.4} />
      </a>
      <div className="run-bar">
        <div style={{ width: `${Math.min(1, progress) * 100}%` }} />
      </div>
      {combo >= 2 ? (
        <span className="combo" key={combo}>
          <Flame size={16} strokeWidth={2.4} />
          {combo}
        </span>
      ) : (
        count && <span className="run-count">{count}</span>
      )}
      {onNote && <NoteButton onClick={onNote} />}
    </div>
  )
}

/** 게임 중에 메모 남기기 (지금 보고 있는 것이 미리 골라짐) */
export function NoteButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="run-note" onClick={onClick} aria-label="메모 남기기">
      <NotebookPen size={20} strokeWidth={2.2} />
      <span>메모</span>
    </button>
  )
}
