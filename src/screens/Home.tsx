import { CHAPTERS } from '../lib/content.ts'
import { lessonKey, useStore } from '../lib/store.ts'
import { formatDate, streak, today } from '../lib/date.ts'
import { href } from '../lib/router.ts'
import type { LessonProgress } from '../lib/store.ts'

function status(lp: LessonProgress | undefined): { text: string; cls: string } {
  if (lp?.quizTotal) {
    const perfect = lp.quizBest === lp.quizTotal
    return { text: `${perfect ? '🏆' : '★'} ${lp.quizBest}/${lp.quizTotal}`, cls: perfect ? 'perfect' : 'done' }
  }
  if (lp?.read || lp?.sentences || lp?.cards) return { text: '공부 중', cls: 'doing' }
  return { text: 'NEW', cls: 'new' }
}

export function Home({ due }: { due: number }) {
  const progress = useStore((s) => s.progress)
  const days = streak(progress.days)
  const studiedToday = !!progress.days[today()]

  return (
    <div className="page">
      <header className="home-head">
        <div>
          <p className="muted small">{formatDate(today())}</p>
          <h1 className="logo">
            M-TOEIC<span className="logo-dot">.</span>
          </h1>
        </div>
        <div className={`streak ${studiedToday ? 'lit' : ''}`} title="연속 공부한 날">
          🔥 <b>{days}</b>일
        </div>
      </header>

      <a className={`card review-cta ${due ? '' : 'calm'}`} href={href('review')}>
        {due ? (
          <>
            <span className="cta-big">🔁 오늘 복습할 단어 {due}개</span>
            <span className="muted small">잊어버리기 직전에 복습하면 오래 기억해요 →</span>
          </>
        ) : (
          <>
            <span className="cta-big">✨ 오늘 복습 끝!</span>
            <span className="muted small">레슨 단어를 카드로 외우면 복습 목록에 들어가요</span>
          </>
        )}
      </a>

      {CHAPTERS.map((ch, ci) => {
        const done = ch.lessons.filter((l) => progress.lessons[lessonKey(ch.id, l.id)]?.quizTotal).length
        return (
          <section key={ch.id} className="chapter">
            <div className="chapter-head">
              <p className="chapter-date">
                {ci === 0 && <span className="pill">최신</span>} {formatDate(ch.date)} 수업
              </p>
              <h2>{ch.title}</h2>
              {ch.subtitle && <p className="muted">{ch.subtitle}</p>}
              <p className="reason">📝 {ch.reason}</p>
              <div className="chapter-progress">
                <div className="progress-bar thin">
                  <div style={{ width: `${(done / ch.lessons.length) * 100}%` }} />
                </div>
                <span className="small muted">
                  {done}/{ch.lessons.length}
                </span>
              </div>
            </div>
            <ol className="lesson-list">
              {ch.lessons.map((l) => {
                const st = status(progress.lessons[lessonKey(ch.id, l.id)])
                return (
                  <li key={l.id}>
                    <a className="lesson-row" href={href('l', ch.id, l.id)}>
                      <span className="lesson-emoji">{l.emoji}</span>
                      <span className="lesson-text">
                        <b>{l.title}</b>
                        <span className="muted small">{l.summary}</span>
                      </span>
                      <span className={`status ${st.cls}`}>{st.text}</span>
                    </a>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
