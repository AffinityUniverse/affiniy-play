import { useState, useEffect, useCallback, CSSProperties } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { playClick, playSuccess, playError } from '../utils/sounds'

interface Props { onBack: () => void }

type Cell = 'X' | 'O' | null
type Board = Cell[]
type Difficulty = 'easy' | 'medium' | 'hard'
type Phase = 'start' | 'playing' | 'result'

// ── Minimax helpers ─────────────────────────────────────────────────────────

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

function checkWinner(b: Board): { winner: Cell; line: number[] } | null {
  for (const line of LINES) {
    const [a, c, d] = line
    if (b[a] && b[a] === b[c] && b[a] === b[d]) {
      return { winner: b[a], line }
    }
  }
  return null
}

function isDraw(b: Board): boolean {
  return b.every(c => c !== null) && !checkWinner(b)
}

function minimax(b: Board, isMax: boolean, alpha: number, beta: number): number {
  const w = checkWinner(b)
  if (w?.winner === 'O') return 10
  if (w?.winner === 'X') return -10
  if (isDraw(b)) return 0

  if (isMax) {
    let best = -Infinity
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = 'O'
        best = Math.max(best, minimax(b, false, alpha, beta))
        b[i] = null
        alpha = Math.max(alpha, best)
        if (beta <= alpha) break
      }
    }
    return best
  } else {
    let best = Infinity
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = 'X'
        best = Math.min(best, minimax(b, true, alpha, beta))
        b[i] = null
        beta = Math.min(beta, best)
        if (beta <= alpha) break
      }
    }
    return best
  }
}

function bestMove(b: Board): number {
  let best = -Infinity
  let move = -1
  for (let i = 0; i < 9; i++) {
    if (!b[i]) {
      b[i] = 'O'
      const score = minimax(b, false, -Infinity, Infinity)
      b[i] = null
      if (score > best) { best = score; move = i }
    }
  }
  return move
}

function randomMove(b: Board): number {
  const empty = b.map((v, i) => (v ? -1 : i)).filter(i => i >= 0)
  return empty[Math.floor(Math.random() * empty.length)]
}

function aiMove(b: Board, difficulty: Difficulty): number {
  if (difficulty === 'easy') return randomMove(b)
  if (difficulty === 'medium') return Math.random() < 0.7 ? bestMove(b) : randomMove(b)
  return bestMove(b)
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CellMark({ cell, winning }: { cell: Cell; winning: boolean }) {
  if (!cell) return null
  const isX = cell === 'X'

  const style: CSSProperties = {
    fontSize: 40,
    fontWeight: 900,
    lineHeight: 1,
    transition: 'transform 0.18s ease',
    color: winning
      ? '#fff'
      : isX
        ? '#4D72FB'
        : '#FF8C42',
    textShadow: winning
      ? '0 2px 8px rgba(0,0,0,0.18)'
      : isX
        ? '0 2px 6px #4D72FB55'
        : '0 2px 6px #FF8C4255',
    animation: 'ttt-pop 0.22s cubic-bezier(0.34,1.56,0.64,1)',
  }

  return (
    <span style={style}>
      {isX ? 'X' : 'O'}
    </span>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function TicTacToeGame({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('start')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [board, setBoard] = useState<Board>(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)
  const [winInfo, setWinInfo] = useState<{ winner: Cell; line: number[] } | null>(null)
  const [draw, setDraw] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [score, setScore] = useState({ wins: 0, losses: 0, draws: 0 })
  const [animatingCell, setAnimatingCell] = useState<number | null>(null)

  const resetBoard = useCallback(() => {
    setBoard(Array(9).fill(null))
    setXIsNext(true)
    setWinInfo(null)
    setDraw(false)
    setAiThinking(false)
    setAnimatingCell(null)
  }, [])

  const startGame = () => {
    playClick()
    resetBoard()
    setPhase('playing')
  }

  const playAgain = () => {
    playClick()
    resetBoard()
    setPhase('playing')
  }

  const backToStart = () => {
    playClick()
    resetBoard()
    setPhase('start')
  }

  // AI move effect
  useEffect(() => {
    if (phase !== 'playing') return
    if (xIsNext) return           // player's turn
    if (winInfo || draw) return   // game over

    setAiThinking(true)
    const delay = difficulty === 'easy' ? 400 : difficulty === 'medium' ? 600 : 700

    const timer = setTimeout(() => {
      setBoard(prev => {
        const w = checkWinner(prev)
        if (w || prev.every(c => c !== null)) return prev

        const idx = aiMove([...prev], difficulty)
        if (idx === -1) return prev

        const next = [...prev]
        next[idx] = 'O'
        setAnimatingCell(idx)

        const wNext = checkWinner(next)
        if (wNext) {
          setWinInfo(wNext)
          setScore(s => ({ ...s, losses: s.losses + 1 }))
          playError()
          setPhase('result')
        } else if (next.every(c => c !== null)) {
          setDraw(true)
          setScore(s => ({ ...s, draws: s.draws + 1 }))
          playClick()
          setPhase('result')
        } else {
          playClick()
          setXIsNext(true)
        }

        setAiThinking(false)
        return next
      })
    }, delay)

    return () => clearTimeout(timer)
  }, [xIsNext, phase, winInfo, draw, difficulty])

  const handleCellClick = (idx: number) => {
    if (!xIsNext || board[idx] || winInfo || draw || aiThinking || phase !== 'playing') return

    playClick()
    const next = [...board]
    next[idx] = 'X'
    setAnimatingCell(idx)

    const wNext = checkWinner(next)
    setBoard(next)

    if (wNext) {
      setWinInfo(wNext)
      setScore(s => ({ ...s, wins: s.wins + 1 }))
      playSuccess()
      setPhase('result')
    } else if (next.every(c => c !== null)) {
      setDraw(true)
      setScore(s => ({ ...s, draws: s.draws + 1 }))
      playClick()
      setPhase('result')
    } else {
      setXIsNext(false)
    }
  }

  // ── Start screen ────────────────────────────────────────────────────────

  if (phase === 'start') {
    const diffOptions: { value: Difficulty; label: string; desc: string; color: string }[] = [
      { value: 'easy',   label: '쉬움',   desc: '랜덤으로 움직여요',      color: '#27AE60' },
      { value: 'medium', label: '보통',   desc: '가끔 실수해요',          color: '#FF8C42' },
      { value: 'hard',   label: '어려움', desc: '절대 실수 안 해요',      color: '#E74C3C' },
    ]

    return (
      <Layout title="틱택토" onBack={onBack}>
        <style>{`
          @keyframes ttt-pop {
            0%   { transform: scale(0.3); opacity: 0; }
            60%  { transform: scale(1.18); }
            100% { transform: scale(1);   opacity: 1; }
          }
          @keyframes ttt-float {
            0%, 100% { transform: translateY(0); }
            50%       { transform: translateY(-8px); }
          }
          @keyframes ttt-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes ttt-pulse-ring {
            0%   { box-shadow: 0 0 0 0 rgba(77,114,251,0.45); }
            70%  { box-shadow: 0 0 0 12px rgba(77,114,251,0); }
            100% { box-shadow: 0 0 0 0 rgba(77,114,251,0); }
          }
        `}</style>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 28, padding: '40px 24px 48px', maxWidth: 420, margin: '0 auto', width: '100%',
        }}>
          {/* Board preview deco */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 6, width: 132, height: 132,
            animation: 'ttt-float 3s ease-in-out infinite',
          }}>
            {['X','O','X','O','X','O','X','O','X'].map((v, i) => (
              <div key={i} style={{
                background: v === 'X' ? '#EEF3FF' : '#FFF3EA',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 900,
                color: v === 'X' ? '#4D72FB' : '#FF8C42',
              }}>
                {v}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#1A1A2E', letterSpacing: '-0.5px' }}>
              틱택토
            </div>
            <div style={{ fontSize: 14, color: '#888', marginTop: 6 }}>
              컴퓨터와 대결해봐요!
            </div>
          </div>

          {/* Score (only show if played before) */}
          {(score.wins + score.losses + score.draws) > 0 && (
            <div style={{
              display: 'flex', gap: 14,
              background: '#F7F9FF', borderRadius: 16, padding: '12px 20px',
            }}>
              <ScorePill label="승리" value={score.wins} color="#27AE60" />
              <div style={{ width: 1, background: '#E8ECF4' }} />
              <ScorePill label="패배" value={score.losses} color="#E74C3C" />
              <div style={{ width: 1, background: '#E8ECF4' }} />
              <ScorePill label="무승부" value={score.draws} color="#888" />
            </div>
          )}

          {/* Difficulty */}
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#aaa', marginBottom: 10, textAlign: 'center' }}>
              난이도 선택
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {diffOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { playClick(); setDifficulty(opt.value) }}
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    borderRadius: 14,
                    border: difficulty === opt.value ? `2.5px solid ${opt.color}` : '2.5px solid #E8ECF4',
                    background: difficulty === opt.value ? opt.color + '15' : '#fff',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.16s ease',
                  }}
                >
                  <div style={{
                    fontSize: 14, fontWeight: 900,
                    color: difficulty === opt.value ? opt.color : '#666',
                  }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={startGame} size="lg">
            시작하기
          </Button>

          <div style={{ fontSize: 12, color: '#bbb', textAlign: 'center', lineHeight: 1.5 }}>
            나는 <span style={{ color: '#4D72FB', fontWeight: 700 }}>X</span> &nbsp;·&nbsp;
            컴퓨터는 <span style={{ color: '#FF8C42', fontWeight: 700 }}>O</span>
          </div>
        </div>
      </Layout>
    )
  }

  // ── Result screen ────────────────────────────────────────────────────────

  if (phase === 'result') {
    const playerWon = winInfo?.winner === 'X'
    const aiWon = winInfo?.winner === 'O'

    const resultTitle = playerWon ? '승리!' : aiWon ? '패배!' : '무승부!'
    const resultEmoji = playerWon ? '🌟' : aiWon ? '😢' : '🤝'
    const resultColor = playerWon ? '#27AE60' : aiWon ? '#E74C3C' : '#888'
    const resultMsg = playerWon
      ? '정말 잘했어요! 대단해요!'
      : aiWon
        ? '아쉬워요. 다시 도전해봐요!'
        : '서로 비겼어요!'

    return (
      <Layout title="틱택토" onBack={onBack}>
        <style>{`
          @keyframes ttt-pop {
            0%   { transform: scale(0.3); opacity: 0; }
            60%  { transform: scale(1.18); }
            100% { transform: scale(1);   opacity: 1; }
          }
          @keyframes ttt-float {
            0%, 100% { transform: translateY(0); }
            50%       { transform: translateY(-8px); }
          }
          @keyframes ttt-result-in {
            0%   { transform: scale(0.7) translateY(24px); opacity: 0; }
            100% { transform: scale(1) translateY(0);     opacity: 1; }
          }
        `}</style>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 24, padding: '40px 24px 48px', maxWidth: 420, margin: '0 auto', width: '100%',
        }}>
          {/* Result card */}
          <div style={{
            background: '#F7F9FF', borderRadius: 24, padding: '32px 28px',
            width: '100%', textAlign: 'center',
            boxShadow: '0 8px 32px rgba(77,114,251,0.10)',
            animation: 'ttt-result-in 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ fontSize: 52, marginBottom: 8, animation: 'ttt-float 2.5s ease-in-out infinite' }}>
              {resultEmoji}
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: resultColor, letterSpacing: '-0.5px' }}>
              {resultTitle}
            </div>
            <div style={{ fontSize: 15, color: '#888', marginTop: 8, fontWeight: 500 }}>
              {resultMsg}
            </div>

            {/* Mini board replay */}
            <div style={{ margin: '20px auto 0', display: 'inline-block' }}>
              <MiniBoard board={board} winLine={winInfo?.line ?? null} />
            </div>
          </div>

          {/* Session score */}
          <div style={{
            display: 'flex', gap: 14, width: '100%',
            background: '#F7F9FF', borderRadius: 16, padding: '14px 20px',
            justifyContent: 'center',
          }}>
            <ScorePill label="승리" value={score.wins} color="#27AE60" />
            <div style={{ width: 1, background: '#E8ECF4' }} />
            <ScorePill label="패배" value={score.losses} color="#E74C3C" />
            <div style={{ width: 1, background: '#E8ECF4' }} />
            <ScorePill label="무승부" value={score.draws} color="#888" />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Button onClick={playAgain}>다시 하기</Button>
            <Button onClick={backToStart} variant="outline">처음으로</Button>
          </div>
        </div>
      </Layout>
    )
  }

  // ── Game screen ──────────────────────────────────────────────────────────

  const winLine = winInfo?.line ?? null
  const gameOver = !!winInfo || draw

  const turnLabel = xIsNext ? '내 차례' : '컴퓨터 차례'
  const turnColor = xIsNext ? '#4D72FB' : '#FF8C42'
  const turnBg    = xIsNext ? '#EEF3FF' : '#FFF3EA'

  return (
    <Layout title="틱택토" onBack={onBack}>
      <style>{`
        @keyframes ttt-pop {
          0%   { transform: scale(0.3); opacity: 0; }
          60%  { transform: scale(1.18); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes ttt-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes ttt-thinking {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes ttt-win-cell {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.18); }
          70%  { transform: scale(0.94); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 20, padding: '24px 20px 40px', maxWidth: 420, margin: '0 auto', width: '100%',
      }}>

        {/* Turn indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: turnBg, borderRadius: 20, padding: '10px 22px',
          transition: 'background 0.25s ease',
        }}>
          {aiThinking ? (
            <>
              <ThinkingDots color={turnColor} />
              <span style={{ fontSize: 14, fontWeight: 700, color: turnColor }}>
                컴퓨터가 생각 중...
              </span>
            </>
          ) : (
            <>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: turnColor,
                animation: 'ttt-thinking 1.2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: turnColor }}>
                {turnLabel}
              </span>
            </>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 700 }}>
          <span style={{
            color: '#4D72FB', background: '#EEF3FF',
            padding: '4px 12px', borderRadius: 10,
          }}>X (나)</span>
          <span style={{
            color: '#FF8C42', background: '#FFF3EA',
            padding: '4px 12px', borderRadius: 10,
          }}>O (컴퓨터)</span>
        </div>

        {/* Board */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          padding: 14,
          background: '#F0F4FF',
          borderRadius: 24,
          boxShadow: '0 4px 24px rgba(77,114,251,0.10)',
          width: '100%',
          maxWidth: 340,
        }}>
          {board.map((cell, idx) => {
            const isWinCell = winLine?.includes(idx) ?? false
            const isEmpty = !cell
            const isClickable = isEmpty && xIsNext && !gameOver && !aiThinking

            let cellBg = '#fff'
            let cellShadow = '0 2px 8px rgba(0,0,0,0.06)'
            if (isWinCell) {
              cellBg = winInfo?.winner === 'X' ? '#4D72FB' : '#FF8C42'
              cellShadow = `0 4px 18px ${winInfo?.winner === 'X' ? '#4D72FB' : '#FF8C42'}88`
            } else if (cell === 'X') {
              cellBg = '#EEF3FF'
              cellShadow = '0 2px 10px #4D72FB22'
            } else if (cell === 'O') {
              cellBg = '#FFF3EA'
              cellShadow = '0 2px 10px #FF8C4222'
            }

            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                style={{
                  aspectRatio: '1',
                  background: cellBg,
                  borderRadius: 16,
                  border: 'none',
                  cursor: isClickable ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: cellShadow,
                  transition: 'background 0.22s ease, box-shadow 0.22s ease, transform 0.14s ease',
                  animation: isWinCell ? 'ttt-win-cell 0.45s ease forwards' : 'none',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onMouseEnter={e => {
                  if (isClickable) (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = ''
                }}
                onMouseDown={e => {
                  if (isClickable) (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)'
                }}
                onMouseUp={e => {
                  if (isClickable) (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'
                }}
              >
                <CellMark cell={cell} winning={isWinCell} />
                {!cell && isClickable && (
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#4D72FB18',
                    transition: 'opacity 0.15s',
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Difficulty badge */}
        <div style={{ fontSize: 12, color: '#bbb', fontWeight: 600 }}>
          난이도: {difficulty === 'easy' ? '쉬움' : difficulty === 'medium' ? '보통' : '어려움'}
        </div>

        {/* Session score during game */}
        {(score.wins + score.losses + score.draws) > 0 && (
          <div style={{
            display: 'flex', gap: 14,
            background: '#F7F9FF', borderRadius: 14, padding: '10px 18px',
          }}>
            <ScorePill label="승리" value={score.wins} color="#27AE60" />
            <div style={{ width: 1, background: '#E8ECF4' }} />
            <ScorePill label="패배" value={score.losses} color="#E74C3C" />
            <div style={{ width: 1, background: '#E8ECF4' }} />
            <ScorePill label="무승부" value={score.draws} color="#888" />
          </div>
        )}
      </div>
    </Layout>
  )
}

// ── Helper components ────────────────────────────────────────────────────────

function ScorePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 48 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', marginTop: 1 }}>{label}</div>
    </div>
  )
}

function ThinkingDots({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: color,
            animation: `ttt-thinking 1s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function MiniBoard({ board, winLine }: { board: Board; winLine: number[] | null }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
      gap: 5, padding: 8,
      background: '#E8ECF4', borderRadius: 14,
    }}>
      {board.map((cell, idx) => {
        const isWin = winLine?.includes(idx) ?? false
        let bg = '#fff'
        if (isWin) bg = cell === 'X' ? '#4D72FB' : '#FF8C42'
        else if (cell === 'X') bg = '#EEF3FF'
        else if (cell === 'O') bg = '#FFF3EA'

        return (
          <div
            key={idx}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 900,
              color: isWin ? '#fff' : cell === 'X' ? '#4D72FB' : cell === 'O' ? '#FF8C42' : 'transparent',
            }}
          >
            {cell ?? ''}
          </div>
        )
      })}
    </div>
  )
}
