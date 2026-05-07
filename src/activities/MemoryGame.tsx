import { useState, useCallback } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

// 6 characters → 6 pairs → 12 cards in a 3×4 grid
const CHARS = [
  { id: 0, src: 'slice/slice2.png', name: '주황이' },
  { id: 1, src: 'slice/slice3.png', name: '초록이' },
  { id: 2, src: 'slice/slice4.png', name: '노랑이' },
  { id: 3, src: 'slice/slice5.png', name: '파랑이' },
  { id: 4, src: 'slice/slice6.png', name: '분홍이' },
  { id: 5, src: 'slice/slice7.png', name: '모자언니' },
]

interface Card {
  uid: string
  charId: number
  flipped: boolean
  matched: boolean
}

function createDeck(): Card[] {
  const cards: Card[] = []
  for (const ch of CHARS) {
    cards.push({ uid: `${ch.id}a`, charId: ch.id, flipped: false, matched: false })
    cards.push({ uid: `${ch.id}b`, charId: ch.id, flipped: false, matched: false })
  }
  return cards.sort(() => Math.random() - 0.5)
}

export default function MemoryGame({ onBack }: Props) {
  const [cards, setCards] = useState<Card[]>(createDeck)
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [isChecking, setIsChecking] = useState(false)

  const done = matches === CHARS.length

  const handleFlip = useCallback((uid: string) => {
    if (isChecking) return

    setCards(prev => {
      const card = prev.find(c => c.uid === uid)
      if (!card || card.flipped || card.matched) return prev

      const openCards = prev.filter(c => c.flipped && !c.matched)
      if (openCards.length >= 2) return prev

      const updated = prev.map(c => c.uid === uid ? { ...c, flipped: true } : c)
      const nowOpen = updated.filter(c => c.flipped && !c.matched)

      if (nowOpen.length === 2) {
        setMoves(m => m + 1)
        setIsChecking(true)
        const [a, b] = nowOpen
        if (a.charId === b.charId) {
          setTimeout(() => {
            setCards(p => p.map(c =>
              c.uid === a.uid || c.uid === b.uid ? { ...c, matched: true } : c
            ))
            setMatches(m => m + 1)
            setIsChecking(false)
          }, 600)
        } else {
          setTimeout(() => {
            setCards(p => p.map(c =>
              c.uid === a.uid || c.uid === b.uid ? { ...c, flipped: false } : c
            ))
            setIsChecking(false)
          }, 1000)
        }
      }

      return updated
    })
  }, [isChecking])

  const restart = () => {
    setCards(createDeck())
    setMoves(0)
    setMatches(0)
    setIsChecking(false)
  }

  if (done) {
    return (
      <Layout title="기억력 놀이" onBack={onBack}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '48px 24px', textAlign: 'center' }}>
          <img src="slice/slice9.png" alt="" style={{ width: 110, height: 110, objectFit: 'contain', animation: 'celebrate 0.6s ease infinite' }} />
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#4D72FB', marginBottom: 8 }}>🎉 모두 찾았어요!</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#888' }}>
              총 <span style={{ color: '#4D72FB', fontWeight: 900 }}>{moves}</span>번 만에 완성했어요!
            </div>
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
    <Layout title="기억력 놀이" onBack={onBack}>
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '12px 16px 32px', width: '100%' }}>
        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 14, fontSize: 14, fontWeight: 700, color: '#aaa' }}>
          <span>횟수 <span style={{ color: '#4D72FB' }}>{moves}</span></span>
          <span>맞춘 쌍 <span style={{ color: '#4D72FB' }}>{matches}</span> / {CHARS.length}</span>
        </div>

        {/* 3 × 4 grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {cards.map(card => {
            const ch = CHARS[card.charId]
            const isUp = card.flipped || card.matched

            return (
              <div
                key={card.uid}
                className="flip-container"
                onClick={() => handleFlip(card.uid)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 18,
                  cursor: card.matched ? 'default' : 'pointer',
                }}
              >
                <div className={`flip-inner${isUp ? ' flipped' : ''}`}>
                  {/* Face-down */}
                  <div
                    className="flip-face"
                    style={{
                      background: '#4D72FB',
                      borderRadius: 18,
                    }}
                  >
                    <svg width="36" height="36" viewBox="0 0 36 36" opacity="0.35">
                      <circle cx="18" cy="18" r="7" fill="white" />
                      {[0,60,120,180,240,300].map(a => (
                        <circle key={a}
                          cx={18 + 12 * Math.cos(a * Math.PI/180)}
                          cy={18 + 12 * Math.sin(a * Math.PI/180)}
                          r="3" fill="white"
                        />
                      ))}
                    </svg>
                  </div>

                  {/* Face-up */}
                  <div
                    className="flip-face flip-face-back"
                    style={{
                      background: card.matched ? '#EEF3FF' : '#F7F9FF',
                      borderRadius: 18,
                      border: card.matched ? '2.5px solid #4D72FB' : '2.5px solid #E8ECF4',
                      transition: 'border 0.3s, background 0.3s',
                      padding: '10%',
                    }}
                  >
                    <img
                      src={ch.src}
                      alt={ch.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                        filter: card.matched ? 'drop-shadow(0 0 6px #4D72FB88)' : 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Character reference strip */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          marginTop: 18,
          padding: '10px 0',
          borderTop: '1px solid #EEF3FF',
        }}>
          {CHARS.map(ch => (
            <div
              key={ch.id}
              style={{
                opacity: matches > CHARS.indexOf(ch) ? 1 : 0.3,
                transition: 'opacity 0.4s ease',
              }}
            >
              <img src={ch.src} alt={ch.name} style={{ width: 32, height: 32, objectFit: 'contain' }} />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
