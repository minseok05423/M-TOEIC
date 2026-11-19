/**
 * 작문 AI 검수 (Supabase Edge Function, Deno).
 *
 * 학생 앱이 최종본을 보내면: 로그인 확인 → 하루 횟수 · 이달 예산 확인 → Claude 로 검수
 * → writings 표에 글과 검수 결과를 함께 저장 → 저장한 줄을 돌려줘요.
 * 학생은 writings 를 읽기만 할 수 있어서 (supabase/schema.sql 14번) 제출한 글과 검수는 바꿀 수 없어요.
 *
 * 비밀값 (대시보드 → Edge Functions → Secrets):
 *   ANTHROPIC_API_KEY     필수
 *   REVIEW_MODEL          기본 claude-opus-5-5
 *   REVIEW_EFFORT         기본 low (low | medium | high)
 *   REVIEWS_PER_DAY       기본 3 (학생 한 명, 24시간)
 *   REVIEW_MONTHLY_USD    기본 2 (모든 학생 합쳐, 이번 달 UTC)
 * SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 는 Supabase 가 자동으로 넣어 줘요.
 *
 * 배포: Supabase MCP deploy_edge_function (verify_jwt false: 아래에서 직접 로그인을 확인해요).
 */
import Anthropic from 'npm:@anthropic-ai/sdk@1.10.0'
import { jsonSchemaOutputFormat } from 'npm:@anthropic-ai/sdk@1.10.0/helpers/json-schema'
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import { checkInput, costUsd, DEFAULTS, normalizeReview, REVIEW_SCHEMA, SYSTEM, userPrompt } from './review.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
/** 학생 화면에 그대로 보여 줄 한국어 오류 */
const fail = (status: number, error: string) => json(status, { error })

const env = (k: string) => Deno.env.get(k) ?? ''
const num = (k: string, d: number) => {
  const n = Number(env(k))
  return Number.isFinite(n) && n > 0 ? n : d
}

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY = /^\d{4}-\d{2}-\d{2}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return fail(405, 'POST 만 받아요.')

  // 1) 로그인한 사람인지
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } }
  const user = auth.user
  if (!user) return fail(401, '로그인이 필요해요. 앱에서 다시 로그인해 주세요.')

  // 2) 보낸 내용
  let body: { id?: unknown; day?: unknown; topic?: unknown; text?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail(400, '보낸 내용을 읽지 못했어요.')
  }
  const { id, day, text } = body
  const topic = typeof body.topic === 'string' && body.topic.trim() ? body.topic.trim() : null
  if (typeof id !== 'string' || !UUID.test(id)) return fail(400, '글 id 가 이상해요.')
  if (typeof day !== 'string' || !DAY.test(day)) return fail(400, '날짜가 이상해요.')
  const bad = checkInput(text, topic)
  if (bad) return fail(400, bad)

  // 같은 글을 두 번 보냈으면 (응답을 못 받고 다시 누름) 저장된 것을 그대로 돌려줌
  const prev = await admin.from('writings').select('*').eq('id', id).maybeSingle()
  if (prev.error) return fail(500, `서버 오류: ${prev.error.message}`)
  if (prev.data) return prev.data.user_id === user.id ? json(200, prev.data) : fail(409, '글 id 가 겹쳐요. 다시 보내 주세요.')

  // 3) 하루 횟수
  const perDay = num('REVIEWS_PER_DAY', DEFAULTS.perDay)
  const since = new Date(Date.now() - 24 * 3600e3).toISOString()
  const recent = await admin.from('writings').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since)
  if (recent.error) return fail(500, `서버 오류: ${recent.error.message}`)
  if ((recent.count ?? 0) >= perDay) return fail(429, `검수는 24시간에 ${perDay}번까지예요. 내일 다시 보내 주세요.`)

  // 4) 이번 달 예산 (모든 학생 합쳐서)
  const cap = num('REVIEW_MONTHLY_USD', DEFAULTS.monthlyUsd)
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const spent = await admin.from('writings').select('cost_usd').gte('created_at', monthStart)
  if (spent.error) return fail(500, `서버 오류: ${spent.error.message}`)
  const used = (spent.data ?? []).reduce((a, r) => a + Number(r.cost_usd ?? 0), 0)
  if (used >= cap) return fail(429, '이번 달 AI 검수 예산을 다 썼어요. 선생님께 말해 주세요. (글은 휴대폰에 남아 있어요)')

  // 5) 검수
  const key = env('ANTHROPIC_API_KEY')
  if (!key) return fail(503, 'AI 검수가 아직 설정되지 않았어요. 선생님께 말해 주세요.')
  const model = env('REVIEW_MODEL') || DEFAULTS.model
  const effort = (['low', 'medium', 'high'].includes(env('REVIEW_EFFORT')) ? env('REVIEW_EFFORT') : 'low') as 'low' | 'medium' | 'high'
  const client = new Anthropic({ apiKey: key, maxRetries: 1, timeout: 120_000 })

  let res
  try {
    res = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      // 안전 필터가 거절하면 서버가 다른 모델로 이어서 답함 (초보 작문에선 거의 없지만 혹시나)
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // 결과는 normalizeReview 로 다시 다듬으니 타입은 넓게 둠
      output_config: { effort, format: jsonSchemaOutputFormat(REVIEW_SCHEMA as unknown as { type: 'object' }) },
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt(text as string, topic) }],
    })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return fail(503, 'AI 가 지금 바빠요. 1분 뒤에 다시 보내 주세요.')
    if (e instanceof Anthropic.AuthenticationError) return fail(503, 'AI 검수 키에 문제가 있어요. 선생님께 말해 주세요.')
    if (e instanceof Anthropic.APIError) return fail(502, `AI 검수 중 오류가 났어요 (${e.status}). 잠시 뒤 다시 보내 주세요.`)
    return fail(502, 'AI 에 연결하지 못했어요. 잠시 뒤 다시 보내 주세요.')
  }

  const cost = costUsd(res.model, res.usage)
  if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens' || !res.parsed_output) {
    console.error('review failed', res.stop_reason, res.model, cost)
    return fail(502, '검수 결과를 만들지 못했어요. 잠시 뒤 다시 보내 주세요.')
  }

  // 6) 저장 (글 + 검수 함께)
  const row = {
    id,
    user_id: user.id,
    day,
    topic,
    body: (text as string).trim(),
    review: normalizeReview(res.parsed_output),
    model: res.model,
    input_tokens: res.usage.input_tokens,
    output_tokens: res.usage.output_tokens,
    cost_usd: Number(cost.toFixed(5)),
  }
  const ins = await admin.from('writings').insert(row).select('*').single()
  if (ins.error) return fail(500, `검수는 됐는데 저장하지 못했어요: ${ins.error.message}`)
  return json(200, ins.data)
})
