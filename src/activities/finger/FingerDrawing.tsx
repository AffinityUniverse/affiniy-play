import { useRef, useEffect, useCallback } from 'react'
import { drawSkeleton, isPinch, isIndexOnly, lmX, lmY, type FrameHandler } from './shared'

const PALETTE = [
  '#FF4444', '#FF8800', '#FFD700', '#88CC44', '#44AAFF',
  '#4D72FB', '#9944CC', '#FF66AA', '#FFFFFF', '#1A1A2E',
]
const BRUSH = 7
const SR    = 16   // swatch radius (canvas px)
const SG    = 5    // swatch gap
const SY    = 8    // swatch top padding

interface Props {
  setFrameHandler: (fn: FrameHandler | null) => void
  onBack: () => void
}

// ── Color strip drawn on the overlay canvas ──
function drawStrip(
  ctx: CanvasRenderingContext2D,
  vw: number,
  active: string,
  dwellIdx: number,
  dwellPct: number,
) {
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
  // draw canvas: persistent strokes — NOT cleared every frame
  const drawCanvasRef    = useRef<HTMLCanvasElement>(null)
  // overlay canvas: cursor, skeleton, color strip — cleared every frame
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

  const colR      = useRef(PALETTE[0])
  // strokesR: completed strokes in world-space coords
  const strokesR  = useRef<{ color: string; pts: [number, number][] }[]>([])
  // curPtsR: points of the stroke being drawn right now (world-space)
  const curPtsR   = useRef<[number, number][]>([])
  const offsetR   = useRef({ x: 0, y: 0 })
  const pinchR    = useRef<{ x: number; y: number } | null>(null)
  const prevGestR = useRef<'draw' | 'pinch' | 'idle'>('idle')
  const dwellR    = useRef<{ idx: number; start: number } | null>(null)

  // ── Redraw all completed strokes + current in-progress stroke ──
  // Called on canvas resize OR after a pan (pinch).
  const redrawAll = useCallback((dc: CanvasRenderingContext2D, w: number, h: number) => {
    dc.clearRect(0, 0, w, h)
    const [ox, oy] = [offsetR.current.x, offsetR.current.y]
    const draw = (pts: [number, number][], c: string) => {
      if (pts.length < 2) return
      dc.beginPath(); dc.strokeStyle = c
      dc.lineWidth = BRUSH; dc.lineCap = 'round'; dc.lineJoin = 'round'
      dc.moveTo(pts[0][0] + ox, pts[0][1] + oy)
      for (let i = 1; i < pts.length; i++) dc.lineTo(pts[i][0] + ox, pts[i][1] + oy)
      dc.stroke()
    }
    for (const s of strokesR.current) draw(s.pts, s.color)
    // Also render current in-progress stroke so it doesn't vanish mid-pan
    if (curPtsR.current.length >= 2) draw(curPtsR.current, colR.current)
  }, [])

  useEffect(() => {
    const handler: FrameHandler = (lm, vw, vh) => {
      const dc  = drawCanvasRef.current
      const oc  = overlayCanvasRef.current
      if (!dc || !oc) return

      // Resize both canvases to match video (happens once on first frame)
      if (dc.width !== vw) {
        dc.width  = vw; dc.height  = vh
        oc.width  = vw; oc.height  = vh
        // Redraw existing content at new size (no-op on first run)
        redrawAll(dc.getContext('2d')!, vw, vh)
      }

      const dctx = dc.getContext('2d')!
      const octx = oc.getContext('2d')!

      // ONLY the overlay is cleared each frame
      octx.clearRect(0, 0, vw, vh)

      const now = Date.now()
      const dwellPct = dwellR.current ? Math.min((now - dwellR.current.start) / 800, 1) : 0
      drawStrip(octx, vw, colR.current, dwellR.current?.idx ?? -1, dwellPct)

      if (!lm) {
        // Finalize open stroke when hand leaves frame
        if (prevGestR.current === 'draw' && curPtsR.current.length > 1) {
          strokesR.current.push({ color: colR.current, pts: [...curPtsR.current] })
          curPtsR.current = []
        }
        prevGestR.current = 'idle'
        pinchR.current = null
        dwellR.current = null
        return
      }

      const g  = isPinch(lm) ? 'pinch' : isIndexOnly(lm) ? 'draw' : 'idle'
      const ix = lmX(lm[8], vw), iy = lmY(lm[8], vh)
      // World-space position (removes current pan offset)
      const wx = ix - offsetR.current.x
      const wy = iy - offsetR.current.y

      // ────────── DRAW gesture ──────────
      if (g === 'draw') {
        if (prevGestR.current !== 'draw') pinchR.current = null
        prevGestR.current = 'draw'
        dwellR.current = null

        curPtsR.current.push([wx, wy])

        // Incrementally paint the latest segment onto the PERSISTENT draw canvas
        const pts = curPtsR.current
        if (pts.length >= 2) {
          const prev = pts[pts.length - 2]
          dctx.beginPath()
          dctx.strokeStyle = colR.current
          dctx.lineWidth = BRUSH; dctx.lineCap = 'round'; dctx.lineJoin = 'round'
          dctx.moveTo(prev[0] + offsetR.current.x, prev[1] + offsetR.current.y)
          dctx.lineTo(wx    + offsetR.current.x, wy    + offsetR.current.y)
          dctx.stroke()
        }

        // Fingertip cursor on overlay
        octx.beginPath(); octx.arc(ix, iy, 16, 0, Math.PI * 2)
        octx.fillStyle = colR.current; octx.fill()
        octx.strokeStyle = '#fff'; octx.lineWidth = 3; octx.stroke()

      // ────────── PINCH / PAN gesture ──────────
      } else if (g === 'pinch') {
        // Finalize any in-progress stroke before panning
        if (prevGestR.current === 'draw' && curPtsR.current.length > 1) {
          strokesR.current.push({ color: colR.current, pts: [...curPtsR.current] })
          curPtsR.current = []
        }
        prevGestR.current = 'pinch'
        dwellR.current = null

        const tx = lmX(lm[4], vw), ty = lmY(lm[4], vh)
        const px = (ix + tx) / 2, py = (iy + ty) / 2

        if (pinchR.current) {
          // Apply pan delta
          offsetR.current.x += px - pinchR.current.x
          offsetR.current.y += py - pinchR.current.y
          // Full redraw onto draw canvas at new offset
          redrawAll(dctx, vw, vh)
        }
        pinchR.current = { x: px, y: py }

        octx.beginPath(); octx.arc(px, py, 22, 0, Math.PI * 2)
        octx.fillStyle = 'rgba(77,114,251,0.3)'; octx.fill()
        octx.strokeStyle = '#4D72FB'; octx.lineWidth = 3; octx.stroke()

      // ────────── IDLE ──────────
      } else {
        // Finalize any in-progress stroke
        if (prevGestR.current === 'draw' && curPtsR.current.length > 1) {
          strokesR.current.push({ color: colR.current, pts: [...curPtsR.current] })
          curPtsR.current = []
        }
        prevGestR.current = 'idle'
        pinchR.current = null

        // Thumb dwell → colour select
        const tx = lmX(lm[4], vw), ty = lmY(lm[4], vh)
        const hit = swatchHit(tx, ty, vw)
        if (hit >= 0) {
          if (dwellR.current?.idx === hit) {
            if (now - dwellR.current.start >= 800) {
              colR.current = PALETTE[hit]; dwellR.current = null
            }
          } else {
            dwellR.current = { idx: hit, start: now }
          }
        } else {
          dwellR.current = null
        }

        // Ghost cursors
        octx.beginPath(); octx.arc(ix, iy, 8, 0, Math.PI * 2)
        octx.fillStyle = 'rgba(255,255,255,0.4)'; octx.fill()
        octx.strokeStyle = 'rgba(255,255,255,0.7)'; octx.lineWidth = 2; octx.stroke()

        octx.beginPath(); octx.arc(tx, ty, 11, 0, Math.PI * 2)
        octx.fillStyle = 'rgba(255,215,0,0.45)'; octx.fill()
        octx.strokeStyle = '#FFD700'; octx.lineWidth = 2; octx.stroke()
      }

      // Skeleton on overlay
      drawSkeleton(octx, lm, vw, vh)
    }

    setFrameHandler(handler)
    return () => setFrameHandler(null)
  }, [setFrameHandler, redrawAll])

  // Mouse click on overlay → colour pick via swatches
  const handleOverlayClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = overlayCanvasRef.current; if (!c) return
    const r  = c.getBoundingClientRect()
    const cx = (e.clientX - r.left) * (c.width / r.width)
    const cy = (e.clientY - r.top)  * (c.height / r.height)
    const hit = swatchHit(cx, cy, c.width)
    if (hit >= 0) colR.current = PALETTE[hit]
  }

  const handleUndo = () => {
    strokesR.current.pop()
    curPtsR.current = []
    const dc = drawCanvasRef.current
    if (dc) redrawAll(dc.getContext('2d')!, dc.width, dc.height)
  }

  const handleClear = () => {
    strokesR.current = []
    curPtsR.current  = []
    offsetR.current  = { x: 0, y: 0 }
    const dc = drawCanvasRef.current
    if (dc) dc.getContext('2d')!.clearRect(0, 0, dc.width, dc.height)
  }

  return (
    <>
      {/* Persistent stroke layer */}
      <canvas
        ref={drawCanvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />
      {/* Overlay layer: cursor, skeleton, colour strip, click target */}
      <canvas
        ref={overlayCanvasRef}
        onClick={handleOverlayClick}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />

      {/* Back */}
      <button onClick={onBack} style={pillBtn}>← 뒤로</button>

      {/* Undo / Clear */}
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
        <button onClick={handleUndo}  style={pillBtn}>↩ 되돌리기</button>
        <button onClick={handleClear} style={{ ...pillBtn, background: 'rgba(180,0,0,0.55)' }}>🗑️ 전체 지우기</button>
      </div>

      {/* Guide pill */}
      <div style={{
        position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        color: '#fff', borderRadius: 20, padding: '5px 14px',
        fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none',
      }}>
        ✏️ 검지만 펴기=그리기 · 🤌 핀치=이동 · 👍 엄지로 색상 가리키기
      </div>
    </>
  )
}

const pillBtn: React.CSSProperties = {
  position: 'absolute', top: 10, left: 10,
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
  color: '#fff', border: 'none', borderRadius: 20,
  padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
