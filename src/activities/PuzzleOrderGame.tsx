import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

/**
 * 타일 퍼즐: 전체 그림을 2×2 조각으로 나눠 섞은 뒤 맞추는 게임
 * 각 조각은 동일한 SVG 씬을 다른 viewBox로 렌더링합니다.
 */

// Full scene: 200×200, center character (파랑이) at (55,55) w=90
function SceneInner() {
  return (
    <>
      {/* Sky */}
      <rect x="0" y="0" width="200" height="100" fill="#B8DEFF" />
      {/* Ground */}
      <rect x="0" y="100" width="200" height="100" fill="#7DC456" />
      <ellipse cx="100" cy="102" rx="110" ry="16" fill="#9EDA70" />

      {/* TL: tree + butterfly */}
      <rect x="14" y="55" width="16" height="55" rx="5" fill="#8B6355" />
      <ellipse cx="22" cy="46" rx="28" ry="26" fill="#4CAF50" />
      <ellipse cx="22" cy="38" rx="20" ry="18" fill="#66CC66" opacity="0.55" />
      {/* butterfly TL */}
      <path d="M 68 30 Q 58 20 52 28 Q 54 36 68 34" fill="#FF9FB3" opacity="0.85" />
      <path d="M 68 30 Q 78 20 84 28 Q 82 36 68 34" fill="#C3A6FF" opacity="0.85" />
      <ellipse cx="68" cy="33" rx="2" ry="6" fill="#6B4030" />

      {/* TR: sun + cloud */}
      <circle cx="172" cy="22" r="18" fill="#FFD700" />
      {[0,45,90,135,180,225,270,315].map(a => (
        <line key={a}
          x1={172 + 20 * Math.cos(a * Math.PI/180)} y1={22 + 20 * Math.sin(a * Math.PI/180)}
          x2={172 + 26 * Math.cos(a * Math.PI/180)} y2={22 + 26 * Math.sin(a * Math.PI/180)}
          stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round"
        />
      ))}
      <ellipse cx="145" cy="52" rx="18" ry="11" fill="white" />
      <ellipse cx="132" cy="57" rx="12" ry="9" fill="white" />
      <ellipse cx="158" cy="57" rx="12" ry="9" fill="white" />

      {/* BL: flowers */}
      {[{x:20,y:140,c:'#FF9FB3'},{x:42,y:148,c:'#FFE66D'},{x:16,y:160,c:'#C3A6FF'}].map((f,i)=>(
        <g key={i}>
          <line x1={f.x} y1={f.y} x2={f.x} y2={f.y+20} stroke="#5A9E40" strokeWidth="2" strokeLinecap="round"/>
          {[0,72,144,216,288].map(a=>{const r=a*Math.PI/180;return(
            <ellipse key={a} cx={f.x+6*Math.cos(r)} cy={f.y+6*Math.sin(r)} rx="4" ry="5" fill={f.c}
              transform={`rotate(${a},${f.x+6*Math.cos(r)},${f.y+6*Math.sin(r)})`}/>
          )})}
          <circle cx={f.x} cy={f.y} r="4" fill="#FFD700"/>
        </g>
      ))}

      {/* BR: small house */}
      <rect x="128" y="128" width="60" height="44" rx="3" fill="#FFDDB3" stroke="#D4956A" strokeWidth="1.5" />
      <polygon points="120,130 158,106 196,130" fill="#D4956A" />
      <rect x="147" y="148" width="20" height="24" rx="3" fill="#8B6355" />
      <rect x="130" y="135" width="14" height="12" rx="3" fill="#C8E8FF" />
      <rect x="170" y="135" width="14" height="12" rx="3" fill="#C8E8FF" />

      {/* CENTER CHARACTER — crosses all 4 quadrants */}
      <image href="/slice/slice5.png" x="55" y="52" width="90" height="90" />

      {/* Subtle cross lines to hint at quadrant borders (very faint) */}
      <line x1="100" y1="0" x2="100" y2="200" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
      <line x1="0" y1="100" x2="200" y2="100" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
    </>
  )
}

const VIEWBOXES = [
  '0 0 100 100',     // piece 0: TL
  '100 0 100 100',   // piece 1: TR
  '0 100 100 100',   // piece 2: BL
  '100 100 100 100', // piece 3: BR
]
const LABELS = ['왼쪽 위', '오른쪽 위', '왼쪽 아래', '오른쪽 아래']

function Piece({ pieceIdx, dim }: { pieceIdx: number; dim: number }) {
  return (
    <svg viewBox={VIEWBOXES[pieceIdx]} width={dim} height={dim} style={{ display: 'block' }}>
      <SceneInner />
    </svg>
  )
}

function shuffle4(): number[] {
  const arr = [0, 1, 2, 3]
  do { arr.sort(() => Math.random() - 0.5) } while (arr.every((v, i) => v === i))
  return arr
}

export default function PuzzleOrderGame({ onBack }: Props) {
  const [slots, setSlots] = useState<number[]>(shuffle4)  // slots[position] = pieceIdx
  const [selected, setSelected] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [flashWrong, setFlashWrong] = useState<number | null>(null)
  const [moves, setMoves] = useState(0)

  useEffect(() => {
    if (slots.every((v, i) => v === i)) setTimeout(() => setDone(true), 300)
  }, [slots])

  const handleTap = (pos: number) => {
    if (done) return
    if (selected === null) {
      setSelected(pos)
    } else if (selected === pos) {
      setSelected(null)
    } else {
      // Swap
      setSlots(prev => {
        const next = [...prev]
        ;[next[selected], next[pos]] = [next[pos], next[selected]]
        return next
      })
      setMoves(m => m + 1)
      setSelected(null)

      // Flash if not correct after swap
      setTimeout(() => {
        setFlashWrong(null)
      }, 400)
    }
  }

  const restart = () => { setSlots(shuffle4()); setSelected(null); setDone(false); setMoves(0) }

  if (done) return (
    <Layout title="그림 맞추기" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '40px 24px', textAlign: 'center' }}>
        <img src="/slice/slice9.png" alt="" style={{ width: 110, height: 110, objectFit: 'contain', animation: 'celebrate 0.6s ease infinite' }} />
        <div style={{ fontSize: 26, fontWeight: 900, color: '#4D72FB' }}>🎉 완성했어요!</div>
        <div style={{ fontSize: 17, color: '#888', fontWeight: 600 }}>
          <span style={{ color: '#4D72FB', fontWeight: 900 }}>{moves}</span>번 만에 맞췄어요!
        </div>
        {/* Completed puzzle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, border: '3px solid #4D72FB', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px #4D72FB33' }}>
          {[0, 1, 2, 3].map(pos => <Piece key={pos} pieceIdx={pos} dim={110} />)}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={restart}>다시 하기</Button>
          <Button onClick={onBack} variant="outline">홈으로</Button>
        </div>
      </div>
    </Layout>
  )

  const dim = Math.min(130, (Math.min(window.innerWidth, 480) - 60) / 2)

  return (
    <Layout title="그림 맞추기" onBack={onBack}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '10px 20px 32px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>

        {/* Hint: reference thumbnail */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '2px solid #E8ECF4', flexShrink: 0 }}>
            <svg viewBox="0 0 200 200" width={56} height={56} style={{ display: 'block' }}>
              <SceneInner />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#888' }}>조각을 눌러 위치를 바꿔보세요!</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#bbb', marginTop: 2 }}>완성된 그림은 왼쪽 미리보기를 참고해요 👈</p>
          </div>
        </div>

        {/* Moves counter */}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#aaa' }}>
          교체 횟수: <span style={{ color: '#4D72FB' }}>{moves}</span>
        </div>

        {/* 2×2 puzzle grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[0, 1, 2, 3].map(pos => {
            const pieceIdx = slots[pos]
            const isSel = selected === pos
            const isCorrect = pieceIdx === pos

            return (
              <div
                key={pos}
                onClick={() => handleTap(pos)}
                style={{
                  width: dim,
                  height: dim,
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: isSel
                    ? '3px solid #4D72FB'
                    : isCorrect && moves > 0
                      ? '3px solid #44CC44'
                      : '3px solid #E8ECF4',
                  cursor: 'pointer',
                  boxShadow: isSel ? '0 0 0 4px #4D72FB33' : isCorrect && moves > 0 ? '0 0 0 3px #44CC4433' : '0 2px 8px rgba(0,0,0,0.08)',
                  transform: isSel ? 'scale(0.96)' : 'scale(1)',
                  transition: 'transform 0.15s ease, border 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <Piece pieceIdx={pieceIdx} dim={dim} />
              </div>
            )
          })}
        </div>

        {/* Position labels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, width: dim * 2 + 6 }}>
          {[0, 1, 2, 3].map(pos => (
            <div key={pos} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: slots[pos] === pos ? '#44CC44' : '#ccc', transition: 'color 0.3s' }}>
              {slots[pos] === pos ? '✓' : LABELS[pos]}
            </div>
          ))}
        </div>

        <Button onClick={restart} size="sm" variant="outline" color="#4D72FB">섞기</Button>
      </div>
    </Layout>
  )
}
