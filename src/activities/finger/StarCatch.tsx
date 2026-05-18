import { useRef, useEffect, useState } from 'react'
import { drawSkeleton, palmCenter, hud, lmX, lmY, type FrameHandler } from './shared'

const STAR_COLORS = ['#FFD700','#FF8800','#FF4444','#44AAFF','#9944CC','#88CC44']
const STAR_PTS   = [10, 10, 20, 20, 30, 30] // points per color (indexed same as STAR_COLORS)

interface Star {
  id: number; x: number; y: number; vy: number; r: number
  color: string; pts: number; angle: number; spin: number
  caught: boolean; catchT?: number; missT?: number
}

interface State {
  stars: Star[]; score: number; lives: number; nextId: number
  lastSpawn: number; spawnMs: number; gameOver: boolean; multiplier: number; multiTimer: number
}

interface Props { setFrameHandler: (fn: FrameHandler | null) => void; onBack: () => void }

export default function StarCatch({ setFrameHandler, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef  = useRef<State>({ stars: [], score: 0, lives: 3, nextId: 0, lastSpawn: 0, spawnMs: 1500, gameOver: false, multiplier: 1, multiTimer: 0 })
  const lastTRef  = useRef(Date.now())
  const [gameOver, setGameOver] = useState(false)
  const [finalScore, setFinalScore] = useState(0)

  const reset = () => {
    Object.assign(stateRef.current, { stars: [], score: 0, lives: 3, nextId: 0, lastSpawn: 0, spawnMs: 1500, gameOver: false, multiplier: 1, multiTimer: 0 })
    lastTRef.current = Date.now()
    setGameOver(false); setFinalScore(0)
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

      if (s.gameOver) { ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,vw,vh); return }

      // Spawn
      if (now - s.lastSpawn > s.spawnMs && s.stars.filter(st=>!st.caught && !st.missT).length < 6) {
        s.lastSpawn = now
        s.spawnMs = Math.max(600, s.spawnMs - 15)
        const ci = Math.floor(Math.random() * STAR_COLORS.length)
        const r  = 18 + Math.random() * 14
        s.stars.push({
          id: s.nextId++,
          x: r + Math.random() * (vw - r * 2),
          y: -r, vy: 90 + Math.random() * 120,
          r, color: STAR_COLORS[ci], pts: STAR_PTS[ci],
          angle: 0, spin: (Math.random() - 0.5) * 4,
          caught: false,
        })
      }

      // Palm position
      let px: number | null = null, py: number | null = null
      const CATCH_R = vw * 0.12 // catch radius ≈ 12% of vw
      if (lm) {
        ;[px, py] = palmCenter(lm, vw, vh)
      }

      // Update stars
      for (const st of s.stars) {
        if (!st.caught && !st.missT) {
          st.y += st.vy * dt
          st.angle += st.spin * dt
          // Catch
          if (px !== null && Math.hypot(px - st.x, py! - st.y) < CATCH_R + st.r) {
            st.caught = true; st.catchT = now
            s.score += st.pts * s.multiplier
            s.multiplier = Math.min(4, s.multiplier + 0.5)
            s.multiTimer = now + 3000
          }
          // Miss
          if (st.y > vh + st.r + 10) {
            st.missT = now; s.lives--; s.multiplier = 1
          }
        }
      }
      // Multiplier decay
      if (s.multiplier > 1 && now > s.multiTimer) s.multiplier = 1

      // Remove old
      s.stars = s.stars.filter(st => {
        if (st.caught) return (now - (st.catchT ?? 0)) < 500
        if (st.missT)  return (now - st.missT) < 400
        return true
      })

      // Draw stars
      for (const st of s.stars) {
        const alpha = st.caught
          ? 1 - (now - (st.catchT ?? 0)) / 500
          : st.missT
          ? 1 - (now - st.missT) / 400
          : 1
        ctx.save(); ctx.globalAlpha = Math.max(0, alpha)
        drawStar(ctx, st.x, st.y, st.r, st.color, st.angle)
        if (st.caught) {
          ctx.fillStyle = '#FFD700'; ctx.font = `bold ${st.r}px sans-serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText(`+${st.pts * s.multiplier}`, st.x, st.y - st.r * 2)
        }
        ctx.restore()
      }

      // Catch zone indicator
      if (px !== null) {
        ctx.save()
        ctx.beginPath(); ctx.arc(px, py!, CATCH_R, 0, Math.PI*2)
        ctx.strokeStyle = 'rgba(255,215,0,0.5)'; ctx.lineWidth = 2
        ctx.setLineDash([6, 4]); ctx.stroke()
        ctx.setLineDash([])
        // Palm centre dot
        ctx.beginPath(); ctx.arc(px, py!, 8, 0, Math.PI*2)
        ctx.fillStyle = 'rgba(255,215,0,0.6)'; ctx.fill()
        ctx.restore()
      }

      if (lm) drawSkeleton(ctx, lm, vw, vh)
      hud(ctx, vw, s.score, s.lives)

      // Multiplier badge
      if (s.multiplier > 1) {
        ctx.save()
        ctx.fillStyle = '#FFD700'
        ctx.font = `bold ${vw*0.045}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 5
        ctx.fillText(`×${s.multiplier} 배율!`, vw/2, vw*0.06)
        ctx.restore()
      }

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
      <canvas ref={canvasRef} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }} />
      <BackBtn onBack={onBack} />
      {gameOver && <GameOverScreen score={finalScore} onRestart={reset} onBack={onBack}
        tip="손바닥을 펼쳐 떨어지는 별을 잡아요!" />}
    </>
  )
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, angle: number) {
  const POINTS = 5
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle)
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8
  ctx.beginPath()
  for (let i = 0; i < POINTS * 2; i++) {
    const a = (i * Math.PI) / POINTS - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.42
    i === 0 ? ctx.moveTo(Math.cos(a)*rad, Math.sin(a)*rad) : ctx.lineTo(Math.cos(a)*rad, Math.sin(a)*rad)
  }
  ctx.closePath()
  ctx.fillStyle = color; ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.restore()
}

function BackBtn({ onBack }: { onBack: () => void }) {
  return <button onClick={onBack} style={pill}>← 뒤로</button>
}

function GameOverScreen({ score, onRestart, onBack, tip }: {
  score: number; onRestart: () => void; onBack: () => void; tip?: string
}) {
  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color:'#fff', textAlign:'center', padding:24 }}>
      <div style={{ fontSize:48 }}>⭐</div>
      <div style={{ fontWeight:900, fontSize:24 }}>게임 오버</div>
      <div style={{ fontWeight:700, fontSize:20 }}>점수: {score}점</div>
      {tip && <div style={{ fontSize:12, color:'#ccc', maxWidth:260 }}>{tip}</div>}
      <div style={{ display:'flex', gap:10, marginTop:6 }}>
        <button onClick={onRestart} style={solidBtn}>다시 하기</button>
        <button onClick={onBack} style={ghostBtn}>게임 목록</button>
      </div>
    </div>
  )
}

const pill: React.CSSProperties = { position:'absolute', top:10, left:10, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', color:'#fff', border:'none', borderRadius:20, padding:'6px 14px', fontWeight:700, fontSize:13, cursor:'pointer' }
const solidBtn: React.CSSProperties = { background:'#4D72FB', color:'#fff', border:'none', borderRadius:12, padding:'10px 24px', fontWeight:700, fontSize:15, cursor:'pointer' }
const ghostBtn: React.CSSProperties = { background:'rgba(255,255,255,0.15)', color:'#fff', border:'2px solid rgba(255,255,255,0.4)', borderRadius:12, padding:'10px 24px', fontWeight:700, fontSize:15, cursor:'pointer' }
