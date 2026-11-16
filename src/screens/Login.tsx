import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Card } from '@astryxdesign/core/Card'
import { Button } from '@astryxdesign/core/Button'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Banner } from '@astryxdesign/core/Banner'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Icon } from '@astryxdesign/core/Icon'
import { supabase } from '../lib/supabase.ts'
import { setSettings } from '../lib/store.ts'
import { href, replace } from '../lib/router.ts'
import { LogoMark } from '../components/Logo.tsx'
import { Screen } from '../components/Screen.tsx'
import { type as t } from '../ui/styles.ts'

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
    <VStack gap={3} hAlign="center">
      <LogoMark size={72} />
      <Heading level={1} type="display-2" xstyle={t.en}>
        M-TOEIC
      </Heading>
      <Text type="large" color="secondary">
        수업 끝나고 펴 보는 토익 노트
      </Text>
    </VStack>
  )
}

function DeviceOnly() {
  return (
    <VStack gap={1} hAlign="center">
      <Button label="로그인 없이 이 휴대폰에서만 쓰기" variant="ghost" onClick={() => setSettings({ skipLogin: true })} />
      <Text type="supporting" justify="center">
        나중에 설정에서 로그인하면 기록이 합쳐져요.
      </Text>
    </VStack>
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
    <Screen>
      <VStack gap={8} paddingBlock={8} hAlign="stretch">
        <Brand />
        <Card padding={5}>
          <form onSubmit={submit}>
            <FormLayout>
              <TextInput label="이메일" type="email" autoComplete="username" value={email} onChange={setEmail} isRequired />
              <TextInput label="비밀번호" type="password" autoComplete="current-password" value={pw} onChange={setPw} isRequired />
              {err && <Banner status="error" title={err} />}
              <Button label={busy ? '로그인 중…' : '시작하기'} type="submit" variant="primary" size="lg" width="100%" isLoading={busy} />
              <Text type="supporting">한 번 로그인하면 계속 유지돼요.</Text>
            </FormLayout>
          </form>
        </Card>
        <VStack gap={1} hAlign="center">
          <Text type="supporting">처음이에요?</Text>
          <Button label="회원가입" variant="secondary" href={href('signup')} />
        </VStack>
        <DeviceOnly />
      </VStack>
    </Screen>
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
      <Screen>
        <VStack gap={8} paddingBlock={8} hAlign="stretch">
          <Brand />
          <Card padding={5}>
            <VStack gap={4}>
              <VStack gap={2} hAlign="center">
                <Icon icon={MailCheck} size="lg" color="accent" />
                <Heading level={2}>메일함을 확인해 주세요</Heading>
                <Text type="body" justify="center" xstyle={t.keepAll}>
                  <Text type="inherit" weight="semibold">
                    {sent}
                  </Text>{' '}
                  으로 인증 메일을 보냈어요. 메일의 링크를 누르면 바로 시작할 수 있어요.
                </Text>
              </VStack>
              {err && <Banner status="error" title={err} />}
              {resent && !err && <Banner status="success" title="메일을 다시 보냈어요." />}
              <Text type="supporting" justify="center">
                메일이 안 보이면 스팸함도 확인해 보세요.
              </Text>
              <Button label="메일 다시 보내기" variant="secondary" size="lg" width="100%" isLoading={busy} onClick={resend} />
              <Button label="인증했어요, 로그인하기" variant="primary" size="lg" width="100%" href={href()} />
            </VStack>
          </Card>
        </VStack>
      </Screen>
    )

  return (
    <Screen>
      <VStack gap={8} paddingBlock={8} hAlign="stretch">
        <Brand />
        <Card padding={5}>
          <form onSubmit={submit}>
            <FormLayout>
              <Heading level={2}>회원가입</Heading>
              <TextInput label="이메일" type="email" autoComplete="email" value={email} onChange={setEmail} isRequired />
              <TextInput
                label="비밀번호"
                type="password"
                autoComplete="new-password"
                description={`${PW_MIN}자 이상`}
                value={pw}
                onChange={setPw}
                isRequired
                status={tooShort ? { type: 'error', message: `${PW_MIN}자 이상으로 정해 주세요.` } : undefined}
              />
              <TextInput
                label="비밀번호 확인"
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={setPw2}
                isRequired
                status={mismatch ? { type: 'error', message: '비밀번호가 서로 달라요.' } : undefined}
              />
              {err && <Banner status="error" title={err} />}
              <Button label={busy ? '가입하는 중…' : '가입하기'} type="submit" variant="primary" size="lg" width="100%" isLoading={busy} />
            </FormLayout>
          </form>
        </Card>
        <VStack gap={1} hAlign="center">
          <Text type="supporting">이미 계정이 있어요?</Text>
          <Button label="로그인" variant="secondary" href={href()} />
        </VStack>
        <DeviceOnly />
      </VStack>
    </Screen>
  )
}
