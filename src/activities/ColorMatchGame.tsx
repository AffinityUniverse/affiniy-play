import { useState, useCallback } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

const COLORS = [
  { id: 'red',      hex: '#FF4444', name: '빨간색' },
  { id: 'blue',     hex: '#4D72FB', name: '파란색' },
  { id: 'green',    hex: '#44BB44', name: '초록색' },
  { id: 'yellow',   hex: '#FFCC00', name: '노란색' },
  { id: 'purple',   hex: '#9944CC', name: '보라색' },
  { id: 'orange',   hex: '#FF8800', name: '주황색' },
  { id: 'pink',     hex: '#FF66AA', name: '분홍색' },
  { id: 'teal',     hex: '#00AAAA', name: '청록색' },
  { id: 'coral',    hex: '#FF6655', name: '산호색' },
  { id: 'mint',     hex: '#44DDAA', name: '민트색' },
]

const TOTAL = 10

function pickRound(exceptId: string | null) {
  const pool = COLORS.filter(c => c.id !== exceptId)
  const target = pool[Math.floor(Math.random() * pool.length)]
  const distractors = COLORS
    .filter(c => c.id !== target.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  const options = [target, ...distractors].sort(() => Math.random() - 0.5)
  return { target, options }
}

// Pick which character shows the color (varies per round)
const CHARS = ['slice/slice2.png', 'slice/slice3.png', 'slice/slice4.png',
               'slice/slice5.png', 'slice/slice6.png', 'slice/slice7.png']

export default function ColorMatchGame({ onBack }: Props) {
  const [round, setRound]         = useState(1)
  const [score, setScore]         = useState(0)
  const [{ target, options }, setRound_] = useState(() => pickRound(null))
  const [result, setResult]       = useState<'correct' | 'wrong' | null>(null)
  const [answered, setAnswered]   = useState(false)
  const [shakingId, setShakingId] = useState<string | null>(null)
  const [done, setDone]           = useState(false)
  const [charIdx]                 = useState(() => Math.floor(Math.random() * CHARS.length))

  const handlePick = useCallback((id: string) => {
    if (answered) return
    setAnswered(true)

    if (id === target.id) {
      setResult('correct')
      setScore(s => s + 1)
      setTimeout(() => {
        if (round >= TOTAL) { setDone(true); return }
        setRound_(pickRound(target.id))
        setRound(r => r + 1)
        setResult(null)
        setAnswered(false)
      }, 850)
    } else {
      setResult('wrong')
      setShakingId(id)
      setTimeout(() => {
        setResult(null)
        setAnswered(false)
        setShakingId(null)
      }, 800)
    }
  }, [answered, target, round])

  const restart = () => {
    setRound(1); setScore(0)
    setRound_(pickRound(null))
    setResult(null); setAnswered(false)
    setDone(false); setShakingId(null)
  }

  if (done) {
    const pct = Math.round(score / TOTAL * 100)
    return (
      <Layout title="색깔 맞추기" onBack={onBack}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '48px 24px', textAlign: 'center' }}>
          
          <div style={{ fontSize: 26, fontWeight: 900, color: '#4D72FB' }}>
            {pct >= 80 ? '🌟 훌륭해요!' : pct >= 60 ? '🎉 잘했어요!' : '😊 다시 해봐요!'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#888' }}>
            <span style={{ color: '#4D72FB', fontWeight: 900, fontSize: 24 }}>{score}</span> / {TOTAL} 개 맞췄어요!
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={restart}>다시 하기</Button>
            <Button onClick={onBack} variant="outline">홈으로</Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="색깔 맞추기" onBack={onBack}>
      <div style={{ maxWidth: 400, margin: '0 auto', padding: '16px 20px 32px', width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 6, borderRadius: 3,
              background: i < round - 1 ? '#4D72FB' : i === round - 1 ? '#B0C4FF' : '#EEF3FF',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Round / score */}
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#aaa' }}>
          {round} / {TOTAL} 번째 &nbsp;·&nbsp; ⭐ {score}점
        </div>

        {/* Target prompt */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#888', marginBottom: 14 }}>
            이 색과 같은 색을 눌러요!
          </p>

          {/* Character holding a color swatch */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={CHARS[charIdx]}
              alt=""
              style={{
                width: 90,
                height: 90,
                objectFit: 'contain',
                display: 'block',
                filter: result === 'correct' ? 'drop-shadow(0 0 12px #4D72FB)' : 'none',
                transition: 'filter 0.3s',
              }}
            />
            {/* Color bubble */}
            <div style={{
              position: 'absolute',
              top: -8,
              right: -14,
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: target.hex,
              border: '3px solid white',
              boxShadow: `0 4px 14px ${target.hex}66`,
              animation: result === 'correct' ? 'celebrate 0.5s ease' : 'pulse 2s ease-in-out infinite',
            }} />
          </div>
        </div>

        {/* Feedback */}
        {result && (
          <div style={{
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 900,
            color: result === 'correct' ? '#4D72FB' : '#FF4444',
            animation: 'pop 0.3s ease',
          }}>
            {result === 'correct' ? '✓ 맞았어요!' : '✗ 다시 해봐요!'}
          </div>
        )}

        {/* Options */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handlePick(opt.id)}
              className={shakingId === opt.id ? 'shake' : ''}
              style={{
                background: opt.hex,
                border: result === 'correct' && opt.id === target.id
                  ? '4px solid #fff'
                  : '4px solid transparent',
                outline: result === 'correct' && opt.id === target.id
                  ? '3px solid #4D72FB'
                  : 'none',
                borderRadius: 18,
                height: 76,
                cursor: answered ? 'default' : 'pointer',
                boxShadow: `0 4px 0 ${opt.hex}99, 0 6px 18px ${opt.hex}55`,
                transition: 'transform 0.14s ease',
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
                textShadow: '0 1px 3px rgba(0,0,0,0.25)',
                fontFamily: 'inherit',
                letterSpacing: '-0.2px',
              }}
              onMouseEnter={e => { if (!answered) (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
            >
              {opt.name}
            </button>
          ))}
        </div>
      </div>
    </Layout>
  )
}
