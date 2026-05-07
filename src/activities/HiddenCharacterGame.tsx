import { useState } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

const ITEMS = [
  { id: 'c2', label: '주황이',   src: 'slice/slice2.png', x: 48,  y: 78,  w: 44, hiddenOpacity: 0.22, layer: 'tree' },
  { id: 'c3', label: '초록이',   src: 'slice/slice3.png', x: 295, y: 155, w: 44, hiddenOpacity: 0.28, layer: 'bush' },
  { id: 'c4', label: '노랑이',   src: 'slice/slice4.png', x: 155, y: 248, w: 38, hiddenOpacity: 0.30, layer: 'ground' },
  { id: 'c6', label: '분홍이',   src: 'slice/slice6.png', x: 265, y: 22,  w: 44, hiddenOpacity: 0.20, layer: 'cloud' },
  { id: 'c7', label: '모자언니', src: 'slice/slice7.png', x: 332, y: 148, w: 40, hiddenOpacity: 0.25, layer: 'house' },
]

export default function HiddenCharacterGame({ onBack }: Props) {
  const [found, setFound]     = useState<Set<string>>(new Set())
  const [hint, setHint]       = useState<string | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)

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

  const c2 = ITEMS[0], c3 = ITEMS[1], c4 = ITEMS[2], c6 = ITEMS[3], c7 = ITEMS[4]

  const charImg = (item: typeof ITEMS[0]) => {
    const isFound = found.has(item.id)
    const isFlash = flashId === item.id
    return (
      <image
        key={item.id + '_img'}
        href={item.src}
        x={item.x} y={item.y}
        width={item.w} height={item.w}
        opacity={isFound ? 1 : item.hiddenOpacity}
        style={{
          transition: 'opacity 0.55s ease',
          filter: isFlash
            ? 'drop-shadow(0 0 10px #4D72FB)'
            : isFound
              ? 'drop-shadow(0 0 5px #4D72FB88)'
              : 'none',
        }}
      />
    )
  }

  const hitRect = (item: typeof ITEMS[0]) => {
    const isFound = found.has(item.id)
    return (
      <g key={item.id + '_hit'}>
        {isFound && (
          <circle
            cx={item.x + item.w / 2} cy={item.y + item.w / 2}
            r={item.w / 2 + 6}
            fill="none" stroke="#4D72FB" strokeWidth="2.5" opacity="0.7"
            style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
          />
        )}
        <rect
          x={item.x} y={item.y} width={item.w} height={item.w}
          fill="transparent"
          style={{ cursor: isFound ? 'default' : 'pointer' }}
          onClick={() => handleFind(item.id)}
        />
      </g>
    )
  }

  if (done) {
    return (
      <Layout title="숨은 친구 찾기" onBack={onBack}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {ITEMS.map((item, i) => (
              <img key={item.id} src={item.src} alt={item.label}
                style={{ width: 56, height: 56, objectFit: 'contain', animation: `pop 0.5s ease ${i * 80}ms both` }} />
            ))}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#4D72FB' }}>모두 찾았어요!</div>
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
              background: '#EEF3FF', border: '2px solid #4D72FB', borderRadius: 10,
              padding: '6px 14px', fontSize: 13, fontWeight: 700, color: '#4D72FB',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#D5E2FF')}
            onMouseLeave={e => (e.currentTarget.style.background = '#EEF3FF')}
          >
            힌트
          </button>
        </div>

        {/* Hint */}
        {hint && (
          <div style={{
            background: '#FFFCE0', border: '2px solid #FFD700', borderRadius: 12,
            padding: '8px 16px', marginBottom: 10, fontSize: 14, fontWeight: 700,
            color: '#7A6000', textAlign: 'center',
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
          background: '#fff', borderRadius: 20, overflow: 'hidden',
          border: '2px solid #E8ECF4', boxShadow: '0 4px 24px rgba(77,114,251,0.10)',
          position: 'relative',
        }}>
          <svg viewBox="0 0 400 300" width="100%" style={{ display: 'block' }}>
            <defs>
              {/* Sky gradient */}
              <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#87CEEB" />
                <stop offset="100%" stopColor="#C2E4FF" />
              </linearGradient>
              {/* Ground gradient */}
              <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7DC456" />
                <stop offset="100%" stopColor="#4a8a30" />
              </linearGradient>
              {/* Pond gradient */}
              <linearGradient id="pondGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#AAD4FF" />
                <stop offset="100%" stopColor="#6AAEE8" />
              </linearGradient>
              {/* Sun gradient */}
              <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFF176" />
                <stop offset="100%" stopColor="#FFB300" />
              </radialGradient>
              {/* House wall gradient */}
              <linearGradient id="houseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFECC8" />
                <stop offset="100%" stopColor="#F5C98A" />
              </linearGradient>
              {/* Clip path: hide 모자언니 behind house right wall */}
              <clipPath id="houseRightClip">
                <rect x="356" y="130" width="44" height="80" />
              </clipPath>
            </defs>

            {/* ── LAYER 1: SKY + SUN ── */}
            <rect width="400" height="210" fill="url(#skyGrad)" />

            {/* Sun with rays */}
            <circle cx="360" cy="38" r="26" fill="url(#sunGrad)" />
            {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
              const rad = a * Math.PI / 180
              const innerR = 30, outerR = a % 60 === 0 ? 42 : 36
              return (
                <line key={a}
                  x1={360 + innerR * Math.cos(rad)} y1={38 + innerR * Math.sin(rad)}
                  x2={360 + outerR * Math.cos(rad)} y2={38 + outerR * Math.sin(rad)}
                  stroke="#FFD700" strokeWidth={a % 60 === 0 ? 3 : 2} strokeLinecap="round"
                />
              )
            })}

            {/* Small bird silhouettes */}
            <path d="M 170 30 Q 174 26 178 30" stroke="#557" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 180 24 Q 184 20 188 24" stroke="#557" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 215 42 Q 219 38 223 42" stroke="#557" strokeWidth="1.5" fill="none" strokeLinecap="round" />

            {/* Background cloud (left, small) */}
            <g opacity="0.75">
              <ellipse cx="100" cy="32" rx="22" ry="12" fill="white" />
              <ellipse cx="83"  cy="38" rx="14" ry="10" fill="white" />
              <ellipse cx="118" cy="38" rx="14" ry="10" fill="white" />
              <ellipse cx="100" cy="40" rx="20" ry="10" fill="white" />
            </g>

            {/* ── LAYER 2: 분홍이 BEHIND CLOUD ── */}
            {charImg(c6)}

            {/* ── LAYER 3: CLOUD BODY IN FRONT OF 분홍이 ── */}
            <g opacity="0.93">
              {/* Cloud shadow */}
              <ellipse cx="284" cy="57" rx="36" ry="14" fill="#D8EEF8" opacity="0.5" />
              {/* Main cloud body */}
              <ellipse cx="284" cy="48" rx="36" ry="20" fill="white" />
              <ellipse cx="262" cy="54" rx="22" ry="16" fill="white" />
              <ellipse cx="308" cy="54" rx="22" ry="16" fill="white" />
              <ellipse cx="275" cy="42" rx="20" ry="16" fill="white" />
              <ellipse cx="296" cy="38" rx="18" ry="14" fill="white" />
            </g>

            {/* ── LAYER 4: GROUND BASE ── */}
            <rect x="0" y="195" width="400" height="105" fill="url(#groundGrad)" />
            {/* Rolling ground highlight */}
            <ellipse cx="200" cy="198" rx="240" ry="22" fill="#7DC456" />
            <ellipse cx="60"  cy="202" rx="90"  ry="20" fill="#8AD460" />
            <ellipse cx="340" cy="200" rx="80"  ry="18" fill="#8AD460" />

            {/* ── LAYER 5: TREE TRUNK ── */}
            {/* Bark texture base */}
            <rect x="56" y="128" width="28" height="80" rx="8" fill="#7A5540" />
            {/* Bark highlight */}
            <rect x="60" y="132" width="8" height="70" rx="4" fill="#9B7258" opacity="0.6" />
            {/* Bark lines */}
            <path d="M 57 145 Q 65 148 73 145" stroke="#5C3D28" strokeWidth="1.2" fill="none" opacity="0.5" />
            <path d="M 57 160 Q 65 163 73 160" stroke="#5C3D28" strokeWidth="1.2" fill="none" opacity="0.5" />
            <path d="M 57 175 Q 65 178 73 175" stroke="#5C3D28" strokeWidth="1.2" fill="none" opacity="0.5" />

            {/* ── LAYER 6: 주황이 BEHIND TREE CANOPY ── */}
            {charImg(c2)}

            {/* ── LAYER 7: TREE CANOPY IN FRONT OF 주황이 ── */}
            {/* Back canopy layer */}
            <ellipse cx="70" cy="112" rx="60" ry="52" fill="#3D9E3A" />
            {/* Mid canopy layers */}
            <ellipse cx="52" cy="105" rx="40" ry="36" fill="#4CAF50" />
            <ellipse cx="88" cy="100" rx="38" ry="34" fill="#4CAF50" />
            <ellipse cx="70" cy="94"  rx="44" ry="38" fill="#56C44D" />
            {/* Bright highlight top */}
            <ellipse cx="68" cy="88"  rx="30" ry="26" fill="#66CC66" opacity="0.7" />
            <ellipse cx="62" cy="82"  rx="18" ry="14" fill="#7ADA6A" opacity="0.5" />
            {/* Fruit dots */}
            <circle cx="50"  cy="96"  r="6"  fill="#FF5252" opacity="0.9" />
            <circle cx="87"  cy="88"  r="5"  fill="#FF5252" opacity="0.9" />
            <circle cx="70"  cy="114" r="5"  fill="#FF8C00" opacity="0.85" />
            <circle cx="38"  cy="108" r="4"  fill="#FF5252" opacity="0.8" />
            <circle cx="98"  cy="104" r="4"  fill="#FF8C00" opacity="0.8" />

            {/* ── LAYER 8: BUSH BASE ELLIPSES ── */}
            <ellipse cx="318" cy="202" rx="58" ry="32" fill="#4A8C32" />
            <ellipse cx="294" cy="196" rx="36" ry="28" fill="#5AA640" />
            <ellipse cx="342" cy="194" rx="36" ry="26" fill="#5AA640" />

            {/* ── LAYER 9: 초록이 INSIDE BUSH ── */}
            {charImg(c3)}

            {/* ── LAYER 10: BUSH FRONT ACCENT ELLIPSES ── */}
            <ellipse cx="300" cy="188" rx="28" ry="22" fill="#66BB50" />
            <ellipse cx="330" cy="186" rx="26" ry="20" fill="#66BB50" />
            <ellipse cx="315" cy="182" rx="20" ry="16" fill="#78CC60" opacity="0.8" />
            {/* Bush berries */}
            <circle cx="303" cy="178" r="4"  fill="#CC2222" />
            <circle cx="319" cy="174" r="3.5" fill="#CC2222" />
            <circle cx="334" cy="180" r="4"  fill="#CC2222" />
            <circle cx="310" cy="186" r="3"  fill="#FF4444" opacity="0.7" />

            {/* ── LAYER 11: HOUSE BODY + ROOF + CHIMNEY ── */}
            {/* House shadow */}
            <ellipse cx="355" cy="225" rx="42" ry="8" fill="#3A7020" opacity="0.3" />
            {/* Main house wall */}
            <rect x="310" y="175" width="84" height="60" rx="4" fill="url(#houseGrad)" stroke="#D4956A" strokeWidth="1.5" />
            {/* Roof */}
            <polygon points="302,178 352,148 402,178" fill="#C05A2A" />
            {/* Roof shingle lines */}
            <line x1="302" y1="168" x2="402" y2="168" stroke="#A04420" strokeWidth="1" opacity="0.5" />
            <line x1="306" y1="158" x2="398" y2="158" stroke="#A04420" strokeWidth="1" opacity="0.5" />
            <line x1="325" y1="175" x2="375" y2="175" stroke="#A04420" strokeWidth="0.8" opacity="0.4" />
            {/* Chimney */}
            <rect x="362" y="138" width="14" height="28" rx="2" fill="#A05030" />
            <rect x="360" y="136" width="18" height="6" rx="2" fill="#B06040" />
            {/* Chimney smoke */}
            <path d="M 365 132 Q 362 126 366 120 Q 370 114 367 108" stroke="#CCBBAA" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
            <path d="M 371 130 Q 368 124 372 118 Q 376 112 373 106" stroke="#CCBBAA" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.45" />
            {/* House door */}
            <rect x="340" y="200" width="24" height="35" rx="4" fill="#8B5E3C" />
            <rect x="342" y="202" width="8"  height="12" rx="2" fill="#A8774F" opacity="0.5" />
            <rect x="352" y="202" width="8"  height="12" rx="2" fill="#A8774F" opacity="0.5" />
            <circle cx="358" cy="221" r="2.5" fill="#D4A020" />
            {/* Left window */}
            <rect x="314" y="185" width="18" height="14" rx="3" fill="#C8E8FF" stroke="#8BBFE0" strokeWidth="1" />
            <line x1="323" y1="185" x2="323" y2="199" stroke="#8BBFE0" strokeWidth="0.8" />
            <line x1="314" y1="192" x2="332" y2="192" stroke="#8BBFE0" strokeWidth="0.8" />
            {/* Window reflection */}
            <rect x="315" y="186" width="5" height="3" rx="1" fill="white" opacity="0.5" />

            {/* ── LAYER 12: 모자언니 PEEKING FROM HOUSE RIGHT EDGE ── */}
            {charImg(c7)}

            {/* ── LAYER 13: HOUSE RIGHT WALL PANEL (clips 모자언니) ── */}
            <rect x="358" y="148" width="44" height="90" fill="url(#houseGrad)" stroke="#D4956A" strokeWidth="1" />
            {/* Right window */}
            <rect x="366" y="185" width="18" height="14" rx="3" fill="#C8E8FF" stroke="#8BBFE0" strokeWidth="1" />
            <line x1="375" y1="185" x2="375" y2="199" stroke="#8BBFE0" strokeWidth="0.8" />
            <line x1="366" y1="192" x2="384" y2="192" stroke="#8BBFE0" strokeWidth="0.8" />
            <rect x="367" y="186" width="5" height="3" rx="1" fill="white" opacity="0.5" />

            {/* ── LAYER 14: FLOWERS, POND, PATH ── */}
            {/* Pond */}
            <ellipse cx="205" cy="250" rx="46" ry="18" fill="url(#pondGrad)" />
            <ellipse cx="205" cy="248" rx="38" ry="12" fill="#C0DDFF" opacity="0.5" />
            <ellipse cx="196" cy="244" rx="10" ry="4"  fill="white" opacity="0.4" />
            {/* Lily pad */}
            <ellipse cx="218" cy="252" rx="7" ry="4" fill="#5AA640" opacity="0.8" />
            <circle  cx="218" cy="251" r="2" fill="#FF8FAF" opacity="0.9" />

            {/* Fence sections */}
            {[0,1,2,3].map(i => (
              <g key={i} transform={`translate(${108 + i * 12}, 215)`}>
                <rect x="0" y="0" width="3" height="20" rx="1" fill="#D4B896" />
                <rect x="8" y="0" width="3" height="20" rx="1" fill="#D4B896" />
                <rect x="-1" y="4" width="13" height="3" rx="1" fill="#C4A880" />
                <rect x="-1" y="12" width="13" height="3" rx="1" fill="#C4A880" />
                <polygon points="1.5,-4 3,0 0,0" fill="#D4B896" />
                <polygon points="9.5,-4 11,0 8,0" fill="#D4B896" />
              </g>
            ))}

            {/* Flower bed bottom-left */}
            {[
              {x:20, y:230, c:'#FF9FB3', s:'#FF5F8A'},
              {x:38, y:238, c:'#FFE66D', s:'#FFB800'},
              {x:10, y:248, c:'#C3A6FF', s:'#9B6DFF'},
              {x:52, y:232, c:'#FF9FB3', s:'#FF5F8A'},
              {x:28, y:252, c:'#FFE66D', s:'#FFB800'},
              {x:62, y:244, c:'#C3A6FF', s:'#9B6DFF'},
              {x:44, y:256, c:'#FF9FB3', s:'#FF5F8A'},
            ].map((f, i) => (
              <g key={i}>
                <line x1={f.x} y1={f.y} x2={f.x} y2={f.y + 18} stroke="#5A9E40" strokeWidth="2" strokeLinecap="round" />
                {[0,72,144,216,288].map(a => {
                  const rad = a * Math.PI / 180
                  return (
                    <ellipse key={a}
                      cx={f.x + 6 * Math.cos(rad)} cy={f.y + 6 * Math.sin(rad)}
                      rx="4.5" ry="5.5"
                      fill={f.c}
                      transform={`rotate(${a},${f.x + 6 * Math.cos(rad)},${f.y + 6 * Math.sin(rad)})`}
                    />
                  )
                })}
                <circle cx={f.x} cy={f.y} r="4" fill={f.s} />
                <circle cx={f.x} cy={f.y} r="2" fill="#FFF9C4" />
              </g>
            ))}

            {/* ── LAYER 15: 노랑이 AT GROUND LEVEL ── */}
            {charImg(c4)}

            {/* ── LAYER 16: DECORATIVE DETAILS ON TOP ── */}
            {/* Butterfly near tree */}
            <g transform="translate(108,160)">
              <path d="M0,0 Q -10,-10 -16,-4 Q -10,4 0,2"   fill="#FF9FB3" opacity="0.88" />
              <path d="M0,0 Q  10,-10  16,-4 Q  10,4 0,2"   fill="#C3A6FF" opacity="0.88" />
              <path d="M0,2 Q -6,8 -10,5 Q -6,2 0,4"        fill="#FF7BAC" opacity="0.6" />
              <path d="M0,2 Q  6,8  10,5 Q  6,2 0,4"        fill="#A87EFF" opacity="0.6" />
              <ellipse cx="0" cy="2" rx="1.5" ry="5" fill="#5C3D28" />
              <line x1="0" y1="-2" x2="-5" y2="-8" stroke="#5C3D28" strokeWidth="1" strokeLinecap="round" />
              <line x1="0" y1="-2" x2="5"  y2="-8" stroke="#5C3D28" strokeWidth="1" strokeLinecap="round" />
            </g>

            {/* Butterfly near pond */}
            <g transform="translate(240,230)">
              <path d="M0,0 Q -8,-8 -12,-3 Q -8,3 0,1"  fill="#FFE66D" opacity="0.85" />
              <path d="M0,0 Q  8,-8  12,-3 Q  8,3 0,1"  fill="#FFB347" opacity="0.85" />
              <ellipse cx="0" cy="1" rx="1.2" ry="4" fill="#5C3D28" />
            </g>

            {/* Extra decorative flowers top of ground (right side) */}
            {[
              {x:378, y:218, c:'#C3A6FF'},
              {x:392, y:228, c:'#FFB3D4'},
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
                <circle cx={f.x} cy={f.y} r="3" fill="#FFD700" />
              </g>
            ))}

            {/* ── LAYER 17: TRANSPARENT CLICKABLE RECTS ── */}
            {ITEMS.map(item => hitRect(item))}
          </svg>
        </div>

        {/* Checklist */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' }}>
          {ITEMS.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: found.has(item.id) ? '#EEF3FF' : '#F5F5F8',
                border: `2px solid ${found.has(item.id) ? '#4D72FB' : '#E8ECF4'}`,
                borderRadius: 10, padding: '5px 12px 5px 7px',
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
