import { useState, type ReactNode } from 'react'
import { Cloud, Download, HardDrive, Info, LogIn, LogOut, RefreshCw, RotateCcw, Smartphone, TriangleAlert } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { List, ListItem } from '@astryxdesign/core/List'
import { Icon } from '@astryxdesign/core/Icon'
import { Switch } from '@astryxdesign/core/Switch'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Banner } from '@astryxdesign/core/Banner'
import { FileInput } from '@astryxdesign/core/FileInput'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { useImperativeAlertDialog } from '@astryxdesign/core/AlertDialog'
import { getState, resetProgress, setSettings, setState, useStore, type State } from '../lib/store.ts'
import { mergeProgress, mergeWords } from '../lib/merge.ts'
import { supabase } from '../lib/supabase.ts'
import { syncNow, useSyncStatus } from '../lib/sync.ts'
import { speak, ttsSupported } from '../lib/tts.ts'
import { useChapters } from '../lib/content.ts'
import { today } from '../lib/date.ts'
import { PageTitle, Screen } from '../components/Screen.tsx'

/** 설정 한 묶음: 제목 + 줄들 + 아래 설명 */
function Group({ title, foot, children }: { title: string; foot?: string; children: ReactNode }) {
  return (
    <VStack gap={2} as="section">
      <Heading level={3} color="secondary">
        {title}
      </Heading>
      {children}
      {foot && <Text type="supporting">{foot}</Text>}
    </VStack>
  )
}

const RATES = [
  { r: 0.7, l: '느리게' },
  { r: 0.9, l: '보통' },
  { r: 1.05, l: '빠르게' },
]

export function Settings({ session }: { session: Session | null }) {
  const settings = useStore((s) => s.settings)
  const sync = useSyncStatus()
  const confirm = useImperativeAlertDialog()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function exportData() {
    const s = getState()
    const blob = new Blob([JSON.stringify({ app: 'm-toeic', version: 1, progress: s.progress, words: s.words }, null, 1)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `m-toeic-backup-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importData(file: File) {
    try {
      const data = JSON.parse(await file.text()) as Partial<State> & { app?: string }
      if (data.app !== 'm-toeic') throw new Error('M-TOEIC 백업 파일이 아니에요')
      setState((s) => ({
        ...s,
        progress: mergeProgress(s.progress, data.progress),
        words: mergeWords(s.words, data.words ?? {}),
      }))
      setMsg({ ok: true, text: '백업을 합쳤어요' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : '불러오기 실패' })
    }
  }

  const chapters = useChapters()
  const lessons = chapters.reduce((n, c) => n + c.lessons.length, 0)
  const syncText =
    sync.state === 'syncing'
      ? '저장 중…'
      : sync.state === 'error'
        ? (sync.error ?? '저장 실패')
        : sync.lastSync
          ? `마지막 저장 ${new Date(sync.lastSync).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
          : '자동 저장 켜짐'

  return (
    <Screen nav>
      <VStack gap={8}>
        <PageTitle>설정</PageTitle>

        <Group title="저장">
          <List edge="outset" hasDividers>
            {!supabase || !session ? (
              <>
                <ListItem startContent={<Icon icon={HardDrive} />} label="이 기기에만 저장 중" description="브라우저 데이터를 지우면 사라지니 가끔 백업하세요" />
                {supabase && (
                  <ListItem
                    onClick={() => setSettings({ skipLogin: false })}
                    startContent={<Icon icon={LogIn} color="accent" />}
                    label="로그인하고 서버에 저장"
                    description="지금까지 기록은 그대로 합쳐져요"
                  />
                )}
              </>
            ) : (
              <>
                <ListItem
                  startContent={<Icon icon={Cloud} />}
                  label={session.user.email ?? '로그인됨'}
                  description={
                    <HStack gap={1} vAlign="center">
                      <StatusDot
                        variant={sync.state === 'error' ? 'error' : sync.state === 'syncing' ? 'accent' : 'success'}
                        label={syncText}
                        isPulsing={sync.state === 'syncing'}
                      />
                      <Text type="supporting">{syncText}</Text>
                    </HStack>
                  }
                />
                <ListItem
                  onClick={() => void syncNow()}
                  isDisabled={sync.state === 'syncing'}
                  startContent={<Icon icon={RefreshCw} color="success" />}
                  label="지금 저장"
                />
                <ListItem
                  onClick={() =>
                    confirm.show({
                      title: '로그아웃할까요?',
                      description: '이 휴대폰의 기록은 서버에 저장한 뒤 로그아웃해요.',
                      actionLabel: '로그아웃',
                      onAction: async () => {
                        await syncNow()
                        await supabase!.auth.signOut()
                        setSettings({ skipLogin: false })
                        confirm.hide()
                      },
                    })
                  }
                  startContent={<Icon icon={LogOut} />}
                  label="로그아웃"
                />
              </>
            )}
          </List>
          {sync.kind === 'setup' && (
            <Banner
              status="warning"
              icon={<Icon icon={TriangleAlert} />}
              title="지금은 이 휴대폰에만 저장되고 있어요"
              description="공부 기록은 안전해요. 서버 준비가 끝나면 자동으로 올라가요."
            />
          )}
        </Group>

        {ttsSupported && (
          <Group title="발음" foot="소리가 안 나면 휴대폰 무음 모드를 꺼 보세요.">
            <SegmentedControl
              label="말하기 속도"
              layout="fill"
              value={String(settings.rate)}
              onChange={(v) => {
                const r = Number(v)
                setSettings({ rate: r })
                speak('The meeting has been postponed until Friday.', r)
              }}
            >
              {RATES.map((o) => (
                <SegmentedControlItem key={o.r} value={String(o.r)} label={o.l} />
              ))}
            </SegmentedControl>
            <Switch label="새 단어 나오면 자동 발음" labelPosition="start" labelSpacing="spread" value={settings.autoSpeak} onChange={(v) => setSettings({ autoSpeak: v })} />
          </Group>
        )}

        <Group title="게임">
          <Switch
            label="정답 · 오답 효과음"
            description='짧은 "띵" 소리와 진동'
            labelPosition="start" labelSpacing="spread"
            value={settings.sfx}
            onChange={(v) => setSettings({ sfx: v })}
          />
        </Group>

        <Group title="백업" foot="학습 기록과 내 단어를 파일로 저장하거나 불러와요. 불러오면 지금 기록과 합쳐져요.">
          <List edge="outset" hasDividers>
            <ListItem onClick={exportData} startContent={<Icon icon={Download} color="purple" />} label="파일로 내보내기" />
          </List>
          <FileInput
            label="파일에서 불러오기"
            accept="application/json,.json"
            value={null}
            onChange={(f) => {
              const file = Array.isArray(f) ? f[0] : f
              if (file) void importData(file)
            }}
            status={msg ? { type: msg.ok ? 'success' : 'error', message: msg.text } : undefined}
          />
        </Group>

        <Group title="홈 화면에 추가">
          <List edge="outset" hasDividers>
            <ListItem
              startContent={<Icon icon={Smartphone} />}
              label="아이폰"
              description="Safari 아래 공유 버튼 → 홈 화면에 추가"
            />
            <ListItem startContent={<Icon icon={Smartphone} />} label="안드로이드" description="Chrome ⋮ → 홈 화면에 추가 / 앱 설치" />
          </List>
        </Group>

        <Group title="정보">
          <List edge="outset" hasDividers>
            <ListItem
              startContent={<Icon icon={Info} />}
              label="콘텐츠"
              description={`챕터 ${chapters.length}개 · 레슨 ${lessons}개 · 최근 ${chapters[0]?.date ?? '-'}`}
            />
            <ListItem
              onClick={() =>
                confirm.show({
                  title: '학습 기록을 모두 지울까요?',
                  description: '퀴즈 점수와 단어 복습 기록이 지워져요. 내 단어는 남아요. 되돌릴 수 없어요.',
                  actionLabel: '모두 지우기',
                  onAction: () => {
                    resetProgress()
                    confirm.hide()
                  },
                })
              }
              startContent={<Icon icon={RotateCcw} color="error" />}
              label={
                <Text type="body">
                  학습 기록 초기화
                </Text>
              }
            />
          </List>
        </Group>
      </VStack>
      {confirm.element}
    </Screen>
  )
}
