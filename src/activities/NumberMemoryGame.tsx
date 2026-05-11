import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { playClick, playSuccess, playError } from '../utils/sounds'

interface Props { onBack: () => void }

const ALL_CHARS = [
  'slice/slice2.png', 'slice/slice3.png', 'slice/slice4.png',
  'slice/slice6.png', 'slice/slice7.png', 'slice/slice9.png',
  'chars/bear.png', 'chars/cat.png',
]

type Phase = 'levelSelect' | 'show' | 'countdown' | 'recall' | 'result'

interface Level {
  id: string
  label: string
  emoji: string
  color: string
  light: string
  cards: number
  showSeconds: number
  desc: string
}

const LEVELS: Level[] = [
  { id: 'easy',   label: '쉬움',   emoji: '🌱', color: '#27AE60', light: '#D5F5E3', cards: 4, showSeconds: 4, desc: '4장 · 4초' },
  { id: 'normal', label: '보통',   emoji: '⭐', color: '#4D72FB', light: '#D5E8FF', cards: 5, showSeconds: 3, desc: '5장 · 3초' },
  { id: 'hard',   label: '어려움', emoji: '🔥', color: '#E8731A', light: '#FFE9D5', cards: 6, showSeconds: 2, desc: '6장 · 2초' },
  { id: 'expert', label: '전문가', emoji: '💀', color: '#CC0000', light: '#FFEEEE', cards: 8, showSeconds: 2, desc: '8장 · 2초' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makePositions(n: number): number[] {
  return shuffle(Array.from({ length: n }, (_, i) => i))
}

// Grid layout helper: given n cards, return rows
function gridRows(n: number): number[][] {
  if (n <= 4) return [Array.from({ length: n }, (_, i) => i)]
  if (n === 5) return [[0,1,2],[3,4]]
  if (n === 6) return [[0,1,2],[3,4,5]]
  if (n === 7) return [[0,1,2,3],[4,5,6]]
  if (n === 8) return [[0,1,2,3],[4,5,6,7]]
  return [Array.from({ length: n }, (_, i) => i)]
}

export default function NumberMemoryGame({ onBack }: Props) {
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null)
  const [phase, setPhase] = useState<Phase>('levelSelect')
  const [positions, setPositions] = useState<number[]>([])
  const [chars, setChars] = useState<string[]>([])
  const [countdown, setCountdown] = useState(3)
  const [clicks, setClicks] = useState<number[]>([])
  const [wrongCard, setWrongCard] = useState<number | null>(null)
  const [round, setRound] = useState(1)
  const [winCount, setWinCount] = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startLevel = (lv: Level) => {
    setSelectedLevel(lv)
    setPositions(makePositions(lv.cards))
    setChars(shuffle(ALL_CHARS).slice(0, lv.cards))
    setClicks([])
    setWrongCard(null)
    setRound(1)
    setCountdown(lv.showSeconds)
    setPhase('show')
    playClick()
  }

  const restart = () => {
    if (!selectedLevel) return
    setPositions(makePositions(selectedLevel.cards))
    setChars(shuffle(ALL_CHARS).slice(0, selectedLevel.cards))
    setClicks([])
    setWrongCard(null)
    setRound(r => r + 1)
    setCountdown(selectedLevel.showSeconds)
    setPhase('show')
    playClick()
  }

  // Show phase timer
  useEffect(() => {
    if (phase !== 'show' || !selectedLevel) return
    setCountdown(selectedLevel.showSeconds)
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
  }, [phase, round, selectedLevel])

  // Brief 'hide' animation
  useEffect(() => {
    if (phase !== 'countdown') return
    const t = setTimeout(() => setPhase('recall'), 650)
    return () => clearTimeout(t)
  }, [phase])

  const handleCardClick = (cardNum: number) => {
    if (phase !== 'recall') return
    if (clicks.includes(cardNum)) return
    const expected = clicks.length + 1
    if (cardNum === expected) {
      const next = [...clicks, cardNum]
      setClicks(next)
      playClick()
      if (next.length === (selectedLevel?.cards ?? 5)) {
        setWinCount(w => w + 1)
        setTimeout(() => { setPhase('result'); playSuccess() }, 400)
      }
    } else {
      setWrongCard(cardNum)
      playError()
      setTimeout(() => setWrongCard(null), 500)
    }
  }

  // Build slot→card map
  const slotToCard: number[] = new Array(selectedLevel?.cards ?? 5)
  positions.forEach((slotIdx, cardIdx) => { slotToCard[slotIdx] = cardIdx + 1 })
  const isShow = phase === 'show' || phase === 'countdown'

  const renderCard = (slotIdx: number) => {
    const cardNum = slotToCard[slotIdx]
    if (cardNum === undefined) return null
    const isClicked = clicks.includes(cardNum)
    const isWrong = wrongCard === cardNum
    const clickOrder = clicks.indexOf(cardNum)
    const lv = selectedLevel!

    return (
      <div
        key={slotIdx}
        onClick={() => handleCardClick(cardNum)}
        className={isWrong ? 'shake' : ''}
        style={{ width: 86, height: 104, borderRadius: 18, cursor: phase === 'recall' && !isClicked ? 'pointer' : 'default', position: 'relative', perspective: 600 }}
      >
        <div style={{
          width: '100%', height: '100%', position: 'relative',
          transformStyle: 'preserve-3d', transition: 'transform 0.42s ease',
          transform: isShow ? 'rotateY(0deg)' : 'rotateY(180deg)',
        }}>
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden', borderRadius: 18,
            background: `linear-gradient(135deg, ${lv.light}, #fff)`,
            border: `2.5px solid ${lv.color}44`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: `0 4px 16px ${lv.color}22`,
          }}>
            <img src={chars[cardNum - 1] || 'chars/bear.png'} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />
            <span style={{ fontSize: 30, fontWeight: 900, color: lv.color, lineHeight: 1 }}>{cardNum}</span>
          </div>
          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
            borderRadius: 18,
            background: isClicked ? `linear-gradient(135deg, ${lv.color}, ${lv.color}BB)` : 'linear-gradient(135deg, #F0F4FF, #E8ECFF)',
            border: isWrong ? '3px solid #FF4444' : isClicked ? `2.5px solid ${lv.color}` : '2.5px solid #C8D4FF',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            boxShadow: isClicked ? `0 4px 16px ${lv.color}55` : '0 4px 16px rgba(77,114,251,0.08)',
            transition: 'background 0.3s',
          }}>
            {isClicked ? (
              <>
                <span style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{cardNum}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{clickOrder + 1}번째</span>
              </>
            ) : (
              <span style={{ fontSize: 28, color: '#C8D4FF' }}>?</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── 레벨 선택 화면 ──
  if (phase === 'levelSelect') {
    return (
      <Layout title="숫자 기억하기" onBack={onBack}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'28px 20px' }}>
          <div style={{ fontSize:20, fontWeight:900, color:'#333', marginBottom:6 }}>난이도 선택</div>
          <div style={{ fontSize:13, color:'#888', marginBottom:24 }}>카드 위치와 순서를 기억하세요!</div>
          {winCount > 0 && (
            <div style={{ fontSize:13, color:'#4D72FB', fontWeight:700, marginBottom:16 }}>
              🎉 이번 세션 클리어: {winCount}회
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:320 }}>
            {LEVELS.map(lv => (
              <button
                key={lv.id}
                onClick={() => startLevel(lv)}
                style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'16px 20px', background:'#fff',
                  border:`2.5px solid ${lv.color}`,
                  borderRadius:16, cursor:'pointer', textAlign:'left',
                  boxShadow:`0 4px 14px ${lv.color}22`,
                  transition:'transform 0.13s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform='translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform='none')}
              >
                <span style={{ fontSize:28 }}>{lv.emoji}</span>
                <div>
                  <div style={{ fontWeight:900, fontSize:16, color:lv.color }}>{lv.label}</div>
                  <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{lv.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  // ── 결과 화면 ──
  if (phase === 'result') {
    const lv = selectedLevel!
    return (
      <Layout title="숫자 기억하기" onBack={onBack}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:18, padding:'40px 24px', textAlign:'center' }}>
          <div style={{ fontSize:52 }}>🎉</div>
          <div style={{ fontSize:24, fontWeight:900, color:lv.color }}>완벽해요!</div>
          <div style={{ fontSize:14, color:'#888' }}>
            {lv.label} 난이도 {lv.cards}장을 모두 기억했어요!
          </div>
          <div style={{ fontSize:16, fontWeight:800, color:'#4D72FB' }}>
            총 클리어: {winCount}회 🏆
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
            <Button onClick={restart}>같은 난이도 다시</Button>
            <Button onClick={() => { setPhase('levelSelect') }} variant="outline">난이도 변경</Button>
          </div>
        </div>
      </Layout>
    )
  }

  // ── 게임 화면 ──
  const lv = selectedLevel!
  const rows = gridRows(lv.cards)

  return (
    <Layout title="숫자 기억하기" onBack={onBack}>
      <div style={{ maxWidth:480, margin:'0 auto', padding:'12px 20px 32px', width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>

        {/* 레벨 배지 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
          <div style={{ background:lv.color, color:'#fff', borderRadius:20, padding:'4px 14px', fontSize:12, fontWeight:800 }}>
            {lv.emoji} {lv.label}
          </div>
          <div style={{ fontSize:13, color:'#888', fontWeight:700 }}>클리어 {winCount}회</div>
        </div>

        {/* 안내 메시지 */}
        <div style={{ textAlign:'center' }}>
          {phase === 'show' && (
            <>
              <p style={{ fontSize:15, fontWeight:900, color:lv.color, margin:0 }}>
                번호 순서를 기억하세요!
              </p>
              <div style={{ fontSize:44, fontWeight:900, color:'#FF8800', lineHeight:1.1, marginTop:4 }}>{countdown}</div>
            </>
          )}
          {phase === 'countdown' && (
            <p style={{ fontSize:18, fontWeight:900, color:'#FF4444', margin:0, animation:'pop 0.3s ease' }}>
              눈 감아요! 👀
            </p>
          )}
          {phase === 'recall' && (
            <div>
              <p style={{ fontSize:15, fontWeight:900, color:lv.color, margin:0 }}>1부터 순서대로 눌러봐요!</p>
              <div style={{ display:'flex', justifyContent:'center', gap:5, marginTop:8, flexWrap:'wrap' }}>
                {Array.from({ length: lv.cards }, (_, i) => i + 1).map(n => (
                  <div key={n} style={{
                    width:30, height:30, borderRadius:'50%',
                    background: clicks.includes(n) ? lv.color : '#EEF3FF',
                    border: `2px solid ${clicks.includes(n) ? lv.color : '#C8D4FF'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, fontWeight:900,
                    color: clicks.includes(n) ? '#fff' : '#C8D4FF',
                    transition:'all 0.2s',
                  }}>
                    {clicks.includes(n) ? n : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 카드 그리드 */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          {rows.map((row, ri) => (
            <div key={ri} style={{ display:'flex', gap:10 }}>
              {row.map(slotIdx => renderCard(slotIdx))}
            </div>
          ))}
        </div>

        {phase === 'recall' && (
          <Button onClick={restart} size="sm" variant="outline">다시 섞기</Button>
        )}
      </div>
    </Layout>
  )
}
