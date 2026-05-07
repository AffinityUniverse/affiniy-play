import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

/**
 * 타일 퍼즐: 전체 그림을 2×2 조각으로 나눠 섞은 뒤 맞추는 게임
 * 각 조각은 동일한 SVG 씬을 다른 viewBox로 렌더링합니다.
 */

// Full scene: 200×200, center character (파랑이) at (55,52) w=90
function SceneInner() {
  return (
    <>
      {/* Sky — subtle top-to-bottom gradient via two rects */}
      <rect x="0" y="0" width="200" height="100" fill="#B8DEFF" />
      <rect x="0" y="0" width="200" height="50"  fill="#8EC8F8" opacity="0.35" />

      {/* ── TL quadrant (0,0 → 100,100): lush tree, flowers, butterfly ── */}

      {/* Tree trunk with bark texture */}
      <rect x="16" y="58" width="14" height="52" rx="5" fill="#7A5540" />
      <rect x="19" y="62" width="5"  height="44" rx="3" fill="#9B7258" opacity="0.55" />
      <path d="M 16 72 Q 23 75 30 72" stroke="#5C3D28" strokeWidth="1" fill="none" opacity="0.45" />
      <path d="M 16 84 Q 23 87 30 84" stroke="#5C3D28" strokeWidth="1" fill="none" opacity="0.45" />

      {/* Tree canopy — multiple overlapping ellipses */}
      <ellipse cx="23" cy="50" rx="30" ry="26" fill="#3D9E3A" />
      <ellipse cx="12" cy="45" rx="22" ry="20" fill="#4CAF50" />
      <ellipse cx="36" cy="42" rx="22" ry="20" fill="#4CAF50" />
      <ellipse cx="23" cy="36" rx="24" ry="20" fill="#56C44D" />
      <ellipse cx="20" cy="30" rx="15" ry="13" fill="#70D45E" opacity="0.75" />
      {/* Fruit dots */}
      <circle cx="10" cy="40" r="4"   fill="#FF5252" opacity="0.9" />
      <circle cx="36" cy="35" r="3.5" fill="#FF5252" opacity="0.9" />
      <circle cx="24" cy="52" r="3.5" fill="#FF8C00" opacity="0.85" />

      {/* Detailed flowers — TL lower area */}
      {[
        {x:58, y:78, c:'#FF9FB3', s:'#FF5F8A'},
        {x:74, y:86, c:'#FFE66D', s:'#FFB800'},
        {x:48, y:90, c:'#C3A6FF', s:'#9B6DFF'},
        {x:88, y:80, c:'#FF9FB3', s:'#FF5F8A'},
      ].map((f, i) => (
        <g key={i}>
          <line x1={f.x} y1={f.y} x2={f.x} y2={f.y + 14} stroke="#5A9E40" strokeWidth="1.5" strokeLinecap="round" />
          {[0,72,144,216,288].map(a => {
            const rad = a * Math.PI / 180
            return (
              <ellipse key={a}
                cx={f.x + 5 * Math.cos(rad)} cy={f.y + 5 * Math.sin(rad)}
                rx="3.5" ry="4.5"
                fill={f.c}
                transform={`rotate(${a},${f.x + 5 * Math.cos(rad)},${f.y + 5 * Math.sin(rad)})`}
              />
            )
          })}
          <circle cx={f.x} cy={f.y} r="3"   fill={f.s} />
          <circle cx={f.x} cy={f.y} r="1.5" fill="#FFF9C4" />
        </g>
      ))}

      {/* Butterfly — TL */}
      <g transform="translate(66,28)">
        <path d="M0,0 Q -9,-9 -14,-4 Q -9,4 0,2"  fill="#FF9FB3" opacity="0.88" />
        <path d="M0,0 Q  9,-9  14,-4 Q  9,4 0,2"  fill="#C3A6FF" opacity="0.88" />
        <path d="M0,2 Q -5,7 -8,5 Q -5,2 0,3"     fill="#FF7BAC" opacity="0.6" />
        <path d="M0,2 Q  5,7  8,5 Q  5,2 0,3"     fill="#A87EFF" opacity="0.6" />
        <ellipse cx="0" cy="2" rx="1.2" ry="4" fill="#5C3D28" />
        <line x1="0" y1="-1" x2="-4" y2="-6" stroke="#5C3D28" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="0" y1="-1" x2=" 4" y2="-6" stroke="#5C3D28" strokeWidth="0.8" strokeLinecap="round" />
      </g>

      {/* ── TR quadrant (100,0 → 200,100): sun + fluffy clouds ── */}

      {/* Sun with gradient and variable ray lengths */}
      <defs>
        <radialGradient id="puzSunGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFF176" />
          <stop offset="100%" stopColor="#FFB300" />
        </radialGradient>
      </defs>
      <circle cx="172" cy="24" r="18" fill="url(#puzSunGrad)" />
      {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
        const rad = a * Math.PI / 180
        const inner = 21, outer = a % 60 === 0 ? 30 : 26
        return (
          <line key={a}
            x1={172 + inner * Math.cos(rad)} y1={24 + inner * Math.sin(rad)}
            x2={172 + outer * Math.cos(rad)} y2={24 + outer * Math.sin(rad)}
            stroke="#FFD700" strokeWidth={a % 60 === 0 ? 2.5 : 1.8} strokeLinecap="round"
          />
        )
      })}

      {/* Fluffy cloud 1 */}
      <ellipse cx="140" cy="50" rx="22" ry="13" fill="white" />
      <ellipse cx="124" cy="56" rx="14" ry="10" fill="white" />
      <ellipse cx="157" cy="56" rx="14" ry="10" fill="white" />
      <ellipse cx="140" cy="58" rx="20" ry="10" fill="white" />
      <ellipse cx="133" cy="44" rx="13" ry="11" fill="white" />
      <ellipse cx="149" cy="42" rx="12" ry="10" fill="white" />
      {/* Cloud shadow tint */}
      <ellipse cx="140" cy="62" rx="18" ry="5" fill="#D8EEF8" opacity="0.4" />

      {/* Fluffy cloud 2 (smaller, upper right) */}
      <ellipse cx="188" cy="62" rx="13" ry="8"  fill="white" opacity="0.8" />
      <ellipse cx="178" cy="66" rx="9"  ry="7" fill="white" opacity="0.8" />
      <ellipse cx="198" cy="66" rx="9"  ry="7"  fill="white" opacity="0.8" />

      {/* Small bird silhouettes — TR sky */}
      <path d="M 112 18 Q 116 14 120 18" stroke="#556" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M 120 12 Q 124 8  128 12" stroke="#556" strokeWidth="1.3" fill="none" strokeLinecap="round" />

      {/* ── BL quadrant (0,100 → 100,200): rolling hills, flowers, pond ── */}

      {/* Ground */}
      <rect x="0" y="100" width="200" height="100" fill="#7DC456" />

      {/* Rolling hills */}
      <ellipse cx="30"  cy="103" rx="44" ry="14" fill="#8AD460" />
      <ellipse cx="85"  cy="106" rx="36" ry="12" fill="#8AD460" />
      <ellipse cx="150" cy="103" rx="44" ry="14" fill="#8AD460" />
      <ellipse cx="190" cy="106" rx="30" ry="11" fill="#8AD460" />

      {/* Small pond — BL */}
      <ellipse cx="62" cy="172" rx="28" ry="11" fill="#88BBFF" />
      <ellipse cx="62" cy="170" rx="23" ry="8"  fill="#AAD4FF" opacity="0.6" />
      <ellipse cx="56" cy="167" rx="7"  ry="3"  fill="white"  opacity="0.35" />
      {/* Lily pad */}
      <ellipse cx="72" cy="173" rx="5" ry="3" fill="#5AA640" opacity="0.85" />
      <circle  cx="72" cy="172" r="1.5" fill="#FF8FAF" opacity="0.9" />

      {/* Detailed flowers — BL */}
      {[
        {x:16, y:138, c:'#FF9FB3', s:'#FF5F8A'},
        {x:34, y:148, c:'#FFE66D', s:'#FFB800'},
        {x:12, y:158, c:'#C3A6FF', s:'#9B6DFF'},
        {x:48, y:142, c:'#FF9FB3', s:'#FF5F8A'},
        {x:28, y:163, c:'#FFE66D', s:'#FFB800'},
        {x:56, y:155, c:'#C3A6FF', s:'#9B6DFF'},
      ].map((f, i) => (
        <g key={i}>
          <line x1={f.x} y1={f.y} x2={f.x} y2={f.y + 16} stroke="#5A9E40" strokeWidth="1.5" strokeLinecap="round" />
          {[0,72,144,216,288].map(a => {
            const rad = a * Math.PI / 180
            return (
              <ellipse key={a}
                cx={f.x + 5.5 * Math.cos(rad)} cy={f.y + 5.5 * Math.sin(rad)}
                rx="3.5" ry="4.5"
                fill={f.c}
                transform={`rotate(${a},${f.x + 5.5 * Math.cos(rad)},${f.y + 5.5 * Math.sin(rad)})`}
              />
            )
          })}
          <circle cx={f.x} cy={f.y} r="3.5" fill={f.s} />
          <circle cx={f.x} cy={f.y} r="1.8" fill="#FFF9C4" />
        </g>
      ))}

      {/* ── BR quadrant (100,100 → 200,200): cozy house ── */}

      {/* House shadow */}
      <ellipse cx="158" cy="194" rx="36" ry="7" fill="#3A7020" opacity="0.25" />

      {/* House wall */}
      <rect x="122" y="155" width="72" height="50" rx="4" fill="#FFECC8" stroke="#D4956A" strokeWidth="1.5" />

      {/* Roof */}
      <polygon points="114,158 158,130 202,158" fill="#C05A2A" />
      {/* Roof shingle lines */}
      <line x1="114" y1="150" x2="202" y2="150" stroke="#A04420" strokeWidth="1"   opacity="0.45" />
      <line x1="118" y1="142" x2="198" y2="142" stroke="#A04420" strokeWidth="1"   opacity="0.45" />
      <line x1="124" y1="134" x2="192" y2="134" stroke="#A04420" strokeWidth="0.8" opacity="0.35" />
      {/* Roof ridge highlight */}
      <line x1="120" y1="156" x2="196" y2="156" stroke="#E07040" strokeWidth="1.5" opacity="0.3" />

      {/* Chimney */}
      <rect x="166" y="126" width="12" height="22" rx="2" fill="#A05030" />
      <rect x="164" y="124" width="16" height="5"  rx="2" fill="#B06040" />
      {/* Chimney smoke curls */}
      <path d="M 169 120 Q 166 114 170 108 Q 174 102 171 96"
        stroke="#CCBBAA" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M 174 119 Q 171 113 175 107 Q 179 101 176 95"
        stroke="#CCBBAA" strokeWidth="2"   fill="none" strokeLinecap="round" opacity="0.4" />

      {/* Door */}
      <rect x="149" y="174" width="18" height="31" rx="3" fill="#8B5E3C" />
      {/* Door panels */}
      <rect x="151" y="176" width="6"  height="9" rx="1.5" fill="#A8774F" opacity="0.45" />
      <rect x="159" y="176" width="6"  height="9" rx="1.5" fill="#A8774F" opacity="0.45" />
      {/* Door knob */}
      <circle cx="162" cy="192" r="2" fill="#D4A020" />

      {/* Left window */}
      <rect x="126" y="163" width="16" height="13" rx="3" fill="#C8E8FF" stroke="#8BBFE0" strokeWidth="1" />
      <line x1="134" y1="163" x2="134" y2="176" stroke="#8BBFE0" strokeWidth="0.8" />
      <line x1="126" y1="170" x2="142" y2="170" stroke="#8BBFE0" strokeWidth="0.8" />
      <rect x="127" y="164" width="5"  height="3" rx="1" fill="white" opacity="0.5" />

      {/* Right window */}
      <rect x="174" y="163" width="16" height="13" rx="3" fill="#C8E8FF" stroke="#8BBFE0" strokeWidth="1" />
      <line x1="182" y1="163" x2="182" y2="176" stroke="#8BBFE0" strokeWidth="0.8" />
      <line x1="174" y1="170" x2="190" y2="170" stroke="#8BBFE0" strokeWidth="0.8" />
      <rect x="175" y="164" width="5"  height="3" rx="1" fill="white" opacity="0.5" />

      {/* Flower box under left window */}
      <rect x="125" y="175" width="18" height="5" rx="2" fill="#C05A2A" opacity="0.7" />
      {[129,133,137].map(x => (
        <circle key={x} cx={x} cy={173} r="2.5" fill="#FF9FB3" opacity="0.85" />
      ))}

      {/* ── CENTER CHARACTER — crosses all 4 quadrants ── */}
      <image href="slice/slice5.png" x="55" y="52" width="90" height="90" />

      {/* Subtle dashed cross lines to hint at quadrant borders */}
      <line x1="100" y1="0"   x2="100" y2="200" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
      <line x1="0"   y1="100" x2="200" y2="100" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
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
  const [slots, setSlots]         = useState<number[]>(shuffle4)
  const [selected, setSelected]   = useState<number | null>(null)
  const [done, setDone]           = useState(false)
  const [moves, setMoves]         = useState(0)

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
      setSlots(prev => {
        const next = [...prev]
        ;[next[selected], next[pos]] = [next[pos], next[selected]]
        return next
      })
      setMoves(m => m + 1)
      setSelected(null)
    }
  }

  const restart = () => { setSlots(shuffle4()); setSelected(null); setDone(false); setMoves(0) }

  if (done) return (
    <Layout title="그림 맞추기" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#4D72FB' }}>완성했어요!</div>
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
            <p style={{ fontSize: 12, fontWeight: 600, color: '#bbb', marginTop: 2 }}>완성된 그림은 왼쪽 미리보기를 참고해요</p>
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
            const isSel    = selected === pos
            const isCorrect = pieceIdx === pos

            return (
              <div
                key={pos}
                onClick={() => handleTap(pos)}
                style={{
                  width: dim, height: dim, borderRadius: 14, overflow: 'hidden',
                  border: isSel
                    ? '3px solid #4D72FB'
                    : isCorrect && moves > 0
                      ? '3px solid #44CC44'
                      : '3px solid #E8ECF4',
                  cursor: 'pointer',
                  boxShadow: isSel
                    ? '0 0 0 4px #4D72FB33'
                    : isCorrect && moves > 0
                      ? '0 0 0 3px #44CC4433'
                      : '0 2px 8px rgba(0,0,0,0.08)',
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
