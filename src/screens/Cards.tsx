import { useState } from 'react'
import { findLesson } from '../lib/content.ts'
import { customWords, lessonWords, type StudyWord } from '../lib/words.ts'
import { getState, markLesson } from '../lib/store.ts'
import { href } from '../lib/router.ts'
import { TopBar } from '../components/TopBar.tsx'
import { CardsDone, Flashcards } from '../components/Flashcards.tsx'

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

/** 레슨 단어 또는 내 단어 묶음을 카드로 외우기 */
export function Cards({ chapterId, lessonId, deck }: { chapterId?: string; lessonId?: string; deck?: string }) {
  const lesson = chapterId && lessonId ? findLesson(chapterId, lessonId) : null
  const back = lesson ? href('l', chapterId!, lessonId!, 'words') : href('words')
  const title = lesson ? `🃏 ${lesson.lesson.title}` : `🃏 ${deck}`
  const [words] = useState<StudyWord[]>(() =>
    shuffle(lesson ? lessonWords(chapterId!, lessonId!) : customWords(getState().words).filter((w) => w.group === deck)),
  )
  const [done, setDone] = useState<{ known: number; again: number } | null>(null)
  const [round, setRound] = useState(0)

  return (
    <div className="page">
      <TopBar back={back} title={title} />
      {words.length === 0 ? (
        <p className="empty">단어가 없어요.</p>
      ) : done ? (
        <CardsDone {...done}>
          <button type="button" className="btn block" onClick={() => (setDone(null), setRound(round + 1))}>
            한 번 더
          </button>
          <a className="btn primary block" href={back}>
            돌아가기
          </a>
        </CardsDone>
      ) : (
        <Flashcards
          key={round}
          words={words}
          onDone={(known, again) => {
            if (lesson) markLesson(chapterId!, lessonId!, { cards: true })
            setDone({ known, again })
          }}
        />
      )}
    </div>
  )
}
