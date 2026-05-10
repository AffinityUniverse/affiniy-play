import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { playClick, playSuccess, playError, playPop } from '../utils/sounds'

interface Props { onBack: () => void }

interface Cell {
  isMine: boolean
  revealed: boolean
  flagged: boolean
  adjacent: number
}

type GameState = 'idle' | 'playing' | 'won' | 'lost'
type Difficulty = 'easy' | 'medium' | 'hard'

const DIFF_CONFIG: Record<Difficulty, { rows: number; cols: number; mines: number; label: string; color: string; emoji: string }> = {
  easy:   { rows: 9,  cols: 9,  mines: 10, label: '쉬움',   color: '#27AE60', emoji: '🌱' },
  medium: { rows: 12, cols: 12, mines: 25, label: '보통',   color: '#E8731A', emoji: '🔥' },
  hard:   { rows: 16, cols: 16, mines: 40, label: '어려움', color: '#CC0000', emoji: '💀' },
}

const NUM_COLORS: Record<number, string> = {
  1: '#0044DD', 2: '#007700', 3: '#CC0000',
  4: '#000088', 5: '#880000', 6: '#007777',
  7: '#111111', 8: '#555555',
}

function createEmptyBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false, revealed: false, flagged: false, adjacent: 0,
    }))
  )
}

function getNeighbors(row: number, col: number, rows: number, cols: number): [number, number][] {
  const neighbors: [number, number][] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr, nc = col + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) neighbors.push([nr, nc])
    }
  }
  return neighbors
}

function placeMines(board: Cell[][], firstRow: number, firstCol: number, mines: number, rows: number, cols: number): Cell[][] {
  const newBoard = board.map(r => r.map(c => ({ ...c })))
  const forbidden = new Set<string>()
  forbidden.add(`${firstRow},${firstCol}`)
  for (const [nr, nc] of getNeighbors(firstRow, firstCol, rows, cols)) forbidden.add(`${nr},${nc}`)

  const candidates: [number, number][] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!forbidden.has(`${r},${c}`)) candidates.push([r, c])

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  for (let i = 0; i < mines; i++) {
    const [r, c] = candidates[i]
    newBoard[r][c].isMine = true
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!newBoard[r][c].isMine)
        newBoard[r][c].adjacent = getNeighbors(r, c, rows, cols).filter(([nr, nc]) => newBoard[nr][nc].isMine).length

  return newBoard
}

function floodReveal(board: Cell[][], row: number, col: number, rows: number, cols: number): Cell[][] {
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
    if (newBoard[r][c].adjacent === 0 && !newBoard[r][c].isMine)
      for (const [nr, nc] of getNeighbors(r, c, rows, cols))
        if (!visited.has(`${nr},${nc}`)) queue.push([nr, nc])
  }
  return newBoard
}

function checkWin(board: Cell[][], rows: number, cols: number): boolean {
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!board[r][c].isMine && !board[r][c].revealed) return false
  return true
}

export default function MinesweeperGame({ onBack }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [showDiffSelect, setShowDiffSelect] = useState(true)
  const [board, setBoard] = useState<Cell[][]>(() => createEmptyBoard(9, 9))
  const [gameState, setGameState] = useState<GameState>('idle')
  const [firstClick, setFirstClick] = useState(true)
  const [flagCount, setFlagCount] = useState(0)
  const [time, setTime] = useState(0)

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longFiredRef = useRef(false)
  const diffRef     = useRef<Difficulty>('easy')

  // difficulty 변경 시 diffRef 동기화
  useEffect(() => { diffRef.current = difficulty }, [difficulty])

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [gameState])

  const cfg = DIFF_CONFIG[difficulty]

  const restart = useCallback((diff?: Difficulty) => {
    const d = diff ?? diffRef.current
    setDifficulty(d)
    diffRef.current = d
    const c = DIFF_CONFIG[d]
    setBoard(createEmptyBoard(c.rows, c.cols))
    setGameState('idle')
    setFirstClick(true)
    setFlagCount(0)
    setTime(0)
    setShowDiffSelect(false)
  }, [])

  const revealCell = useCallback((row: number, col: number) => {
    if (longFiredRef.current) return
    const d = diffRef.current
    const c = DIFF_CONFIG[d]
    setBoard(prev => {
      const cell = prev[row][col]
      if (cell.revealed || cell.flagged) return prev
      let wb = prev.map(r => r.map(c => ({ ...c })))
      if (firstClick) {
        wb = placeMines(wb, row, col, c.mines, c.rows, c.cols)
        setFirstClick(false)
        setGameState('playing')
      }
      if (wb[row][col].isMine) {
        wb = wb.map(r => r.map(c => c.isMine ? { ...c, revealed: true } : c))
        setGameState('lost')
        playError()
        return wb
      }
      wb = floodReveal(wb, row, col, c.rows, c.cols)
      playPop()
      if (checkWin(wb, c.rows, c.cols)) {
        setGameState('won')
        playSuccess()
      }
      return wb
    })
  }, [firstClick])

  const toggleFlag = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault()
    if (gameState !== 'playing') return
    playClick()
    setBoard(prev => {
      const cell = prev[row][col]
      if (cell.revealed) return prev
      const nb = prev.map(r => r.map(c => ({ ...c })))
      nb[row][col].flagged = !nb[row][col].flagged
      setFlagCount(f => nb[row][col].flagged ? f + 1 : f - 1)
      return nb
    })
  }, [gameState])

  const handleTouchStart = useCallback((row: number, col: number) => {
    longFiredRef.current = false
    longPressRef.current = setTimeout(() => {
      longFiredRef.current = true
      if (gameState === 'playing') {
        playClick()
        setBoard(prev => {
          const cell = prev[row][col]
          if (cell.revealed) return prev
          const nb = prev.map(r => r.map(c => ({ ...c })))
          nb[row][col].flagged = !nb[row][col].flagged
          setFlagCount(f => nb[row][col].flagged ? f + 1 : f - 1)
          return nb
        })
      }
    }, 450)
  }, [gameState])

  const handleTouchEnd = useCallback(() => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null }
  }, [])

  const faceEmoji = gameState === 'lost' ? '💀' : gameState === 'won' ? '🏆' : '😊'

  // 셀 크기: 화면 너비와 컬럼 수에 맞게 계산
  const maxGridW = Math.min(window.innerWidth - 32, 500)
  const cellPx   = Math.floor((maxGridW - (cfg.cols - 1) * 2 - 4) / cfg.cols)
  const cellSize  = `${cellPx}px`

  const containerStyle: CSSProperties = {
    maxWidth: 520, margin: '0 auto',
    padding: '12px 16px 32px', width: '100%', userSelect: 'none',
  }

  if (showDiffSelect) {
    return (
      <Layout title="지뢰 찾기" onBack={onBack}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 20px' }}>
          <div style={{ fontSize:22, fontWeight:900, color:'#333', marginBottom:8 }}>난이도 선택</div>
          <div style={{ fontSize:14, color:'#888', marginBottom:28 }}>원하는 난이도를 골라주세요!</div>
          <div style={{ display:'flex', flexDirection:'column', gap:14, width:'100%', maxWidth:320 }}>
            {(Object.entries(DIFF_CONFIG) as [Difficulty, typeof DIFF_CONFIG[Difficulty]][]).map(([key, conf]) => (
              <button
                key={key}
                onClick={() => restart(key as Difficulty)}
                style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'18px 24px',
                  background:'#fff',
                  border:`3px solid ${conf.color}`,
                  borderRadius:16,
                  cursor:'pointer',
                  textAlign:'left',
                  transition:'transform 0.15s, box-shadow 0.15s',
                  boxShadow:`0 4px 16px ${conf.color}33`,
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
              >
                <span style={{ fontSize:32 }}>{conf.emoji}</span>
                <div>
                  <div style={{ fontWeight:900, fontSize:17, color:conf.color }}>{conf.label}</div>
                  <div style={{ fontWeight:500, fontSize:13, color:'#666', marginTop:2 }}>
                    {conf.cols}×{conf.rows}칸 · 지뢰 {conf.mines}개
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="지뢰 찾기" onBack={onBack}>
      <div style={containerStyle}>
        {/* 난이도 배지 + 헤더 바 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <button
            onClick={() => setShowDiffSelect(true)}
            style={{
              background: cfg.color, color:'#fff',
              border:'none', borderRadius:20, padding:'4px 12px',
              fontWeight:800, fontSize:12, cursor:'pointer',
              display:'flex', alignItems:'center', gap:5,
            }}
          >
            {cfg.emoji} {cfg.label}
          </button>
          <div style={{ fontWeight:800, fontSize:14, color:'#555' }}>⏱ {time}초</div>
        </div>

        {/* 상태바 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#EEF3FF', borderRadius:12, padding:'10px 16px', marginBottom:12, fontWeight:800, fontSize:15 }}>
          <span style={{ color:'#333', display:'flex', alignItems:'center', gap:6 }}>
            <img src="chars/bear.png" alt="지뢰" style={{ width:20, height:20, objectFit:'contain', borderRadius:4 }} />
            {Math.max(0, cfg.mines - flagCount)}
          </span>
          <button
            onClick={() => restart()}
            style={{ fontSize:26, background:'none', border:'none', cursor:'pointer', lineHeight:1, padding:'2px 10px', borderRadius:8 }}
          >
            {faceEmoji}
          </button>
          <span style={{ color:cfg.color, fontSize:12, fontWeight:700 }}>
            {cfg.cols}×{cfg.rows}
          </span>
        </div>

        {/* 안내 메시지 */}
        {gameState === 'won'  && <div style={{ textAlign:'center', padding:'10px', marginBottom:10, background:'#EEF3FF', borderRadius:10, color:'#4D72FB', fontWeight:800, fontSize:15 }}>🎉 성공! 모든 지뢰를 찾았어요!</div>}
        {gameState === 'lost' && <div style={{ textAlign:'center', padding:'10px', marginBottom:10, background:'#FFEEEE', borderRadius:10, color:'#CC0000', fontWeight:800, fontSize:15 }}>💥 지뢰를 밟았어요!</div>}
        {gameState === 'idle' && <div style={{ textAlign:'center', padding:'5px', marginBottom:8, color:'#999', fontSize:12 }}>칸을 클릭해서 시작 | 우클릭/꾹 누르기 = 🚩 깃발</div>}

        {/* 그리드 */}
        <div style={{ overflowX:'auto' }}>
          <div style={{
            display:'grid',
            gridTemplateColumns:`repeat(${cfg.cols}, ${cellSize})`,
            gap:2,
            background:'#8A9FE8',
            borderRadius:8,
            padding:2,
            border:`3px solid ${cfg.color}`,
            width:'fit-content',
            margin:'0 auto',
          }}>
            {board.map((row, ri) =>
              row.map((cell, ci) => {
                let bg = '#C8D4FF', content: React.ReactNode = null
                let border = `1.5px solid #A0B0F0`
                let boxShadow = 'inset 0 2px 0 rgba(255,255,255,0.5)'

                if (cell.revealed) {
                  boxShadow = 'none'
                  if (cell.isMine) {
                    bg = '#FF6B6B'; border = '1.5px solid #CC0000'
                    content = <span style={{ fontSize: Math.max(cellPx * 0.55, 10) }}>💣</span>
                  } else {
                    bg = '#FFFFFF'; border = '1.5px solid #D0D8FF'
                    if (cell.adjacent > 0)
                      content = <span style={{ color:NUM_COLORS[cell.adjacent], fontWeight:900, fontSize:Math.max(cellPx*0.52, 10), lineHeight:1 }}>{cell.adjacent}</span>
                  }
                } else if (cell.flagged) {
                  content = <span style={{ fontSize:Math.max(cellPx*0.5, 10) }}>🚩</span>
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
                      width: cellSize, height: cellSize,
                      background: bg, border, borderRadius: cellPx > 24 ? 6 : 4,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor: cell.revealed ? 'default' : 'pointer',
                      boxSizing:'border-box', transition:'background 0.1s', boxShadow,
                    }}
                  >
                    {content}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:18, display:'flex', gap:10, justifyContent:'center' }}>
          <Button onClick={() => restart()} size="sm" variant="outline">다시 시작</Button>
          <Button onClick={() => setShowDiffSelect(true)} size="sm" variant="outline">난이도 변경</Button>
        </div>
      </div>
    </Layout>
  )
}
