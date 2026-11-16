import { ChevronRight, CircleCheck, RefreshCw, TriangleAlert, Users } from 'lucide-react'
import { useClass, type StudentView } from '../lib/teacher.ts'
import { CALENDAR_DAYS, RULES, type LessonRow, type Report, type Status } from '../lib/analytics.ts'
import { formatDate, today } from '../lib/date.ts'
import { href } from '../lib/router.ts'
import { TopBar } from '../components/TopBar.tsx'

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
const weekday = (day: string) => WEEKDAY[new Date(`${day}T12:00:00`).getDay()]

function ago(day?: string): string {
  if (!day) return '없음'
  const n = Math.round((Date.parse(today()) - Date.parse(day)) / 86400e3)
  return n === 0 ? '오늘' : n === 1 ? '어제' : `${n}일 전`
}

const STATUS: Record<Status, string> = { ok: '제때 하는 중', behind: '밀림', new: '시작 전' }

function Pill({ tone, children }: { tone: 'ok' | 'behind' | 'new' | 'blue'; children: React.ReactNode }) {
  return <span className={`t-pill ${tone}`}>{children}</span>
}

function Refresh({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`icon-btn t-refresh ${busy ? 'spin' : ''}`} onClick={onClick} disabled={busy} aria-label="새로고침">
      <RefreshCw size={22} />
    </button>
  )
}

function Rules() {
  return (
    <section className="group">
      <p className="section-label">"제때" 기준</p>
      <ul className="t-rules small muted">
        {RULES.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="group-foot">학생이 앱을 열 때 기록이 서버에 올라와요. 휴대폰이 오프라인이면 늦게 보일 수 있어요.</p>
    </section>
  )
}

function ErrorBox({ error }: { error: string }) {
  return (
    <div className="warn small">
      <TriangleAlert size={16} />
      <div>
        <b>기록을 못 불러왔어요</b>
        <br />
        {error}
      </div>
    </div>
  )
}

/** 학생 목록 한 줄 요약 */
function summary(r: Report): string {
  if (r.status === 'new') return '아직 기록이 없어요'
  if (r.issues.length) return r.issues.join(' · ')
  return `마지막 공부 ${ago(r.lastStudied)} · 연속 ${r.streak}일 · 레슨 ${r.lessonsDone}/${r.lessons.length}`
}

/** 선생님 홈: 학생 목록 (밀린 학생 먼저) */
export function TeacherHome() {
  const c = useClass()
  return (
    <div className="page">
      <TopBar title="학생 현황" right={<Refresh busy={c.state === 'loading'} onClick={c.reload} />} />
      {c.state === 'error' && <ErrorBox error={c.error} />}
      {c.state === 'loading' && <p className="empty">불러오는 중…</p>}
      {c.state === 'ready' &&
        (c.students.length ? (
          <section className="group">
            <p className="section-label">
              학생 {c.students.length}명 · 밀림 {c.students.filter((s) => s.report.status === 'behind').length}명 ·{' '}
              {new Date(c.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
            </p>
            <div className="group-card">
              {c.students.map((s) => (
                <a key={s.raw.id} className="row t-student" href={href('t', s.raw.id)}>
                  <span className="row-text">
                    <b className="t-email">{s.raw.email}</b>
                    <span className="sub">{summary(s.report)}</span>
                  </span>
                  <Pill tone={s.report.status}>{STATUS[s.report.status]}</Pill>
                  <ChevronRight size={18} className="muted" />
                </a>
              ))}
            </div>
          </section>
        ) : (
          <div className="empty">
            <Users size={32} />
            <p>
              아직 학생이 없어요.
              <br />
              학생이 회원가입하면 여기에 나와요.
            </p>
          </div>
        ))}
      <Rules />
    </div>
  )
}

/** 학생 한 명 자세히 */
export function StudentPage({ id }: { id: string }) {
  const c = useClass()
  const s = c.state === 'ready' ? c.students.find((x) => x.raw.id === id) : undefined
  return (
    <div className="page">
      <TopBar back={href()} title={s?.raw.email ?? '학생'} right={<Refresh busy={c.state === 'loading'} onClick={c.reload} />} />
      {c.state === 'error' ? (
        <ErrorBox error={c.error} />
      ) : !s ? (
        <p className="empty">{c.state === 'ready' ? '학생을 찾을 수 없어요. 목록으로 돌아가 다시 골라 주세요.' : '불러오는 중…'}</p>
      ) : (
        <Student s={s} />
      )}
    </div>
  )
}

function Student({ s }: { s: StudentView }) {
  const r = s.report
  return (
    <>
      <p className="t-meta small muted">
        <Pill tone={r.status}>{STATUS[r.status]}</Pill>
        가입 {formatDate(s.raw.createdAt.slice(0, 10))} · 마지막 동기화 {s.raw.progressAt ? ago(today(new Date(s.raw.progressAt))) : '없음'}
      </p>
      {r.status === 'behind' ? (
        <div className="t-alert behind">
          <p className="t-alert-title">
            <TriangleAlert size={18} /> 밀린 것 {r.issues.length}개
          </p>
          <ul>
            {r.issues.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : r.status === 'ok' ? (
        <div className="t-alert ok">
          <p className="t-alert-title">
            <CircleCheck size={18} /> 모두 제때 하고 있어요
          </p>
        </div>
      ) : (
        <div className="t-alert">
          <p className="t-alert-title">아직 앱에서 공부한 기록이 없어요</p>
          <p className="small">첫 레슨이나 단어 테스트를 하면 여기에 나와요.</p>
        </div>
      )}

      <dl className="t-stats">
        <div>
          <dt>마지막 공부</dt>
          <dd>{ago(r.lastStudied)}</dd>
        </div>
        <div>
          <dt>연속 · 최근 7일</dt>
          <dd>
            {r.streak}일 · {r.studied7}/7일
          </dd>
        </div>
        <div>
          <dt>레슨 완료</dt>
          <dd>
            {r.lessonsDone}/{r.lessons.length}
            {r.lessonsOverdue ? <small> (밀림 {r.lessonsOverdue})</small> : null}
          </dd>
        </div>
        <div>
          <dt>복습할 단어 (지남)</dt>
          <dd>
            {r.review.due} <small>({r.review.overdue})</small>
          </dd>
        </div>
        <div>
          <dt>단어 테스트 7일 평균</dt>
          <dd>{r.tests.avg7 === undefined ? '없음' : `${r.tests.avg7}% · ${r.tests.count7}번`}</dd>
        </div>
        <div>
          <dt>내 단어 (7일)</dt>
          <dd>
            {r.wordsTotal} <small>(+{r.words7})</small>
          </dd>
        </div>
      </dl>

      <Days r={r} />
      <Lessons rows={r.lessons} />
      <Tests r={r} />
      {r.notesNew.length > 0 && <Notes r={r} />}
      <Rules />
    </>
  )
}

function Days({ r }: { r: Report }) {
  return (
    <section className="group">
      <p className="section-label">최근 {CALENDAR_DAYS}일</p>
      <div className="group-card">
        <table className="t-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>공부</th>
              <th className="num">테스트</th>
              <th className="num">새 단어</th>
            </tr>
          </thead>
          <tbody>
            {r.calendar.map((d) => (
              <tr key={d.day} className={d.studied ? 'on' : ''}>
                <td>
                  {formatDate(d.day)} {weekday(d.day)}
                </td>
                <td>{d.studied ? `✓ ${d.studied}번` : '—'}</td>
                <td className="num">{d.test ? `${d.test.score}/${d.test.total}` : '—'}</td>
                <td className="num">{d.words ? `${d.words}개` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Lessons({ rows }: { rows: LessonRow[] }) {
  const chapters = [...new Map(rows.map((x) => [x.chapter.id, x.chapter])).values()]
  return (
    <>
      {chapters.map((ch) => (
        <section key={ch.id} className="group">
          <p className="section-label">
            레슨 · {formatDate(ch.date)} 수업 · {formatDate(rows.find((x) => x.chapter.id === ch.id)!.dueBy)}까지
          </p>
          <div className="group-card">
            <div className="row t-chapter">
              <b>{ch.title}</b>
            </div>
            {rows
              .filter((x) => x.chapter.id === ch.id)
              .map((x) => (
                <div key={x.lesson.id} className="row">
                  <span className="row-text">
                    {x.lesson.title}
                    <span className="sub">
                      {x.stages.map((st) => `${st.done ? '✓' : '·'} ${st.title.split(' ')[0]}`).join('  ')}
                      {x.quiz ? `  · 퀴즈 최고 ${x.quiz.best}/${x.quiz.total}` : ''}
                    </span>
                  </span>
                  {x.done === x.total ? (
                    <Pill tone="ok">완료</Pill>
                  ) : x.overdue ? (
                    <Pill tone="behind">
                      밀림 {x.done}/{x.total}
                    </Pill>
                  ) : (
                    <Pill tone="new">
                      {x.done}/{x.total}
                    </Pill>
                  )}
                </div>
              ))}
          </div>
        </section>
      ))}
    </>
  )
}

function Tests({ r }: { r: Report }) {
  return (
    <>
      <section className="group">
        <p className="section-label">단어 테스트{r.tests.recent.length ? ` · 최근 ${r.tests.recent.length}번` : ''}</p>
        {r.tests.recent.length ? (
          <div className="group-card">
            {r.tests.recent.map((x) => {
              const wrong = x.items.filter((i) => !i.ok)
              return (
                <div key={x.finished_at} className="row">
                  <span className="row-text">
                    {formatDate(x.day)} {weekday(x.day)}
                    <span className="sub">{wrong.length ? `틀림: ${wrong.map((i) => i.en).join(', ')}` : '만점'}</span>
                  </span>
                  <b className={`t-score ${x.score === x.total ? 'good' : ''}`}>
                    {x.score}/{x.total}
                  </b>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="small muted pad-x">아직 본 테스트가 없어요.</p>
        )}
      </section>
      {r.missedOften.length > 0 && (
        <section className="group">
          <p className="section-label">두 번 이상 틀린 단어 · {r.missedOften.length}</p>
          <div className="group-card">
            {r.missedOften.map((m) => (
              <div key={m.en} className="row">
                <span className="row-text">
                  <b className="en-serif">{m.en}</b>
                  <span className="sub">{m.ko}</span>
                </span>
                <span className="muted small">{m.n}번</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function Notes({ r }: { r: Report }) {
  return (
    <section className="group">
      <p className="section-label">답 안 한 메모 · {r.notesNew.length}</p>
      <div className="group-card">
        {r.notesNew.map((n) => (
          <div key={n.id} className="row">
            <span className="row-text">
              <span className="t-note-head">
                <Pill tone={n.kind === 'confusing' ? 'behind' : 'blue'}>{n.kind === 'confusing' ? '헷갈림' : '중요'}</Pill>
                <b>{n.lesson_title}</b>
              </span>
              <span className="sub">{n.question ?? n.point}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="group-foot">답하기: Claude Code 에서 "학생 메모 처리해 줘" (npm run teacher -- notes)</p>
    </section>
  )
}
