import { useState } from 'react'
import { CircleCheck, Lightbulb, MessagesSquare, PenLine, Sparkles, Target, ThumbsUp } from 'lucide-react'
import { ISSUE_LABEL, SCORE_LABEL, type Review } from '../../supabase/functions/review-writing/review.ts'
import { markParts } from '../lib/marks.ts'
import type { Talk, Writing } from '../lib/writing.ts'
import { formatDate } from '../lib/date.ts'
import { Speak } from './Speak.tsx'

const VERDICT: Record<Review['sentences'][number]['verdict'], { label: string; tone: string }> = {
  ok: { label: '좋아요', tone: 'ok' },
  fix: { label: '고칠 곳', tone: 'fix' },
  better: { label: '더 자연스럽게', tone: 'better' },
}

function Scores({ s }: { s: Review['scores'] }) {
  return (
    <dl className="rv-scores">
      {(Object.keys(SCORE_LABEL) as (keyof Review['scores'])[]).map((k) => (
        <div key={k}>
          <dt>{SCORE_LABEL[k]}</dt>
          <dd aria-label={`${s[k]}점 / 5점`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <i key={i} className={i <= s[k] ? 'on' : ''} />
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Head({ icon, children, count }: { icon: React.ReactNode; children: React.ReactNode; count?: number }) {
  return (
    <h2 className="rv-h">
      {icon}
      {children}
      {count !== undefined && <span className="rv-count">{count}</span>}
    </h2>
  )
}

/** 검수 결과 한 편 (학생 · 선생님 화면 공통) */
export function ReviewView({ w, talk, teacher }: { w: Writing; talk?: Talk; teacher?: boolean }) {
  const r = w.review
  const [whole, setWhole] = useState<'corrected' | 'natural' | 'mine'>('corrected')
  const fixes = r.sentences.reduce((a, s) => a + s.issues.length, 0)
  const wholeText = whole === 'corrected' ? r.corrected : whole === 'natural' ? r.natural : w.body

  return (
    <div className="rv">
      <header className="rv-top">
        <p className="eyebrow">
          {formatDate(w.day)} 작문{w.topic ? ` · ${w.topic}` : ''}
        </p>
        <p className="rv-summary">{r.summary}</p>
        <Scores s={r.scores} />
        <p className="rv-stat small muted">
          {r.sentences.length}문장 · 고칠 곳 {fixes}개 · 아쉬운 표현 {r.better.length}개
        </p>
      </header>

      {talk && (
        <section className="rv-sec rv-talknote">
          <Head icon={<CircleCheck size={19} />}>선생님과 프리토킹 함</Head>
          <p className="small muted">{formatDate(talk.talked_at.slice(0, 10))}</p>
          {talk.note && <p className="rv-note">{talk.note}</p>}
        </section>
      )}

      <section className="rv-sec">
        <Head icon={<PenLine size={19} />} count={r.sentences.length}>
          문장별 검수
        </Head>
        <ol className="rv-sents">
          {r.sentences.map((s, i) => {
            const v = VERDICT[s.verdict]
            const changed = s.corrected.trim() !== s.original.trim()
            return (
              <li key={i} className={`rv-sent ${v.tone}`}>
                <div className="rv-sent-head">
                  <span className="rv-num">{i + 1}</span>
                  <span className={`rv-verdict ${v.tone}`}>
                    {v.label}
                    {s.issues.length ? ` ${s.issues.length}` : ''}
                  </span>
                </div>
                <p className="rv-orig en-serif">
                  {markParts(s.original, s.issues.map((x) => x.wrong)).map((p, j) =>
                    p.hit ? (
                      <mark key={j} className="rv-wrong">
                        {p.t}
                      </mark>
                    ) : (
                      <span key={j}>{p.t}</span>
                    ),
                  )}
                </p>
                {changed && (
                  <p className="rv-fixed en-serif">
                    <span className="grow">{s.corrected}</span>
                    <Speak text={s.corrected} />
                  </p>
                )}
                {s.issues.length > 0 && (
                  <ul className="rv-issues">
                    {s.issues.map((x, j) => (
                      <li key={j}>
                        <span className="rv-type">{ISSUE_LABEL[x.type]}</span>
                        <span className="rv-change en-serif">
                          {x.wrong && <s>{x.wrong}</s>}
                          {x.wrong && x.right && ' → '}
                          {x.right && <b>{x.right}</b>}
                        </span>
                        <span className="rv-why">{x.why}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      {r.better.length > 0 && (
        <section className="rv-sec">
          <Head icon={<Sparkles size={19} />} count={r.better.length}>
            아쉬운 표현
          </Head>
          <p className="small muted">틀리진 않았지만, 이렇게 말하면 더 자연스러워요.</p>
          <ul className="rv-list">
            {r.better.map((b, i) => (
              <li key={i}>
                <p className="en-serif muted">{b.original}</p>
                <p className="rv-better en-serif">
                  <span className="grow">{b.better}</span>
                  <Speak text={b.better} />
                </p>
                <p className="rv-why">{b.why}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.good.length > 0 && (
        <section className="rv-sec">
          <Head icon={<ThumbsUp size={19} />}>잘한 점</Head>
          <ul className="rv-good">
            {r.good.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </section>
      )}

      {r.focus.length > 0 && (
        <section className="rv-sec">
          <Head icon={<Target size={19} />}>오늘 기억할 것</Head>
          <ol className="rv-focus">
            {r.focus.map((f, i) => (
              <li key={i}>
                <b>{f.title}</b>
                <span>{f.explain}</span>
                {f.example && <span className="en-serif rv-ex">{f.example}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="rv-sec">
        <Head icon={<Lightbulb size={19} />}>글 전체</Head>
        <div className="seg">
          <button type="button" className={whole === 'corrected' ? 'on' : ''} onClick={() => setWhole('corrected')}>
            고친 글
          </button>
          <button type="button" className={whole === 'natural' ? 'on' : ''} onClick={() => setWhole('natural')}>
            자연스러운 글
          </button>
          <button type="button" className={whole === 'mine' ? 'on' : ''} onClick={() => setWhole('mine')}>
            내가 쓴 글
          </button>
        </div>
        <div className="rv-whole">
          <p className="en-serif">{wholeText}</p>
          {whole !== 'mine' && (
            <div className="row-gap">
              <Speak text={wholeText} showLabel label="전체 듣기" />
              <Speak text={wholeText} slow showLabel />
            </div>
          )}
        </div>
        {!teacher && whole !== 'mine' && <p className="small muted">듣고 세 번 소리 내어 읽어 보세요. 프리토킹 때 그대로 말할 수 있게요.</p>}
      </section>

      {r.talk.length > 0 && (
        <section className="rv-sec rv-talk">
          <Head icon={<MessagesSquare size={19} />}>프리토킹 준비</Head>
          <p className="small muted">
            {teacher ? '이 글로 이야기할 질문이에요. 쉬운 것부터.' : '선생님이 이런 걸 물어볼 수 있어요. 대답을 입으로 먼저 연습해 봐요.'}
          </p>
          <ol className="rv-qs">
            {r.talk.map((q, i) => (
              <li key={i}>
                <p className="rv-q en-serif">
                  <span className="grow">{q.en}</span>
                  <Speak text={q.en} />
                </p>
                <p className="small">{q.ko}</p>
                {q.hint && (
                  <p className="rv-hint">
                    <span>이렇게 시작</span> <span className="en-serif">{q.hint}</span>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
