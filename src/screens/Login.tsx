import { useState } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Card } from '@astryxdesign/core/Card'
import { Button } from '@astryxdesign/core/Button'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Banner } from '@astryxdesign/core/Banner'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { supabase } from '../lib/supabase.ts'
import { setSettings } from '../lib/store.ts'
import { LogoMark } from '../components/Logo.tsx'
import { Screen } from '../components/Screen.tsx'
import { type as t } from '../ui/styles.ts'

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
    <Screen>
      <VStack gap={8} paddingBlock={8} hAlign="stretch">
        <VStack gap={3} hAlign="center">
          <LogoMark size={72} />
          <Heading level={1} type="display-2" xstyle={t.en}>
            M-TOEIC
          </Heading>
          <Text type="large" color="secondary">
            수업 끝나고 펴 보는 토익 노트
          </Text>
        </VStack>
        <Card padding={5}>
          <form onSubmit={submit}>
            <FormLayout>
              <TextInput label="이메일" type="email" autoComplete="username" value={email} onChange={setEmail} isRequired />
              <TextInput label="비밀번호" type="password" autoComplete="current-password" value={pw} onChange={setPw} isRequired />
              {err && <Banner status="error" title={err} />}
              <Button label={busy ? '로그인 중…' : '시작하기'} type="submit" variant="primary" size="lg" width="100%" isLoading={busy} />
              <Text type="supporting">계정은 선생님이 만들어 드려요. 한 번 로그인하면 계속 유지돼요.</Text>
            </FormLayout>
          </form>
        </Card>
        <VStack gap={1} hAlign="center">
          <Button label="로그인 없이 이 휴대폰에서만 쓰기" variant="ghost" onClick={() => setSettings({ skipLogin: true })} />
          <Text type="supporting" justify="center">
            나중에 설정에서 로그인하면 기록이 합쳐져요.
          </Text>
        </VStack>
      </VStack>
    </Screen>
  )
}
