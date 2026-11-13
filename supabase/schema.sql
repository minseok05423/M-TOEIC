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
language plpgsql set search_path = '' as $$
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

-- 4) 로그인한 사용자가 표를 쓸 수 있도록 권한 부여 (새 프로젝트는 자동으로 안 될 수 있음)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.progress, public.custom_words to authenticated;
-- TRUNCATE 는 RLS 를 무시하고 표 전체를 지울 수 있으므로 회수 (Supabase 기본 권한에 포함돼 있음)
revoke truncate, references, trigger on public.progress, public.custom_words from authenticated;
-- 로그인 안 한 요청(anon 키만)은 표에 아예 접근 못 함
revoke all on public.progress, public.custom_words from anon;

-- 5) API 가 새 표를 바로 알아보도록 (안 하면 "Could not find the table … in the schema cache")
notify pgrst, 'reload schema';

-- ═════════ 학생 메모 → 맞춤 레슨 ═════════

-- 6) 학생이 레슨에서 남긴 메모 (중요한 점 / 헷갈리는 점). 형식은 앱이 강제하고 DB 도 한 번 더 검사
create table if not exists public.lesson_notes (
  id uuid primary key,                         -- 앱에서 만든 id (오프라인에서 만들어도 중복 업로드 안 되게)
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  chapter_id text not null,
  lesson_id text not null,
  lesson_title text not null,
  stage text not null check (stage in ('lesson', 'learn', 'words', 'sentences', 'quiz')),
  target_id text,                              -- 'learn:s2', 'words:w:agenda', 'sentences:s1', 'quiz:q3' (없으면 레슨 전체)
  target_label text,                           -- 그때 화면에 보이던 것 (설명 제목, 단어, 문장, 문제)
  kind text not null check (kind in ('important', 'confusing')),
  category text check (category in ('meaning', 'structure', 'grammar', 'answer', 'other')),
  point text not null check (char_length(btrim(point)) between 5 and 600),
  question text check (question is null or char_length(btrim(question)) between 5 and 600),
  example text check (example is null or char_length(example) <= 300),
  level smallint check (level between 1 and 3),
  status text not null default 'new' check (status in ('new', 'done')),
  reply text,                                  -- 선생님 한마디 (반영할 때)
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  constraint confusing_is_complete check (
    kind <> 'confusing' or (category is not null and question is not null and level is not null)
  )
);
create index if not exists lesson_notes_user_status_idx on public.lesson_notes (user_id, status);

-- 7) 그 학생에게만 보이는 맞춤 챕터 (선생님이 Claude Code 로 만들어서 올림)
--    id 가 기본 챕터와 같으면 그 학생에게는 기본 챕터 대신 이것이 보임 (= 레슨 고치기)
create table if not exists public.user_chapters (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  chapter jsonb not null,
  note_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.lesson_notes enable row level security;
alter table public.user_chapters enable row level security;

-- 학생: 자기 메모를 보내고 볼 수만 있음 (반영 표시·답장은 선생님만)
drop policy if exists "read own notes" on public.lesson_notes;
create policy "read own notes" on public.lesson_notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "send own notes" on public.lesson_notes;
create policy "send own notes" on public.lesson_notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'new' and reply is null and handled_at is null);

-- 학생: 자기 맞춤 챕터를 읽기만 함 (쓰기는 선생님이 비밀 키로)
drop policy if exists "read own chapters" on public.user_chapters;
create policy "read own chapters" on public.user_chapters
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Supabase 기본 권한(ALL)을 걷어내고 필요한 것만
revoke all on public.lesson_notes, public.user_chapters from anon, authenticated;
grant select, insert on public.lesson_notes to authenticated;
grant select on public.user_chapters to authenticated;

notify pgrst, 'reload schema';
