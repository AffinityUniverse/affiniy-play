import { useState, useRef, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

// ────────────────────────── SVG mode state ──────────────────────────
const DEFAULTS: Record<string, string> = {
  sky: '#fff', sun: '#fff', cloud1: '#fff', cloud2: '#fff',
  ground: '#fff', path: '#fff',
  houseBody: '#fff', roof: '#fff', chimney: '#fff',
  doorBody: '#fff', doorKnob: '#fff',
  windowL: '#fff', windowR: '#fff',
  treeTrunk: '#fff', treeTop: '#fff',
  petalL: '#fff', centerL: '#fff', petalR: '#fff', centerR: '#fff',
}

const PALETTE = [
  '#FF4444', '#FF8800', '#FFD700', '#88CC44',
  '#44AAFF', '#4D72FB', '#9944CC', '#FF66AA',
  '#FF99CC', '#FFFFFF', '#CCCCCC', '#8B6355',
  '#3A7820', '#1A1A2E', '#FF6633', '#00CCAA',
]

const S = '#1A1A2E'
const SW = 1.8

// ────────────────────────── Sobel edge detection ──────────────────────────
function applySobelEdge(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width, h = src.height
  const ctx = src.getContext('2d')!
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  // Convert to grayscale
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b
  }

  // Sobel kernels — lower threshold captures more edges
  const edgeMask = new Uint8Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = gray[(y-1)*w+(x-1)], tm = gray[(y-1)*w+x], tr = gray[(y-1)*w+(x+1)]
      const ml = gray[y*w+(x-1)],                             mr = gray[y*w+(x+1)]
      const bl = gray[(y+1)*w+(x-1)], bm = gray[(y+1)*w+x], br = gray[(y+1)*w+(x+1)]
      const gx = -tl - 2*ml - bl + tr + 2*mr + br
      const gy = -tl - 2*tm - tr + bl + 2*bm + br
      if (Math.sqrt(gx*gx + gy*gy) > 25) edgeMask[y*w+x] = 1
    }
  }

  // Dilate edges by 1px to make strokes thicker
  const out = new Uint8ClampedArray(w * h * 4).fill(255)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (
        edgeMask[y*w+x] ||
        edgeMask[(y-1)*w+x] || edgeMask[(y+1)*w+x] ||
        edgeMask[y*w+(x-1)] || edgeMask[y*w+(x+1)]
      ) {
        const idx = (y*w+x)*4
        out[idx] = 0; out[idx+1] = 0; out[idx+2] = 0; out[idx+3] = 255
      }
    }
  }

  const dst = document.createElement('canvas')
  dst.width = w
  dst.height = h
  const dctx = dst.getContext('2d')!
  const dData = dctx.createImageData(w, h)
  dData.data.set(out)
  dctx.putImageData(dData, 0, 0)
  return dst
}

// ────────────────────────── BFS flood fill ──────────────────────────
function floodFill(
  canvas: HTMLCanvasElement,
  x: number, y: number,
  fillR: number, fillG: number, fillB: number
) {
  const ctx = canvas.getContext('2d')!
  const w = canvas.width, h = canvas.height
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  const idx = (py: number, px: number) => (py * w + px) * 4
  const startIdx = idx(y, x)
  const targetR = data[startIdx], targetG = data[startIdx+1], targetB = data[startIdx+2]

  // Don't fill if clicking on a black edge pixel
  if (targetR < 50 && targetG < 50 && targetB < 50) return

  // Don't fill if color is already this color (within tolerance)
  if (
    Math.abs(targetR - fillR) < 5 &&
    Math.abs(targetG - fillG) < 5 &&
    Math.abs(targetB - fillB) < 5
  ) return

  const matches = (r: number, g: number, b: number) =>
    Math.abs(r - targetR) < 30 &&
    Math.abs(g - targetG) < 30 &&
    Math.abs(b - targetB) < 30

  const visited = new Uint8Array(w * h)
  const queue: number[] = [y * w + x]
  visited[y * w + x] = 1

  while (queue.length > 0) {
    const pos = queue.pop()!
    const py = Math.floor(pos / w)
    const px = pos % w
    const i = idx(py, px)
    data[i] = fillR; data[i+1] = fillG; data[i+2] = fillB; data[i+3] = 255

    const neighbors = [
      [py-1, px], [py+1, px], [py, px-1], [py, px+1]
    ]
    for (const [ny, nx] of neighbors) {
      if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue
      const ni = ny * w + nx
      if (visited[ni]) continue
      const di = ni * 4
      if (matches(data[di], data[di+1], data[di+2])) {
        visited[ni] = 1
        queue.push(ni)
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

// ────────────────────────── hex → rgb ──────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0]
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}

// ────────────────────────── Component ──────────────────────────
type Mode = 'svg' | 'canvas'

export default function ColoringActivity({ onBack }: Props) {
  const [mode, setMode] = useState<Mode>('svg')

  // SVG mode state
  const [colors, setColors] = useState<Record<string, string>>({ ...DEFAULTS })
  const [sel, setSel] = useState('#FFD700')

  // Canvas mode state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Stores processed edge image data URL — drawn onto canvas once it mounts
  const pendingEdgeUrl = useRef<string | null>(null)
  const pendingSize = useRef<{ w: number; h: number } | null>(null)

  const fill = (r: string) => setColors(p => ({ ...p, [r]: sel }))

  const svgRegion = (id: string, extra?: Record<string, unknown>) => ({
    fill: colors[id],
    stroke: S,
    strokeWidth: SW,
    onClick: () => fill(id),
    style: { cursor: 'pointer' } as React.CSSProperties,
    ...extra,
  })

  // Once canvasReady flips true the canvas element mounts — draw the edge image into it
  useEffect(() => {
    if (!canvasReady || !canvasRef.current || !pendingEdgeUrl.current || !pendingSize.current) return
    const canvas = canvasRef.current
    const { w, h } = pendingSize.current
    canvas.width = w
    canvas.height = h
    const img = new Image()
    img.onload = () => {
      canvas.getContext('2d')!.drawImage(img, 0, 0)
    }
    img.src = pendingEdgeUrl.current
  }, [canvasReady])

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    setCanvasReady(false)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        // Resize to fit display (max 480×580)
        const maxW = 480, maxH = 580
        let w = img.width, h = img.height
        const scale = Math.min(maxW / w, maxH / h, 1)
        w = Math.round(w * scale)
        h = Math.round(h * scale)

        // Draw original image to offscreen canvas
        const offscreen = document.createElement('canvas')
        offscreen.width = w
        offscreen.height = h
        offscreen.getContext('2d')!.drawImage(img, 0, 0, w, h)

        // Apply Sobel edge detection → store as data URL
        const edgeCanvas = applySobelEdge(offscreen)
        pendingEdgeUrl.current = edgeCanvas.toDataURL()
        pendingSize.current = { w, h }

        // Switch mode first so <canvas> element mounts, then useEffect draws to it
        setMode('canvas')
        setUploading(false)
        setCanvasReady(true)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    // Reset so the same file can be re-selected later
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  // Canvas click → flood fill
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !canvasReady) return
    const rect = canvas.getBoundingClientRect()
    // Map click coordinates from display size to canvas buffer size
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top) * scaleY)
    const [r, g, b] = hexToRgb(sel)
    floodFill(canvas, x, y, r, g, b)
  }, [canvasReady, sel])

  const handleCanvasReset = () => {
    // Re-draw the original edge image to wipe all colors
    const canvas = canvasRef.current
    if (!canvas || !pendingEdgeUrl.current || !pendingSize.current) return
    const { w, h } = pendingSize.current
    canvas.width = w
    canvas.height = h
    const img = new Image()
    img.onload = () => canvas.getContext('2d')!.drawImage(img, 0, 0)
    img.src = pendingEdgeUrl.current
  }

  const switchToSvg = () => setMode('svg')
  const switchToCanvas = () => {
    if (canvasReady) setMode('canvas')
    else fileInputRef.current?.click()
  }

  return (
    <Layout title="색칠놀이" onBack={onBack}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '8px 14px 24px', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, background: '#F0F4FF', borderRadius: 12, padding: 4 }}>
          <button
            onClick={switchToSvg}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: mode === 'svg' ? '#4D72FB' : 'transparent',
              color: mode === 'svg' ? '#fff' : '#666',
              fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
            }}
          >
            기본 그림
          </button>
          <button
            onClick={switchToCanvas}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: mode === 'canvas' ? '#4D72FB' : 'transparent',
              color: mode === 'canvas' ? '#fff' : '#666',
              fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
            }}
          >
            사진 업로드
          </button>
        </div>

        {/* ── SVG mode ── */}
        {mode === 'svg' && (
          <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '2px solid #E8ECF4', boxShadow: '0 2px 16px rgba(77,114,251,0.08)' }}>
            <svg viewBox="0 0 400 260" width="100%" style={{ display: 'block', cursor: 'crosshair' }}>

              {/* Sky */}
              <rect x="0" y="0" width="400" height="175" {...svgRegion('sky')} rx="0" />

              {/* Sun */}
              <g onClick={() => fill('sun')} style={{ cursor: 'pointer' }}>
                {[0,45,90,135,180,225,270,315].map(a => (
                  <line key={a}
                    x1={340 + 40 * Math.cos(a * Math.PI/180)} y1={45 + 40 * Math.sin(a * Math.PI/180)}
                    x2={340 + 52 * Math.cos(a * Math.PI/180)} y2={45 + 52 * Math.sin(a * Math.PI/180)}
                    stroke={colors.sun === '#fff' ? S : colors.sun} strokeWidth={SW + 1} strokeLinecap="round"
                  />
                ))}
                <circle cx="340" cy="45" r="30" fill={colors.sun} stroke={S} strokeWidth={SW} style={{ cursor: 'pointer' }} />
              </g>

              {/* Cloud 1 */}
              <g onClick={() => fill('cloud1')} style={{ cursor: 'pointer' }}>
                <ellipse cx="95" cy="55" rx="28" ry="18" fill={colors.cloud1} stroke={S} strokeWidth={SW} />
                <ellipse cx="75" cy="62" rx="18" ry="14" fill={colors.cloud1} stroke={S} strokeWidth={SW} />
                <ellipse cx="118" cy="62" rx="18" ry="14" fill={colors.cloud1} stroke={S} strokeWidth={SW} />
              </g>

              {/* Cloud 2 */}
              <g onClick={() => fill('cloud2')} style={{ cursor: 'pointer' }}>
                <ellipse cx="220" cy="38" rx="22" ry="14" fill={colors.cloud2} stroke={S} strokeWidth={SW} />
                <ellipse cx="203" cy="44" rx="14" ry="11" fill={colors.cloud2} stroke={S} strokeWidth={SW} />
                <ellipse cx="238" cy="44" rx="15" ry="11" fill={colors.cloud2} stroke={S} strokeWidth={SW} />
              </g>

              {/* Ground */}
              <ellipse cx="200" cy="198" rx="210" ry="25" {...svgRegion('ground')} />
              <rect x="0" y="200" width="400" height="60" {...svgRegion('ground')} />

              {/* Path */}
              <rect x="175" y="198" width="50" height="62" {...svgRegion('path')} />
              <ellipse cx="200" cy="198" rx="25" ry="10" {...svgRegion('path')} />

              {/* Tree trunk */}
              <rect x="42" y="150" width="24" height="70" rx="6" {...svgRegion('treeTrunk')} />
              {/* Tree top */}
              <ellipse cx="54" cy="140" rx="42" ry="36" {...svgRegion('treeTop')} />

              {/* House body */}
              <rect x="118" y="115" width="164" height="90" rx="4" {...svgRegion('houseBody')} />
              {/* Roof */}
              <polygon points="100,117 200,55 300,117" {...svgRegion('roof')} strokeLinejoin="round" />
              {/* Chimney */}
              <rect x="225" y="62" width="22" height="40" rx="3" {...svgRegion('chimney')} />

              {/* Door */}
              <rect x="175" y="162" width="50" height="43" rx="5" {...svgRegion('doorBody')} />
              <ellipse cx="200" cy="162" rx="25" ry="9" fill={colors.doorBody} stroke={S} strokeWidth={SW} style={{ cursor: 'pointer' }} onClick={() => fill('doorBody')} />
              <circle cx="218" cy="186" r="4" {...svgRegion('doorKnob')} />

              {/* Windows */}
              <rect x="130" y="132" width="36" height="28" rx="5" {...svgRegion('windowL')} />
              <line x1="148" y1="132" x2="148" y2="160" stroke={S} strokeWidth={SW * 0.7} style={{ pointerEvents: 'none' }} />
              <line x1="130" y1="146" x2="166" y2="146" stroke={S} strokeWidth={SW * 0.7} style={{ pointerEvents: 'none' }} />

              <rect x="234" y="132" width="36" height="28" rx="5" {...svgRegion('windowR')} />
              <line x1="252" y1="132" x2="252" y2="160" stroke={S} strokeWidth={SW * 0.7} style={{ pointerEvents: 'none' }} />
              <line x1="234" y1="146" x2="270" y2="146" stroke={S} strokeWidth={SW * 0.7} style={{ pointerEvents: 'none' }} />

              {/* Flower left */}
              <line x1="90" y1="222" x2="90" y2="200" stroke={S} strokeWidth={SW} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
              {[0,60,120,180,240,300].map(a => {
                const rad = a * Math.PI / 180
                return <ellipse key={a}
                  cx={90 + 9 * Math.cos(rad)} cy={200 + 9 * Math.sin(rad)}
                  rx="5" ry="7" fill={colors.petalL} stroke={S} strokeWidth={SW - 0.5}
                  transform={`rotate(${a},${90+9*Math.cos(rad)},${200+9*Math.sin(rad)})`}
                  onClick={() => fill('petalL')} style={{ cursor: 'pointer' }} />
              })}
              <circle cx="90" cy="200" r="7" {...svgRegion('centerL')} />

              {/* Flower right */}
              <line x1="315" y1="222" x2="315" y2="200" stroke={S} strokeWidth={SW} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
              {[0,60,120,180,240,300].map(a => {
                const rad = a * Math.PI / 180
                return <ellipse key={a}
                  cx={315 + 9 * Math.cos(rad)} cy={200 + 9 * Math.sin(rad)}
                  rx="5" ry="7" fill={colors.petalR} stroke={S} strokeWidth={SW - 0.5}
                  transform={`rotate(${a},${315+9*Math.cos(rad)},${200+9*Math.sin(rad)})`}
                  onClick={() => fill('petalR')} style={{ cursor: 'pointer' }} />
              })}
              <circle cx="315" cy="200" r="7" {...svgRegion('centerR')} />
            </svg>
          </div>
        )}

        {/* ── Canvas mode ── */}
        {mode === 'canvas' && (
          <>
            {!canvasReady ? (
              /* Upload drop zone */
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                style={{
                  border: '3px dashed #C8D4FF',
                  borderRadius: 18,
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#F8F9FF',
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#4D72FB', marginBottom: 6 }}>
                  사진을 선택하세요
                </div>
                <div style={{ fontSize: 13, color: '#999' }}>
                  클릭하거나 사진을 여기에 끌어다 놓으세요
                </div>
              </div>
            ) : (
              /* Coloring canvas */
              <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '2px solid #E8ECF4', boxShadow: '0 2px 16px rgba(77,114,251,0.08)' }}>
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  style={{ display: 'block', width: '100%', cursor: 'crosshair', touchAction: 'none' }}
                />
              </div>
            )}
            {uploading && (
              <div style={{ textAlign: 'center', color: '#4D72FB', fontWeight: 700, fontSize: 14 }}>
                이미지 처리 중...
              </div>
            )}
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />

        {/* Palette */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '12px 14px 10px', border: '2px solid #E8ECF4' }}>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center' }}>
            {PALETTE.map(hex => (
              <button key={hex} onClick={() => setSel(hex)} style={{
                width: 32, height: 32, borderRadius: '50%', background: hex,
                border: sel === hex ? '3px solid #1A1A2E' : '3px solid #E8ECF4',
                outline: sel === hex ? '2px solid #fff' : 'none',
                cursor: 'pointer',
                transform: sel === hex ? 'scale(1.22)' : 'scale(1)',
                transition: 'transform 0.15s ease, border 0.15s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0F0F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: sel, border: '2px solid #E8ECF4', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#aaa' }}>선택된 색</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {mode === 'svg' && (
                <Button onClick={() => setColors({ ...DEFAULTS })} size="sm" variant="outline">초기화</Button>
              )}
              {mode === 'canvas' && canvasReady && (
                <>
                  <Button onClick={handleCanvasReset} size="sm" variant="outline">색 지우기</Button>
                  <Button onClick={() => { pendingEdgeUrl.current = null; pendingSize.current = null; setCanvasReady(false); setTimeout(() => fileInputRef.current?.click(), 50) }} size="sm" variant="outline">새 사진</Button>
                </>
              )}
              {mode === 'canvas' && !canvasReady && (
                <Button onClick={() => fileInputRef.current?.click()} size="sm">사진 선택</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
