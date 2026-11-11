/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /** Supabase 'publishable' 키 (sb_publishable_...) */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** 예전 이름 (anon 키, eyJ...) — 둘 중 하나만 있으면 됨 */
  readonly VITE_SUPABASE_ANON_KEY?: string
}
