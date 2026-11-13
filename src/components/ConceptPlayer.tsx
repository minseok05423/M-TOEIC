import { useState } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import type { Section } from '../content/types.ts'
import { useImmersive } from '../lib/ui.ts'
import { sfx } from '../lib/sfx.ts'
import { RichText } from './RichText.tsx'
import { NoteButton } from './RunHead.tsx'
import { Speak } from './Speak.tsx'

/** 설명을 한 장씩 넘겨 보기 (위쪽 칸 = 몇 번째 장인지) */
export function ConceptPlayer({
  sections,
  exitHref,
  onDone,
  onNote,
}: {
  sections: Section[]
  exitHref: string
  onDone: () => void
  /** 지금 장의 메모 대상 id ('learn:s<번호>') */
  onNote?: (targetId: string) => void
}) {
  useImmersive()
  const [i, setI] = useState(0)
  const s = sections[i]
  const last = i === sections.length - 1
  const go = (n: number) => {
    setI(n)
    window.scrollTo(0, 0)
  }

  return (
    <div className="game concept">
      <div className="run-head">
        <a className="run-exit" href={exitHref} aria-label="그만하기">
          <X size={24} strokeWidth={2.4} />
        </a>
        <div className="segs">
          {sections.map((_, j) => (
            <button key={j} type="button" className={j <= i ? 'on' : ''} onClick={() => go(j)} aria-label={`${j + 1}번째 장`} />
          ))}
        </div>
        <span className="run-count">
          {i + 1}/{sections.length}
        </span>
        {onNote && <NoteButton onClick={() => onNote(`learn:s${i}`)} />}
      </div>

      <article className="page-card" key={i}>
        <p className="pc-num">
          <span>{String(i + 1).padStart(2, '0')}</span>
        </p>
        <h2 className="pc-title">{s.heading}</h2>
        <RichText text={s.body} />
        {s.table && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {s.table[0].map((c, j) => (
                    <th key={j}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.table.slice(1).map((row, r) => (
                  <tr key={r}>
                    {row.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {s.examples?.map((ex, j) => (
          <div key={j} className="example">
            <Speak text={ex.en} />
            <div>
              <p className="ex-en en-serif">{ex.en}</p>
              <p className="ex-ko">{ex.ko}</p>
            </div>
          </div>
        ))}
      </article>

      <div className="game-foot row-gap">
        {i > 0 && (
          <button type="button" className="btn square" onClick={() => go(i - 1)} aria-label="이전">
            <ArrowLeft size={20} />
          </button>
        )}
        <button
          type="button"
          className="btn primary big grow"
          onClick={() => {
            if (last) {
              sfx.done()
              onDone()
            } else {
              sfx.pop()
              go(i + 1)
            }
          }}
        >
          {last ? '다 읽었어요' : '다음 장'} <ArrowRight size={19} />
        </button>
      </div>
    </div>
  )
}
