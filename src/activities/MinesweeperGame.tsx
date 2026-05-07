import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

interface Cell {
  isMine: boolean
  revealed: boolean
  flagged: boolean
  adjacent: number
}

type GameState = 'idle' | 'playing' | 'won' | 'lost'

const ROWS = 9
const COLS = 9
const MINES = 15

const NUM_COLORS: Record<number, string> = {
  1: '#0000FF',
  2: '#008000',
  3: '#FF0000',
  4: '#00008B',
  5: '#8B0000',
  6: '#008B8B',
  7: '#000000',
  8: '#808080',
}

function createEmptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      isMine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  )
}

function getNeighbors(row: number, col: number): [number, number][] {
  const neighbors: [number, number][] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        neighbors.push([nr, nc])
      }
    }
  }
  return neighbors
}

function placeMines(board: Cell[][], firstRow: number, firstCol: number): Cell[][] {
  const newBoard = board.map(r => r.map(c => ({ ...c })))
  const forbidden = new Set<string>()
  forbidden.add(`${firstRow},${firstCol}`)
  for (const [nr, nc] of getNeighbors(firstRow, firstCol)) {
    forbidden.add(`${nr},${nc}`)
  }

  const candidates: [number, number][] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!forbidden.has(`${r},${c}`)) candidates.push([r, c])
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  for (let i = 0; i < MINES; i++) {
    const [r, c] = candidates[i]
    newBoard[r][c].isMine = true
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!newBoard[r][c].isMine) {
        newBoard[r][c].adjacent = getNeighbors(r, c).filter(([nr, nc]) => newBoard[nr][nc].isMine).length
      }
    }
  }

  return newBoard
}

function floodReveal(board: Cell[][], row: number, col: number): Cell[][] {
  const newBoard = board.map(r => r.map(c => ({ ...c })))
  const queue: [number, number][] = [[row, col]]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    const key = `${r},${c}`
    if (visited.has(key)) continue
    visited.add(key)

    if (newBoard[r][c].flagged || newBoard[r][c].revealed) continue
    newBoard[r][c].revealed = true

    if (newBoard[r][c].adjacent === 0 && !newBoard[r][c].isMine) {
      for (const [nr, nc] of getNeighbors(r, c)) {
        if (!visited.has(`${nr},${nc}`)) {
          queue.push([nr, nc])
        }
      }
    }
  }

  return newBoard
}

function checkWin(board: Cell[][]): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c].isMine && !board[r][c].revealed) return false
    }
  }
  return true
}

export default function MinesweeperGame({ onBack }: Props) {
  const [board, setBoard] = useState<Cell[][]>(createEmptyBoard)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [firstClick, setFirstClick] = useState(true)
  const [flagCount, setFlagCount] = useState(0)
  const [time, setTime] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [gameState])

  const restart = useCallback(() => {
    setBoard(createEmptyBoard())
    setGameState('idle')
    setFirstClick(true)
    setFlagCount(0)
    setTime(0)
  }, [])

  const revealCell = useCallback((row: number, col: number) => {
    if (longPressFiredRef.current) return
    setBoard(prev => {
      const cell = prev[row][col]
      if (cell.revealed || cell.flagged) return prev

      let workBoard = prev.map(r => r.map(c => ({ ...c })))

      if (firstClick) {
        workBoard = placeMines(workBoard, row, col)
        setFirstClick(false)
        setGameState('playing')
      }

      if (workBoard[row][col].isMine) {
        workBoard = workBoard.map(r =>
          r.map(c => c.isMine ? { ...c, revealed: true } : c)
        )
        setGameState('lost')
        return workBoard
      }

      workBoard = floodReveal(workBoard, row, col)

      if (checkWin(workBoard)) {
        setGameState('won')
      }

      return workBoard
    })
  }, [firstClick])

  const toggleFlag = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault()
    if (gameState !== 'playing') return

    setBoard(prev => {
      const cell = prev[row][col]
      if (cell.revealed) return prev
      const newBoard = prev.map(r => r.map(c => ({ ...c })))
      newBoard[row][col].flagged = !newBoard[row][col].flagged
      setFlagCount(f => newBoard[row][col].flagged ? f + 1 : f - 1)
      return newBoard
    })
  }, [gameState])

  const handleTouchStart = useCallback((row: number, col: number) => {
    longPressFiredRef.current = false
    longPressRef.current = setTimeout(() => {
      longPressFiredRef.current = true
      if (gameState === 'playing') {
        setBoard(prev => {
          const cell = prev[row][col]
          if (cell.revealed) return prev
          const newBoard = prev.map(r => r.map(c => ({ ...c })))
          newBoard[row][col].flagged = !newBoard[row][col].flagged
          setFlagCount(f => newBoard[row][col].flagged ? f + 1 : f - 1)
          return newBoard
        })
      }
    }, 500)
  }, [gameState])

  const handleTouchEnd = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }, [])

  const faceEmoji = gameState === 'lost' ? '💀' : gameState === 'won' ? '🏆' : '😀'
  const cellSize = `calc((min(100vw, 480px) - 40px) / 9)`

  const containerStyle: CSSProperties = {
    maxWidth: 480,
    margin: '0 auto',
    padding: '12px 20px 32px',
    width: '100%',
    userSelect: 'none',
  }

  const headerBarStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#EEF3FF',
    borderRadius: 12,
    padding: '10px 16px',
    marginBottom: 12,
    fontWeight: 800,
    fontSize: 15,
  }

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(9, 1fr)',
    gap: 2,
    background: '#8A9FE8',
    borderRadius: 8,
    padding: 2,
    border: '3px solid #4D72FB',
  }

  return (
    <Layout title="지뢰 찾기" onBack={onBack}>
      <div style={containerStyle}>
        {/* Header bar: mine counter | face button | timer */}
        <div style={headerBarStyle}>
          <span style={{ color: '#333', minWidth: 60 }}>
            💣 {Math.max(0, MINES - flagCount)}
          </span>
          <button
            onClick={restart}
            style={{
              fontSize: 24,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px 8px',
              borderRadius: 8,
            }}
          >
            {faceEmoji}
          </button>
          <span style={{ color: '#333', minWidth: 60, textAlign: 'right' }}>
            ⏱ {time}초
          </span>
        </div>

        {gameState === 'won' && (
          <div style={{ textAlign: 'center', padding: '10px', marginBottom: 10, background: '#EEF3FF', borderRadius: 10, color: '#4D72FB', fontWeight: 800, fontSize: 15 }}>
            🎉 성공! 모든 지뢰를 찾았어요!
          </div>
        )}
        {gameState === 'lost' && (
          <div style={{ textAlign: 'center', padding: '10px', marginBottom: 10, background: '#FFEEEE', borderRadius: 10, color: '#CC0000', fontWeight: 800, fontSize: 15 }}>
            💥 지뢰를 밟았어요!
          </div>
        )}
        {gameState === 'idle' && (
          <div style={{ textAlign: 'center', padding: '6px', marginBottom: 8, color: '#999', fontSize: 13 }}>
            칸을 클릭해서 시작하세요 | 우클릭(꾹 누르기) = 깃발
          </div>
        )}

        {/* Grid */}
        <div style={gridStyle}>
          {board.map((row, ri) =>
            row.map((cell, ci) => {
              let bg = '#C8D4FF'
              let content: React.ReactNode = null
              let border = '1.5px solid #A0B0F0'
              let boxShadow = 'inset 0 2px 0 rgba(255,255,255,0.5)'

              if (cell.revealed) {
                boxShadow = 'none'
                if (cell.isMine) {
                  bg = '#FF6B6B'
                  content = <span style={{ fontSize: 14 }}>💣</span>
                  border = '1.5px solid #CC0000'
                } else {
                  bg = '#FFFFFF'
                  border = '1.5px solid #D0D8FF'
                  if (cell.adjacent > 0) {
                    content = (
                      <span style={{
                        color: NUM_COLORS[cell.adjacent],
                        fontWeight: 900,
                        fontSize: 13,
                        lineHeight: 1,
                      }}>
                        {cell.adjacent}
                      </span>
                    )
                  }
                }
              } else if (cell.flagged) {
                content = (
                  <img
                    src="slice/slice7.png"
                    alt="깃발"
                    style={{ width: 16, height: 16, objectFit: 'contain' }}
                  />
                )
              }

              return (
                <div
                  key={`${ri}-${ci}`}
                  onClick={() => revealCell(ri, ci)}
                  onContextMenu={e => toggleFlag(e, ri, ci)}
                  onTouchStart={() => handleTouchStart(ri, ci)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: bg,
                    border,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: cell.revealed ? 'default' : 'pointer',
                    boxSizing: 'border-box',
                    transition: 'background 0.1s',
                    boxShadow,
                  }}
                >
                  {content}
                </div>
              )
            })
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Button onClick={restart} size="sm" variant="outline">
            다시 시작
          </Button>
        </div>
      </div>
    </Layout>
  )
}
