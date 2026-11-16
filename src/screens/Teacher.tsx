import { RefreshCw, TriangleAlert, CircleCheck, Users } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Token } from '@astryxdesign/core/Token'
import { Banner } from '@astryxdesign/core/Banner'
import { List, ListItem } from '@astryxdesign/core/List'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Table, proportional } from '@astryxdesign/core/Table'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Center } from '@astryxdesign/core/Center'
import { Spinner } from '@astryxdesign/core/Spinner'
import { useClass, type StudentView } from '../lib/teacher.ts'
import { CALENDAR_DAYS, RULES, type LessonRow, type Report, type Status } from '../lib/analytics.ts'
import { formatDate, today } from '../lib/date.ts'
import { href } from '../lib/router.ts'
import { AppBar, PageTitle, Screen } from '../components/Screen.tsx'
import { type as t } from '../ui/styles.ts'

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
const weekday = (day: string) => WEEKDAY[new Date(`${day}T12:00:00`).getDay()]

function ago(day?: string): string {
  if (!day) return '없음'
  const n = Math.round((Date.parse(today()) - Date.parse(day)) / 86400e3)
  return n === 0 ? '오늘' : n === 1 ? '어제' : `${n}일 전`
}

const STATUS: Record<Status, { label: string; color: 'green' | 'orange' | 'gray' }> = {
  ok: { label: '제때 하는 중', color: 'green' },
  behind: { label: '밀림', color: 'orange' },
  new: { label: '시작 전', color: 'gray' },
}

function StatusToken({ status }: { status: Status }) {
  return <Token color={STATUS[status].color} label={STATUS[status].label} />
}

function Refresh({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return <IconButton label="새로고침" variant="ghost" size="lg" isLoading={busy} onClick={onClick} icon={<Icon icon={RefreshCw} />} />
}

function Rules() {
  return (
    <VStack gap={1}>
      <Text type="label" color="secondary">
        "제때" 기준
      </Text>
      {RULES.map((r) => (
        <Text key={r} type="supporting">
          · {r}
        </Text>
      ))}
      <Text type="supporting">학생이 앱을 열 때 기록이 서버에 올라와요. 휴대폰이 오프라인이면 늦게 보일 수 있어요.</Text>
    </VStack>
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
  const busy = c.state === 'loading'
  return (
    <Screen nav>
      <VStack gap={6}>
        <PageTitle right={<Refresh busy={busy} onClick={c.reload} />}>학생 현황</PageTitle>
        {c.state === 'error' && <Banner status="error" icon={<Icon icon={TriangleAlert} />} title="기록을 못 불러왔어요" description={c.error} />}
        {c.state === 'loading' && (
          <Center paddingBlock={8}>
            <Spinner size="lg" />
          </Center>
        )}
        {c.state === 'ready' &&
          (c.students.length ? (
            <VStack gap={3}>
              <Text type="supporting">
                학생 {c.students.length}명 · 밀림 {c.students.filter((s) => s.report.status === 'behind').length}명 ·{' '}
                {new Date(c.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
              </Text>
              <List edge="outset" hasDividers>
                {c.students.map((s) => (
                  <ListItem
                    key={s.raw.id}
                    href={href('t', s.raw.id)}
                    align="first-line"
                    label={
                      <Text type="body" weight="semibold" maxLines={1}>
                        {s.raw.email}
                      </Text>
                    }
                    description={
                      <Text type="supporting" xstyle={t.keepAll}>
                        {summary(s.report)}
                      </Text>
                    }
                    endContent={<StatusToken status={s.report.status} />}
                  />
                ))}
              </List>
            </VStack>
          ) : (
            <EmptyState icon={<Icon icon={Users} />} title="아직 학생이 없어요" description="학생이 회원가입하면 여기에 나와요." />
          ))}
        <Rules />
      </VStack>
    </Screen>
  )
}

/** 학생 한 명 자세히 */
export function StudentPage({ id }: { id: string }) {
  const c = useClass()
  const s = c.state === 'ready' ? c.students.find((x) => x.raw.id === id) : undefined
  return (
    <Screen header={<AppBar back={href()} title={s?.raw.email ?? '학생'} right={<Refresh busy={c.state === 'loading'} onClick={c.reload} />} />}>
      {c.state === 'error' ? (
        <Banner status="error" icon={<Icon icon={TriangleAlert} />} title="기록을 못 불러왔어요" description={c.error} />
      ) : !s ? (
        c.state === 'ready' ? (
          <EmptyState title="학생을 찾을 수 없어요" description="목록으로 돌아가 다시 골라 주세요." />
        ) : (
          <Center paddingBlock={8}>
            <Spinner size="lg" />
          </Center>
        )
      ) : (
        <Student s={s} />
      )}
    </Screen>
  )
}

function Student({ s }: { s: StudentView }) {
  const r = s.report
  return (
    <VStack gap={8}>
      <VStack gap={3}>
        <HStack gap={2} vAlign="center">
          <StatusToken status={r.status} />
          <Text type="supporting">
            가입 {formatDate(s.raw.createdAt.slice(0, 10))} · 마지막 동기화 {s.raw.progressAt ? ago(today(new Date(s.raw.progressAt))) : '없음'}
          </Text>
        </HStack>
        {r.status === 'behind' ? (
          <Banner status="warning" icon={<Icon icon={TriangleAlert} />} title={`밀린 것 ${r.issues.length}개`} collapsible={false}>
            <VStack gap={1}>
              {r.issues.map((x) => (
                <Text key={x} type="body" xstyle={t.keepAll}>
                  · {x}
                </Text>
              ))}
            </VStack>
          </Banner>
        ) : r.status === 'ok' ? (
          <Banner status="success" icon={<Icon icon={CircleCheck} />} title="모두 제때 하고 있어요" />
        ) : (
          <Banner status="info" title="아직 앱에서 공부한 기록이 없어요" description="첫 레슨이나 단어 테스트를 하면 여기에 나와요." />
        )}
      </VStack>

      <MetadataList columns={2} label={{ position: 'top' }}>
        <MetadataListItem label="마지막 공부">
          <Heading level={3}>{ago(r.lastStudied)}</Heading>
        </MetadataListItem>
        <MetadataListItem label="연속 · 최근 7일">
          <Heading level={3}>
            {r.streak}일 · {r.studied7}/7일
          </Heading>
        </MetadataListItem>
        <MetadataListItem label="레슨 완료">
          <Heading level={3}>
            {r.lessonsDone}/{r.lessons.length}
            {r.lessonsOverdue ? ` (밀림 ${r.lessonsOverdue})` : ''}
          </Heading>
        </MetadataListItem>
        <MetadataListItem label="복습할 단어 (지남)">
          <Heading level={3}>
            {r.review.due} ({r.review.overdue})
          </Heading>
        </MetadataListItem>
        <MetadataListItem label="단어 테스트 7일 평균">
          <Heading level={3}>{r.tests.avg7 === undefined ? '없음' : `${r.tests.avg7}% · ${r.tests.count7}번`}</Heading>
        </MetadataListItem>
        <MetadataListItem label="내 단어 (7일)">
          <Heading level={3}>
            {r.wordsTotal} (+{r.words7})
          </Heading>
        </MetadataListItem>
      </MetadataList>

      <Days r={r} />
      <Lessons rows={r.lessons} />
      <Tests r={r} />
      {r.notesNew.length > 0 && <Notes r={r} />}
      <Rules />
    </VStack>
  )
}

interface DayCells extends Record<string, unknown> {
  day: string
  label: string
  studied: string
  test: string
  words: string
}

function Days({ r }: { r: Report }) {
  const rows: DayCells[] = r.calendar.map((d) => ({
    day: d.day,
    label: `${formatDate(d.day)} ${weekday(d.day)}`,
    studied: d.studied ? `✓ ${d.studied}번` : '—',
    test: d.test ? `${d.test.score}/${d.test.total}` : '—',
    words: d.words ? `${d.words}개` : '—',
  }))
  return (
    <VStack gap={2} as="section">
      <Heading level={2}>최근 {CALENDAR_DAYS}일</Heading>
      <Table<DayCells>
        data={rows}
        idKey="day"
        density="compact"
        columns={[
          // 휴대폰 폭(약 358px)에 네 칸이 다 들어가게 최소 폭을 줄임 (기본 120px)
          { key: 'label', header: '날짜', width: proportional(3, { minWidth: 92 }) },
          { key: 'studied', header: '공부', width: proportional(2, { minWidth: 64 }) },
          { key: 'test', header: '테스트', width: proportional(2, { minWidth: 64 }), align: 'end' },
          { key: 'words', header: '새 단어', width: proportional(2, { minWidth: 64 }), align: 'end' },
        ]}
      />
    </VStack>
  )
}

function Lessons({ rows }: { rows: LessonRow[] }) {
  const chapters = [...new Map(rows.map((x) => [x.chapter.id, x.chapter])).values()]
  return (
    <VStack gap={4} as="section">
      <Heading level={2}>레슨</Heading>
      {chapters.map((ch) => (
        <List
          key={ch.id}
          edge="outset"
          hasDividers
          density="compact"
          header={
            <VStack gap={0}>
              <Text type="supporting">
                {formatDate(ch.date)} 수업 · {formatDate(rows.find((x) => x.chapter.id === ch.id)!.dueBy)}까지
              </Text>
              <Text type="label" xstyle={t.keepAll}>
                {ch.title}
              </Text>
            </VStack>
          }
        >
          {rows
            .filter((x) => x.chapter.id === ch.id)
            .map((x) => (
              <ListItem
                key={x.lesson.id}
                label={
                  <Text type="body" weight="medium" xstyle={t.keepAll}>
                    {x.lesson.title}
                  </Text>
                }
                description={
                  <Text type="supporting">
                    {x.stages.map((st) => `${st.done ? '✓' : '·'} ${st.title.split(' ')[0]}`).join('  ')}
                    {x.quiz ? `  · 퀴즈 최고 ${x.quiz.best}/${x.quiz.total}` : ''}
                  </Text>
                }
                endContent={
                  x.done === x.total ? (
                    <Token size="sm" color="green" label="완료" />
                  ) : x.overdue ? (
                    <Token size="sm" color="orange" label={`밀림 ${x.done}/${x.total}`} />
                  ) : (
                    <Token size="sm" color="gray" label={`${x.done}/${x.total}`} />
                  )
                }
              />
            ))}
        </List>
      ))}
    </VStack>
  )
}

function Tests({ r }: { r: Report }) {
  return (
    <VStack gap={4} as="section">
      <Heading level={2}>단어 테스트</Heading>
      {r.tests.recent.length ? (
        <List edge="outset" hasDividers density="compact" header={<Text type="label" color="secondary">최근 {r.tests.recent.length}번</Text>}>
          {r.tests.recent.map((x) => {
            const wrong = x.items.filter((i) => !i.ok)
            return (
              <ListItem
                key={x.finished_at}
                label={`${formatDate(x.day)} ${weekday(x.day)}`}
                description={wrong.length ? `틀림: ${wrong.map((i) => i.en).join(', ')}` : '만점'}
                endContent={
                  <Text type="label" hasTabularNumbers>
                    {x.score}/{x.total}
                  </Text>
                }
              />
            )
          })}
        </List>
      ) : (
        <Text type="supporting">아직 본 테스트가 없어요.</Text>
      )}
      {r.missedOften.length > 0 && (
        <List edge="outset" hasDividers density="compact" header={<Text type="label" color="secondary">두 번 이상 틀린 단어 · {r.missedOften.length}</Text>}>
          {r.missedOften.map((m) => (
            <ListItem
              key={m.en}
              label={
                <Text type="body" weight="semibold" xstyle={t.en}>
                  {m.en}
                </Text>
              }
              description={m.ko}
              endContent={<Text type="label" color="secondary">{m.n}번</Text>}
            />
          ))}
        </List>
      )}
    </VStack>
  )
}

function Notes({ r }: { r: Report }) {
  return (
    <VStack gap={2} as="section">
      <Heading level={2}>답 안 한 메모 · {r.notesNew.length}</Heading>
      <List edge="outset" hasDividers density="compact">
        {r.notesNew.map((n) => (
          <ListItem
            key={n.id}
            label={
              <HStack gap={2} vAlign="center">
                <Token size="sm" color={n.kind === 'confusing' ? 'orange' : 'blue'} label={n.kind === 'confusing' ? '헷갈림' : '중요'} />
                <Text type="label" maxLines={1}>
                  {n.lesson_title}
                </Text>
              </HStack>
            }
            description={
              <Text type="supporting" xstyle={t.keepAll}>
                {n.question ?? n.point}
              </Text>
            }
          />
        ))}
      </List>
      <Text type="supporting">답하기: Claude Code 에서 "학생 메모 처리해 줘" (npm run teacher -- notes)</Text>
    </VStack>
  )
}
