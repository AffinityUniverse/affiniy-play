import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

// Frame data callback type — registered by each sub-game
export type FrameHandler = (lm: NormalizedLandmark[] | null, vw: number, vh: number) => void

// ── Coordinate helpers (mirror x for CSS-mirrored video) ──
export const lmX = (p: NormalizedLandmark, vw: number) => (1 - p.x) * vw
export const lmY = (p: NormalizedLandmark, vh: number) => p.y * vh

// ── Gesture helpers ──
export const isExtended = (lm: NormalizedLandmark[], tip: number, pip: number) =>
  lm[tip].y < lm[pip].y

export function isIndexOnly(lm: NormalizedLandmark[]): boolean {
  return (
    isExtended(lm, 8, 6) &&
    !isExtended(lm, 12, 10) &&
    !isExtended(lm, 16, 14) &&
    !isExtended(lm, 20, 18)
  )
}

export function isPinch(lm: NormalizedLandmark[]): boolean {
  return Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) < 0.07
}

// Wrist + four MCP joints → stable palm centre
export function palmCenter(lm: NormalizedLandmark[], vw: number, vh: number): [number, number] {
  const pts = [0, 5, 9, 13, 17]
  return [
    pts.reduce((a, i) => a + lmX(lm[i], vw), 0) / pts.length,
    pts.reduce((a, i) => a + lmY(lm[i], vh), 0) / pts.length,
  ]
}

// ── Line-circle intersection (for fruit slashing) ──
export function lineHitsCircle(
  x1: number, y1: number, x2: number, y2: number,
  cx: number, cy: number, r: number,
): boolean {
  const dx = x2 - x1, dy = y2 - y1
  const fx = x1 - cx, fy = y1 - cy
  const a = dx * dx + dy * dy
  if (a === 0) return Math.hypot(fx, fy) <= r
  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - r * r
  const disc = b * b - 4 * a * c
  if (disc < 0) return false
  const s = Math.sqrt(disc)
  const t1 = (-b - s) / (2 * a)
  const t2 = (-b + s) / (2 * a)
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 <= 0 && t2 >= 1)
}

// ── Hand skeleton overlay ──
const BONES = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
]

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  lm: NormalizedLandmark[],
  vw: number, vh: number,
  alpha = 0.4,
) {
  ctx.lineWidth = 1.5
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`
  for (const [a, b] of BONES) {
    ctx.beginPath()
    ctx.moveTo(lmX(lm[a], vw), lmY(lm[a], vh))
    ctx.lineTo(lmX(lm[b], vw), lmY(lm[b], vh))
    ctx.stroke()
  }
  for (const p of lm) {
    ctx.beginPath()
    ctx.arc(lmX(p, vw), lmY(p, vh), 3, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${alpha + 0.3})`
    ctx.fill()
  }
}

// ── HUD helpers ──
export function hud(
  ctx: CanvasRenderingContext2D,
  vw: number,
  score: number,
  lives: number,
  timeLeft?: number,
) {
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.8)'
  ctx.shadowBlur = 5
  // Score (right)
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${vw * 0.045}px sans-serif`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(`${score}점`, vw - 12, 12)
  // Lives (left)
  ctx.textAlign = 'left'
  ctx.fillText('❤️'.repeat(Math.max(0, lives)), 12, 12)
  // Timer (center, if provided)
  if (timeLeft !== undefined) {
    ctx.textAlign = 'center'
    ctx.fillStyle = timeLeft < 10 ? '#FF4444' : '#fff'
    ctx.fillText(`${timeLeft}s`, vw / 2, 12)
  }
  ctx.restore()
}
