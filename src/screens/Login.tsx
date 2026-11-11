import { useState } from 'react'
import { supabase } from '../lib/supabase.ts'

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
          : /fetch|network/i.test(error.message)
            ? '인터넷 연결을 확인해 주세요.'
            : error.message,
      )
  }

  return (
    <div className="page login">
      <h1 className="logo big">
        M-TOEIC<span className="logo-dot">.</span>
      </h1>
      <p className="muted">나만의 토익 수업 노트</p>
      <form className="card form" onSubmit={submit}>
        <label>
          이메일
          <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          비밀번호
          <input className="input" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        </label>
        {err && <p className="warn small">{err}</p>}
        <button type="submit" className="btn primary block" disabled={busy}>
          {busy ? '로그인 중…' : '시작하기'}
        </button>
        <p className="hint">계정은 선생님이 만들어 드려요. 한 번 로그인하면 계속 유지돼요.</p>
      </form>
    </div>
  )
}
