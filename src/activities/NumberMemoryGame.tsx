import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

const TOTAL = 5
const SHOW_SECONDS = 3
const CHARS = [
  '/slice/slice2.png',
  '/slice/slice3.png',
  '/slice/slice4.png',
  '/slice/slice6.png',
  '/slice/slice7.png',
]

type Phase = 'show' | 'countdown' | 'recall' | 'result'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// positions[i] = which slot card i occupies (0-based)
function makePositions(): number[] {
  return shuffle([0, 1, 2, 3, 4])
}

export default function NumberMemoryGame({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('show')
  const [positions, setPositions] = useState<number[]>(makePositions) // positions[cardIndex] = slotIndex
  const [countdown, setCountdown] = useState(SHOW_SECONDS)
  const [clicks, setClicks] = useState<number[]>([])   // card numbers clicked so far (1-based)
  const [wrongCard, setWrongCard] = useState<number | null>(null)
  const [round, setRound] = useState(1)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer during 'show' phase
  useEffect(() => {
    if (phase !== 'show') return
    setCountdown(SHOW_SECONDS)
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current!)
          setPhase('countdown')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [phase, round])

  // Brief "감춰요!" countdown before recall
  useEffect(() => {
    if (phase !== 'countdown') return
    const t = setTimeout(() => setPhase('recall'), 700)
    return () => clearTimeout(t)
  }, [phase])

  const handleCardClick = (cardNum: number) => {
    if (phase !== 'recall') return
    if (clicks.includes(cardNum)) return

    const expected = clicks.length + 1
    if (cardNum === expected) {
      const next = [...clicks, cardNum]
      setClicks(next)
      if (next.length === TOTAL) {
        setTimeout(() => setPhase('result'), 400)
      }
    } else {
      setWrongCard(cardNum)
      setTimeout(() => setWrongCard(null), 500)
    }
  }

  const restart = () => {
    setPositions(makePositions())
    setClicks([])
    setWrongCard(null)
    setRound(r => r + 1)
    setPhase('show')
  }

  // Build a 5-slot layout: top row [0,1,2], bottom row centered [3,4]
  // card[i] is at slotIndex positions[i]
  // We need: given a slotIndex, which card is there?
  const slotToCard: number[] = new Array(5)
  positions.forEach((slotIdx, cardIdx) => {
    slotToCard[slotIdx] = cardIdx + 1  // 1-based card number
  })

  const isShow = phase === 'show' || phase === 'countdown'

  const renderCard = (slotIdx: number) => {
    const cardNum = slotToCard[slotIdx]
    const isClicked = clicks.includes(cardNum)
    const isWrong = wrongCard === cardNum
    const clickOrder = clicks.indexOf(cardNum)  // -1 if not clicked

    return (
      <div
        key={slotIdx}
        onClick={() => handleCardClick(cardNum)}
        className={isWrong ? 'shake' : ''}
        style={{
          width: 90,
          height: 110,
          borderRadius: 18,
          cursor: phase === 'recall' && !isClicked ? 'pointer' : 'default',
          position: 'relative',
          perspective: 600,
        }}
      >
        <div
          style={{
            width: '100%', height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.45s ease',
            transform: isShow ? 'rotateY(0deg)' : 'rotateY(180deg)',
          }}
        >
          {/* Front: shows number */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            borderRadius: 18,
            background: `linear-gradient(135deg, #EEF3FF, #fff)`,
            border: '2.5px solid #4D72FB33',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: '0 4px 16px rgba(77,114,251,0.12)',
          }}>
            <img src={CHARS[cardNum - 1]} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
            <span style={{ fontSize: 32, fontWeight: 900, color: '#4D72FB', lineHeight: 1 }}>{cardNum}</span>
          </div>

          {/* Back: blank or revealed-as-clicked */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 18,
            background: isClicked
              ? `linear-gradient(135deg, #4D72FB, #6B8FFF)`
              : `linear-gradient(135deg, #F0F4FF, #E8ECFF)`,
            border: isWrong ? '3px solid #FF4444' : isClicked ? '2.5px solid #4D72FB' : '2.5px solid #C8D4FF',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            boxShadow: isClicked ? '0 4px 16px rgba(77,114,251,0.35)' : '0 4px 16px rgba(77,114,251,0.08)',
            transition: 'background 0.3s ease',
          }}>
            {isClicked ? (
              <>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{cardNum}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                  {clickOrder + 1}번째
                </span>
              </>
            ) : (
              <span style={{ fontSize: 28, color: '#C8D4FF' }}>?</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'result') return (
    <Layout title="숫자 기억하기" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '48px 24px', textAlign: 'center' }}>
        <img src="/slice/slice9.png" alt="" style={{ width: 110, height: 110, objectFit: 'contain', animation: 'celebrate 0.6s ease infinite' }} />
        <div style={{ fontSize: 26, fontWeight: 900, color: '#4D72FB' }}>🎉 순서대로 맞췄어요!</div>
        <div style={{ fontSize: 15, color: '#888', fontWeight: 600 }}>
          1 → 2 → 3 → 4 → 5 를 기억했어요!
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={restart}>다시 하기</Button>
          <Button onClick={onBack} variant="outline">홈으로</Button>
        </div>
      </div>
    </Layout>
  )

  return (
    <Layout title="숫자 기억하기" onBack={onBack}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '12px 20px 32px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>

        {/* Phase instruction */}
        <div style={{ textAlign: 'center' }}>
          {phase === 'show' && (
            <>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#4D72FB' }}>숫자 위치를 기억해요!</p>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#FF8800', lineHeight: 1.2, marginTop: 4 }}>{countdown}</div>
            </>
          )}
          {phase === 'countdown' && (
            <p style={{ fontSize: 16, fontWeight: 900, color: '#FF4444', animation: 'pop 0.3s ease' }}>감춰요! 👀</p>
          )}
          {phase === 'recall' && (
            <div>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#4D72FB' }}>1부터 순서대로 눌러봐요!</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                {Array.from({ length: TOTAL }, (_, i) => i + 1).map(n => (
                  <div key={n} style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: clicks.includes(n) ? '#4D72FB' : '#EEF3FF',
                    border: `2px solid ${clicks.includes(n) ? '#4D72FB' : '#C8D4FF'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 900,
                    color: clicks.includes(n) ? '#fff' : '#C8D4FF',
                    transition: 'all 0.2s ease',
                  }}>
                    {clicks.includes(n) ? n : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cards — 3 top, 2 bottom centered */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {/* Top row: slots 0, 1, 2 */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[0, 1, 2].map(slotIdx => renderCard(slotIdx))}
          </div>
          {/* Bottom row: slots 3, 4 — centered */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[3, 4].map(slotIdx => renderCard(slotIdx))}
          </div>
        </div>

        {/* Restart */}
        {phase === 'recall' && (
          <Button onClick={restart} size="sm" variant="outline">다시 섞기</Button>
        )}
      </div>
    </Layout>
  )
}
