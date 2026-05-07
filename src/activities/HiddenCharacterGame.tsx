import { useState } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

// Each hidden item: which slice image, position, and hitbox in the SVG (400×280)
const ITEMS = [
  { id: 'c2', label: '주황이',   src: 'slice/slice2.png', hx: 96,  hy: 68,  hw: 42, hh: 42, svgX: 96,  svgY: 62,  svgW: 42 },
  { id: 'c3', label: '초록이',   src: 'slice/slice3.png', hx: 282, hy: 140, hw: 40, hh: 40, svgX: 282, svgY: 134, svgW: 40 },
  { id: 'c4', label: '노랑이',   src: 'slice/slice4.png', hx: 148, hy: 218, hw: 40, hh: 40, svgX: 148, svgY: 212, svgW: 40 },
  { id: 'c6', label: '분홍이',   src: 'slice/slice6.png', hx: 316, hy: 74,  hw: 40, hh: 40, svgX: 316, svgY: 68,  svgW: 40 },
  { id: 'c7', label: '모자언니', src: 'slice/slice7.png', hx: 196, hy: 210, hw: 40, hh: 40, svgX: 196, svgY: 204, svgW: 40 },
]

export default function HiddenCharacterGame({ onBack }: Props) {
  const [found, setFound]       = useState<Set<string>>(new Set())
  const [hint, setHint]         = useState<string | null>(null)
  const [flashId, setFlashId]   = useState<string | null>(null)

  const done = found.size === ITEMS.length

  const handleFind = (id: string) => {
    if (found.has(id)) return
    setFound(prev => new Set([...prev, id]))
    setFlashId(id)
    setTimeout(() => setFlashId(null), 1200)
  }

  const showHint = () => {
    const unfound = ITEMS.filter(i => !found.has(i.id))
    if (!unfound.length) return
    const pick = unfound[Math.floor(Math.random() * unfound.length)]
    setHint(`"${pick.label}"을 찾아봐요!`)
    setTimeout(() => setHint(null), 2200)
  }

  const restart = () => { setFound(new Set()); setHint(null); setFlashId(null) }

  if (done) {
    return (
      <Layout title="숨은 친구 찾기" onBack={onBack}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 0, justifyContent: 'center' }}>
            {ITEMS.map((item, i) => (
              <img key={item.id} src={item.src} alt={item.label}
                style={{ width: 56, height: 56, objectFit: 'contain', animation: `celebrate 0.5s ease ${i * 80}ms both` }} />
            ))}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#4D72FB' }}>🎉 모두 찾았어요!</div>
          <div style={{ fontSize: 17, fontWeight: 500, color: '#888' }}>친구들을 전부 발견했어요!</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={restart}>다시 하기</Button>
            <Button onClick={onBack} variant="outline">홈으로</Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="숨은 친구 찾기" onBack={onBack}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '8px 16px 28px', width: '100%' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#aaa' }}>
            찾은 친구: <span style={{ color: '#4D72FB', fontWeight: 900 }}>{found.size}</span> / {ITEMS.length}
          </span>
          <button
            onClick={showHint}
            style={{
              background: '#EEF3FF',
              border: '2px solid #4D72FB',
              borderRadius: 10,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 700,
              color: '#4D72FB',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#D5E2FF')}
            onMouseLeave={e => (e.currentTarget.style.background = '#EEF3FF')}
          >
            💡 힌트
          </button>
        </div>

        {/* Hint */}
        {hint && (
          <div style={{
            background: '#FFFCE0', border: '2px solid #FFD700', borderRadius: 12,
            padding: '8px 16px', marginBottom: 10, fontSize: 14, fontWeight: 700,
            color: '#7A6000', textAlign: 'center', animation: 'fadeInUp 0.3s ease',
          }}>
            {hint}
          </div>
        )}

        {/* Flash toast */}
        {flashId && (
          <div style={{
            background: '#4D72FB', borderRadius: 12, padding: '8px 16px', marginBottom: 10,
            fontSize: 14, fontWeight: 700, color: 'white', textAlign: 'center',
            animation: 'pop 0.35s cubic-bezier(.34,1.56,.64,1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <img src={ITEMS.find(i => i.id === flashId)?.src} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            {ITEMS.find(i => i.id === flashId)?.label} 발견!
          </div>
        )}

        {/* Scene */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          overflow: 'hidden',
          border: '2px solid #E8ECF4',
          boxShadow: '0 4px 24px rgba(77,114,251,0.10)',
          position: 'relative',
        }}>
          <svg viewBox="0 0 400 280" width="100%" style={{ display: 'block' }}>
            {/* Sky */}
            <rect width="400" height="185" fill="#C2E4FF" />
            {/* Ground */}
            <rect y="180" width="400" height="100" fill="#8ED468" />
            <ellipse cx="200" cy="182" rx="220" ry="20" fill="#9EDA70" />

            {/* Background hills */}
            <ellipse cx="70"  cy="186" rx="78" ry="28" fill="#A8E070" />
            <ellipse cx="335" cy="188" rx="88" ry="26" fill="#A8E070" />

            {/* Pond */}
            <ellipse cx="200" cy="242" rx="48" ry="22" fill="#88BBFF" />
            <ellipse cx="200" cy="240" rx="42" ry="16" fill="#AAD0FF" />
            <ellipse cx="190" cy="237" rx="10" ry="5"  fill="#CCE4FF" opacity="0.6" />

            {/* Path */}
            <ellipse cx="200" cy="260" rx="35" ry="15" fill="#D4C4A0" />
            <rect x="184" y="212" width="32" height="58" fill="#D4C4A0" />
            <ellipse cx="200" cy="212" rx="16" ry="9"  fill="#C4B490" />

            {/* Large tree */}
            <rect x="58" y="120" width="26" height="80" rx="6" fill="#8B6355" />
            <ellipse cx="71" cy="108" rx="55" ry="50" fill="#4CAF50" />
            <ellipse cx="71" cy="100" rx="42" ry="40" fill="#66CC66" opacity="0.55" />
            <circle cx="50"  cy="98"  r="7" fill="#FF6B6B" opacity="0.85" />
            <circle cx="86"  cy="90"  r="6" fill="#FF6B6B" opacity="0.85" />
            <circle cx="68"  cy="118" r="6" fill="#FF9900" opacity="0.75" />

            {/* Bush right */}
            <ellipse cx="312" cy="192" rx="54" ry="30" fill="#5A9E40" />
            <ellipse cx="288" cy="188" rx="32" ry="24" fill="#6AB850" />
            <ellipse cx="334" cy="186" rx="34" ry="24" fill="#6AB850" />
            <circle cx="297" cy="180" r="5" fill="#FF4444" />
            <circle cx="316" cy="174" r="4" fill="#FF4444" />
            <circle cx="330" cy="179" r="5" fill="#FF4444" />

            {/* Scattered flowers (decorative) */}
            {[{x:118,y:210,c:'#FFB3D4'},{x:142,y:218,c:'#FFE66D'},{x:352,y:208,c:'#C3A6FF'},{x:370,y:216,c:'#FFB3D4'}].map((f,i) => (
              <g key={i}>
                <line x1={f.x} y1={f.y} x2={f.x} y2={f.y+18} stroke="#5A9E40" strokeWidth="2" strokeLinecap="round"/>
                {[0,72,144,216,288].map(a => {
                  const r = a * Math.PI/180
                  return <ellipse key={a} cx={f.x+6*Math.cos(r)} cy={f.y+6*Math.sin(r)} rx="4" ry="5"
                    fill={f.c} transform={`rotate(${a},${f.x+6*Math.cos(r)},${f.y+6*Math.sin(r)})`} />
                })}
                <circle cx={f.x} cy={f.y} r="4" fill="#FFD700" />
              </g>
            ))}

            {/* Clouds */}
            <g opacity="0.92">
              <ellipse cx="280" cy="42" rx="32" ry="18" fill="white" />
              <ellipse cx="258" cy="50" rx="20" ry="14" fill="white" />
              <ellipse cx="304" cy="50" rx="20" ry="14" fill="white" />
            </g>
            <g opacity="0.82">
              <ellipse cx="130" cy="28" rx="26" ry="14" fill="white" />
              <ellipse cx="110" cy="35" rx="17" ry="11" fill="white" />
              <ellipse cx="152" cy="35" rx="17" ry="11" fill="white" />
            </g>

            {/* Sun */}
            <circle cx="358" cy="38" r="28" fill="#FFD700" />

            {/* ── HIDDEN CHARACTER IMAGES ─────────────────────────────── */}
            {ITEMS.map(item => {
              const isFound = found.has(item.id)
              const isFlash = flashId === item.id
              return (
                <g key={item.id}>
                  <image
                    href={item.src}
                    x={item.svgX} y={item.svgY}
                    width={item.svgW} height={item.svgW}
                    opacity={isFound ? 1 : 0.18}
                    style={{
                      transition: 'opacity 0.5s ease',
                      filter: isFlash ? 'drop-shadow(0 0 8px #4D72FB)' : isFound ? 'drop-shadow(0 0 4px #4D72FB88)' : 'none',
                    }}
                  />
                  {/* Clickable hitbox */}
                  <rect
                    x={item.hx} y={item.hy} width={item.hw} height={item.hh}
                    fill="transparent"
                    style={{ cursor: isFound ? 'default' : 'pointer' }}
                    onClick={() => handleFind(item.id)}
                  />
                  {/* Found ring */}
                  {isFound && (
                    <circle
                      cx={item.hx + item.hw/2} cy={item.hy + item.hh/2}
                      r={item.hw/2 + 5}
                      fill="none" stroke="#4D72FB" strokeWidth="2.5" opacity="0.7"
                      style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
                    />
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Checklist */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' }}>
          {ITEMS.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: found.has(item.id) ? '#EEF3FF' : '#F5F5F8',
                border: `2px solid ${found.has(item.id) ? '#4D72FB' : '#E8ECF4'}`,
                borderRadius: 10,
                padding: '5px 12px 5px 7px',
                transition: 'all 0.3s ease',
              }}
            >
              <img src={item.src} alt={item.label}
                style={{ width: 24, height: 24, objectFit: 'contain', opacity: found.has(item.id) ? 1 : 0.35 }} />
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: found.has(item.id) ? '#4D72FB' : '#ccc',
                letterSpacing: '-0.2px',
              }}>
                {found.has(item.id) ? '✓ ' : ''}{item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
