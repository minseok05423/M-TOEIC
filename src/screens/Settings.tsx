import { useRef, useState } from 'react'
import { Cloud, Download, HardDrive, Info, LogIn, LogOut, Music, RefreshCw, RotateCcw, Smartphone, TriangleAlert, Upload, Volume2 } from 'lucide-react'
import { getState, resetProgress, setSettings, setState, useStore, type State } from '../lib/store.ts'
import { mergeProgress, mergeWords } from '../lib/merge.ts'
import { supabase } from '../lib/supabase.ts'
import { syncNow, useSyncStatus } from '../lib/sync.ts'
import { speak, ttsSupported } from '../lib/tts.ts'
import { useChapters } from '../lib/content.ts'
import { today } from '../lib/date.ts'
import { TopBar } from '../components/TopBar.tsx'
import type { Session } from '@supabase/supabase-js'

export function Settings({ session }: { session: Session | null }) {
  const settings = useStore((s) => s.settings)
  const sync = useSyncStatus()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

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
      setMsg('백업을 합쳤어요')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '불러오기 실패')
    }
  }

  const chapters = useChapters()
  const lessons = chapters.reduce((n, c) => n + c.lessons.length, 0)
  const syncText =
    sync.state === 'syncing'
      ? '저장 중…'
      : sync.state === 'error'
        ? sync.error
        : sync.lastSync
          ? `마지막 저장 ${new Date(sync.lastSync).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
          : '자동 저장 켜짐'

  return (
    <div className="page">
      <TopBar title="설정" />

      <section className="group">
        <p className="section-label">저장</p>
        <div className="group-card">
          {!supabase || !session ? (
            <>
              <div className="row">
                <span className="row-ico gray">
                  <HardDrive size={18} />
                </span>
                <span className="row-text">
                  이 기기에만 저장 중
                  <span className="sub">브라우저 데이터를 지우면 사라지니 가끔 백업하세요</span>
                </span>
              </div>
              {supabase && (
                <button type="button" className="row" onClick={() => setSettings({ skipLogin: false })}>
                  <span className="row-ico">
                    <LogIn size={18} />
                  </span>
                  <span className="row-text">
                    로그인하고 서버에 저장
                    <span className="sub">지금까지 기록은 그대로 합쳐져요</span>
                  </span>
                </button>
              )}
            </>
          ) : (
            <>
              <div className="row">
                <span className="row-ico">
                  <Cloud size={18} />
                </span>
                <span className="row-text">
                  {session.user.email}
                  <span className="sub">
                    <span className={`status-dot ${sync.state}`} />
                    {syncText}
                  </span>
                </span>
              </div>
              {sync.kind === 'setup' && (
                <div className="row setup-warn">
                  <span className="row-ico red">
                    <TriangleAlert size={18} />
                  </span>
                  <span className="row-text small">
                    지금은 이 휴대폰에만 저장되고 있어요. 공부 기록은 안전해요 — 서버 준비가 끝나면 자동으로 올라가요.
                  </span>
                </div>
              )}
              <button type="button" className="row" onClick={() => void syncNow()} disabled={sync.state === 'syncing'}>
                <span className="row-ico green">
                  <RefreshCw size={18} />
                </span>
                <span className="row-text">지금 저장</span>
              </button>
              <button
                type="button"
                className="row"
                onClick={async () => {
                  await syncNow()
                  if (confirm('로그아웃할까요?')) {
                    await supabase!.auth.signOut()
                    setSettings({ skipLogin: false })
                  }
                }}
              >
                <span className="row-ico gray">
                  <LogOut size={18} />
                </span>
                <span className="row-text">로그아웃</span>
              </button>
            </>
          )}
        </div>
      </section>

      {ttsSupported && (
        <section className="group">
          <p className="section-label">발음</p>
          <div className="group-card">
            <div className="row-block">
              <span className="row-text">
                <span className="row-value">말하기 속도</span>
              </span>
              <div className="seg">
                {[
                  { r: 0.7, l: '느리게' },
                  { r: 0.9, l: '보통' },
                  { r: 1.05, l: '빠르게' },
                ].map((o) => (
                  <button
                    key={o.r}
                    type="button"
                    className={settings.rate === o.r ? 'on' : ''}
                    onClick={() => {
                      setSettings({ rate: o.r })
                      speak('The meeting has been postponed until Friday.', o.r)
                    }}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <label className="row">
              <span className="row-ico orange">
                <Volume2 size={18} />
              </span>
              <span className="row-text">새 단어 나오면 자동 발음</span>
              <input
                type="checkbox"
                className="switch"
                checked={settings.autoSpeak}
                onChange={(e) => setSettings({ autoSpeak: e.target.checked })}
              />
            </label>
          </div>
          <p className="group-foot">소리가 안 나면 휴대폰 무음 모드를 꺼 보세요.</p>
        </section>
      )}

      <section className="group">
        <p className="section-label">게임</p>
        <div className="group-card">
          <label className="row">
            <span className="row-ico orange">
              <Music size={18} />
            </span>
            <span className="row-text">
              정답 · 오답 효과음
              <span className="sub">짧은 "띵" 소리와 진동</span>
            </span>
            <input type="checkbox" className="switch" checked={settings.sfx} onChange={(e) => setSettings({ sfx: e.target.checked })} />
          </label>
        </div>
      </section>

      <section className="group">
        <p className="section-label">백업</p>
        <div className="group-card">
          <button type="button" className="row" onClick={exportData}>
            <span className="row-ico purple">
              <Download size={18} />
            </span>
            <span className="row-text">파일로 내보내기</span>
          </button>
          <button type="button" className="row" onClick={() => fileRef.current?.click()}>
            <span className="row-ico purple">
              <Upload size={18} />
            </span>
            <span className="row-text">
              파일에서 불러오기
              {msg && <span className="sub">{msg}</span>}
            </span>
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importData(f)
            e.target.value = ''
          }}
        />
        <p className="group-foot">학습 기록과 내 단어를 파일로 저장하거나 불러와요. 불러오면 지금 기록과 합쳐져요.</p>
      </section>

      <section className="group">
        <p className="section-label">홈 화면에 추가</p>
        <div className="group-card">
          <div className="row">
            <span className="row-ico gray">
              <Smartphone size={18} />
            </span>
            <span className="row-text small">
              <span>
                <b>아이폰</b> Safari 아래 공유 버튼 → 홈 화면에 추가
              </span>
              <span>
                <b>안드로이드</b> Chrome ⋮ → 홈 화면에 추가 / 앱 설치
              </span>
            </span>
          </div>
        </div>
      </section>

      <section className="group">
        <p className="section-label">정보</p>
        <div className="group-card">
          <div className="row">
            <span className="row-ico gray">
              <Info size={18} />
            </span>
            <span className="row-text">
              콘텐츠
              <span className="sub">
                챕터 {chapters.length}개 · 레슨 {lessons}개 · 최근 {chapters[0]?.date}
              </span>
            </span>
          </div>
          <button
            type="button"
            className="row danger"
            onClick={() => {
              if (confirm('퀴즈 점수와 단어 복습 기록을 모두 지울까요? (내 단어는 남아요)') && confirm('정말요? 되돌릴 수 없어요.')) resetProgress()
            }}
          >
            <span className="row-ico red">
              <RotateCcw size={18} />
            </span>
            <span className="row-text">학습 기록 초기화</span>
          </button>
        </div>
      </section>
    </div>
  )
}
