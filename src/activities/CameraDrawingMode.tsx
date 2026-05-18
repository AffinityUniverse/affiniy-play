import { useRef, useEffect, useState, useCallback } from 'react'
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import Button from '../components/Button'

// ── 10-colour palette (samples shown in both strip + palette bar) ──
const PALETTE = [
  '#FF4444', '#FF8800', '#FFD700', '#88CC44', '#44AAFF',
  '#4D72FB', '#9944CC', '#FF66AA', '#FFFFFF', '#1A1A2E',
]

const BRUSH    = 7    // canvas px stroke width
const SWATCH_R = 18   // radius of each colour swatch (canvas px, @640)
const SWATCH_G = 6    // gap between swatches
const SWATCH_Y = 10   // top padding
const DWELL_MS = 800  // ms to hold thumb on swatch to select

// ── Finger-extension test (landmark indices) ──
function extended(lm: NormalizedLandmark[], tip: number, pip: number) {
  return lm[tip].y < lm[pip].y
}

// ── Classify hand gesture ──
function classify(lm: NormalizedLandmark[]): 'draw' | 'pinch' | 'idle' {
  const d = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y)
  if (d < 0.07) return 'pinch'
  if (
    extended(lm, 8, 6) &&
    !extended(lm, 12, 10) &&
    !extended(lm, 16, 14) &&
    !extended(lm, 20, 18)
  ) return 'draw'
  return 'idle'
}

// ── Draw hand skeleton on overlay canvas ──
function drawSkeleton(ctx: CanvasRenderingContext2D, lm: NormalizedLandmark[], w: number, h: number) {
  const bones = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17],
  ]
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  for (const [a, b] of bones) {
    ctx.beginPath()
    ctx.moveTo((1 - lm[a].x) * w, lm[a].y * h)
    ctx.lineTo((1 - lm[b].x) * w, lm[b].y * h)
    ctx.stroke()
  }
  for (const p of lm) {
    ctx.beginPath()
    ctx.arc((1 - p.x) * w, p.y * h, 3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fill()
  }
}

// ── Draw colour-swatch strip on overlay canvas ──
function drawColourStrip(
  ctx: CanvasRenderingContext2D,
  vw: number,
  active: string,
  dwellIdx: number,
  dwellPct: number,
) {
  const totalW = PALETTE.length * SWATCH_R * 2 + (PALETTE.length - 1) * SWATCH_G
  const sx = (vw - totalW) / 2

  for (let i = 0; i < PALETTE.length; i++) {
    const cx = sx + i * (SWATCH_R * 2 + SWATCH_G) + SWATCH_R
    const cy = SWATCH_Y + SWATCH_R
    const isSel = PALETTE[i] === active

    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.arc(cx, cy, SWATCH_R, 0, Math.PI * 2)
    ctx.fillStyle = PALETTE[i]
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.beginPath()
    ctx.arc(cx, cy, SWATCH_R, 0, Math.PI * 2)
    ctx.strokeStyle = isSel ? '#fff' : 'rgba(255,255,255,0.35)'
    ctx.lineWidth = isSel ? 3 : 1.5
    ctx.stroke()

    if (isSel) {
      ctx.beginPath()
      ctx.arc(cx, cy, SWATCH_R + 5, 0, Math.PI * 2)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    if (dwellIdx === i && dwellPct > 0) {
      ctx.beginPath()
      ctx.arc(cx, cy, SWATCH_R + 7, -Math.PI / 2, -Math.PI / 2 + dwellPct * Math.PI * 2)
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.stroke()
    }
  }
}

// ── Swatch hit-test (canvas-space coords) ──
function swatchHit(tx: number, ty: number, vw: number): number {
  const totalW = PALETTE.length * SWATCH_R * 2 + (PALETTE.length - 1) * SWATCH_G
  const sx = (vw - totalW) / 2
  for (let i = 0; i < PALETTE.length; i++) {
    const cx = sx + i * (SWATCH_R * 2 + SWATCH_G) + SWATCH_R
    const cy = SWATCH_Y + SWATCH_R
    if (Math.hypot(tx - cx, ty - cy) < SWATCH_R + 8) return i
  }
  return -1
}

// ── Component ──
interface Props { active: boolean }

export default function CameraDrawingMode({ active }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const drawRef    = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)

  const [colour, setColour] = useState(PALETTE[0])
  const [status, setStatus] = useState<'loading' | 'ready' | 'nocam' | 'error'>('loading')
  const [label,  setLabel]  = useState('')

  // Mutation refs — avoid stale closures inside RAF
  const colR        = useRef(colour)
  const strokesR    = useRef<{ color: string; pts: [number, number][] }[]>([])
  const curPtsR     = useRef<[number, number][]>([])
  const offsetR     = useRef({ x: 0, y: 0 })
  const pinchR      = useRef<{ x: number; y: number } | null>(null)
  const prevGestR   = useRef<'draw' | 'pinch' | 'idle'>('idle')
  const dwellR      = useRef<{ idx: number; start: number } | null>(null)
  const rafR        = useRef(0)
  const landmarkerR = useRef<HandLandmarker | null>(null)
  const streamR     = useRef<MediaStream | null>(null)

  useEffect(() => { colR.current = colour }, [colour])

  // ── Full redraw from stored strokes ──
  const redrawAll = useCallback((dc: CanvasRenderingContext2D, w: number, h: number) => {
    dc.clearRect(0, 0, w, h)
    const ox = offsetR.current.x, oy = offsetR.current.y

    const draw = (pts: [number, number][], c: string) => {
      if (pts.length < 2) return
      dc.beginPath()
      dc.strokeStyle = c
      dc.lineWidth = BRUSH
      dc.lineCap = 'round'
      dc.lineJoin = 'round'
      dc.moveTo(pts[0][0] + ox, pts[0][1] + oy)
      for (let i = 1; i < pts.length; i++) dc.lineTo(pts[i][0] + ox, pts[i][1] + oy)
      dc.stroke()
    }

    for (const s of strokesR.current) draw(s.pts, s.color)
    if (curPtsR.current.length >= 2) draw(curPtsR.current, colR.current)
  }, [])

  // ── RAF loop ──
  const tick = useCallback(() => {
    const video  = videoRef.current
    const drawC  = drawRef.current
    const overC  = overlayRef.current
    const lmkr   = landmarkerR.current

    if (!video || !drawC || !overC || !lmkr || video.readyState < 2) {
      rafR.current = requestAnimationFrame(tick)
      return
    }

    const vw = video.videoWidth  || 640
    const vh = video.videoHeight || 480
    if (drawC.width  !== vw) { drawC.width  = vw; drawC.height  = vh }
    if (overC.width  !== vw) { overC.width  = vw; overC.height  = vh }

    const results = lmkr.detectForVideo(video, performance.now())
    const oc = overC.getContext('2d')!
    const dc = drawC.getContext('2d')!
    oc.clearRect(0, 0, vw, vh)

    // Dwell progress for colour strip rendering
    const now      = Date.now()
    const dwellIdx = dwellR.current?.idx ?? -1
    const dwellPct = dwellR.current ? Math.min((now - dwellR.current.start) / DWELL_MS, 1) : 0
    drawColourStrip(oc, vw, colR.current, dwellIdx, dwellPct)

    if (results.landmarks?.length) {
      const lm = results.landmarks[0]
      const g  = classify(lm)

      // Mirror x: (1 - lm.x) * vw aligns with CSS-mirrored video
      const ix = (1 - lm[8].x) * vw
      const iy = lm[8].y * vh
      const wx = ix - offsetR.current.x  // world-space x
      const wy = iy - offsetR.current.y  // world-space y

      // ── DRAW ──
      if (g === 'draw') {
        if (prevGestR.current !== 'draw') pinchR.current = null
        prevGestR.current = 'draw'
        dwellR.current = null
        setLabel('✏️ 그리는 중')

        curPtsR.current.push([wx, wy])

        const pts = curPtsR.current
        if (pts.length >= 2) {
          const prev = pts[pts.length - 2]
          dc.beginPath()
          dc.strokeStyle = colR.current
          dc.lineWidth = BRUSH
          dc.lineCap = 'round'
          dc.lineJoin = 'round'
          dc.moveTo(prev[0] + offsetR.current.x, prev[1] + offsetR.current.y)
          dc.lineTo(wx      + offsetR.current.x, wy      + offsetR.current.y)
          dc.stroke()
        }

        // Fingertip cursor
        oc.beginPath()
        oc.arc(ix, iy, 16, 0, Math.PI * 2)
        oc.fillStyle = colR.current
        oc.fill()
        oc.strokeStyle = '#fff'
        oc.lineWidth = 3
        oc.stroke()

      // ── PINCH / MOVE ──
      } else if (g === 'pinch') {
        if (prevGestR.current === 'draw' && curPtsR.current.length > 1) {
          strokesR.current.push({ color: colR.current, pts: [...curPtsR.current] })
          curPtsR.current = []
        }
        prevGestR.current = 'pinch'
        dwellR.current = null
        setLabel('✋ 이동 중')

        const tx = (1 - lm[4].x) * vw
        const ty = lm[4].y * vh
        const px = (ix + tx) / 2
        const py = (iy + ty) / 2

        if (pinchR.current) {
          offsetR.current.x += px - pinchR.current.x
          offsetR.current.y += py - pinchR.current.y
          redrawAll(dc, vw, vh)
        }
        pinchR.current = { x: px, y: py }

        oc.beginPath()
        oc.arc(px, py, 22, 0, Math.PI * 2)
        oc.fillStyle = 'rgba(77,114,251,0.3)'
        oc.fill()
        oc.strokeStyle = '#4D72FB'
        oc.lineWidth = 3
        oc.stroke()

      // ── IDLE ──
      } else {
        if (prevGestR.current === 'draw' && curPtsR.current.length > 1) {
          strokesR.current.push({ color: colR.current, pts: [...curPtsR.current] })
          curPtsR.current = []
        }
        prevGestR.current = 'idle'
        pinchR.current = null
        setLabel('')

        // Thumb tip position for colour-swatch dwell
        const tx = (1 - lm[4].x) * vw
        const ty = lm[4].y * vh
        const hit = swatchHit(tx, ty, vw)

        if (hit >= 0) {
          if (dwellR.current?.idx === hit) {
            if (now - dwellR.current.start >= DWELL_MS) {
              const picked = PALETTE[hit]
              setColour(picked)
              colR.current = picked
              dwellR.current = null
            }
          } else {
            dwellR.current = { idx: hit, start: now }
          }
        } else {
          dwellR.current = null
        }

        // Ghost index cursor
        oc.beginPath()
        oc.arc(ix, iy, 8, 0, Math.PI * 2)
        oc.fillStyle = 'rgba(255,255,255,0.4)'
        oc.fill()
        oc.strokeStyle = 'rgba(255,255,255,0.7)'
        oc.lineWidth = 2
        oc.stroke()

        // Thumb cursor (yellow)
        oc.beginPath()
        oc.arc(tx, ty, 11, 0, Math.PI * 2)
        oc.fillStyle = 'rgba(255,215,0,0.45)'
        oc.fill()
        oc.strokeStyle = '#FFD700'
        oc.lineWidth = 2
        oc.stroke()
      }

      drawSkeleton(oc, lm, vw, vh)

    } else {
      // No hand in frame — finalise any open stroke
      if (prevGestR.current === 'draw' && curPtsR.current.length > 1) {
        strokesR.current.push({ color: colR.current, pts: [...curPtsR.current] })
        curPtsR.current = []
      }
      prevGestR.current = 'idle'
      pinchR.current = null
      dwellR.current = null
      setLabel('')
    }

    rafR.current = requestAnimationFrame(tick)
  }, [redrawAll])

  // ── Initialise camera + MediaPipe when tab becomes active ──
  useEffect(() => {
    if (!active) return
    let cancelled = false

    ;(async () => {
      try {
        setStatus('loading')
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
        )
        if (cancelled) return

        const lmkr = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        })
        if (cancelled) { lmkr.close(); return }
        landmarkerR.current = lmkr

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamR.current = stream

        const vid = videoRef.current
        if (!vid) return
        vid.srcObject = stream
        await vid.play()
        if (!cancelled) setStatus('ready')
      } catch (e: any) {
        if (cancelled) return
        console.error('[CameraDrawingMode]', e)
        setStatus(
          e.name === 'NotAllowedError' || e.name === 'NotFoundError' ? 'nocam' : 'error'
        )
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafR.current)
      streamR.current?.getTracks().forEach(t => t.stop())
      streamR.current = null
      landmarkerR.current?.close()
      landmarkerR.current = null
      strokesR.current = []
      curPtsR.current = []
      offsetR.current = { x: 0, y: 0 }
      prevGestR.current = 'idle'
      setStatus('loading')
      setLabel('')
    }
  }, [active])

  // ── Start / stop RAF loop on ready ──
  useEffect(() => {
    if (status === 'ready') rafR.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafR.current)
  }, [status, tick])

  // ── Click on overlay canvas → mouse-click colour select ──
  const handleOverlayClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = overlayRef.current
    if (!c) return
    const rect = c.getBoundingClientRect()
    const cx = (e.clientX - rect.left) * (c.width / rect.width)
    const cy = (e.clientY - rect.top)  * (c.height / rect.height)
    const hit = swatchHit(cx, cy, c.width)
    if (hit >= 0) {
      setColour(PALETTE[hit])
      colR.current = PALETTE[hit]
    }
  }

  const handleClear = () => {
    strokesR.current = []
    curPtsR.current  = []
    offsetR.current  = { x: 0, y: 0 }
    const c = drawRef.current
    if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
  }

  const handleUndo = () => {
    if (strokesR.current.length === 0) return
    strokesR.current.pop()
    curPtsR.current = []
    const c = drawRef.current
    if (c) redrawAll(c.getContext('2d')!, c.width, c.height)
  }

  // ── Render ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Camera viewport ── */}
      <div style={{
        position: 'relative',
        borderRadius: 18,
        overflow: 'hidden',
        border: '2px solid #E8ECF4',
        boxShadow: '0 2px 16px rgba(77,114,251,0.08)',
        background: '#111',
        aspectRatio: '4/3',
        width: '100%',
      }}>
        {/* Status overlays */}
        {status === 'loading' && (
          <div style={centreOverlay}>
            <div style={{ fontSize: 44 }} className="bounce">✋</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>카메라 · AI 불러오는 중…</div>
            <div style={{ fontSize: 12, color: '#aaa' }}>처음 실행 시 잠시 걸릴 수 있어요</div>
          </div>
        )}
        {status === 'nocam' && (
          <div style={centreOverlay}>
            <div style={{ fontSize: 44 }}>📷</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>카메라 권한이 필요해요</div>
            <div style={{ fontSize: 13, color: '#ccc' }}>브라우저에서 카메라를 허용해 주세요</div>
          </div>
        )}
        {status === 'error' && (
          <div style={centreOverlay}>
            <div style={{ fontSize: 44 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>카메라를 불러올 수 없어요</div>
          </div>
        )}

        {/* Video — CSS-mirrored so user sees a natural reflection */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            display: 'block',
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            opacity: status === 'ready' ? 1 : 0,
            transition: 'opacity 0.4s',
          }}
        />

        {/* Stroke canvas — NOT CSS-mirrored; JS flips x with (1 - lm.x) * vw */}
        <canvas
          ref={drawRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
          }}
        />

        {/* Overlay canvas — skeleton, cursor, colour strip; click → colour pick */}
        <canvas
          ref={overlayRef}
          onClick={handleOverlayClick}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            cursor: 'default',
          }}
        />

        {/* Gesture label pill */}
        {label && (
          <div style={{
            position: 'absolute', bottom: 10, left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            color: '#fff', borderRadius: 20,
            padding: '5px 16px',
            fontSize: 13, fontWeight: 700,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            {label}
          </div>
        )}
      </div>

      {/* ── Colour palette (mouse-clickable bar) ── */}
      <div style={{
        background: '#fff', borderRadius: 16,
        padding: '12px 14px 10px',
        border: '2px solid #E8ECF4',
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#4D72FB', marginBottom: 8 }}>
          색상 선택 (카메라 위 원을 엄지로 가리켜도 선택돼요)
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {PALETTE.map(hex => (
            <button key={hex}
              onClick={() => { setColour(hex); colR.current = hex }}
              style={{
                width: 34, height: 34, borderRadius: '50%', background: hex,
                border: colour === hex ? '3px solid #1A1A2E' : '3px solid #E8ECF4',
                outline: colour === hex ? '2px solid #fff' : 'none',
                cursor: 'pointer',
                transform: colour === hex ? 'scale(1.22)' : 'scale(1)',
                transition: 'transform 0.15s ease, border 0.15s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              }}
            />
          ))}
        </div>

        {/* Selected swatch + action buttons */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0F0F0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: colour,
              border: '2px solid #E8ECF4', boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#aaa' }}>선택된 색</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleUndo}  size="sm" variant="outline">↩ 되돌리기</Button>
            <Button onClick={handleClear} size="sm" variant="outline" color="#FF4444">지우기</Button>
          </div>
        </div>
      </div>

      {/* ── Gesture guide ── */}
      {status === 'ready' && (
        <div style={{
          background: '#F8F9FF', borderRadius: 14,
          padding: '10px 14px',
          border: '1px solid #E0E8FF',
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#4D72FB', marginBottom: 6 }}>
            손 제스처 사용법
          </div>
          {[
            ['✏️', '검지만 펴기',               '그림 그리기'],
            ['🤌', '엄지 + 검지 모으기',        '그림 전체 이동'],
            ['👍', '엄지로 위쪽 색상 원 가리키기', `${DWELL_MS / 1000}초 유지 → 색상 선택`],
          ].map(([icon, act, desc]) => (
            <div key={act} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#555', lineHeight: 1.7 }}>
              <span>{icon}</span>
              <span><b>{act}</b> → {desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const centreOverlay: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column', gap: 12,
  alignItems: 'center', justifyContent: 'center',
  padding: 24, textAlign: 'center',
}
