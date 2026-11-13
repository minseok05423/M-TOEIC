import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import type { AnalyzedSentence } from '../content/types.ts'
import { parseMarkup, plainText, tagInfo, TAG_KEYS } from '../content/markup.ts'
import { Speak } from './Speak.tsx'
import { Inline } from './RichText.tsx'

export interface ViewOpts {
  skeleton: boolean
  ko: boolean
  slash: boolean
}

export function SentenceView({ s, opts, index }: { s: AnalyzedSentence; opts: ViewOpts; index: number }) {
  const [sel, setSel] = useState<number | null>(null)
  const tokens = parseMarkup(s.text)
  const plain = plainText(s.text)
  const picked = sel !== null ? tokens[sel] : null
  const info = picked?.tag ? tagInfo(picked.tag) : null

  return (
    <div className="card sentence">
      <div className="sentence-head">
        {index >= 0 ? <span className="num">{String(index + 1).padStart(2, '0')}</span> : <span />}
        <Speak text={plain} />
        <Speak text={plain} slow />
      </div>
      <p className={`sent en-serif ${opts.skeleton ? 'skeleton' : ''}`}>
        {tokens.map((t, i) => {
          if (!t.tag)
            return (
              <span key={i} className="plain">
                {t.text}
              </span>
            )
          const ti = tagInfo(t.tag)
          const clause = t.tag !== t.tag.toUpperCase()
          return (
            <button
              key={i}
              type="button"
              className={`tok ${ti.core ? 'core' : ''} ${clause ? 'clause' : ''} ${sel === i ? 'sel' : ''}`}
              style={{ '--c': ti.color } as React.CSSProperties}
              onClick={() => setSel(sel === i ? null : i)}
            >
              {t.text}
              <span className="tok-tag">{t.tag.toUpperCase()}</span>
            </button>
          )
        })}
      </p>
      {picked && info && (
        <div className="tok-info" style={{ '--c': info.color } as React.CSSProperties}>
          <b>{picked.text}</b> → <span className="role">{info.label}</span>
          {picked.note && <div className="tok-note">{picked.note}</div>}
        </div>
      )}
      {opts.slash && s.slash && (
        <p className="slash en-serif">
          {s.slash.split('/').map((part, i, arr) => (
            <span key={i}>
              {part.trim()}
              {i < arr.length - 1 && <span className="slash-mark"> / </span>}
            </span>
          ))}
        </p>
      )}
      {opts.ko && <p className="ko">{s.ko}</p>}
      {opts.ko && s.note && (
        <p className="note">
          <Lightbulb size={16} />
          <span>
            <Inline text={s.note} />
          </span>
        </p>
      )}
    </div>
  )
}

export function TagLegend() {
  return (
    <div className="legend">
      {TAG_KEYS.map((k) => {
        const ti = tagInfo(k.toUpperCase())
        return (
          <span key={k} className="legend-chip" style={{ '--c': ti.color } as React.CSSProperties}>
            {k.toUpperCase()} {ti.label}
          </span>
        )
      })}
      <span className="legend-chip clause-demo">점선 = 덩어리 안</span>
    </div>
  )
}
