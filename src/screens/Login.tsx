import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import { supabase } from '../lib/supabase.ts'
import { setSettings } from '../lib/store.ts'
import { href, replace } from '../lib/router.ts'
import { LogoMark } from '../components/Logo.tsx'

/** Supabase 기본 최소 길이 (Authentication → Sign In / Providers → Email 에서 바꿀 수 있음) */
const PW_MIN = 6

/** 인증 메일의 링크를 누르면 이 앱으로 돌아오게 (Supabase 의 Redirect URLs 에 이 주소가 있어야 해요) */
const appUrl = () => location.origin + location.pathname

/** Supabase 인증 오류 → 학생이 알아들을 말 */
function explain(message: string): string {
  if (/invalid login|invalid.*credentials/i.test(message)) return '이메일이나 비밀번호가 맞지 않아요.'
  if (/not confirmed/i.test(message)) return '아직 메일 인증 전이에요. 메일함에서 인증 링크를 먼저 눌러 주세요.'
  if (/already registered|already exists/i.test(message)) return '이미 가입된 이메일이에요. 로그인해 주세요.'
  if (/password/i.test(message)) return `비밀번호가 너무 짧거나 쉬워요. ${PW_MIN}자 이상으로 정해 주세요.`
  if (/rate limit|too many|security purposes/i.test(message)) return '메일을 너무 자주 보냈어요. 몇 분 뒤에 다시 해 주세요.'
  if (/email.*invalid|invalid.*email|validate email/i.test(message)) return '이메일 주소를 다시 확인해 주세요.'
  if (/fetch|network/i.test(message)) return '인터넷 연결을 확인해 주세요.'
  return message
}

function Brand() {
  return (
    <div className="login-head">
      <LogoMark />
      <h1 className="wordmark-text">
        M<span>-</span>TOEIC
      </h1>
      <p className="login-tag">수업 끝나고 펴 보는 토익 노트</p>
    </div>
  )
}

function DeviceOnly() {
  return (
    <>
      <button type="button" className="link small login-skip" onClick={() => setSettings({ skipLogin: true })}>
        로그인 없이 이 휴대폰에서만 쓰기
      </button>
      <p className="hint center">나중에 설정에서 로그인하면 기록이 합쳐져요.</p>
    </>
  )
}

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
    if (error) setErr(explain(error.message))
    else setSettings({ skipLogin: false })
  }

  return (
    <div className="page login">
      <Brand />
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
        <p className="hint">한 번 로그인하면 계속 유지돼요.</p>
      </form>
      <div className="login-alt">
        <span className="muted small">처음이에요?</span>
        <a className="btn" href={href('signup')}>
          회원가입
        </a>
      </div>
      <DeviceOnly />
    </div>
  )
}

/** 회원가입 (#/signup). 메일 인증이 켜져 있으면 "메일함 확인" 화면으로, 꺼져 있으면 바로 로그인 */
export function SignUp() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  /** 인증 메일을 보낸 주소 */
  const [sent, setSent] = useState('')
  const [resent, setResent] = useState(false)

  const tooShort = pw.length > 0 && pw.length < PW_MIN
  const mismatch = pw2.length > 0 && pw !== pw2

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || tooShort || mismatch || !pw2) return
    setBusy(true)
    setErr('')
    const addr = email.trim()
    const { data, error } = await supabase.auth.signUp({ email: addr, password: pw, options: { emailRedirectTo: appUrl() } })
    setBusy(false)
    if (error) return setErr(explain(error.message))
    // 이미 인증까지 끝난 이메일이면 Supabase 는 오류 대신 identities 가 빈 사용자를 돌려줘요
    if (data.user && data.user.identities?.length === 0) return setErr(explain('already registered'))
    if (data.session) {
      setSettings({ skipLogin: false })
      replace()
      return
    }
    setSent(addr)
  }

  async function resend() {
    if (!supabase) return
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.resend({ type: 'signup', email: sent, options: { emailRedirectTo: appUrl() } })
    setBusy(false)
    if (error) setErr(explain(error.message))
    else setResent(true)
  }

  if (sent)
    return (
      <div className="page login">
        <Brand />
        <div className="sheet-card form">
          <div className="mail-sent">
            <MailCheck size={36} />
            <h2>메일함을 확인해 주세요</h2>
            <p>
              <b>{sent}</b> 으로 인증 메일을 보냈어요. 메일의 링크를 누르면 바로 시작할 수 있어요.
            </p>
          </div>
          {err && <p className="warn small">{err}</p>}
          {resent && !err && <p className="note small">메일을 다시 보냈어요.</p>}
          <p className="hint center">메일이 안 보이면 스팸함도 확인해 보세요.</p>
          <button type="button" className="btn block big" disabled={busy} onClick={resend}>
            메일 다시 보내기
          </button>
          <a className="btn primary block big" href={href()}>
            인증했어요, 로그인하기
          </a>
        </div>
      </div>
    )

  return (
    <div className="page login">
      <Brand />
      <form className="sheet-card form" onSubmit={submit}>
        <h2 className="form-title">회원가입</h2>
        <label>
          이메일
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          <span>
            비밀번호 <span className="hint">{PW_MIN}자 이상</span>
          </span>
          <input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          {tooShort && <span className="field-err">{PW_MIN}자 이상으로 정해 주세요.</span>}
        </label>
        <label>
          비밀번호 확인
          <input className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          {mismatch && <span className="field-err">비밀번호가 서로 달라요.</span>}
        </label>
        {err && <p className="warn small">{err}</p>}
        <button type="submit" className="btn primary block big" disabled={busy}>
          {busy ? '가입하는 중…' : '가입하기'}
        </button>
      </form>
      <div className="login-alt">
        <span className="muted small">이미 계정이 있어요?</span>
        <a className="btn" href={href()}>
          로그인
        </a>
      </div>
      <DeviceOnly />
    </div>
  )
}
