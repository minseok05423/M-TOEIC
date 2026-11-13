import { useState } from 'react'
import { supabase } from '../lib/supabase.ts'
import { setSettings } from '../lib/store.ts'
import { LogoMark } from '../components/Logo.tsx'

export function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    setBusy(false)
    if (error)
      setErr(
        /invalid/i.test(error.message)
          ? '이메일이나 비밀번호가 맞지 않아요.'
          : /not confirmed/i.test(error.message)
            ? '아직 인증되지 않은 계정이에요. 선생님께 알려 주세요.'
            : /fetch|network/i.test(error.message)
              ? '인터넷 연결을 확인해 주세요.'
              : error.message,
      )
    else setSettings({ skipLogin: false })
  }

  return (
    <div className="page login">
      <div className="login-head">
        <LogoMark />
        <h1 className="wordmark-text">
          M<span>-</span>TOEIC
        </h1>
        <p className="login-tag">수업 끝나고 펴 보는 토익 노트</p>
      </div>
      <form className="sheet-card form" onSubmit={submit}>
        <label>
          이메일
          <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          비밀번호
          <input className="input" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        </label>
        {err && <p className="warn small">{err}</p>}
        <button type="submit" className="btn primary block big" disabled={busy}>
          {busy ? '로그인 중…' : '시작하기'}
        </button>
        <p className="hint">계정은 선생님이 만들어 드려요. 한 번 로그인하면 계속 유지돼요.</p>
      </form>
      <button type="button" className="link small login-skip" onClick={() => setSettings({ skipLogin: true })}>
        로그인 없이 이 휴대폰에서만 쓰기
      </button>
      <p className="hint center">나중에 설정에서 로그인하면 기록이 합쳐져요.</p>
    </div>
  )
}
