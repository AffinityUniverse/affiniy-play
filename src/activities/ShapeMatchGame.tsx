import { useState, useRef, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

const SHAPES = [
  { id: 'circle',   color: '#4D72FB', name: '동그라미' },
  { id: 'square',   color: '#FF8800', name: '네모' },
  { id: 'triangle', color: '#44BB44', name: '세모' },
  { id: 'star',     color: '#CC44CC', name: '별' },
  { id: 'heart',    color: '#FF4488', name: '하트' },
]

const CHAR: Record<string, string> = {
  circle: '/slice/slice5.png', square: '/slice/slice2.png',
  triangle: '/slice/slice3.png', star: '/slice/slice4.png', heart: '/slice/slice6.png',
}

function ShapeSVG({ id, color, size = 64, outline = false }: { id: string; color: string; size?: number; outline?: boolean }) {
  const f = outline ? 'none' : color
  const s = outline ? color : 'none'
  const sw = outline ? 3.5 : 0
  const c = size / 2

  const starPts = Array.from({ length: 5 }, (_, i) => {
    const o = (i * 72 - 90) * Math.PI / 180
    const n = (i * 72 - 90 + 36) * Math.PI / 180
    const R = size * 0.42, r2 = size * 0.17
    return [`${c + R * Math.cos(o)},${c + R * Math.sin(o)}`, `${c + r2 * Math.cos(n)},${c + r2 * Math.sin(n)}`]
  }).flat().join(' ')

  const heartD = `M ${c} ${size*.78} L ${size*.1} ${size*.38} A ${size*.22} ${size*.22} 0 0 1 ${c} ${size*.22} A ${size*.22} ${size*.22} 0 0 1 ${size*.9} ${size*.38} Z`

  const shapes: Record<string, JSX.Element> = {
    circle:   <circle cx={c} cy={c} r={size*.38} fill={f} stroke={s} strokeWidth={sw} />,
    square:   <rect x={size*.1} y={size*.1} width={size*.8} height={size*.8} rx={size*.12} fill={f} stroke={s} strokeWidth={sw} />,
    triangle: <polygon points={`${c},${size*.1} ${size*.9},${size*.9} ${size*.1},${size*.9}`} fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />,
    star:     <polygon points={starPts} fill={f} stroke={s} strokeWidth={sw} />,
    heart:    <path d={heartD} fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />,
  }
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{shapes[id]}</svg>
}

export default function ShapeMatchGame({ onBack }: Props) {
  const [matched, setMatched] = useState<string[]>([])
  const [wrongSlot, setWrongSlot] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [dragPos, setDragPos] = useState<{ x: number; y: number; id: string } | null>(null)

  const dragRef = useRef<{ id: string } | null>(null)
  const matchedRef = useRef<string[]>([])
  matchedRef.current = matched
  const doneRef = useRef(false)
  doneRef.current = done

  const slots = useMemo(() => [...SHAPES].sort(() => Math.random() - 0.5).map(s => s.id), [])

  const checkDrop = (shapeId: string, slotId: string) => {
    if (matchedRef.current.includes(shapeId)) return
    if (shapeId === slotId) {
      const next = [...matchedRef.current, shapeId]
      setMatched(next)
      if (next.length === SHAPES.length) setTimeout(() => setDone(true), 450)
    } else {
      setWrongSlot(slotId)
      setTimeout(() => setWrongSlot(null), 550)
    }
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      e.preventDefault()
      setDragPos({ x: e.clientX, y: e.clientY, id: dragRef.current.id })
    }

    const onUp = (e: PointerEvent) => {
      if (!dragRef.current) return
      const id = dragRef.current.id
      dragRef.current = null

      // Temporarily hide ghost to get element underneath
      const ghost = document.getElementById('shape-ghost')
      if (ghost) ghost.style.display = 'none'
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (ghost) ghost.style.display = ''

      const slotEl = el?.closest('[data-slot-id]') as HTMLElement | null
      if (slotEl) checkDrop(id, slotEl.dataset.slotId!)

      setDragPos(null)
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', () => { dragRef.current = null; setDragPos(null) })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  const startDrag = (e: React.PointerEvent, id: string) => {
    if (matched.includes(id)) return
    e.preventDefault()
    dragRef.current = { id }
    setDragPos({ x: e.clientX, y: e.clientY, id })
  }

  const restart = () => { setMatched([]); setWrongSlot(null); setDone(false); setDragPos(null); dragRef.current = null }

  if (done) return (
    <Layout title="모양 맞추기" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '48px 24px', textAlign: 'center' }}>
        <img src="/slice/slice9.png" alt="" style={{ width: 110, height: 110, objectFit: 'contain', animation: 'celebrate 0.6s ease infinite' }} />
        <div style={{ fontSize: 26, fontWeight: 900, color: '#4D72FB' }}>🎉 모두 맞췄어요!</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={restart}>다시 하기</Button>
          <Button onClick={onBack} variant="outline">홈으로</Button>
        </div>
      </div>
    </Layout>
  )

  const draggingId = dragPos?.id

  return (
    <Layout title="모양 맞추기" onBack={onBack}>
      {/* Ghost element that follows pointer */}
      {dragPos && (
        <div id="shape-ghost" style={{ position: 'fixed', left: dragPos.x - 40, top: dragPos.y - 40, width: 80, height: 80, pointerEvents: 'none', zIndex: 9999, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.25))', opacity: 0.92 }}>
          <ShapeSVG id={dragPos.id} color={SHAPES.find(s => s.id === dragPos.id)!.color} size={80} />
        </div>
      )}

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '12px 18px 32px', width: '100%' }}>
        <p style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#aaa', marginBottom: 20 }}>
          모양을 끌어다 맞는 자리에 놓아봐요!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Left: draggable shapes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#bbb', marginBottom: 2 }}>모양 고르기</div>
            {SHAPES.map(shape => {
              const isMatched = matched.includes(shape.id)
              const isDragging = draggingId === shape.id
              return (
                <div
                  key={shape.id}
                  onPointerDown={e => startDrag(e, shape.id)}
                  style={{
                    background: isMatched ? '#F5F7FF' : `${shape.color}18`,
                    border: `2.5px solid ${isMatched ? '#E8ECF4' : `${shape.color}60`}`,
                    borderRadius: 18,
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 14px',
                    cursor: isMatched ? 'default' : 'grab',
                    opacity: isMatched ? 0.3 : isDragging ? 0.35 : 1,
                    transition: 'opacity 0.2s ease',
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                >
                  <ShapeSVG id={shape.id} color={shape.color} size={50} />
                  <img src={CHAR[shape.id]} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                </div>
              )
            })}
          </div>

          {/* Right: drop slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#bbb', marginBottom: 2 }}>자리 찾기</div>
            {slots.map(slotId => {
              const shape = SHAPES.find(s => s.id === slotId)!
              const isMatched = matched.includes(slotId)
              const isWrong = wrongSlot === slotId
              const isHoverable = !!draggingId && !isMatched
              return (
                <div
                  key={slotId}
                  data-slot-id={slotId}
                  className={isWrong ? 'shake' : ''}
                  style={{
                    background: isMatched ? `${shape.color}14` : isHoverable ? '#EEF3FF' : '#FAFBFF',
                    border: `2.5px dashed ${isMatched ? shape.color : isWrong ? '#FF4444' : isHoverable ? '#4D72FB' : '#C8D4FF'}`,
                    borderRadius: 18,
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: isMatched ? `0 4px 16px ${shape.color}33` : 'none',
                  }}
                >
                  {isMatched
                    ? <ShapeSVG id={slotId} color={shape.color} size={50} />
                    : <ShapeSVG id={slotId} color="#C8D4FF" size={50} outline />
                  }
                </div>
              )
            })}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {SHAPES.map(s => (
            <div key={s.id} style={{ width: 10, height: 10, borderRadius: '50%', background: matched.includes(s.id) ? s.color : '#E8ECF4', transition: 'background 0.3s, transform 0.3s', transform: matched.includes(s.id) ? 'scale(1.3)' : 'scale(1)' }} />
          ))}
        </div>
      </div>
    </Layout>
  )
}
