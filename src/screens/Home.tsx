import { useMemo } from 'react'
import { ArrowRight, Check, Star } from 'lucide-react'
import { TOTAL_TARGET } from '../lib/wordtest.ts'
import { useChapters, type ShownChapter } from '../lib/content.ts'
import { lessonKey, useStore, type Progress } from '../lib/store.ts'
import { addDays, formatDate, streak, today } from '../lib/date.ts'
import { href } from '../lib/router.ts'
import { lessonWords } from '../lib/words.ts'
import { stars } from '../lib/game.ts'
import { stageList } from './Lesson.tsx'
import { LogoMark } from '../components/Logo.tsx'

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function lessonStages(progress: Progress, chapterId: string, lesson: ShownChapter['lessons'][number]) {
  const started = lessonWords(chapterId, lesson.id).filter((w) => progress.srs[w.key]).length
  return stageList(lesson, progress.lessons[lessonKey(chapterId, lesson.id)], started)
}

/** 다음에 할 레슨 단계 (최신 챕터부터, 레슨 순서대로) */
function nextUp(progress: Progress, chapters: ShownChapter[]) {
  for (const ch of chapters)
    for (const l of ch.lessons) {
      const next = lessonStages(progress, ch.id, l).find((s) => !s.done)
      if (next) return { ch, l, stage: next }
    }
  return null
}

/** 최근 7일: 공부한 날에 도장 */
function Week({ days }: { days: Record<string, number> }) {
  const t = today()
  const list = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6))
  return (
    <div className="week" aria-label="최근 7일 공부 기록">
      {list.map((d) => {
        const [y, m, dd] = d.split('-').map(Number)
        const wd = new Date(y, m - 1, dd).getDay()
        return (
          <span key={d} className={`day ${days[d] ? 'on' : ''} ${d === t ? 'today' : ''}`}>
            <span className="day-w">{WEEKDAY[wd]}</span>
            <span className="day-dot">{days[d] ? <Check size={14} strokeWidth={3.2} /> : dd}</span>
          </span>
        )
      })}
    </div>
  )
}

export function Home({ due }: { due: number }) {
  const progress = useStore((s) => s.progress)
  const days = streak(progress.days)
  const studiedToday = !!progress.days[today()]
  const chapters = useChapters()
  const up = useMemo(() => nextUp(progress, chapters), [progress, chapters])
  const tests = useStore((s) => s.tests)
  const testToday = useMemo(
    () => Object.values(tests).filter((t) => t.day === today()).sort((a, b) => b.finishedAt - a.finishedAt)[0],
    [tests],
  )

  return (
    <div className="page home">
      <header className="home-head">
        <div className="home-brand">
          <LogoMark />
          <div>
            <p className="eyebrow">
              {formatDate(today())} {WEEKDAY[new Date().getDay()]}요일
            </p>
            <h1 className="wordmark-text">
              M<span>-</span>TOEIC
            </h1>
          </div>
        </div>
        <p className="streak-line">
          {days > 0 ? (
            <>
              <b>{days}일</b> 연속 공부 중{studiedToday ? '' : ' · 오늘도 이어 가요'}
            </>
          ) : (
            '오늘 첫 도장을 찍어 봐요'
          )}
        </p>
        <Week days={progress.days} />
      </header>

      <section className="todo">
        <h2 className="todo-title">오늘 할 일</h2>
        <a className={`todo-item ${testToday ? 'done' : ''}`} href={href('test')}>
          <span className="todo-box">{testToday && <Check size={16} strokeWidth={3.2} />}</span>
          <span className="todo-text">
            <span>
              {testToday ? (
                <>
                  단어 테스트 <b>{testToday.score}/{testToday.total}</b>
                </>
              ) : (
                <>
                  단어 테스트 <b>{TOTAL_TARGET}문제</b>
                </>
              )}
            </span>
            <span className="todo-sub">{testToday ? '틀린 단어는 다음 테스트에 다시 나와요' : '오늘 외운 단어 + 이전 단어 복습'}</span>
          </span>
          {!testToday && <ArrowRight className="todo-go" size={20} />}
        </a>
        <a className={`todo-item ${due ? '' : 'done'}`} href={href('review')}>
          <span className="todo-box">{!due && <Check size={16} strokeWidth={3.2} />}</span>
          <span className="todo-text">
            <span>
              {due ? (
                <>
                  단어 복습 <b>{due}개</b>
                </>
              ) : (
                '단어 복습 끝'
              )}
            </span>
            <span className="todo-sub">{due ? '잊기 직전에 다시 보기' : '내일 또 만나요'}</span>
          </span>
          {due > 0 && <ArrowRight className="todo-go" size={20} />}
        </a>
        {up ? (
          <a className="todo-item" href={href('l', up.ch.id, up.l.id, up.stage.id)}>
            <span className="todo-box" />
            <span className="todo-text">
              <span>
                {up.l.title} · <b>{up.stage.title}</b>
              </span>
              <span className="todo-sub">{up.stage.desc}</span>
            </span>
            <ArrowRight className="todo-go" size={20} />
          </a>
        ) : (
          <div className="todo-item done">
            <span className="todo-box">
              <Check size={16} strokeWidth={3.2} />
            </span>
            <span className="todo-text">
              모든 레슨 완료
              <span className="todo-sub">다음 수업 뒤에 새 챕터가 생겨요</span>
            </span>
          </div>
        )}
      </section>

      {chapters.map((ch, ci) => {
        const done = ch.lessons.filter((l) => progress.lessons[lessonKey(ch.id, l.id)]?.quizTotal).length
        return (
          <section key={ch.id} className="chapter">
            <div className="chapter-head">
              <p className="chapter-date">
                {formatDate(ch.date)} {ch.personal && !ch.modified ? '맞춤' : '수업'}
                {ci === 0 && <span className="new-tag">NEW</span>}
                {ch.personal && <span className="mine-tag">{ch.modified ? '맞춤 수정' : '나만의 챕터'}</span>}
              </p>
              <h2>{ch.title}</h2>
              {ch.subtitle && <p className="sub">{ch.subtitle}</p>}
              <p className="reason">
                <span>{ch.personal && !ch.modified ? '내 메모에서' : '선생님 메모'}</span> {ch.reason}
              </p>
              <p className="chapter-count">
                레슨 {done}/{ch.lessons.length} 완료
              </p>
            </div>
            <ol className="lesson-list">
              {ch.lessons.map((l, i) => {
                const st = lessonStages(progress, ch.id, l)
                const lp = progress.lessons[lessonKey(ch.id, l.id)]
                const all = st.every((s) => s.done)
                const isUp = up?.l === l
                return (
                  <li key={l.id}>
                    <a className={`lesson-row ${all ? 'all' : ''} ${isUp ? 'up' : ''}`} href={href('l', ch.id, l.id)}>
                      <span className="lesson-num">{all ? <Check size={18} strokeWidth={3} /> : i + 1}</span>
                      <span className="lesson-text">
                        <b>{l.title}</b>
                        <span>{l.summary}</span>
                        <span className="pips" aria-label={`${st.filter((s) => s.done).length}/${st.length} 단계`}>
                          {st.map((s) => (
                            <i key={s.id} className={s.done ? 'on' : ''} />
                          ))}
                        </span>
                      </span>
                      {lp?.quizTotal ? (
                        <span className="mini-stars">
                          {[0, 1, 2].map((k) => (
                            <Star key={k} size={13} className={k < stars(lp.quizBest ?? 0, lp.quizTotal!) ? 'on' : ''} />
                          ))}
                        </span>
                      ) : null}
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
