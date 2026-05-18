import { useRef, useEffect, useState } from 'react'
import { drawSkeleton, isIndexOnly, lmX, lmY, hud, type FrameHandler } from './shared'

const COLORS = ['#FF4444','#FF8800','#FFD700','#44AAFF','#9944CC','#FF66AA','#44CC88','#4D72FB']

interface Balloon {
  id: number; x: number; y: number; vy: number; r: number
  color: string; phase: number // for sway
  popped: boolean; popT?: number
  particles: { x: number; y: number; vx: number; vy: number; r: number }[]
}

interface State {
  balloons: Balloon[]; score: number; lives: number; nextId: number
  lastSpawn: number; spawnMs: number; gameOver: boolean; combo: number; lastPop: number
}

interface Props { setFrameHandler: (fn: FrameHandler | null) => void; onBack: () => void }

export default function BalloonPop({ setFrameHandler, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef  = useRef<State>({ balloons: [], score: 0, lives: 3, nextId: 0, lastSpawn: 0, spawnMs: 1800, gameOver: false, combo: 0, lastPop: 0 })
  const lastTRef  = useRef(Date.now())
  const [gameOver, setGameOver] = useState(false)
  const [finalScore, setFinalScore] = useState(0)

  const reset = () => {
    Object.assign(stateRef.current, { balloons: [], score: 0, lives: 3, nextId: 0, lastSpawn: 0, spawnMs: 1800, gameOver: false, combo: 0, lastPop: 0 })
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
      const s   = stateRef.current

      if (s.gameOver) { ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,vw,vh); return }

      // Spawn
      if (now - s.lastSpawn > s.spawnMs && s.balloons.filter(b=>!b.popped).length < 7) {
        s.lastSpawn = now
        s.spawnMs = Math.max(700, s.spawnMs - 20)
        const r  = 28 + Math.random() * 18
        const x  = r + Math.random() * (vw - r * 2)
        const vy = -(55 + Math.random() * 55)
        s.balloons.push({
          id: s.nextId++, x, y: vh + r, vy, r,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          phase: Math.random() * Math.PI * 2,
          popped: false, particles: [],
        })
      }

      // Finger position (index-only)
      let fx: number | null = null, fy: number | null = null
      if (lm && isIndexOnly(lm)) { fx = lmX(lm[8], vw); fy = lmY(lm[8], vh) }

      // Physics + pop detection
      for (const b of s.balloons) {
        if (!b.popped) {
          b.y += b.vy * dt
          b.x += Math.sin((now / 700) + b.phase) * 0.6 // gentle sway (px per frame at 60fps approx)
          // Finger touch → pop
          if (fx !== null && Math.hypot(fx - b.x, fy! - b.y) < b.r + 10) {
            b.popped = true; b.popT = now
            const bonus = now - s.lastPop < 800 ? ++s.combo : (s.combo = 1)
            s.score += 10 + (bonus - 1) * 5
            s.lastPop = now
            for (let i = 0; i < 8; i++)
              b.particles.push({ x: b.x, y: b.y, vx: (Math.random()-0.5)*300, vy: (Math.random()-0.5)*300, r: 4+Math.random()*6 })
          }
          // Missed (reached top)
          if (b.y < -b.r - 10) { b.popped = true; b.popT = now; s.lives--; s.combo = 0 }
        } else {
          const age = (now - (b.popT ?? now)) / 1000
          for (const p of b.particles) { p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 200*dt }
        }
      }

      // Remove old
      s.balloons = s.balloons.filter(b => !b.popped || (now - (b.popT ?? 0)) < 600)

      // Draw balloons
      for (const b of s.balloons) {
        if (!b.popped) {
          drawBalloon(ctx, b, now)
        } else {
          const age = (now - (b.popT ?? now)) / 600
          for (const p of b.particles) {
            ctx.save(); ctx.globalAlpha = 1 - age
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - age*0.5), 0, Math.PI*2)
            ctx.fillStyle = b.color; ctx.fill()
            ctx.restore()
          }
        }
      }

      // Finger cursor
      if (fx !== null) {
        ctx.beginPath(); ctx.arc(fx, fy!, 14, 0, Math.PI*2)
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill()
        ctx.strokeStyle = '#4D72FB'; ctx.lineWidth = 3; ctx.stroke()
      }

      if (lm) drawSkeleton(ctx, lm, vw, vh)
      hud(ctx, vw, s.score, s.lives)

      // Combo label
      if (s.combo > 1) {
        ctx.save()
        ctx.fillStyle = '#FFD700'
        ctx.font = `bold ${vw*0.05}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 6
        ctx.fillText(`${s.combo}x 콤보!`, vw/2, vh*0.35)
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
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <BackBtn onBack={onBack} />
      {gameOver && <GameOverScreen score={finalScore} onRestart={reset} onBack={onBack}
        tip="검지손가락을 펴서 풍선에 갖다 대세요!" />}
    </>
  )
}

function drawBalloon(ctx: CanvasRenderingContext2D, b: Balloon, now: number) {
  // String
  ctx.beginPath(); ctx.moveTo(b.x, b.y + b.r)
  ctx.quadraticCurveTo(b.x + Math.sin(now/800+b.phase)*6, b.y + b.r + b.r*0.7, b.x, b.y + b.r*1.4)
  ctx.strokeStyle = 'rgba(180,180,180,0.7)'; ctx.lineWidth = 1.5; ctx.stroke()
  // Body
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8
  ctx.beginPath(); ctx.ellipse(b.x, b.y - b.r*0.08, b.r, b.r*1.15, 0, 0, Math.PI*2)
  ctx.fillStyle = b.color; ctx.fill()
  ctx.shadowBlur = 0
  // Knot
  ctx.beginPath(); ctx.arc(b.x, b.y + b.r, 4, 0, Math.PI*2)
  ctx.fillStyle = b.color; ctx.fill()
  // Highlight
  ctx.beginPath(); ctx.ellipse(b.x - b.r*0.25, b.y - b.r*0.4, b.r*0.22, b.r*0.32, -0.5, 0, Math.PI*2)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill()
}

function BackBtn({ onBack }: { onBack: () => void }) {
  return <button onClick={onBack} style={pill}>← 뒤로</button>
}

function GameOverScreen({ score, onRestart, onBack, tip }: {
  score: number; onRestart: () => void; onBack: () => void; tip?: string
}) {
  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color:'#fff', textAlign:'center', padding:24 }}>
      <div style={{ fontSize:48 }}>🎈</div>
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
