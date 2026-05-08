import { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

const COLORS = [
  { id: 'red',    hex: '#FF4444', name: '빨강' },
  { id: 'orange', hex: '#FF8800', name: '주황' },
  { id: 'yellow', hex: '#FFD700', name: '노랑' },
  { id: 'green',  hex: '#44BB44', name: '초록' },
  { id: 'blue',   hex: '#44AAFF', name: '파랑' },
  { id: 'purple', hex: '#9944CC', name: '보라' },
  { id: 'pink',   hex: '#FF66AA', name: '분홍' },
]

const CHARS = [
  'slice/slice2.png',
  'slice/slice3.png',
  'slice/slice4.png',
  'slice/slice5.png',
  'slice/slice6.png',
  'slice/slice7.png',
  'slice/slice9.png',
]

interface Balloon {
  id: number
  colorId: string
  hex: string
  x: number
  size: number
  duration: number
  popped: boolean
  popping: boolean
}

const GOAL = 15

let _uid = 0

function BalloonSVG({ hex, size }: { hex: string; size: number }) {
  const w = size, h = size * 1.3
  return (
    <svg width={w} height={h} viewBox="0 0 60 78" style={{ display: 'block' }}>
      <ellipse cx="30" cy="28" rx="26" ry="28" fill={hex} />
      <ellipse cx="20" cy="16" rx="7" ry="9" fill="rgba(255,255,255,0.35)" />
      <ellipse cx="30" cy="56" rx="4" ry="3" fill={hex} />
      <path d="M30 59 Q26 66 30 72 Q34 66 30 59" stroke="#888" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export default function BalloonGame({ onBack }: Props) {
  const [balloons, setBalloons] = useState<Balloon[]>([])
  const [target, setTarget] = useState(() => COLORS[Math.floor(Math.random() * COLORS.length)])
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState(0)
  const [done, setDone] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null)
  const [running, setRunning] = useState(true)

  const scoreRef = useRef(0)
  scoreRef.current = score
  const targetRef = useRef(target)
  targetRef.current = target
  const runningRef = useRef(running)
  runningRef.current = running

  const spawnBalloon = useCallback(() => {
    if (!runningRef.current) return
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const balloon: Balloon = {
      id: ++_uid,
      colorId: color.id,
      hex: color.hex,
      x: 5 + Math.random() * 80,
      size: 52 + Math.random() * 28,
      duration: 2400 + Math.random() * 1600,
      popped: false,
      popping: false,
    }
    setBalloons(prev => [...prev.slice(-29), balloon])
  }, [])

  useEffect(() => {
    if (!running) return
    spawnBalloon()
    const interval = setInterval(spawnBalloon, 380)
    return () => clearInterval(interval)
  }, [running, spawnBalloon])

  const popBalloon = (balloon: Balloon) => {
    if (balloon.popped || balloon.popping || done) return

    // Trigger burst animation
    setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, popping: true } : b))
    // Remove after animation completes
    setTimeout(() => {
      setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, popped: true, popping: false } : b))
    }, 400)

    if (balloon.colorId === targetRef.current.id) {
      const next = scoreRef.current + 1
      setScore(next)
      setFeedback({ text: '✓ 맞아요!', ok: true })
      if (next >= GOAL) {
        setRunning(false)
        setTimeout(() => setDone(true), 600)
      } else {
        if (next % 3 === 0) {
          const newTarget = COLORS[Math.floor(Math.random() * COLORS.length)]
          setTarget(newTarget)
        }
      }
    } else {
      setMissed(m => m + 1)
      setFeedback({ text: '✗ 다른 색이에요!', ok: false })
    }
    setTimeout(() => setFeedback(null), 600)
  }

  const restart = () => {
    setBalloons([])
    setScore(0)
    setMissed(0)
    setDone(false)
    setFeedback(null)
    setRunning(true)
    setTarget(COLORS[Math.floor(Math.random() * COLORS.length)])
  }

  if (done) return (
    <Layout title="풍선 터뜨리기" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#4D72FB' }}>🎉 {GOAL}개 터뜨렸어요!</div>
        <div style={{ fontSize: 16, color: '#888', fontWeight: 600 }}>
          실수 <span style={{ color: '#FF4444', fontWeight: 900 }}>{missed}</span>번
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={restart}>다시 하기</Button>
          <Button onClick={onBack} variant="outline">홈으로</Button>
        </div>
      </div>
    </Layout>
  )

  return (
    <Layout title="풍선 터뜨리기" onBack={onBack}>
      <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden', position: 'relative' }}>

        {/* Top HUD */}
        <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fff', zIndex: 10, borderBottom: '1px solid #F0F0F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#aaa' }}>이 색을 터뜨려요!</span>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: target.hex,
              border: '3px solid #fff',
              boxShadow: `0 0 0 2px ${target.hex}88, 0 4px 12px ${target.hex}55`,
              animation: 'pop 0.4s ease',
            }} />
            <span style={{ fontSize: 14, fontWeight: 900, color: target.hex }}>{target.name}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#4D72FB' }}>
            {score} / {GOAL}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 5, background: '#EEF3FF', flexShrink: 0 }}>
          <div style={{ height: '100%', background: '#4D72FB', width: `${(score / GOAL) * 100}%`, transition: 'width 0.3s ease', borderRadius: '0 3px 3px 0' }} />
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div style={{
            position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
            background: feedback.ok ? '#44BB44' : '#FF4444',
            color: '#fff', fontWeight: 900, fontSize: 16,
            padding: '8px 22px', borderRadius: 999,
            zIndex: 50, animation: 'fadeInUp 0.2s ease',
            pointerEvents: 'none',
          }}>
            {feedback.text}
          </div>
        )}

        {/* Balloon field */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg, #C8E8FF 0%, #EEF8FF 60%, #EEF3FF 100%)' }}>
          {balloons.map(balloon => !balloon.popped && (
            <div
              key={balloon.id}
              onClick={() => popBalloon(balloon)}
              style={{
                position: 'absolute',
                left: `${balloon.x}%`,
                bottom: '-160px',
                cursor: 'pointer',
                animation: balloon.popping
                  ? 'balloonBurst 400ms ease forwards'
                  : `riseUp ${balloon.duration}ms linear forwards`,
                userSelect: 'none',
                touchAction: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
              onAnimationEnd={(e) => {
                if (e.animationName === 'riseUp') {
                  setBalloons(prev => prev.filter(b => b.id !== balloon.id))
                }
              }}
            >
              <BalloonSVG hex={balloon.hex} size={balloon.size} />
              {/* String connecting balloon to character */}
              <div style={{ width: 1, height: 10, background: '#999', marginTop: -2 }} />
              {/* Character image */}
              <img
                src={CHARS[balloon.id % 7]}
                alt=""
                style={{ width: 28, height: 28, objectFit: 'contain', display: 'block' }}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes riseUp {
          from { transform: translateY(0) rotate(-3deg); }
          25%  { transform: translateY(-25vh) rotate(3deg); }
          50%  { transform: translateY(-50vh) rotate(-2deg); }
          75%  { transform: translateY(-75vh) rotate(2deg); }
          to   { transform: translateY(-110vh) rotate(0deg); }
        }
        @keyframes balloonBurst {
          0%   { transform: scale(1);   opacity: 1; }
          50%  { transform: scale(1.5); opacity: 0.7; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </Layout>
  )
}
