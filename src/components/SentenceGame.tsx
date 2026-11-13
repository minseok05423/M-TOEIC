import { useMemo, useState } from 'react'
import { ArrowRight, Languages } from 'lucide-react'
import type { AnalyzedSentence } from '../content/types.ts'
import { parseMarkup, plainText, tagInfo } from '../content/markup.ts'
import { sfx } from '../lib/sfx.ts'
import { useImmersive } from '../lib/ui.ts'
import { RunHead } from './RunHead.tsx'
import { SentenceView } from './SentenceView.tsx'
import { Speak } from './Speak.tsx'

interface Chip {
  text: string
  tag?: string
  /** 구두점처럼 누를 필요 없는 조각 */
  punct?: boolean
}

function chips(src: string): Chip[] {
  const out: Chip[] = []
  for (const t of parseMarkup(src)) {
    if (t.tag) out.push({ text: t.text, tag: t.tag })
    else
      for (const w of t.text.split(/\s+/).filter(Boolean))
        out.push(/[A-Za-z0-9]/.test(w) ? { text: w } : { text: w, punct: true })
  }
  return out
}

type Want = 'V' | 'S'

/** 틀린 조각을 눌렀을 때: 왜 아닌지 한 줄로 */
function why(c: Chip, want: Want): string {
  const t = c.tag
  if (!t) return '여기는 아니에요. 색이 없는 부분은 뼈대가 아니에요.'
  const lower = t !== t.toUpperCase()
  const k = t.toUpperCase()
  if (lower && k === 'V') return '그 동사는 덩어리 안에 있어요. 덩어리 밖의 진짜 동사를 찾아요.'
  if (lower && k === 'S') return '덩어리 안의 주어예요. 문장 전체의 주어를 찾아요.'
  if (lower) return `덩어리 안의 ${tagInfo(k).label}예요.`
  if (k === 'MOD') return want === 'V' ? '조동사예요! 바로 뒤에 오는 동사원형을 눌러요.' : '조동사예요. 주어는 그 앞에 있어요.'
  if (k === 'S') return '그건 주어예요. 주어 뒤에 오는 동사를 찾아요.'
  if (k === 'V') return '그건 동사예요. 동사 앞에서 "누가 / 무엇이"를 찾아요.'
  if (k === 'PREP') return '전치사예요. 전치사 + 명사는 꾸밈 덩어리라 뼈대가 아니에요.'
  if (k === 'CONJ') return '접속사예요. 주어+동사 덩어리를 여는 신호예요.'
  if (k === 'REL') return '관계사예요. 앞 명사를 꾸미는 덩어리를 열어요.'
  if (k === 'O') return '목적어예요 ("~을/를"). 동사 뒤에 와요.'
  if (k === 'C') return '보어예요. be동사 뒤에서 주어를 설명해요.'
  return `${tagInfo(k).label}예요.`
}

function One({ s, onSolved }: { s: AnalyzedSentence; onSolved: (clean: boolean) => void }) {
  const cs = useMemo(() => chips(s.text), [s.text])
  const wants = useMemo<Want[]>(() => (cs.some((c) => c.tag === 'S') ? ['V', 'S'] : ['V']), [cs])
  const [wi, setWi] = useState(0)
  const [found, setFound] = useState<Set<number>>(new Set())
  const [miss, setMiss] = useState<{ i: number; msg: string } | null>(null)
  const [misses, setMisses] = useState(0)
  const [stepMisses, setStepMisses] = useState(0)
  const [ko, setKo] = useState(false)
  const revealed = wi >= wants.length
  const want = wants[wi]
  const targets = cs.map((c, i) => (c.tag === want ? i : -1)).filter((i) => i >= 0)
  const left = targets.filter((i) => !found.has(i)).length

  function tap(i: number) {
    if (revealed || found.has(i)) return
    const c = cs[i]
    if (c.tag === want) {
      const f = new Set(found).add(i)
      setFound(f)
      setMiss(null)
      if (targets.every((t) => f.has(t))) {
        sfx.right()
        setWi(wi + 1)
        setStepMisses(0)
      } else sfx.pop()
    } else {
      sfx.wrong()
      setMiss({ i, msg: why(c, want) })
      setMisses(misses + 1)
      setStepMisses(stepMisses + 1)
    }
  }

  const prompt =
    want === 'V'
      ? targets.length > 1
        ? `진짜 동사 ${targets.length}개를 찾아 누르세요`
        : '진짜 동사를 찾아 누르세요'
      : targets.length > 1
        ? `주어 ${targets.length}개를 찾아 누르세요`
        : '이 동사의 주어는?'

  return (
    <>
      {!revealed ? (
        <>
          <p className="game-prompt">
            <span className={`want want-${want}`}>{want}</span>
            {prompt}
            {targets.length > 1 && left < targets.length && <span className="muted small"> · {left}개 남음</span>}
          </p>
          <div className="sg-card">
            <div className="sg-tools">
              <Speak text={plainText(s.text)} />
              <button type="button" className={`chip ${ko ? 'on' : ''}`} onClick={() => setKo(!ko)}>
                <Languages size={15} /> 해석 힌트
              </button>
            </div>
            <p className="sg-sent">
              {cs.map((c, i) => {
                if (c.punct)
                  return (
                    <span key={i} className="sg-punct">
                      {c.text}
                    </span>
                  )
                const isFound = found.has(i) || (c.tag && wants.indexOf(c.tag as Want) > -1 && wants.indexOf(c.tag as Want) < wi)
                const color = c.tag ? tagInfo(c.tag).color : undefined
                const hint = stepMisses >= 2 && targets.includes(i) && !found.has(i)
                return (
                  <button
                    key={i}
                    type="button"
                    className={`gtok en-serif ${isFound ? 'found' : ''} ${miss?.i === i ? 'miss' : ''} ${hint ? 'hint' : ''}`}
                    style={isFound ? ({ '--c': color } as React.CSSProperties) : undefined}
                    onClick={() => tap(i)}
                  >
                    {c.text}
                    {isFound && <span className="gtok-tag">{c.tag}</span>}
                  </button>
                )
              })}
            </p>
            {ko && <p className="sg-ko">{s.ko}</p>}
          </div>
          <p className={`sg-why ${miss ? 'show' : ''}`} key={misses}>
            {miss ? miss.msg : want === 'V' ? '시제가 붙은 동사 · 덩어리(절) 밖에 있어요' : '동사 앞의 "누가 / 무엇이"'}
          </p>
        </>
      ) : (
        <>
          <p className="game-prompt">{misses === 0 ? '한 번에 찾았어요!' : '뼈대를 찾았어요'}</p>
          <SentenceView s={s} opts={{ skeleton: false, ko: true, slash: true }} index={-1} />
          <div className="game-foot">
            <button type="button" className="btn primary block big" onClick={() => onSolved(misses === 0)}>
              다음 <ArrowRight size={19} />
            </button>
          </div>
        </>
      )}
    </>
  )
}

/** 뼈대 찾기: 문장마다 진짜 동사 → 주어를 직접 눌러서 찾고, 다 찾으면 전체 분석을 보여줌 */
export function SentenceGame({
  sentences,
  exitHref,
  onDone,
  onNote,
}: {
  sentences: AnalyzedSentence[]
  exitHref: string
  onDone: (clean: number, total: number) => void
  onNote?: (targetId: string) => void
}) {
  useImmersive()
  const [i, setI] = useState(0)
  const [clean, setClean] = useState(0)
  const [combo, setCombo] = useState(0)
  const s = sentences[i]
  if (!s) return null
  return (
    <div className="game">
      <RunHead
        exitHref={exitHref}
        progress={i / sentences.length}
        combo={combo}
        count={`${i + 1}/${sentences.length}`}
        onNote={onNote && (() => onNote(`sentences:${s.id}`))}
      />
      <div className="game-body" key={s.id}>
        <One
          s={s}
          onSolved={(ok) => {
            const c = clean + (ok ? 1 : 0)
            setClean(c)
            setCombo(ok ? combo + 1 : 0)
            if (i + 1 >= sentences.length) {
              sfx.done()
              onDone(c, sentences.length)
            } else {
              setI(i + 1)
              window.scrollTo(0, 0)
            }
          }}
        />
      </div>
    </div>
  )
}
