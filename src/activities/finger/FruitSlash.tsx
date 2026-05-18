import { useRef, useEffect, useState } from 'react'
import { drawSkeleton, isIndexOnly, lmX, lmY, lineHitsCircle, hud, type FrameHandler } from './shared'

const FRUIT_TYPES = [
  { emoji: '🍎', color: '#FF4444' }, { emoji: '🍊', color: '#FF8800' },
  { emoji: '🍋', color: '#FFD700' }, { emoji: '🍇', color: '#9944CC' },
  { emoji: '🍓', color: '#FF4488' }, { emoji: '🍌', color: '#FFCC44' },
  { emoji: '🍑', color: '#FF9966' }, { emoji: '🍍', color: '#88CC44' },
]

interface Fruit {
  id: number; x: number; y: number; vx: number; vy: number; r: number
  emoji: string; color: string
  sliced: boolean; sliceT?: number; half1Vy?: number; half2Vy?: number
}

interface State {
  fruits: Fruit[]; score: number; lives: number; nextId: number
  lastSpawn: number; spawnMs: number
  prevFx: number | null; prevFy: number | null
  gameOver: boolean; startT: number
}

interface Props { setFrameHandler: (fn: FrameHandler | null) => void; onBack: () => void }

export default function FruitSlash({ setFrameHandler, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef  = useRef<State>({ fruits: [], score: 0, lives: 3, nextId: 0, lastSpawn: 0, spawnMs: 2000, prevFx: null, prevFy: null, gameOver: false, startT: 0 })
  const lastTRef  = useRef(0)
  const [gameOver, setGameOver] = useState(false)
  const [finalScore, setFinalScore] = useState(0)

  const reset = () => {
    Object.assign(stateRef.current, { fruits: [], score: 0, lives: 3, nextId: 0, lastSpawn: 0, spawnMs: 2000, prevFx: null, prevFy: null, gameOver: false, startT: Date.now() })
    lastTRef.current = Date.now()
    setGameOver(false)
    setFinalScore(0)
  }

  useEffect(() => {
    reset()
    const handler: FrameHandler = (lm, vw, vh) => {
      const c = canvasRef.current; if (!c) return
      if (c.width !== vw) { c.width = vw; c.height = vh }
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, vw, vh)

      const now = Date.now()
      const dt  = Math.min((now - lastTRef.current) / 1000, 0.08)
      lastTRef.current = now
      const s = stateRef.current

      if (s.gameOver) { drawOver(ctx, vw, vh, s.score); return }

      // Spawn
      if (now - s.lastSpawn > s.spawnMs && s.fruits.filter(f => !f.sliced).length < 5) {
        s.lastSpawn = now
        s.spawnMs = Math.max(700, s.spawnMs - 25)
        spawnFruit(s, vw, vh)
      }

      // Gesture: index-only → blade
      let isDraw = false, fx = 0, fy = 0
      if (lm) {
        isDraw = isIndexOnly(lm)
        fx = lmX(lm[8], vw); fy = lmY(lm[8], vh)
        if (isDraw && s.prevFx !== null) {
          const speed = Math.hypot(fx - s.prevFx!, fy - s.prevFy!)
          if (speed > vw * 0.04) { // fast swipe threshold
            for (const f of s.fruits) {
              if (!f.sliced && lineHitsCircle(s.prevFx!, s.prevFy!, fx, fy, f.x, f.y, f.r)) {
                f.sliced = true; f.sliceT = now
                f.half1Vy = -200; f.half2Vy = -120
                s.score += 10
              }
            }
          }
        }
        s.prevFx = isDraw ? fx : null; s.prevFy = isDraw ? fy : null
      } else { s.prevFx = null; s.prevFy = null }

      // Physics
      const G = 400 // px/s²
      for (const f of s.fruits) {
        if (!f.sliced) {
          f.vy += G * dt; f.x += f.vx * dt; f.y += f.vy * dt
        } else {
          f.half1Vy = (f.half1Vy ?? 0) + G * dt
          f.half2Vy = (f.half2Vy ?? 0) + G * dt
        }
      }

      // Remove fruits & check misses
      s.fruits = s.fruits.filter(f => {
        if (!f.sliced && f.y > vh + f.r + 40) {
          s.lives--; return false
        }
        if (f.sliced && (now - (f.sliceT ?? 0)) > 900) return false
        return true
      })

      // Draw
      for (const f of s.fruits) {
        if (!f.sliced) drawFruit(ctx, f)
        else drawSliced(ctx, f, now)
      }

      // Blade cursor + trail
      if (isDraw && lm) {
        if (s.prevFx !== null) {
          ctx.beginPath(); ctx.moveTo(s.prevFx, s.prevFy!)
          ctx.lineTo(fx, fy)
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke()
        }
        ctx.beginPath(); ctx.arc(fx, fy, 14, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill()
      }

      if (lm) drawSkeleton(ctx, lm, vw, vh)
      hud(ctx, vw, s.score, s.lives)

      // Game over
      if (s.lives <= 0 && !s.gameOver) {
        s.gameOver = true; setGameOver(true); setFinalScore(s.score)
      }
    }
    setFrameHandler(handler)
    return () => setFrameHandler(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setFrameHandler])

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <BackBtn onBack={onBack} />
      {gameOver && (
        <GameOverScreen score={finalScore}
          onRestart={reset}
          onBack={onBack}
          tip="검지손가락을 빠르게 휘두르면 과일이 잘려요!" />
      )}
    </>
  )
}

function spawnFruit(s: State, vw: number, vh: number) {
  const ft = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)]
  const r  = 28 + Math.random() * 14
  const fromLeft = Math.random() < 0.5
  const x = fromLeft ? r + Math.random() * vw * 0.35 : vw - r - Math.random() * vw * 0.35
  const vx = (fromLeft ? 1 : -1) * (30 + Math.random() * 60)
  const vy = -(580 + Math.random() * 200)
  s.fruits.push({ id: s.nextId++, x, y: vh + r, vx, vy, r, emoji: ft.emoji, color: ft.color, sliced: false })
}

function drawFruit(ctx: CanvasRenderingContext2D, f: Fruit) {
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 10
  ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
  ctx.fillStyle = f.color; ctx.fill()
  ctx.shadowBlur = 0
  ctx.beginPath(); ctx.arc(f.x - f.r * 0.25, f.y - f.r * 0.25, f.r * 0.28, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill()
  ctx.font = `${f.r * 1.1}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(f.emoji, f.x, f.y)
}

function drawSliced(ctx: CanvasRenderingContext2D, f: Fruit, now: number) {
  const age = (now - (f.sliceT ?? now)) / 1000
  const alpha = 1 - age / 0.9
  const vy1 = (f.half1Vy ?? 0) * age
  const vy2 = (f.half2Vy ?? 0) * age
  ctx.save(); ctx.globalAlpha = Math.max(0, alpha)
  const emoji = (dx: number, dy: number) => {
    ctx.font = `${f.r * 0.9}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(f.emoji, f.x + dx, f.y + dy)
  }
  emoji(-f.r * 0.5, vy1); emoji(f.r * 0.5, vy2)
  // Juice effect
  ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.4 * alpha, 0, Math.PI * 2)
  ctx.fillStyle = f.color + '88'; ctx.fill()
  ctx.restore()
}

function drawOver(ctx: CanvasRenderingContext2D, vw: number, vh: number, score: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, vw, vh)
}

// ── Shared components ──
function BackBtn({ onBack }: { onBack: () => void }) {
  return <button onClick={onBack} style={pill}>← 뒤로</button>
}

function GameOverScreen({ score, onRestart, onBack, tip }: {
  score: number; onRestart: () => void; onBack: () => void; tip?: string
}) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 12, color: '#fff', textAlign: 'center', padding: 24,
    }}>
      <div style={{ fontSize: 48 }}>🎮</div>
      <div style={{ fontWeight: 900, fontSize: 24 }}>게임 오버</div>
      <div style={{ fontWeight: 700, fontSize: 20 }}>점수: {score}점</div>
      {tip && <div style={{ fontSize: 12, color: '#ccc', maxWidth: 260 }}>{tip}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button onClick={onRestart} style={solidBtn}>다시 하기</button>
        <button onClick={onBack} style={ghostBtn}>게임 목록</button>
      </div>
    </div>
  )
}

const pill: React.CSSProperties = {
  position: 'absolute', top: 10, left: 10,
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
  color: '#fff', border: 'none', borderRadius: 20,
  padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
const solidBtn: React.CSSProperties = {
  background: '#4D72FB', color: '#fff', border: 'none',
  borderRadius: 12, padding: '10px 24px', fontWeight: 700, fontSize: 15, cursor: 'pointer',
}
const ghostBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)', color: '#fff',
  border: '2px solid rgba(255,255,255,0.4)',
  borderRadius: 12, padding: '10px 24px', fontWeight: 700, fontSize: 15, cursor: 'pointer',
}
