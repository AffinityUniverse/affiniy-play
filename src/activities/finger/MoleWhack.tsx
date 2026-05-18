import { useRef, useEffect, useState } from 'react'
import { drawSkeleton, isIndexOnly, lmX, lmY, type FrameHandler } from './shared'

const GAME_SEC = 45
const HOLE_CNT = 9
// Hole grid: 3×3, positions as fraction of vw/vh
const HOLES = [
  [0.17, 0.28], [0.50, 0.28], [0.83, 0.28],
  [0.17, 0.55], [0.50, 0.55], [0.83, 0.55],
  [0.17, 0.82], [0.50, 0.82], [0.83, 0.82],
]

interface HoleState { active: boolean; showT: number; hitT?: number }

interface State {
  holes: HoleState[]
  score: number; nextId: number
  lastSpawn: number; spawnMs: number
  startT: number; gameOver: boolean
  // dwell tracking: timestamp when finger started hovering, per hole
  dwellStart: number[]
}

interface Props { setFrameHandler: (fn: FrameHandler | null) => void; onBack: () => void }

export default function MoleWhack({ setFrameHandler, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef  = useRef<State>({
    holes: Array.from({ length: HOLE_CNT }, () => ({ active: false, showT: 0 })),
    score: 0, nextId: 0, lastSpawn: 0, spawnMs: 1200,
    startT: 0, gameOver: false,
    dwellStart: Array(HOLE_CNT).fill(-1),
  })
  const [gameOver, setGameOver] = useState(false)
  const [finalScore, setFinalScore] = useState(0)

  const reset = () => {
    const s = stateRef.current
    s.holes = Array.from({ length: HOLE_CNT }, () => ({ active: false, showT: 0 }))
    s.score = 0; s.nextId = 0; s.lastSpawn = 0; s.spawnMs = 1200
    s.startT = Date.now(); s.gameOver = false
    s.dwellStart = Array(HOLE_CNT).fill(-1)
    setGameOver(false); setFinalScore(0)
  }

  useEffect(() => {
    reset()
    const handler: FrameHandler = (lm, vw, vh) => {
      const c = canvasRef.current; if (!c) return
      if (c.width !== vw) { c.width = vw; c.height = vh }
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, vw, vh)

      const now  = Date.now()
      const s    = stateRef.current
      const elapsed = (now - s.startT) / 1000
      const timeLeft = Math.max(0, GAME_SEC - elapsed)

      if (s.gameOver || timeLeft <= 0) {
        if (!s.gameOver) { s.gameOver = true; setGameOver(true); setFinalScore(s.score) }
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, vw, vh)
        return
      }

      // Compute hole positions
      const hpos = HOLES.map(([fx, fy]) => ({ x: fx * vw, y: fy * vh, r: vw * 0.08 }))

      // Spawn moles
      const active = s.holes.filter(h => h.active && !h.hitT).length
      if (now - s.lastSpawn > s.spawnMs && active < 2) {
        s.lastSpawn = now
        s.spawnMs = Math.max(600, s.spawnMs - 12)
        const free = s.holes.map((h, i) => i).filter(i => !s.holes[i].active)
        if (free.length > 0) {
          const idx = free[Math.floor(Math.random() * free.length)]
          s.holes[idx] = { active: true, showT: now }
        }
      }

      // Hide moles that overstayed (2.5s visible, 0.4s hit anim)
      for (let i = 0; i < HOLE_CNT; i++) {
        const h = s.holes[i]
        if (h.active && !h.hitT && now - h.showT > 2500) { h.active = false }
        if (h.hitT && now - h.hitT > 400)                { h.active = false; h.hitT = undefined }
      }

      // Finger position (index-only)
      let fx: number | null = null, fy: number | null = null
      if (lm && isIndexOnly(lm)) { fx = lmX(lm[8], vw); fy = lmY(lm[8], vh) }

      // Dwell detection: hover 0.4s on active mole → hit
      for (let i = 0; i < HOLE_CNT; i++) {
        const h = s.holes[i]; if (!h.active || h.hitT) continue
        const p = hpos[i]
        const inside = fx !== null && Math.hypot(fx - p.x, fy! - p.y) < p.r * 1.1
        if (inside) {
          if (s.dwellStart[i] < 0) s.dwellStart[i] = now
          const dwell = now - s.dwellStart[i]
          if (dwell >= 400) { // hit!
            h.hitT = now; s.score += 10; s.dwellStart[i] = -1
            s.spawnMs = Math.max(600, s.spawnMs - 5)
          }
        } else {
          s.dwellStart[i] = -1
        }
      }

      // Draw holes & moles
      for (let i = 0; i < HOLE_CNT; i++) {
        const p = hpos[i]; const h = s.holes[i]
        drawHole(ctx, p.x, p.y, p.r)
        if (h.active) {
          const age  = (now - h.showT) / 1000
          const rise = Math.min(age / 0.25, 1)         // pop up over 0.25s
          const fall = h.hitT ? Math.min((now - h.hitT) / 0.4, 1) : 0
          const pct  = rise - fall                       // 0=hidden, 1=fully up
          const dwellPct = s.dwellStart[i] >= 0 ? Math.min((now - s.dwellStart[i]) / 400, 1) : 0
          drawMole(ctx, p.x, p.y, p.r, pct, !!h.hitT, dwellPct)
        }
      }

      // Finger cursor
      if (fx !== null) {
        ctx.beginPath(); ctx.arc(fx, fy!, 13, 0, Math.PI*2)
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill()
        ctx.strokeStyle = '#FF8800'; ctx.lineWidth = 3; ctx.stroke()
      }

      if (lm) drawSkeleton(ctx, lm, vw, vh)

      // HUD
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 5
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${vw*0.045}px sans-serif`
      ctx.textAlign = 'right'; ctx.textBaseline = 'top'
      ctx.fillText(`${s.score}점`, vw - 12, 12)
      ctx.textAlign = 'center'
      ctx.fillStyle = timeLeft < 10 ? '#FF4444' : '#fff'
      ctx.fillText(`${Math.ceil(timeLeft)}s`, vw / 2, 12)
      ctx.restore()
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
        tip="검지로 두더지를 가리키면 0.4초 후 잡혀요!" />}
    </>
  )
}

function drawHole(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save()
  // Ground patch
  ctx.beginPath(); ctx.ellipse(cx, cy + r*0.15, r*1.4, r*0.55, 0, 0, Math.PI*2)
  ctx.fillStyle = '#5A8C3A'; ctx.fill()
  // Hole shadow
  const g = ctx.createRadialGradient(cx, cy, r*0.1, cx, cy, r)
  g.addColorStop(0, 'rgba(0,0,0,0.8)')
  g.addColorStop(1, 'rgba(0,0,0,0.2)')
  ctx.beginPath(); ctx.ellipse(cx, cy, r*0.85, r*0.45, 0, 0, Math.PI*2)
  ctx.fillStyle = g; ctx.fill()
  ctx.restore()
}

function drawMole(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pct: number, hit: boolean, dwellPct: number) {
  if (pct <= 0) return
  const offY = r * 0.9 * (1 - pct)   // slide up from hole
  ctx.save()
  // Clip to hole area so mole appears to emerge from ground
  ctx.beginPath(); ctx.ellipse(cx, cy, r*0.85, r*0.45, 0, 0, Math.PI*2)
  ctx.rect(cx - r*2, cy - r*4, r*4, r*4) // extend upward
  // Only show the part above the hole centre
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, r*0.85, r*0.45+1, 0, 0, Math.PI*2); ctx.clip()

  ctx.globalAlpha = Math.min(1, pct * 2)
  const my = cy - r * 0.8 * pct + offY  // mole centre y

  if (hit) {
    // Stars effect
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI/2
      const dist = r * 0.5 * (1 - dwellPct)
      ctx.fillStyle = '#FFD700'
      ctx.font = `${r*0.35}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('⭐', cx + Math.cos(a)*dist*1.5, my + Math.sin(a)*dist)
    }
  } else {
    // Body
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.ellipse(cx, my + r*0.1, r*0.65, r*0.8, 0, 0, Math.PI*2)
    ctx.fillStyle = '#7B4F2E'; ctx.fill()
    ctx.shadowBlur = 0
    // Face
    ctx.beginPath(); ctx.ellipse(cx, my - r*0.1, r*0.52, r*0.52, 0, 0, Math.PI*2)
    ctx.fillStyle = '#A0704A'; ctx.fill()
    // Eyes
    ctx.fillStyle = '#1A1A2E'
    ctx.beginPath(); ctx.arc(cx - r*0.17, my - r*0.12, r*0.09, 0, Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(cx + r*0.17, my - r*0.12, r*0.09, 0, Math.PI*2); ctx.fill()
    // Nose
    ctx.fillStyle = '#FF8888'
    ctx.beginPath(); ctx.ellipse(cx, my + r*0.09, r*0.12, r*0.08, 0, 0, Math.PI*2); ctx.fill()
    // Smile
    ctx.beginPath(); ctx.arc(cx, my + r*0.1, r*0.18, 0.2, Math.PI - 0.2)
    ctx.strokeStyle = '#5A2E0A'; ctx.lineWidth = 2; ctx.stroke()
    // Ears
    ctx.fillStyle = '#7B4F2E'
    ctx.beginPath(); ctx.ellipse(cx - r*0.38, my - r*0.44, r*0.15, r*0.19, -0.4, 0, Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(cx + r*0.38, my - r*0.44, r*0.15, r*0.19, 0.4, 0, Math.PI*2); ctx.fill()

    // Dwell progress ring (yellow arc)
    if (dwellPct > 0) {
      ctx.beginPath(); ctx.arc(cx, my - r*0.1, r*0.6, -Math.PI/2, -Math.PI/2 + dwellPct*Math.PI*2)
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke()
    }
  }

  ctx.restore()
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
      <div style={{ fontSize:48 }}>🐹</div>
      <div style={{ fontWeight:900, fontSize:24 }}>시간 종료!</div>
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
