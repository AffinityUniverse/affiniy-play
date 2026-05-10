import { useEffect, useRef, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { playClick, playSuccess, playError, playPop } from '../utils/sounds'

interface Props { onBack: () => void }

interface Question {
  question: string
  choices: string[]
  answer: number // index of correct choice
}

const QUESTIONS: Question[] = [
  { question: '저장하려면?',           choices: ['Ctrl+S', 'Ctrl+C', 'Ctrl+Z', 'Ctrl+V'],   answer: 0 },
  { question: '복사하려면?',           choices: ['Ctrl+X', 'Ctrl+V', 'Ctrl+C', 'Ctrl+A'],   answer: 2 },
  { question: '붙여넣기?',             choices: ['Ctrl+C', 'Ctrl+V', 'Ctrl+Z', 'Ctrl+S'],   answer: 1 },
  { question: '실행 취소?',            choices: ['Ctrl+Y', 'Ctrl+R', 'Ctrl+Z', 'Ctrl+X'],   answer: 2 },
  { question: '전체 선택?',            choices: ['Ctrl+F', 'Ctrl+A', 'Ctrl+D', 'Ctrl+H'],   answer: 1 },
  { question: '찾기?',                 choices: ['Ctrl+G', 'Ctrl+H', 'Ctrl+F', 'Ctrl+L'],   answer: 2 },
  { question: '잘라내기?',             choices: ['Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+D'],   answer: 0 },
  { question: '다시 실행(Redo)?',      choices: ['Ctrl+Z', 'Ctrl+Y', 'Ctrl+R', 'Ctrl+U'],   answer: 1 },
  { question: '새 탭 열기?',           choices: ['Ctrl+W', 'Ctrl+N', 'Ctrl+T', 'Ctrl+O'],   answer: 2 },
  { question: '탭 닫기?',              choices: ['Ctrl+T', 'Ctrl+Q', 'Ctrl+X', 'Ctrl+W'],   answer: 3 },
  { question: '인쇄?',                 choices: ['Ctrl+I', 'Ctrl+P', 'Ctrl+L', 'Ctrl+K'],   answer: 1 },
  { question: '굵게(Bold)?',           choices: ['Ctrl+I', 'Ctrl+U', 'Ctrl+B', 'Ctrl+G'],   answer: 2 },
  { question: '기울임(Italic)?',       choices: ['Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+E'],   answer: 1 },
  { question: '밑줄(Underline)?',      choices: ['Ctrl+U', 'Ctrl+I', 'Ctrl+B', 'Ctrl+L'],   answer: 0 },
  { question: '화면 새로고침?',        choices: ['F1', 'F3', 'F5', 'F12'],                   answer: 2 },
  { question: '개발자 도구 열기?',     choices: ['F5', 'F10', 'F11', 'F12'],                 answer: 3 },
  { question: '전체화면?',             choices: ['F9', 'F10', 'F11', 'F12'],                 answer: 2 },
  { question: '새 창 열기?',           choices: ['Ctrl+T', 'Ctrl+N', 'Ctrl+O', 'Ctrl+W'],   answer: 1 },
]

type GameState = 'idle' | 'playing' | 'won' | 'lost'

const CANVAS_W = 340
const CANVAS_H = 520
const SUB_W = 56
const SUB_H = 28
const WALL_SPEED = 2.8
const GAP_H = 90       // gap height per choice lane
const TOTAL_LANES = 4
const WALL_X_SPAWN = CANVAS_W + 40
const WALL_THICK = 40

// Lane y positions (center of each gap)
function laneY(lane: number) {
  const topOffset = 60
  return topOffset + lane * GAP_H + GAP_H / 2
}

interface Wall {
  x: number
  qIdx: number
  passed: boolean
  flashAnswer: number  // highlight correct lane after pass
}

interface Bubble { x: number; y: number; r: number; speed: number; alpha: number }

export default function ShortcutQuizGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef({
    state: 'idle' as GameState,
    subY: CANVAS_H / 2,
    targetY: CANVAS_H / 2,
    walls: [] as Wall[],
    score: 0,
    lives: 3,
    frameCount: 0,
    rafId: 0,
    bubbles: [] as Bubble[],
    qOrder: [] as number[],
    qPointer: 0,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
    flashTimer: 0,
    flashLane: -1,
    flashCorrect: false,
  })
  const [uiState, setUiState] = useState<GameState>('idle')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [currentQ, setCurrentQ] = useState<Question | null>(null)

  const shuffleQuestions = useCallback(() => {
    const order = Array.from({ length: QUESTIONS.length }, (_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]]
    }
    return order
  }, [])

  const initGame = useCallback(() => {
    const g = gameRef.current
    g.state = 'playing'
    g.subY = CANVAS_H / 2
    g.targetY = CANVAS_H / 2
    g.walls = []
    g.score = 0
    g.lives = 3
    g.frameCount = 0
    g.particles = []
    g.flashTimer = 0
    g.flashLane = -1
    g.qOrder = shuffleQuestions()
    g.qPointer = 0
    // make initial bubbles
    g.bubbles = Array.from({ length: 12 }, () => ({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      r: 3 + Math.random() * 5,
      speed: 0.3 + Math.random() * 0.6,
      alpha: 0.15 + Math.random() * 0.2,
    }))
    setScore(0); setLives(3); setUiState('playing')
    setCurrentQ(QUESTIONS[g.qOrder[0]])
  }, [shuffleQuestions])

  const moveSub = useCallback((lane: number) => {
    const g = gameRef.current
    if (g.state !== 'playing') return
    g.targetY = laneY(lane)
    playMove_local()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H

    const g = gameRef.current

    function spawnWall() {
      const qIdx = g.qOrder[g.qPointer % g.qOrder.length]
      g.walls.push({ x: WALL_X_SPAWN, qIdx, passed: false, flashAnswer: -1 })
      setCurrentQ(QUESTIONS[qIdx])
      g.qPointer++
    }

    function spawnParticles(x: number, y: number, ok: boolean) {
      const colors = ok ? ['#FFD700', '#FF6', '#FFF', '#4DFB72'] : ['#FF4444', '#FF8888', '#FFF']
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2
        const spd = 2 + Math.random() * 4
        g.particles.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 30 + Math.random() * 20, color: colors[i % colors.length] })
      }
    }

    function draw(ctx: CanvasRenderingContext2D) {
      const cw = CANVAS_W, ch = CANVAS_H
      g.frameCount++

      // Background: underwater
      const bg = ctx.createLinearGradient(0, 0, 0, ch)
      bg.addColorStop(0, '#0A3D6B')
      bg.addColorStop(1, '#0A1A3E')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch)

      // Bubbles
      for (const b of g.bubbles) {
        ctx.globalAlpha = b.alpha
        ctx.strokeStyle = '#8BBFFF'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke()
        b.y -= b.speed
        if (b.y < -b.r) { b.y = ch + b.r; b.x = Math.random() * cw }
      }
      ctx.globalAlpha = 1

      if (g.state === 'idle') {
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 22px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('클릭/터치하여 시작', cw / 2, ch / 2 - 10)
        ctx.font = '14px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillText('↑↓ 또는 1234 키로 잠수함 조종', cw / 2, ch / 2 + 20)
        return
      }

      if (g.state === 'playing') {
        // Smooth sub movement
        g.subY += (g.targetY - g.subY) * 0.14

        // Spawn walls periodically
        if (g.frameCount % 180 === 0 || (g.walls.length === 0 && g.frameCount > 60)) {
          spawnWall()
        }

        // Move walls
        for (const wall of g.walls) {
          wall.x -= WALL_SPEED
        }

        // Check collisions + passage
        const subLeft = 60
        const subRight = 60 + SUB_W
        const subTop = g.subY - SUB_H / 2
        const subBottom = g.subY + SUB_H / 2

        for (const wall of g.walls) {
          if (wall.passed) continue
          const wallLeft = wall.x - WALL_THICK / 2
          const wallRight = wall.x + WALL_THICK / 2

          if (subRight < wallLeft || subLeft > wallRight) continue
          // horizontal overlap — check lane
          const q = QUESTIONS[wall.qIdx]
          let inGap = false
          let hitLane = -1
          for (let lane = 0; lane < TOTAL_LANES; lane++) {
            const gy = laneY(lane)
            const gTop = gy - GAP_H / 2 + 4
            const gBot = gy + GAP_H / 2 - 4
            if (subTop >= gTop && subBottom <= gBot) { inGap = true; hitLane = lane; break }
          }

          if (inGap) {
            // passed — check if correct lane
            wall.passed = true
            const correct = hitLane === q.answer
            g.flashLane = hitLane
            g.flashTimer = 45
            g.flashCorrect = correct
            spawnParticles(wall.x, g.subY, correct)
            if (correct) {
              g.score += 10; setScore(g.score)
              playSuccess()
            } else {
              g.lives -= 1; setLives(g.lives)
              playError()
              if (g.lives <= 0) { g.state = 'lost'; setUiState('lost') }
            }
          } else if (subRight > wallLeft && subLeft < wallRight) {
            // hit a wall segment
            wall.passed = true
            g.flashLane = -1
            g.flashTimer = 30
            g.flashCorrect = false
            g.lives -= 1; setLives(g.lives)
            playError()
            if (g.lives <= 0) { g.state = 'lost'; setUiState('lost') }
          }
        }
        g.walls = g.walls.filter(w => w.x > -WALL_THICK)

        // Win condition
        if (g.score >= 100) { g.state = 'won'; setUiState('won'); playSuccess() }
      }

      // Draw walls
      for (const wall of g.walls) {
        const q = QUESTIONS[wall.qIdx]
        const wx = wall.x - WALL_THICK / 2

        for (let lane = 0; lane < TOTAL_LANES; lane++) {
          const gy = laneY(lane)
          const prevLaneBot = lane === 0 ? 0 : laneY(lane - 1) + GAP_H / 2
          const segTop = prevLaneBot
          const segBot = gy - GAP_H / 2

          // wall segment above this lane
          if (segBot > segTop) {
            const wg = ctx.createLinearGradient(wx, 0, wx + WALL_THICK, 0)
            wg.addColorStop(0, '#1A5FCC')
            wg.addColorStop(0.5, '#2A7FEE')
            wg.addColorStop(1, '#1A5FCC')
            ctx.fillStyle = wg
            ctx.fillRect(wx, segTop, WALL_THICK, segBot - segTop)
          }

          // gap label
          const isCorrect = lane === q.answer
          const isFlash = g.flashTimer > 0 && g.flashLane === lane
          const labelBg = isCorrect ? (g.flashTimer > 0 ? '#FFD700' : 'rgba(255,215,0,0.2)') : 'rgba(255,255,255,0.12)'
          ctx.fillStyle = labelBg
          ctx.beginPath()
          ctx.roundRect(wx - 6, gy - GAP_H / 2 + 4, WALL_THICK + 12, GAP_H - 8, 8)
          ctx.fill()

          // border for gap
          ctx.strokeStyle = isFlash
            ? (g.flashCorrect ? '#FFD700' : '#FF4444')
            : isCorrect ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.25)'
          ctx.lineWidth = isFlash ? 3 : 1.5
          ctx.stroke()

          // choice text
          ctx.fillStyle = isCorrect ? '#FFD700' : 'rgba(255,255,255,0.9)'
          ctx.font = `bold ${isCorrect ? 13 : 12}px monospace`
          ctx.textAlign = 'center'
          ctx.fillText(q.choices[lane], wall.x, gy + 5)
        }

        // wall below last lane
        const lastBot = laneY(TOTAL_LANES - 1) + GAP_H / 2
        if (lastBot < CANVAS_H) {
          const wg = ctx.createLinearGradient(wx, 0, wx + WALL_THICK, 0)
          wg.addColorStop(0, '#1A5FCC'); wg.addColorStop(0.5, '#2A7FEE'); wg.addColorStop(1, '#1A5FCC')
          ctx.fillStyle = wg
          ctx.fillRect(wx, lastBot, WALL_THICK, CANVAS_H - lastBot)
        }
        // top wall
        const firstTop = laneY(0) - GAP_H / 2
        if (firstTop > 0) {
          const wg = ctx.createLinearGradient(wx, 0, wx + WALL_THICK, 0)
          wg.addColorStop(0, '#1A5FCC'); wg.addColorStop(0.5, '#2A7FEE'); wg.addColorStop(1, '#1A5FCC')
          ctx.fillStyle = wg
          ctx.fillRect(wx, 0, WALL_THICK, firstTop)
        }
      }

      // Lane guide lines (subtle)
      for (let lane = 0; lane < TOTAL_LANES; lane++) {
        const gy = laneY(lane)
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'
        ctx.lineWidth = GAP_H - 8
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(60, gy); ctx.stroke()
      }

      // Particles
      g.particles = g.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 1
        ctx.globalAlpha = p.life / 50
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6)
        return p.life > 0
      })
      ctx.globalAlpha = 1

      // Submarine
      const sx = 60, sy = g.subY
      ctx.save()
      ctx.translate(sx + SUB_W / 2, sy)
      // body
      const subGrad = ctx.createLinearGradient(-SUB_W / 2, -SUB_H / 2, SUB_W / 2, SUB_H / 2)
      subGrad.addColorStop(0, '#FFD700')
      subGrad.addColorStop(1, '#FFA500')
      ctx.fillStyle = subGrad
      ctx.beginPath()
      ctx.ellipse(0, 0, SUB_W / 2, SUB_H / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#CC8800'; ctx.lineWidth = 2; ctx.stroke()
      // conning tower
      ctx.fillStyle = '#FFC200'
      ctx.beginPath()
      ctx.roundRect(-6, -SUB_H / 2 - 10, 12, 12, 3)
      ctx.fill()
      ctx.strokeStyle = '#CC8800'; ctx.lineWidth = 1.5; ctx.stroke()
      // periscope
      ctx.strokeStyle = '#CC8800'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(0, -SUB_H / 2 - 10); ctx.lineTo(0, -SUB_H / 2 - 18); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, -SUB_H / 2 - 18); ctx.lineTo(8, -SUB_H / 2 - 18); ctx.stroke()
      // porthole
      ctx.fillStyle = '#A0DFFF'
      ctx.beginPath(); ctx.arc(8, 0, 7, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#CC8800'; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath(); ctx.arc(6, -2, 3, 0, Math.PI * 2); ctx.fill()
      // propeller
      ctx.fillStyle = '#CC8800'
      ctx.beginPath(); ctx.ellipse(-SUB_W / 2 - 2, -8, 4, 9, 0.3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(-SUB_W / 2 - 2, 8, 4, 9, -0.3, 0, Math.PI * 2); ctx.fill()
      // bubble trail
      for (let i = 0; i < 3; i++) {
        const bx = -SUB_W / 2 - 8 - i * 10 + Math.sin(g.frameCount * 0.15 + i) * 4
        const by = (Math.sin(g.frameCount * 0.1 + i * 1.3)) * 5
        ctx.globalAlpha = 0.4 - i * 0.12
        ctx.strokeStyle = '#A0DFFF'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(bx, by, 3 + i, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.restore()

      // Flash timer
      if (g.flashTimer > 0) g.flashTimer--

      // End screens
      if (g.state === 'won' || g.state === 'lost') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(0, 0, cw, ch)
        ctx.fillStyle = g.state === 'won' ? '#FFD700' : '#FF6666'
        ctx.font = 'bold 30px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(g.state === 'won' ? '🎉 클리어!' : '💦 게임 오버', cw / 2, ch / 2 - 20)
        ctx.fillStyle = '#FFF'
        ctx.font = 'bold 20px sans-serif'
        ctx.fillText(`점수: ${g.score}점`, cw / 2, ch / 2 + 16)
      }
    }

    function loop() {
      const ctx = canvas!.getContext('2d')
      if (ctx) draw(ctx)
      g.rafId = requestAnimationFrame(loop)
    }
    g.rafId = requestAnimationFrame(loop)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (g.state !== 'playing') return
      if (e.key === 'ArrowUp')    { moveSub_local(Math.max(0, getCurrentLane() - 1)); e.preventDefault() }
      if (e.key === 'ArrowDown')  { moveSub_local(Math.min(3, getCurrentLane() + 1)); e.preventDefault() }
      if (e.key === '1') moveSub_local(0)
      if (e.key === '2') moveSub_local(1)
      if (e.key === '3') moveSub_local(2)
      if (e.key === '4') moveSub_local(3)
    }

    function getCurrentLane() {
      let closest = 0, minDist = Infinity
      for (let i = 0; i < TOTAL_LANES; i++) {
        const d = Math.abs(g.targetY - laneY(i))
        if (d < minDist) { minDist = d; closest = i }
      }
      return closest
    }

    function moveSub_local(lane: number) {
      g.targetY = laneY(lane)
      playClick()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(g.rafId)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [moveSub])

  function handleLaneClick(lane: number) {
    const g = gameRef.current
    if (g.state === 'idle') { initGame(); return }
    if (g.state !== 'playing') return
    g.targetY = laneY(lane)
    playClick()
  }

  function handleCanvasClick() {
    if (gameRef.current.state === 'idle') initGame()
  }

  return (
    <Layout title="단축키 퀴즈" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 24px' }}>
        {/* HUD */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 10, fontWeight: 800, fontSize: 15, color: '#333' }}>
          <span>{'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, 3 - lives))}</span>
          <span style={{ color: '#0066CC' }}>점수: {score}점</span>
        </div>

        {/* Current question */}
        {uiState === 'playing' && currentQ && (
          <div style={{
            background: '#0A3D6B', color: '#FFD700',
            borderRadius: 12, padding: '8px 20px',
            marginBottom: 10, fontWeight: 800, fontSize: 16,
            textAlign: 'center', letterSpacing: '-0.3px',
          }}>
            {currentQ.question}
          </div>
        )}

        {/* Canvas */}
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(10,61,107,0.5)' }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ display: 'block', touchAction: 'none' }}
          />
        </div>

        {/* Lane buttons (for touch) */}
        {uiState === 'playing' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {['1번', '2번', '3번', '4번'].map((label, i) => (
              <button
                key={i}
                onPointerDown={() => handleLaneClick(i)}
                style={{
                  padding: '10px 18px',
                  background: '#0A3D6B',
                  color: '#FFD700',
                  border: '2px solid #2A7FEE',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {(uiState === 'won' || uiState === 'lost') && (
          <div style={{ marginTop: 16 }}>
            <Button onClick={initGame}>다시 하기</Button>
          </div>
        )}

        <div style={{ marginTop: 12, color: '#888', fontSize: 12, textAlign: 'center' }}>
          ↑↓ 키 또는 1~4 키로 선택 | 버튼으로도 조종 가능
        </div>
      </div>
    </Layout>
  )
}

function playMove_local() {
  try {
    const c = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = c.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(440, c.currentTime)
    o.frequency.linearRampToValueAtTime(660, c.currentTime + 0.06)
    const g = c.createGain()
    g.gain.setValueAtTime(0.1, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.09)
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.09)
    setTimeout(() => c.close(), 200)
  } catch (_) {}
}
