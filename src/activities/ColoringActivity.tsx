import { useState } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

// All regions start WHITE — user colors them in
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
  '#FFFFFF', '#CCCCCC', '#8B6355', '#3A7820',
]

const S = '#1A1A2E' // stroke color
const SW = 1.8     // stroke width

export default function ColoringActivity({ onBack }: Props) {
  const [colors, setColors] = useState<Record<string, string>>({ ...DEFAULTS })
  const [sel, setSel] = useState('#FFD700')

  const fill = (r: string) => setColors(p => ({ ...p, [r]: sel }))

  // Helper: common props for fillable regions
  const r = (id: string, extra?: Record<string, unknown>) => ({
    fill: colors[id],
    stroke: S,
    strokeWidth: SW,
    onClick: () => fill(id),
    style: { cursor: 'pointer' } as React.CSSProperties,
    ...extra,
  })

  return (
    <Layout title="색칠놀이" onBack={onBack}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '8px 14px 24px', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Inspiration characters */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {['slice/slice6.png', 'slice/slice2.png', 'slice/slice4.png'].map((src, i) => (
            <img key={i} src={src} alt="" style={{ width: 34, height: 34, objectFit: 'contain', animation: `float 3s ease-in-out ${i * 400}ms infinite` }} />
          ))}
        </div>

        {/* Coloring canvas — white bg, black outlines only */}
        <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '2px solid #E8ECF4', boxShadow: '0 2px 16px rgba(77,114,251,0.08)' }}>
          <svg viewBox="0 0 400 260" width="100%" style={{ display: 'block', cursor: 'crosshair' }}>

            {/* Sky */}
            <rect x="0" y="0" width="400" height="175" {...r('sky')} rx="0" />

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
            <ellipse cx="200" cy="198" rx="210" ry="25" {...r('ground')} />
            <rect x="0" y="200" width="400" height="60" {...r('ground')} />

            {/* Path */}
            <rect x="175" y="198" width="50" height="62" {...r('path')} />
            <ellipse cx="200" cy="198" rx="25" ry="10" {...r('path')} />

            {/* Tree trunk */}
            <rect x="42" y="150" width="24" height="70" rx="6" {...r('treeTrunk')} />
            {/* Tree top */}
            <ellipse cx="54" cy="140" rx="42" ry="36" {...r('treeTop')} />

            {/* House body */}
            <rect x="118" y="115" width="164" height="90" rx="4" {...r('houseBody')} />
            {/* Roof */}
            <polygon points="100,117 200,55 300,117" {...r('roof')} strokeLinejoin="round" />
            {/* Chimney */}
            <rect x="225" y="62" width="22" height="40" rx="3" {...r('chimney')} />

            {/* Door */}
            <rect x="175" y="162" width="50" height="43" rx="5" {...r('doorBody')} />
            <ellipse cx="200" cy="162" rx="25" ry="9" fill={colors.doorBody} stroke={S} strokeWidth={SW} style={{ cursor: 'pointer' }} onClick={() => fill('doorBody')} />
            <circle cx="218" cy="186" r="4" {...r('doorKnob')} />

            {/* Windows */}
            <rect x="130" y="132" width="36" height="28" rx="5" {...r('windowL')} />
            <line x1="148" y1="132" x2="148" y2="160" stroke={S} strokeWidth={SW * 0.7} style={{ pointerEvents: 'none' }} />
            <line x1="130" y1="146" x2="166" y2="146" stroke={S} strokeWidth={SW * 0.7} style={{ pointerEvents: 'none' }} />

            <rect x="234" y="132" width="36" height="28" rx="5" {...r('windowR')} />
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
            <circle cx="90" cy="200" r="7" {...r('centerL')} />

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
            <circle cx="315" cy="200" r="7" {...r('centerR')} />
          </svg>
        </div>

        {/* Palette */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '12px 14px 10px', border: '2px solid #E8ECF4' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {PALETTE.map(hex => (
              <button key={hex} onClick={() => setSel(hex)} style={{
                width: 34, height: 34, borderRadius: '50%', background: hex,
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
            <Button onClick={() => setColors({ ...DEFAULTS })} size="sm" variant="outline">초기화</Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
