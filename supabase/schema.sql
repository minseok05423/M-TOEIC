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

-- ═════════ 매일 단어 테스트 ═════════

-- 8) 단어에 ★중요 표시 (학생이 앱에서, 선생님이 npm run teacher -- star 로). 단어 테스트 복습 칸에 먼저 나옴
alter table public.custom_words add column if not exists important boolean not null default false;

-- 9) 단어 테스트 결과 (한 번 볼 때마다 한 줄). 학생은 보내고 볼 수만 있음, 선생님은 비밀 키로 읽음
create table if not exists public.word_tests (
  id uuid primary key,                         -- 앱에서 만든 id (오프라인에서 봐도 중복 업로드 안 되게)
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  day date not null,                           -- 시험 본 날 (학생 휴대폰 기준)
  items jsonb not null check (jsonb_typeof(items) = 'array'),
                                               -- [{ key, en, ko, part: 'new'|'review', why?, ok, skip? }]
  score smallint not null,
  total smallint not null check (total between 1 and 100),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint word_tests_score_range check (score between 0 and total)
);
create index if not exists word_tests_user_day_idx on public.word_tests (user_id, day);

alter table public.word_tests enable row level security;

drop policy if exists "read own tests" on public.word_tests;
create policy "read own tests" on public.word_tests
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "send own tests" on public.word_tests;
create policy "send own tests" on public.word_tests
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.word_tests from anon, authenticated;
grant select, insert on public.word_tests to authenticated;

notify pgrst, 'reload schema';

-- 10) 단어 품사 ('동사', '동사 / 명사'). 뜻마다 다르면 ko 와 같은 순서로 ' / ' 로 나눔
alter table public.custom_words add column if not exists pos text;
do $$ begin
  alter table public.custom_words add constraint custom_words_pos_len check (pos is null or char_length(pos) <= 30);
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';

-- ═════════ 선생님 계정 (앱의 학생 현황 화면) ═════════

-- 11) 선생님 = app_metadata.role 이 'teacher' 인 계정. app_metadata 는 비밀 키로만 바꿀 수 있어서 학생이 스스로 선생님이 될 수 없음
--     계정 지정: npm run teacher -- role <이메일> teacher   (바꾼 뒤 앱에서 로그아웃 → 로그인해야 반영)
create or replace function public.is_teacher() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher', false)
$$;
revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;

-- 선생님은 모든 학생의 기록을 읽기만 함 (쓰기는 지금처럼 npm run teacher)
drop policy if exists "teacher reads progress" on public.progress;
create policy "teacher reads progress" on public.progress for select to authenticated using ((select public.is_teacher()));
drop policy if exists "teacher reads words" on public.custom_words;
create policy "teacher reads words" on public.custom_words for select to authenticated using ((select public.is_teacher()));
drop policy if exists "teacher reads notes" on public.lesson_notes;
create policy "teacher reads notes" on public.lesson_notes for select to authenticated using ((select public.is_teacher()));
drop policy if exists "teacher reads chapters" on public.user_chapters;
create policy "teacher reads chapters" on public.user_chapters for select to authenticated using ((select public.is_teacher()));
drop policy if exists "teacher reads tests" on public.word_tests;
create policy "teacher reads tests" on public.word_tests for select to authenticated using ((select public.is_teacher()));

-- 학생 목록 (auth.users 는 앱에서 직접 못 읽어서). 선생님이 아니면 빈 목록
create or replace function public.teacher_students()
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email::text, u.created_at, u.last_sign_in_at
  from auth.users u
  where public.is_teacher()
    and coalesce(u.raw_app_meta_data ->> 'role', '') not in ('teacher', 'supervisor')
  order by u.created_at
$$;
revoke all on function public.teacher_students() from public, anon;
grant execute on function public.teacher_students() to authenticated;

notify pgrst, 'reload schema';

-- ═════════ 메모를 어디서나 · 레슨 마감일 ═════════

-- 12) 메모를 레슨 밖에서도: 단어 하나 · 그냥 메모. scope = 무엇에 대한 메모, place = 어느 화면에서 썼는지 (선생님이 봄)
--     단어 메모: stage 'words', target_id 'words:<단어 key>', target_label '영어 · 뜻'. 그냥 메모: stage 'lesson', target 없음
alter table public.lesson_notes add column if not exists scope text not null default 'lesson';
alter table public.lesson_notes add column if not exists place text;
alter table public.lesson_notes alter column chapter_id drop not null;
alter table public.lesson_notes alter column lesson_id drop not null;
alter table public.lesson_notes alter column lesson_title drop not null;
do $$ begin
  alter table public.lesson_notes add constraint lesson_notes_scope_check check (scope in ('lesson', 'word', 'general'));
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table public.lesson_notes add constraint lesson_notes_lesson_has_ids
    check (scope <> 'lesson' or (chapter_id is not null and lesson_id is not null and lesson_title is not null));
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table public.lesson_notes add constraint lesson_notes_place_len check (place is null or char_length(place) <= 200);
exception when duplicate_object then null;
end $$;

-- 13) 레슨 마감일. 선생님이 앱(학생 현황)에서 정하고 모든 학생이 읽음. 없는 레슨은 수업 날 + 2일 (src/lib/analytics.ts)
create table if not exists public.lesson_due (
  chapter_id text not null,
  lesson_id text not null,
  due date not null,
  updated_by uuid default auth.uid() references auth.users on delete set null,
  updated_at timestamptz not null default now(),
  primary key (chapter_id, lesson_id)
);
alter table public.lesson_due enable row level security;
drop policy if exists "everyone reads due dates" on public.lesson_due;
create policy "everyone reads due dates" on public.lesson_due for select to authenticated using (true);
drop policy if exists "teacher adds due dates" on public.lesson_due;
create policy "teacher adds due dates" on public.lesson_due for insert to authenticated with check ((select public.is_teacher()));
drop policy if exists "teacher changes due dates" on public.lesson_due;
create policy "teacher changes due dates" on public.lesson_due
  for update to authenticated using ((select public.is_teacher())) with check ((select public.is_teacher()));
drop policy if exists "teacher clears due dates" on public.lesson_due;
create policy "teacher clears due dates" on public.lesson_due for delete to authenticated using ((select public.is_teacher()));
revoke all on public.lesson_due from anon, authenticated;
grant select, insert, update, delete on public.lesson_due to authenticated;

notify pgrst, 'reload schema';

-- ═════════ 회화: 매일 작문 → AI 검수 → 선생님과 프리토킹 ═════════

-- 14) 제출한 작문 + AI 검수 결과. 쓰기는 Edge Function(review-writing, 비밀 키)만 함
--     → 학생은 자기 글을 읽기만, 선생님은 모두 읽기만. 고쳐 쓰고 싶으면 새 글로 다시 제출
create table if not exists public.writings (
  id uuid primary key,                         -- 앱에서 만든 id (응답을 못 받고 다시 보내도 한 번만 저장)
  user_id uuid not null references auth.users on delete cascade,
  day date not null,                           -- 쓴 날 (학생 휴대폰 기준)
  topic text check (topic is null or char_length(topic) <= 100),
  body text not null check (char_length(body) between 1 and 6000),
  review jsonb not null,                       -- supabase/functions/review-writing/review.ts 의 Review
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 5) not null default 0,  -- 이달 예산 계산용 (REVIEW_MONTHLY_USD)
  created_at timestamptz not null default now()
);
create index if not exists writings_user_created_idx on public.writings (user_id, created_at desc);
create index if not exists writings_created_idx on public.writings (created_at);

-- 15) 프리토킹 메모: 선생님이 앱에서 작문마다 남김. 학생은 자기 것을 읽음
create table if not exists public.writing_talks (
  writing_id uuid primary key references public.writings on delete cascade,
  user_id uuid not null references auth.users on delete cascade,   -- 학생 (읽기 권한용)
  note text not null default '' check (char_length(note) <= 2000),
  talked_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.writings enable row level security;
alter table public.writing_talks enable row level security;

drop policy if exists "read own writings" on public.writings;
create policy "read own writings" on public.writings for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "teacher reads writings" on public.writings;
create policy "teacher reads writings" on public.writings for select to authenticated using ((select public.is_teacher()));

drop policy if exists "read own talks" on public.writing_talks;
create policy "read own talks" on public.writing_talks for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "teacher reads talks" on public.writing_talks;
create policy "teacher reads talks" on public.writing_talks for select to authenticated using ((select public.is_teacher()));
drop policy if exists "teacher adds talks" on public.writing_talks;
create policy "teacher adds talks" on public.writing_talks for insert to authenticated with check (
  (select public.is_teacher()) and exists (select 1 from public.writings w where w.id = writing_id and w.user_id = writing_talks.user_id)
);
drop policy if exists "teacher changes talks" on public.writing_talks;
create policy "teacher changes talks" on public.writing_talks for update to authenticated
  using ((select public.is_teacher()))
  with check ((select public.is_teacher()) and exists (select 1 from public.writings w where w.id = writing_id and w.user_id = writing_talks.user_id));

revoke all on public.writings, public.writing_talks from anon, authenticated;
grant select on public.writings to authenticated;
grant select, insert, update on public.writing_talks to authenticated;

notify pgrst, 'reload schema';
