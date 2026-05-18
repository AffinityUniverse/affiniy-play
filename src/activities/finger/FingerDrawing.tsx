import { useRef, useEffect, useCallback } from 'react'
import { drawSkeleton, isPinch, isIndexOnly, lmX, lmY, type FrameHandler } from './shared'

const PALETTE = [
  '#FF4444', '#FF8800', '#FFD700', '#88CC44', '#44AAFF',
  '#4D72FB', '#9944CC', '#FF66AA', '#FFFFFF', '#1A1A2E',
]
const BRUSH   = 7
const SR      = 16   // swatch radius (canvas px)
const SG      = 5    // swatch gap
const SY      = 8    // swatch top margin

interface Props {
  setFrameHandler: (fn: FrameHandler | null) => void
  onBack: () => void
}

function drawStrip(ctx: CanvasRenderingContext2D, vw: number, active: string, dwellIdx: number, dwellPct: number) {
  const totalW = PALETTE.length * SR * 2 + (PALETTE.length - 1) * SG
  const sx = (vw - totalW) / 2
  for (let i = 0; i < PALETTE.length; i++) {
    const cx = sx + i * (SR * 2 + SG) + SR
    const cy = SY + SR
    const sel = PALETTE[i] === active
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 5
    ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2)
    ctx.fillStyle = PALETTE[i]; ctx.fill()
    ctx.shadowBlur = 0
    ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2)
    ctx.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,0.3)'
    ctx.lineWidth = sel ? 3 : 1.5; ctx.stroke()
    if (sel) {
      ctx.beginPath(); ctx.arc(cx, cy, SR + 5, 0, Math.PI * 2)
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
    }
    if (dwellIdx === i && dwellPct > 0) {
      ctx.beginPath()
      ctx.arc(cx, cy, SR + 7, -Math.PI / 2, -Math.PI / 2 + dwellPct * Math.PI * 2)
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke()
    }
  }
}

function swatchHit(tx: number, ty: number, vw: number): number {
  const totalW = PALETTE.length * SR * 2 + (PALETTE.length - 1) * SG
  const sx = (vw - totalW) / 2
  for (let i = 0; i < PALETTE.length; i++) {
    if (Math.hypot(tx - (sx + i * (SR * 2 + SG) + SR), ty - (SY + SR)) < SR + 8) return i
  }
  return -1
}

export default function FingerDrawing({ setFrameHandler, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const colR      = useRef(PALETTE[0])
  const strokesR  = useRef<{ color: string; pts: [number, number][] }[]>([])
  const curPtsR   = useRef<[number, number][]>([])
  const offsetR   = useRef({ x: 0, y: 0 })
  const pinchR    = useRef<{ x: number; y: number } | null>(null)
  const prevGestR = useRef<'draw' | 'pinch' | 'idle'>('idle')
  const dwellR    = useRef<{ idx: number; start: number } | null>(null)

  const redrawAll = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h)
    const [ox, oy] = [offsetR.current.x, offsetR.current.y]
    const draw = (pts: [number, number][], c: string) => {
      if (pts.length < 2) return
      ctx.beginPath(); ctx.strokeStyle = c
      ctx.lineWidth = BRUSH; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy)
      ctx.stroke()
    }
    for (const s of strokesR.current) draw(s.pts, s.color)
    if (curPtsR.current.length >= 2) draw(curPtsR.current, colR.current)
  }, [])

  useEffect(() => {
    const handler: FrameHandler = (lm, vw, vh) => {
      const c = canvasRef.current; if (!c) return
      if (c.width !== vw) { c.width = vw; c.height = vh }
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, vw, vh)

      const now = Date.now()
      const dwellPct = dwellR.current ? Math.min((now - dwellR.current.start) / 800, 1) : 0
      drawStrip(ctx, vw, colR.current, dwellR.current?.idx ?? -1, dwellPct)

      if (!lm) { prevGestR.current = 'idle'; pinchR.current = null; dwellR.current = null; return }

      const g = isPinch(lm) ? 'pinch' : isIndexOnly(lm) ? 'draw' : 'idle'
      const ix = lmX(lm[8], vw), iy = lmY(lm[8], vh)
      const wx = ix - offsetR.current.x, wy = iy - offsetR.current.y

      if (g === 'draw') {
        if (prevGestR.current !== 'draw') pinchR.current = null
        prevGestR.current = 'draw'; dwellR.current = null
        curPtsR.current.push([wx, wy])
        const pts = curPtsR.current
        if (pts.length >= 2) {
          const prev = pts[pts.length - 2]
          ctx.beginPath(); ctx.strokeStyle = colR.current
          ctx.lineWidth = BRUSH; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
          ctx.moveTo(prev[0] + offsetR.current.x, prev[1] + offsetR.current.y)
          ctx.lineTo(wx + offsetR.current.x, wy + offsetR.current.y)
          ctx.stroke()
        }
        ctx.beginPath(); ctx.arc(ix, iy, 16, 0, Math.PI * 2)
        ctx.fillStyle = colR.current; ctx.fill()
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke()

      } else if (g === 'pinch') {
        if (prevGestR.current === 'draw' && curPtsR.current.length > 1) {
          strokesR.current.push({ color: colR.current, pts: [...curPtsR.current] })
          curPtsR.current = []
        }
        prevGestR.current = 'pinch'; dwellR.current = null
        const tx = lmX(lm[4], vw), ty = lmY(lm[4], vh)
        const px = (ix + tx) / 2, py = (iy + ty) / 2
        if (pinchR.current) {
          offsetR.current.x += px - pinchR.current.x
          offsetR.current.y += py - pinchR.current.y
          redrawAll(ctx, vw, vh)
        }
        pinchR.current = { x: px, y: py }
        ctx.beginPath(); ctx.arc(px, py, 22, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(77,114,251,0.3)'; ctx.fill()
        ctx.strokeStyle = '#4D72FB'; ctx.lineWidth = 3; ctx.stroke()

      } else {
        if (prevGestR.current === 'draw' && curPtsR.current.length > 1) {
          strokesR.current.push({ color: colR.current, pts: [...curPtsR.current] })
          curPtsR.current = []
        }
        prevGestR.current = 'idle'; pinchR.current = null

        // Thumb dwell colour pick
        const tx = lmX(lm[4], vw), ty = lmY(lm[4], vh)
        const hit = swatchHit(tx, ty, vw)
        if (hit >= 0) {
          if (dwellR.current?.idx === hit) {
            if (now - dwellR.current.start >= 800) { colR.current = PALETTE[hit]; dwellR.current = null }
          } else dwellR.current = { idx: hit, start: now }
        } else dwellR.current = null

        ctx.beginPath(); ctx.arc(ix, iy, 8, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke()
        ctx.beginPath(); ctx.arc(tx, ty, 11, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,215,0,0.45)'; ctx.fill()
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.stroke()
      }

      drawSkeleton(ctx, lm, vw, vh)
    }
    setFrameHandler(handler)
    return () => setFrameHandler(null)
  }, [setFrameHandler, redrawAll])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current; if (!c) return
    const r = c.getBoundingClientRect()
    const cx = (e.clientX - r.left) * (c.width / r.width)
    const cy = (e.clientY - r.top) * (c.height / r.height)
    const hit = swatchHit(cx, cy, c.width)
    if (hit >= 0) colR.current = PALETTE[hit]
  }

  return (
    <>
      <canvas ref={canvasRef} onClick={handleCanvasClick}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <BackBtn onBack={onBack} />
      {/* undo / clear */}
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
        {[
          { label: '↩', action: () => { strokesR.current.pop(); curPtsR.current = []; const c = canvasRef.current; if (c) redrawAll(c.getContext('2d')!, c.width, c.height) } },
          { label: '🗑️', action: () => { strokesR.current = []; curPtsR.current = []; offsetR.current = { x: 0, y: 0 }; const c = canvasRef.current; if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height) } },
        ].map(b => (
          <button key={b.label} onClick={b.action} style={pillBtn}>{b.label}</button>
        ))}
      </div>
      <div style={{ ...pill, bottom: 10, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
        ✏️ 검지만=그리기 · 🤌 핀치=이동 · 👍 엄지로 색상 가리키기
      </div>
    </>
  )
}

function BackBtn({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} style={{ ...pillBtn, position: 'absolute', top: 10, left: 10 }}>
      ← 뒤로
    </button>
  )
}

const pillBtn: React.CSSProperties = {
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
  color: '#fff', border: 'none', borderRadius: 20,
  padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}

const pill: React.CSSProperties = {
  position: 'absolute',
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
  color: '#fff', borderRadius: 20, padding: '5px 14px',
  fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
}
