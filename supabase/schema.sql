-- M-TOEIC Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run. (여러 번 실행해도 안전)

-- 1) 학습 기록: 사용자당 한 줄 (퀴즈 점수, 단어 복습 상태, 공부한 날짜를 JSON 으로)
create table if not exists public.progress (
  user_id uuid primary key references auth.users on delete cascade default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2) 학생이 직접 추가한 단어 (선생님이 대시보드에서 직접 넣어도 됨 → README 참고)
create table if not exists public.custom_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  en text not null,
  ko text not null,
  ex_en text,
  ex_ko text,
  tip text,
  deck text not null default '내 단어',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists custom_words_user_idx on public.custom_words (user_id);

-- 대시보드에서 수정할 때 updated_at 을 안 바꿔도 앱이 변경을 알아채도록
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists custom_words_touch on public.custom_words;
create trigger custom_words_touch before update on public.custom_words
  for each row execute function public.touch_updated_at();

-- 3) 행 단위 보안: 로그인한 본인 데이터만 읽고 쓸 수 있음
alter table public.progress enable row level security;
alter table public.custom_words enable row level security;

drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own words" on public.custom_words;
create policy "own words" on public.custom_words
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
