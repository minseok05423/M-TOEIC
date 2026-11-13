import { useState } from 'react'
import { Lightbulb, Pencil } from 'lucide-react'
import { MAX_BOX } from '../lib/srs.ts'
import { Speak } from './Speak.tsx'

export function HideKoSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle small">
      뜻 가리기
      <input type="checkbox" className="switch" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

/** 외운 정도: 칸 6개 */
function Meter({ box, title }: { box: number; title?: string }) {
  return (
    <span className={`meter b${box}`} title={title} aria-label={title}>
      {Array.from({ length: MAX_BOX }, (_, i) => (
        <i key={i} className={i < box ? 'on' : ''} />
      ))}
    </span>
  )
}

export function WordRow({
  en,
  ko,
  tip,
  ex,
  level,
  box,
  hideKo,
  onEdit,
}: {
  en: string
  ko: string
  tip?: string
  ex?: { en: string; ko: string }
  level?: string
  box?: number
  hideKo?: boolean
  onEdit?: () => void
}) {
  const [open, setOpen] = useState(false)
  const shown = !hideKo || open
  return (
    <li className="word-row" onClick={() => setOpen(!open)}>
      <div className="word-main">
        <Speak text={en} />
        <div className="word-text">
          <b className="word-en en-serif">{en}</b>
          <span className={`word-ko ${shown ? '' : 'hidden'}`}>{shown ? ko : '탭해서 보기'}</span>
        </div>
        {box !== undefined && <Meter box={box} title={level} />}
      </div>
      {open && (ex || tip || onEdit || level) && (
        <div className="word-more">
          {ex && (
            <div className="word-ex">
              <Speak text={ex.en} />
              <span>
                <span className="en-serif">{ex.en}</span>
                <br />
                <span className="muted small">{ex.ko}</span>
              </span>
            </div>
          )}
          {tip && (
            <p className="word-tip small">
              <Lightbulb size={14} /> <span>{tip}</span>
            </p>
          )}
          {level && <p className="small muted">상태 · {level}</p>}
          {onEdit && (
            <button
              type="button"
              className="btn small"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Pencil size={14} /> 수정
            </button>
          )}
        </div>
      )}
    </li>
  )
}
