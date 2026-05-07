import { useState, useRef, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

const CHARS = [
  { id: 'orange', name: '주황이',   src: 'slice/slice2.png', color: '#FF8800' },
  { id: 'green',  name: '초록이',   src: 'slice/slice3.png', color: '#44BB44' },
  { id: 'yellow', name: '노랑이',   src: 'slice/slice4.png', color: '#FFD700' },
  { id: 'blue',   name: '파랑이',   src: 'slice/slice5.png', color: '#4D72FB' },
  { id: 'pink',   name: '분홍이',   src: 'slice/slice6.png', color: '#FF66AA' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
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

  const slots = useMemo(() => shuffle([...CHARS]).map(c => c.id), [])

  const checkDrop = (charId: string, slotId: string) => {
    if (matchedRef.current.includes(charId)) return
    if (charId === slotId) {
      const next = [...matchedRef.current, charId]
      setMatched(next)
      if (next.length === CHARS.length) setTimeout(() => setDone(true), 450)
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
      const ghost = document.getElementById('char-ghost')
      if (ghost) ghost.style.display = 'none'
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (ghost) ghost.style.display = ''
      const slotEl = el?.closest('[data-slot-id]') as HTMLElement | null
      if (slotEl) checkDrop(id, slotEl.dataset.slotId!)
      setDragPos(null)
    }
    const onCancel = () => { dragRef.current = null; setDragPos(null) }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [])

  const startDrag = (e: React.PointerEvent, id: string) => {
    if (matched.includes(id)) return
    e.preventDefault()
    dragRef.current = { id }
    setDragPos({ x: e.clientX, y: e.clientY, id })
  }

  const restart = () => { setMatched([]); setWrongSlot(null); setDone(false); setDragPos(null); dragRef.current = null }

  const draggingId = dragPos?.id
  const draggingChar = CHARS.find(c => c.id === draggingId)

  if (done) return (
    <Layout title="친구 찾기" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {CHARS.map(c => (
            <img key={c.id} src={c.src} alt={c.name} style={{ width: 52, height: 52, objectFit: 'contain' }} />
          ))}
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#4D72FB' }}>모두 찾았어요!</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={restart}>다시 하기</Button>
          <Button onClick={onBack} variant="outline">홈으로</Button>
        </div>
      </div>
    </Layout>
  )

  return (
    <Layout title="친구 찾기" onBack={onBack}>
      {/* Drag ghost */}
      {dragPos && draggingChar && (
        <div id="char-ghost" style={{
          position: 'fixed', left: dragPos.x - 44, top: dragPos.y - 44,
          width: 88, height: 88, pointerEvents: 'none', zIndex: 9999,
          filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.3))',
        }}>
          <img src={draggingChar.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      )}

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '12px 16px 32px', width: '100%' }}>
        <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#aaa', marginBottom: 18 }}>
          친구를 끌어다 그림자 위에 올려봐요!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Left: draggable characters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#bbb', marginBottom: 2 }}>친구들</div>
            {CHARS.map(char => {
              const isMatched = matched.includes(char.id)
              const isDragging = draggingId === char.id
              return (
                <div
                  key={char.id}
                  onPointerDown={e => startDrag(e, char.id)}
                  style={{
                    background: isMatched ? '#F8F9FF' : `${char.color}14`,
                    border: `2.5px solid ${isMatched ? '#E8ECF4' : `${char.color}44`}`,
                    borderRadius: 20,
                    height: 90,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isMatched ? 'default' : 'grab',
                    opacity: isMatched ? 0.25 : isDragging ? 0.3 : 1,
                    transition: 'opacity 0.2s ease',
                    userSelect: 'none', touchAction: 'none',
                  }}
                >
                  <img
                    src={char.src}
                    alt={char.name}
                    style={{ width: 64, height: 64, objectFit: 'contain', pointerEvents: 'none' }}
                  />
                </div>
              )
            })}
          </div>

          {/* Right: silhouette slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#bbb', marginBottom: 2 }}>그림자</div>
            {slots.map(slotId => {
              const char = CHARS.find(c => c.id === slotId)!
              const isMatched = matched.includes(slotId)
              const isWrong = wrongSlot === slotId
              const isHoverable = !!draggingId && !isMatched
              return (
                <div
                  key={slotId}
                  data-slot-id={slotId}
                  className={isWrong ? 'shake' : ''}
                  style={{
                    background: isMatched ? `${char.color}10` : isHoverable ? '#EEF3FF' : '#F8F9FF',
                    border: `2.5px dashed ${isMatched ? char.color : isWrong ? '#FF4444' : isHoverable ? '#4D72FB' : '#DDE2F0'}`,
                    borderRadius: 20,
                    height: 90,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: isMatched ? `0 4px 16px ${char.color}33` : 'none',
                  }}
                >
                  <img
                    src={char.src}
                    alt=""
                    style={{
                      width: 64, height: 64, objectFit: 'contain',
                      filter: isMatched ? 'none' : 'brightness(0) opacity(0.18)',
                      transition: 'filter 0.4s ease',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {CHARS.map(c => (
            <div key={c.id} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: matched.includes(c.id) ? c.color : '#E8ECF4',
              transition: 'background 0.3s, transform 0.3s',
              transform: matched.includes(c.id) ? 'scale(1.3)' : 'scale(1)',
            }} />
          ))}
        </div>
      </div>
    </Layout>
  )
}
