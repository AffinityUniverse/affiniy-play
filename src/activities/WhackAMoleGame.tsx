import { useEffect, useRef, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { playPop, playError, playSuccess, playJackpot } from '../utils/sounds'

interface Props { onBack: () => void }

type GameState = 'idle' | 'countdown' | 'playing' | 'over'

const GRID_COLS = 3
const GRID_ROWS = 3
const TOTAL_HOLES = GRID_COLS * GRID_ROWS
const GAME_DURATION = 30  // seconds
const BASE_INTERVAL = 1000 // ms

interface MoleSlot {
  active: boolean
  type: 'normal' | 'golden' | 'bomb' // golden = 2pts, bomb = -1 life
  showTimer: number // frames until hide
  hitAnim: number   // hit flash frames
  missAnim: number  // escape frames
  bobOffset: number // animation offset
}

function makeMole(): MoleSlot {
  return { active: false, type: 'normal', showTimer: 0, hitAnim: 0, missAnim: 0, bobOffset: Math.random() * Math.PI * 2 }
}

export default function WhackAMoleGame({ onBack }: Props) {
  const [gameState, setGameState] = useState<GameState>('idle')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [countdown, setCountdown] = useState(3)
  const [combo, setCombo] = useState(0)
  const [floatingTexts, setFloatingTexts] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([])
  const [slots, setSlots] = useState<MoleSlot[]>(() => Array.from({ length: TOTAL_HOLES }, makeMole))

  const stateRef = useRef({
    gameState: 'idle' as GameState,
    score: 0,
    lives: 3,
    timeLeft: GAME_DURATION,
    combo: 0,
    slots: Array.from({ length: TOTAL_HOLES }, makeMole),
    spawnTimer: null as ReturnType<typeof setTimeout> | null,
    tickTimer: null as ReturnType<typeof setInterval> | null,
    animFrame: 0,
    floatId: 0,
  })
  const rafRef = useRef(0)

  const stopTimers = useCallback(() => {
    const s = stateRef.current
    if (s.spawnTimer) { clearTimeout(s.spawnTimer); s.spawnTimer = null }
    if (s.tickTimer)  { clearInterval(s.tickTimer); s.tickTimer = null }
  }, [])

  const endGame = useCallback(() => {
    const s = stateRef.current
    s.gameState = 'over'
    setGameState('over')
    stopTimers()
    if (s.score >= 20) playSuccess()
    if (s.score >= 40) playJackpot()
  }, [stopTimers])

  const spawnMole = useCallback(() => {
    const s = stateRef.current
    if (s.gameState !== 'playing') return

    const idle = s.slots.map((sl, i) => (!sl.active ? i : -1)).filter(i => i >= 0)
    if (idle.length === 0) { scheduleNext(); return }

    const idx = idle[Math.floor(Math.random() * idle.length)]
    const rand = Math.random()
    const type: MoleSlot['type'] = rand < 0.12 ? 'bomb' : rand < 0.25 ? 'golden' : 'normal'
    const showDuration = type === 'bomb' ? 90 : type === 'golden' ? 70 : 80

    s.slots[idx] = { ...s.slots[idx], active: true, type, showTimer: showDuration, hitAnim: 0, missAnim: 0 }
    setSlots([...s.slots])
    scheduleNext()
  }, [])

  function scheduleNext() {
    const s = stateRef.current
    if (s.gameState !== 'playing') return
    const interval = Math.max(400, BASE_INTERVAL - s.score * 10)
    s.spawnTimer = setTimeout(() => spawnMole(), interval)
  }

  const startGame = useCallback(() => {
    const s = stateRef.current
    s.gameState = 'countdown'
    s.score = 0; s.lives = 3; s.timeLeft = GAME_DURATION; s.combo = 0
    s.slots = Array.from({ length: TOTAL_HOLES }, makeMole)
    setScore(0); setLives(3); setTimeLeft(GAME_DURATION); setCombo(0)
    setSlots([...s.slots])
    setFloatingTexts([])
    setGameState('countdown')
    setCountdown(3)

    let cnt = 3
    const cd = setInterval(() => {
      cnt--
      setCountdown(cnt)
      if (cnt <= 0) {
        clearInterval(cd)
        s.gameState = 'playing'
        setGameState('playing')
        s.spawnTimer = setTimeout(() => spawnMole(), 500)
        s.tickTimer = setInterval(() => {
          s.timeLeft -= 1
          setTimeLeft(s.timeLeft)
          if (s.timeLeft <= 0) endGame()
        }, 1000)
      }
    }, 1000)
  }, [spawnMole, endGame])

  // Animation loop for hiding moles
  useEffect(() => {
    function tick() {
      const s = stateRef.current
      if (s.gameState === 'playing') {
        let changed = false
        for (let i = 0; i < s.slots.length; i++) {
          const sl = s.slots[i]
          if (sl.hitAnim > 0) { s.slots[i] = { ...sl, hitAnim: sl.hitAnim - 1 }; changed = true }
          if (sl.missAnim > 0) { s.slots[i] = { ...sl, missAnim: sl.missAnim - 1 }; changed = true }
          if (sl.active && sl.showTimer > 0) {
            s.slots[i] = { ...sl, showTimer: sl.showTimer - 1 }; changed = true
            if (s.slots[i].showTimer <= 0) {
              // missed — bomb is good, normal/golden = escaped
              if (sl.type !== 'bomb') {
                s.combo = 0; setCombo(0)
                s.slots[i] = { ...s.slots[i], active: false, missAnim: 20 }
              } else {
                s.slots[i] = { ...s.slots[i], active: false }
              }
              changed = true
            }
          }
        }
        if (changed) setSlots([...s.slots])
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(rafRef.current); stopTimers() }
  }, [stopTimers])

  const handleWhack = useCallback((idx: number, e: React.PointerEvent) => {
    const s = stateRef.current
    if (s.gameState !== 'playing') return
    const sl = s.slots[idx]
    const rect = (e.target as HTMLElement).closest('[data-hole]')?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : e.clientX
    const cy = rect ? rect.top + rect.height / 2 : e.clientY

    if (sl.active && sl.hitAnim === 0) {
      // Hit a mole
      if (sl.type === 'bomb') {
        // hit bomb = lose life
        s.lives = Math.max(0, s.lives - 1)
        setLives(s.lives)
        s.combo = 0; setCombo(0)
        s.slots[idx] = { ...sl, active: false, hitAnim: 18 }
        playError()
        addFloat(cx, cy, '-1 💀', '#FF4444')
        if (s.lives <= 0) endGame()
      } else {
        const pts = sl.type === 'golden' ? 3 : 1
        s.combo += 1; setCombo(s.combo)
        const comboBonus = s.combo >= 3 ? 1 : 0
        const total = pts + comboBonus
        s.score += total; setScore(s.score)
        s.slots[idx] = { ...sl, active: false, hitAnim: 18 }
        playPop()
        const label = sl.type === 'golden' ? `+${total} ⭐` : s.combo >= 3 ? `+${total} 🔥${s.combo}콤보!` : `+${total}`
        addFloat(cx, cy, label, sl.type === 'golden' ? '#FFD700' : '#4DFB72')
      }
      setSlots([...s.slots])
    } else if (!sl.active) {
      // Hit empty hole
      s.combo = 0; setCombo(0)
      addFloat(cx, cy, 'Miss!', '#AAA')
      playError()
    }
  }, [endGame])

  function addFloat(x: number, y: number, text: string, color: string) {
    const id = stateRef.current.floatId++
    setFloatingTexts(prev => [...prev, { id, x, y, text, color }])
    setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 900)
  }

  const moleColors: Record<MoleSlot['type'], string> = {
    normal: '#8B6B4A',
    golden: '#FFD700',
    bomb:   '#CC3333',
  }

  return (
    <Layout title="두더지 잡기" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 24px', position: 'relative' }}>

        {/* Floating texts */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }}>
          {floatingTexts.map(ft => (
            <div
              key={ft.id}
              style={{
                position: 'fixed',
                left: ft.x, top: ft.y,
                transform: 'translate(-50%, -50%)',
                color: ft.color,
                fontWeight: 900,
                fontSize: 20,
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                animation: 'floatUp 0.9s ease-out forwards',
                pointerEvents: 'none',
              }}
            >
              {ft.text}
            </div>
          ))}
        </div>

        <style>{`
          @keyframes floatUp { from { opacity:1; transform:translate(-50%,-50%); } to { opacity:0; transform:translate(-50%,-120%); } }
          @keyframes moleIn { from { transform:translateY(100%) scaleY(0.3); } to { transform:translateY(0) scaleY(1); } }
          @keyframes moleOut { from { transform:translateY(0); } to { transform:translateY(80%) scaleY(0.4); } }
          @keyframes hitPop { 0%{transform:scale(1.3) translateY(-20%)} 50%{transform:scale(0.8)} 100%{transform:scale(0) translateY(30%)} }
          @keyframes shakeMiss { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
          @keyframes bombSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes goldenPulse { 0%,100%{box-shadow:0 0 8px #FFD700} 50%{box-shadow:0 0 24px #FFD700, 0 0 40px #FFA500} }
          @keyframes urgentBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        `}</style>

        {/* HUD */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontWeight: 800, fontSize: 16, color: '#333', alignItems: 'center' }}>
          <span>{'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, 3 - lives))}</span>
          <span style={{ color: '#8B5E3C' }}>점수: {score}</span>
          {combo >= 3 && (
            <span style={{ color: '#FF6600', fontSize: 14, animation: 'urgentBlink 0.5s infinite' }}>🔥 {combo}콤보!</span>
          )}
        </div>

        {/* Timer bar */}
        <div style={{ width: 300, height: 14, background: '#EEE', borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{
            width: `${(timeLeft / GAME_DURATION) * 100}%`,
            height: '100%',
            background: timeLeft > 10 ? '#4D72FB' : '#FF4444',
            borderRadius: 8,
            transition: 'width 0.9s linear',
            animation: timeLeft <= 5 ? 'urgentBlink 0.5s infinite' : 'none',
          }} />
        </div>
        <div style={{ fontWeight: 700, color: timeLeft <= 5 ? '#FF4444' : '#555', fontSize: 14, marginBottom: 16 }}>
          ⏱ {timeLeft}초
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gap: 14,
          padding: '20px 24px 28px',
          background: '#8B7355',
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          position: 'relative',
        }}>
          {/* Grass decoration */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 28,
            background: '#5A9E3A', borderRadius: '0 0 20px 20px',
          }} />

          {slots.map((sl, i) => (
            <div
              key={i}
              data-hole="true"
              onPointerDown={(e) => handleWhack(i, e)}
              style={{
                width: 86, height: 86,
                borderRadius: '50%',
                background: '#3D2810',
                boxShadow: 'inset 0 6px 16px rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                touchAction: 'none',
                userSelect: 'none',
              }}
            >
              {/* Mole */}
              {(sl.active || sl.hitAnim > 0 || sl.missAnim > 0) && (
                <div style={{
                  position: 'absolute',
                  bottom: sl.hitAnim > 0 ? '-20%' : sl.missAnim > 0 ? '20%' : '5%',
                  width: 64, height: 64,
                  animation: sl.hitAnim > 0 ? 'hitPop 0.3s ease-out forwards' :
                             sl.missAnim > 0 ? 'moleOut 0.3s ease-in forwards' :
                             'moleIn 0.2s ease-out forwards',
                  transition: 'bottom 0.15s',
                }}>
                  {/* Mole SVG inline */}
                  <svg viewBox="0 0 64 64" width="64" height="64">
                    {/* body */}
                    <ellipse cx="32" cy="48" rx="22" ry="18"
                      fill={sl.type === 'bomb' ? '#CC3333' : sl.type === 'golden' ? '#FFD700' : '#8B6B4A'}/>
                    {/* belly */}
                    {sl.type !== 'bomb' && (
                      <ellipse cx="32" cy="50" rx="13" ry="12" fill={sl.type === 'golden' ? '#FFF0A0' : '#D4A882'}/>
                    )}
                    {/* head */}
                    <ellipse cx="32" cy="28" rx="20" ry="18"
                      fill={sl.type === 'bomb' ? '#CC3333' : sl.type === 'golden' ? '#FFD700' : '#8B6B4A'}/>
                    {sl.type === 'bomb' ? (
                      <>
                        {/* bomb face */}
                        <text x="32" y="34" textAnchor="middle" fontSize="18">💣</text>
                        <text x="32" y="20" textAnchor="middle" fontSize="10" fill="#FF0">💥</text>
                      </>
                    ) : sl.type === 'golden' ? (
                      <>
                        {/* golden star mole */}
                        <ellipse cx="24" cy="24" rx="5" ry="5.5" fill="white"/>
                        <ellipse cx="40" cy="24" rx="5" ry="5.5" fill="white"/>
                        <circle cx="24.5" cy="25" r="3.2" fill="#1A1A1A"/>
                        <circle cx="40.5" cy="25" r="3.2" fill="#1A1A1A"/>
                        <circle cx="23" cy="23.5" r="1.1" fill="white"/>
                        <circle cx="39" cy="23.5" r="1.1" fill="white"/>
                        <ellipse cx="32" cy="34" rx="6" ry="4" fill="#E8C000"/>
                        <text x="32" y="10" textAnchor="middle" fontSize="10">⭐</text>
                      </>
                    ) : (
                      <>
                        {/* normal mole */}
                        <ellipse cx="32" cy="35" rx="9" ry="7" fill="#D4A882"/>
                        <ellipse cx="32" cy="32" rx="5" ry="4" fill="#FF8080"/>
                        <ellipse cx="24" cy="24" rx="5" ry="5.5" fill="white"/>
                        <ellipse cx="40" cy="24" rx="5" ry="5.5" fill="white"/>
                        <circle cx="24.5" cy="25" r="3.2" fill="#1A1A1A"/>
                        <circle cx="40.5" cy="25" r="3.2" fill="#1A1A1A"/>
                        <circle cx="23" cy="23.5" r="1.1" fill="white"/>
                        <circle cx="39" cy="23.5" r="1.1" fill="white"/>
                        <path d="M28 38 Q32 42 36 38" stroke="#555" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                      </>
                    )}
                  </svg>
                </div>
              )}

              {/* Hit effect star */}
              {sl.hitAnim > 10 && (
                <div style={{
                  position: 'absolute', top: '10%', left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 22, animation: 'hitPop 0.3s ease-out',
                }}>
                  {sl.type === 'golden' ? '⭐' : sl.type === 'bomb' ? '💥' : '✨'}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginTop: 16, fontSize: 12, color: '#666' }}>
          <span>🟫 두더지 +1점</span>
          <span style={{ color: '#CC8800' }}>⭐ 황금 +3점</span>
          <span style={{ color: '#CC3333' }}>💣 폭탄 -❤️</span>
        </div>

        {/* Overlays */}
        {gameState === 'idle' && (
          <div style={{ marginTop: 20 }}>
            <Button onClick={startGame}>게임 시작!</Button>
          </div>
        )}

        {gameState === 'countdown' && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 500,
          }}>
            <div style={{ fontSize: 100, fontWeight: 900, color: '#FFD700', textShadow: '0 4px 24px #000', animation: 'pop 0.4s cubic-bezier(.34,1.56,.64,1)' }}>
              {countdown > 0 ? countdown : 'GO!'}
            </div>
          </div>
        )}

        {gameState === 'over' && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#8B5E3C', marginBottom: 6 }}>
              {score >= 40 ? '🏆 대단해요!' : score >= 20 ? '🎉 잘했어요!' : '👏 수고했어요!'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#555', marginBottom: 14 }}>
              최종 점수: {score}점
            </div>
            <Button onClick={startGame}>다시 하기</Button>
          </div>
        )}
      </div>
    </Layout>
  )
}
