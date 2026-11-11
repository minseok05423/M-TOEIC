import { useRef, useState } from 'react'
import { getState, resetProgress, setSettings, setState, useStore, type State } from '../lib/store.ts'
import { mergeProgress, mergeWords } from '../lib/merge.ts'
import { supabase } from '../lib/supabase.ts'
import { syncNow, useSyncStatus } from '../lib/sync.ts'
import { speak, ttsSupported } from '../lib/tts.ts'
import { CHAPTERS } from '../lib/content.ts'
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
      setMsg('✅ 백업을 합쳤어요')
    } catch (e) {
      setMsg('⚠️ ' + (e instanceof Error ? e.message : '불러오기 실패'))
    }
  }

  const lessons = CHAPTERS.reduce((n, c) => n + c.lessons.length, 0)

  return (
    <div className="page">
      <TopBar title="⚙️ 설정" />

      <section className="card">
        <h3>☁️ 저장</h3>
        {!supabase ? (
          <p className="muted small">이 기기(브라우저)에만 저장하고 있어요. 앱을 지우거나 브라우저 데이터를 지우면 사라지니 가끔 백업하세요.</p>
        ) : (
          <>
            <p className="small">
              {session?.user.email} 계정에 자동 저장 중
              <br />
              <span className="muted">
                {sync.state === 'syncing'
                  ? '저장 중…'
                  : sync.state === 'error'
                    ? `⚠️ ${sync.error}`
                    : sync.lastSync
                      ? `마지막 저장 ${new Date(sync.lastSync).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
                      : ''}
              </span>
            </p>
            <div className="row-gap">
              <button type="button" className="btn grow" onClick={() => void syncNow()} disabled={sync.state === 'syncing'}>
                지금 저장
              </button>
              <button
                type="button"
                className="btn grow"
                onClick={async () => {
                  await syncNow()
                  if (confirm('로그아웃할까요?')) await supabase!.auth.signOut()
                }}
              >
                로그아웃
              </button>
            </div>
          </>
        )}
      </section>

      {ttsSupported && (
        <section className="card">
          <h3>🔊 발음</h3>
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
          <label className="toggle">
            <input type="checkbox" checked={settings.autoSpeak} onChange={(e) => setSettings({ autoSpeak: e.target.checked })} />{' '}
            단어 카드 넘기면 자동으로 발음
          </label>
          <p className="hint">소리가 안 나면 휴대폰 무음 모드를 꺼 보세요.</p>
        </section>
      )}

      <section className="card">
        <h3>💾 백업</h3>
        <p className="muted small">학습 기록과 내 단어를 파일로 저장하거나 불러와요. 불러오면 지금 기록과 합쳐져요.</p>
        <div className="row-gap">
          <button type="button" className="btn grow" onClick={exportData}>
            내보내기
          </button>
          <button type="button" className="btn grow" onClick={() => fileRef.current?.click()}>
            불러오기
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
        {msg && <p className="small">{msg}</p>}
      </section>

      <section className="card">
        <h3>📱 홈 화면에 추가</h3>
        <p className="small">
          <b>아이폰</b>: Safari 아래 공유 버튼 → "홈 화면에 추가"
          <br />
          <b>안드로이드</b>: Chrome 오른쪽 위 ⋮ → "홈 화면에 추가" 또는 "앱 설치"
        </p>
      </section>

      <section className="card">
        <h3>정보</h3>
        <p className="small muted">
          챕터 {CHAPTERS.length}개 · 레슨 {lessons}개 · 최근 수업 {CHAPTERS[0]?.date}
        </p>
        <button
          type="button"
          className="btn danger small"
          onClick={() => {
            if (confirm('퀴즈 점수와 단어 복습 기록을 모두 지울까요? (내 단어는 남아요)') && confirm('정말요? 되돌릴 수 없어요.')) resetProgress()
          }}
        >
          학습 기록 초기화
        </button>
      </section>
    </div>
  )
}
