import { useMemo, useState } from 'react'
import { customWords, allWords, type StudyWord } from '../lib/words.ts'
import { getState } from '../lib/store.ts'
import { href } from '../lib/router.ts'
import { shuffle, stars } from '../lib/game.ts'
import { TopBar } from '../components/TopBar.tsx'
import { WordGame, type GameResult } from '../components/WordGame.tsx'
import { GameDone } from '../components/GameDone.tsx'

const PER_ROUND = 15

/** 내 단어 묶음을 게임으로 외우기 */
export function Cards({ deck }: { deck: string }) {
  const back = href('words')
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<GameResult | null>(null)
  const all = useMemo(() => customWords(getState().words).filter((w) => w.group === deck), [deck])
  const pool = useMemo(() => [...allWords(getState().words).values()], [])
  const snap = useMemo(() => getState().progress.srs, [round])
  const session = useMemo<StudyWord[]>(() => {
    const srs = getState().progress.srs
    // 아직 한 번도 안 푼 단어 → 약한 단어 순
    return [...all].sort((a, b) => (srs[a.key]?.reps ?? 0) - (srs[b.key]?.reps ?? 0) || (srs[a.key]?.box ?? 0) - (srs[b.key]?.box ?? 0) || Math.random() - 0.5).slice(0, PER_ROUND)
  }, [all, round])

  if (!all.length)
    return (
      <div className="page">
        <TopBar back={back} title={deck} />
        <p className="empty">단어가 없어요.</p>
      </div>
    )

  if (result)
    return (
      <div className="page">
        <GameDone
          stars={stars(result.right, result.right + result.wrong)}
          title={`${deck} · 한 판 끝`}
          line="틀린 단어는 내일 복습에 다시 나와요."
          stats={[
            { label: '한 번에 맞힘', value: `${result.right}/${result.total}` },
            { label: '최고 연속', value: result.bestCombo },
          ]}
        >
          <button
            type="button"
            className="btn primary block big"
            onClick={() => {
              setResult(null)
              setRound(round + 1)
            }}
          >
            한 판 더
          </button>
          <a className="btn block big" href={back}>
            단어장으로
          </a>
        </GameDone>
      </div>
    )

  return (
    <WordGame
      key={round}
      words={shuffle(session)}
      pool={pool}
      isNew={(w) => !snap[w.key] || snap[w.key].reps === 0}
      exitHref={back}
      onDone={setResult}
    />
  )
}
