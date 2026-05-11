import { useEffect, useRef, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { playClick, playSuccess, playError } from '../utils/sounds'

interface Props { onBack: () => void }

interface Question {
  question: string
  choices: string[]
  answer: number
}

const QUESTIONS: Question[] = [
  { question: '저장하려면?',        choices: ['Ctrl+S', 'Ctrl+C', 'Ctrl+Z', 'Ctrl+V'],  answer: 0 },
  { question: '복사하려면?',        choices: ['Ctrl+X', 'Ctrl+V', 'Ctrl+C', 'Ctrl+A'],  answer: 2 },
  { question: '붙여넣기?',          choices: ['Ctrl+C', 'Ctrl+V', 'Ctrl+Z', 'Ctrl+S'],  answer: 1 },
  { question: '실행 취소?',         choices: ['Ctrl+Y', 'Ctrl+R', 'Ctrl+Z', 'Ctrl+X'],  answer: 2 },
  { question: '전체 선택?',         choices: ['Ctrl+F', 'Ctrl+A', 'Ctrl+D', 'Ctrl+H'],  answer: 1 },
  { question: '찾기?',              choices: ['Ctrl+G', 'Ctrl+H', 'Ctrl+F', 'Ctrl+L'],  answer: 2 },
  { question: '잘라내기?',          choices: ['Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+D'],  answer: 0 },
  { question: '다시 실행(Redo)?',   choices: ['Ctrl+Z', 'Ctrl+Y', 'Ctrl+R', 'Ctrl+U'],  answer: 1 },
  { question: '새 탭 열기?',        choices: ['Ctrl+W', 'Ctrl+N', 'Ctrl+T', 'Ctrl+O'],  answer: 2 },
  { question: '탭 닫기?',           choices: ['Ctrl+T', 'Ctrl+Q', 'Ctrl+X', 'Ctrl+W'],  answer: 3 },
  { question: '인쇄?',              choices: ['Ctrl+I', 'Ctrl+P', 'Ctrl+L', 'Ctrl+K'],  answer: 1 },
  { question: '굵게(Bold)?',        choices: ['Ctrl+I', 'Ctrl+U', 'Ctrl+B', 'Ctrl+G'],  answer: 2 },
  { question: '기울임(Italic)?',    choices: ['Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+E'],  answer: 1 },
  { question: '밑줄(Underline)?',   choices: ['Ctrl+U', 'Ctrl+I', 'Ctrl+B', 'Ctrl+L'],  answer: 0 },
  { question: '화면 새로고침?',     choices: ['F1',     'F3',     'F5',     'F12'],       answer: 2 },
  { question: '개발자 도구 열기?',  choices: ['F5',     'F10',    'F11',    'F12'],       answer: 3 },
  { question: '전체화면?',          choices: ['F9',     'F10',    'F11',    'F12'],       answer: 2 },
  { question: '새 창 열기?',        choices: ['Ctrl+T', 'Ctrl+N', 'Ctrl+O', 'Ctrl+W'],  answer: 1 },
]

type GameState = 'idle' | 'playing' | 'won' | 'lost'

const TOTAL_LANES = 4
const WALL_THICK  = 68
const SUB_W = 72
const SUB_H = 36
const WALL_SPEED  = 2.6

// Lane colors — pastel
const LANE_COLORS = ['#FF8C42', '#4D72FB', '#27AE60', '#E8731A']
const LANE_LIGHT  = ['#FFE9D5', '#D5E8FF', '#D5F5E3', '#FFF0D5']

function getSize() {
  const w = Math.min(500, window.innerWidth - 16)
  const h = Math.round(w * 1.18)
  return { w, h }
}

function laneY(lane: number, ch: number) {
  const topOff  = ch * 0.08
  const usableH = ch * 0.84
  const gapH    = usableH / TOTAL_LANES
  return topOff + lane * gapH + gapH / 2
}

function laneGapH(ch: number) {
  return (ch * 0.84) / TOTAL_LANES
}

interface WallObj { x: number; qIdx: number; passed: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
interface Bubble { x: number; y: number; r: number; speed: number; alpha: number }

// Draw cute submarine
function drawSub(ctx: CanvasRenderingContext2D, x: number, y: number, frameCount: number) {
  ctx.save()
  ctx.translate(x, y)

  // --- body shadow ---
  ctx.fillStyle = 'rgba(0,80,160,0.18)'
  ctx.beginPath()
  ctx.ellipse(4, 6, SUB_W/2, SUB_H/2, 0, 0, Math.PI*2)
  ctx.fill()

  // --- propeller blades ---
  const propPhase = frameCount * 0.18
  ctx.fillStyle = '#E8C000'
  for (let i = 0; i < 3; i++) {
    const a = propPhase + (i * Math.PI * 2) / 3
    ctx.save()
    ctx.translate(-SUB_W/2 - 6, 0)
    ctx.rotate(a)
    ctx.beginPath()
    ctx.ellipse(0, 0, 4, 13, 0, 0, Math.PI*2)
    ctx.fill()
    ctx.restore()
  }
  ctx.strokeStyle = '#CC9900'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(-SUB_W/2 - 6, 0, 5, 0, Math.PI*2); ctx.stroke()

  // --- main body ---
  const bodyGrad = ctx.createLinearGradient(-SUB_W/2, -SUB_H/2, SUB_W/2, SUB_H/2)
  bodyGrad.addColorStop(0, '#FFEE88')
  bodyGrad.addColorStop(0.5, '#FFD700')
  bodyGrad.addColorStop(1, '#E8B800')
  ctx.fillStyle = bodyGrad
  ctx.beginPath()
  ctx.ellipse(0, 0, SUB_W/2, SUB_H/2, 0, 0, Math.PI*2)
  ctx.fill()
  ctx.strokeStyle = '#CC9900'; ctx.lineWidth = 2.5; ctx.stroke()

  // --- conning tower ---
  ctx.fillStyle = '#FFD700'
  ctx.beginPath()
  ctx.roundRect(-10, -SUB_H/2 - 14, 20, 16, 4)
  ctx.fill()
  ctx.strokeStyle = '#CC9900'; ctx.lineWidth = 2; ctx.stroke()

  // --- periscope ---
  ctx.strokeStyle = '#CC9900'; ctx.lineWidth = 3; ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(2, -SUB_H/2 - 14)
  ctx.lineTo(2, -SUB_H/2 - 26)
  ctx.lineTo(14, -SUB_H/2 - 26)
  ctx.stroke()
  // periscope eye
  ctx.fillStyle = '#A0DFFF'
  ctx.beginPath(); ctx.arc(14, -SUB_H/2 - 26, 4, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = '#0077AA'; ctx.lineWidth = 1.5; ctx.stroke()

  // --- porthole ---
  ctx.fillStyle = '#A0DFFF'
  ctx.beginPath(); ctx.arc(14, 0, 10, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = '#CC9900'; ctx.lineWidth = 2.5; ctx.stroke()
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath(); ctx.arc(10, -4, 4, 0, Math.PI*2); ctx.fill()

  // --- cute face in porthole ---
  ctx.fillStyle = '#1A1A1A'
  ctx.beginPath(); ctx.arc(12, -1, 2, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(17, -1, 2, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(14, 0, 4, 0.1, Math.PI - 0.1)
  ctx.stroke()

  // --- stripe ---
  ctx.strokeStyle = '#E8B800'; ctx.lineWidth = 3; ctx.globalAlpha = 0.5
  ctx.beginPath(); ctx.moveTo(-SUB_W/2+12, -SUB_H/2+6); ctx.lineTo(-SUB_W/2+12, SUB_H/2-6); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(-SUB_W/2+20, -SUB_H/2+6); ctx.lineTo(-SUB_W/2+20, SUB_H/2-6); ctx.stroke()
  ctx.globalAlpha = 1

  // --- bubble trail ---
  for (let i = 0; i < 4; i++) {
    const bx = -SUB_W/2 - 14 - i*12 + Math.sin(frameCount*0.15 + i)*4
    const by = Math.sin(frameCount*0.1 + i*1.4)*5
    ctx.globalAlpha = 0.3 - i*0.06
    ctx.strokeStyle = '#A0DFFF'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(bx, by, 4+i, 0, Math.PI*2); ctx.stroke()
  }
  ctx.globalAlpha = 1

  ctx.restore()
}

export default function ShortcutQuizGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [uiState, setUiState] = useState<GameState>('idle')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [currentQ, setCurrentQ] = useState<Question | null>(null)
  const sizeRef = useRef(getSize())

  const gameRef = useRef({
    state: 'idle' as GameState,
    subY: 0, targetY: 0, currentLane: 0,
    walls: [] as WallObj[],
    score: 0, lives: 3, frameCount: 0, rafId: 0,
    bubbles: [] as Bubble[],
    qOrder: [] as number[], qPointer: 0,
    particles: [] as Particle[],
    flashTimer: 0, flashLane: -1, flashCorrect: false,
  })

  const shuffleQ = useCallback(() => {
    const order = Array.from({ length: QUESTIONS.length }, (_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]]
    }
    return order
  }, [])

  const initGame = useCallback(() => {
    const g = gameRef.current
    const { h } = sizeRef.current
    g.state = 'playing'
    g.currentLane = 0
    g.subY = laneY(0, h)
    g.targetY = laneY(0, h)
    g.walls = []; g.score = 0; g.lives = 3; g.frameCount = 0
    g.particles = []; g.flashTimer = 0; g.flashLane = -1
    g.qOrder = shuffleQ(); g.qPointer = 0
    g.bubbles = Array.from({ length: 18 }, () => ({
      x: Math.random() * sizeRef.current.w,
      y: Math.random() * h,
      r: 2 + Math.random() * 5,
      speed: 0.25 + Math.random() * 0.5,
      alpha: 0.08 + Math.random() * 0.15,
    }))
    setScore(0); setLives(3); setUiState('playing')
    setCurrentQ(QUESTIONS[g.qOrder[0]])
  }, [shuffleQ])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const { w, h } = sizeRef.current
    canvas.width = w; canvas.height = h
    const g = gameRef.current
    g.subY = laneY(0, h); g.targetY = laneY(0, h)

    function spawnWall() {
      const qIdx = g.qOrder[g.qPointer % g.qOrder.length]
      g.walls.push({ x: sizeRef.current.w + WALL_THICK, qIdx, passed: false })
      setCurrentQ(QUESTIONS[qIdx])
      g.qPointer++
    }

    function spawnParticles(x: number, y: number, ok: boolean) {
      const colors = ok
        ? ['#FFD700', '#FFF', '#4DFB72', '#FF6']
        : ['#FF4444', '#FF8888', '#FFF']
      for (let i = 0; i < 18; i++) {
        const ang = Math.random() * Math.PI * 2, spd = 2 + Math.random() * 5
        g.particles.push({
          x, y,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          life: 35 + Math.random() * 20,
          color: colors[i % colors.length],
        })
      }
    }

    function draw(ctx: CanvasRenderingContext2D) {
      const cw = canvas!.width, ch = canvas!.height
      g.frameCount++

      // ── 배경: 밝은 하늘색 바다 ──
      const bgGrad = ctx.createLinearGradient(0, 0, 0, ch)
      bgGrad.addColorStop(0, '#B8E4FF')
      bgGrad.addColorStop(0.45, '#7DC8F5')
      bgGrad.addColorStop(1, '#3EB5E8')
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, cw, ch)

      // 수면 물결
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2
      for (let wx = 0; wx < cw; wx += 40) {
        const wy = ch * 0.07 + Math.sin((wx + g.frameCount * 0.8) * 0.05) * 4
        ctx.beginPath(); ctx.arc(wx, wy, 12, Math.PI, 0); ctx.stroke()
      }

      // 레인 구분선 (반투명)
      const gapH = laneGapH(ch)
      const topOff = ch * 0.08
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5
      for (let lane = 1; lane < TOTAL_LANES; lane++) {
        const y = topOff + lane * gapH
        ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke()
      }
      ctx.setLineDash([])

      // 배경 버블
      for (const b of g.bubbles) {
        ctx.globalAlpha = b.alpha
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke()
        b.y -= b.speed
        if (b.y < -b.r) { b.y = ch + b.r; b.x = Math.random() * cw }
      }
      ctx.globalAlpha = 1

      // ── 대기 화면 ──
      if (g.state === 'idle') {
        ctx.fillStyle = 'rgba(0,80,160,0.45)'
        ctx.beginPath(); ctx.roundRect(cw/2-160, ch/2-56, 320, 112, 20); ctx.fill()
        ctx.fillStyle = '#FFF'; ctx.font = `bold ${Math.round(cw*0.055)}px sans-serif`; ctx.textAlign = 'center'
        ctx.fillText('탭 또는 클릭하여 시작!', cw/2, ch/2 - 8)
        ctx.font = `${Math.round(cw*0.032)}px sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillText('↑↓ 방향키로 잠수함 조종', cw/2, ch/2 + 26)
        drawSub(ctx, 80, ch/2, g.frameCount)
        return
      }

      // ── 게임 중 ──
      if (g.state === 'playing') {
        g.subY += (g.targetY - g.subY) * 0.14

        // 벽 스폰
        if (g.frameCount % 180 === 0 || (g.walls.length === 0 && g.frameCount > 40)) spawnWall()

        // 벽 이동
        for (const wall of g.walls) wall.x -= WALL_SPEED

        // 충돌 체크
        const subLeft = 80, subRight = 80 + SUB_W
        const subTop = g.subY - SUB_H/2, subBot = g.subY + SUB_H/2

        for (const wall of g.walls) {
          if (wall.passed) continue
          const wLeft = wall.x - WALL_THICK/2, wRight = wall.x + WALL_THICK/2
          if (subRight < wLeft || subLeft > wRight) continue

          const q = QUESTIONS[wall.qIdx]
          let inGap = false, hitLane = -1
          for (let lane = 0; lane < TOTAL_LANES; lane++) {
            const gy = laneY(lane, ch)
            if (subTop >= gy - gapH/2 + 6 && subBot <= gy + gapH/2 - 6) {
              inGap = true; hitLane = lane; break
            }
          }

          wall.passed = true
          g.flashLane = hitLane; g.flashTimer = 55
          if (inGap) {
            g.flashCorrect = hitLane === q.answer
            spawnParticles(wall.x, g.subY, g.flashCorrect)
            if (g.flashCorrect) {
              g.score += 10; setScore(g.score); playSuccess()
            } else {
              g.lives -= 1; setLives(g.lives); playError()
              if (g.lives <= 0) { g.state = 'lost'; setUiState('lost') }
            }
          } else {
            g.flashCorrect = false
            spawnParticles(wall.x, g.subY, false)
            g.lives -= 1; setLives(g.lives); playError()
            if (g.lives <= 0) { g.state = 'lost'; setUiState('lost') }
          }
        }
        g.walls = g.walls.filter(w => w.x > -WALL_THICK - 20)

        if (g.score >= 100) { g.state = 'won'; setUiState('won'); playSuccess() }
      }

      // ── 벽 그리기 ──
      for (const wall of g.walls) {
        const q = QUESTIONS[wall.qIdx]
        const wx = wall.x - WALL_THICK/2

        for (let lane = 0; lane < TOTAL_LANES; lane++) {
          const gy = laneY(lane, ch)
          const gTop = gy - gapH/2, gBot = gy + gapH/2

          // 레인 위쪽 벽 세그먼트
          const segTop = lane === 0 ? 0 : laneY(lane-1, ch) + gapH/2
          const segBot = gTop
          if (segBot > segTop) {
            ctx.fillStyle = LANE_COLORS[lane]
            ctx.fillRect(wx, segTop, WALL_THICK, segBot - segTop)
            ctx.fillStyle = 'rgba(255,255,255,0.15)'
            ctx.fillRect(wx, segTop, 5, segBot - segTop)
          }

          // 통로 배경
          const isCorrect = lane === q.answer
          const isFlash   = g.flashTimer > 0 && g.flashLane === lane
          ctx.fillStyle = isFlash
            ? (g.flashCorrect ? 'rgba(100,255,100,0.45)' : 'rgba(255,80,80,0.35)')
            : isCorrect ? `${LANE_COLORS[lane]}44` : LANE_LIGHT[lane] + 'BB'
          ctx.beginPath(); ctx.roundRect(wx - 4, gTop + 4, WALL_THICK + 8, gapH - 8, 10); ctx.fill()

          // 통로 테두리
          ctx.strokeStyle = isFlash
            ? (g.flashCorrect ? '#44FF44' : '#FF4444')
            : LANE_COLORS[lane]
          ctx.lineWidth = isFlash ? 3 : 2
          ctx.beginPath(); ctx.roundRect(wx - 4, gTop + 4, WALL_THICK + 8, gapH - 8, 10); ctx.stroke()

          // 번호 뱃지
          ctx.fillStyle = LANE_COLORS[lane]
          ctx.beginPath(); ctx.roundRect(wall.x - 12, gTop + 8, 24, 18, 9); ctx.fill()
          ctx.fillStyle = '#FFF'; ctx.font = `bold ${Math.round(WALL_THICK * 0.2)}px sans-serif`; ctx.textAlign = 'center'
          ctx.fillText(`${lane+1}`, wall.x, gTop + 21)

          // 단축키 텍스트 — 큰 글씨
          ctx.fillStyle = isCorrect ? LANE_COLORS[lane] : '#333'
          ctx.font = `bold ${Math.min(Math.round(WALL_THICK * 0.26), 18)}px monospace`
          ctx.textAlign = 'center'
          ctx.fillText(q.choices[lane], wall.x, gy + 6)
        }

        // 마지막 레인 아래 벽
        const lastBot = laneY(TOTAL_LANES-1, ch) + gapH/2
        if (lastBot < ch) {
          ctx.fillStyle = LANE_COLORS[TOTAL_LANES-1]
          ctx.fillRect(wx, lastBot, WALL_THICK, ch - lastBot)
          ctx.fillStyle = 'rgba(255,255,255,0.15)'
          ctx.fillRect(wx, lastBot, 5, ch - lastBot)
        }

        // 맨 위 벽
        const firstTop = laneY(0, ch) - gapH/2
        if (firstTop > 0) {
          ctx.fillStyle = LANE_COLORS[0]
          ctx.fillRect(wx, 0, WALL_THICK, firstTop)
          ctx.fillStyle = 'rgba(255,255,255,0.15)'
          ctx.fillRect(wx, 0, 5, firstTop)
        }
      }

      // 파티클
      g.particles = g.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 1
        ctx.globalAlpha = p.life / 55
        ctx.fillStyle = p.color; ctx.fillRect(p.x - 3, p.y - 3, 6, 6)
        return p.life > 0
      })
      ctx.globalAlpha = 1

      // 잠수함
      drawSub(ctx, 80 + SUB_W/2, g.subY, g.frameCount)

      // 플래시 타이머
      if (g.flashTimer > 0) g.flashTimer--

      // 종료 오버레이
      if (g.state === 'won' || g.state === 'lost') {
        ctx.fillStyle = 'rgba(0,40,100,0.65)'; ctx.fillRect(0, 0, cw, ch)
        ctx.fillStyle = g.state === 'won' ? '#FFD700' : '#FF8888'
        ctx.font = `bold ${Math.round(cw * 0.075)}px sans-serif`; ctx.textAlign = 'center'
        ctx.fillText(g.state === 'won' ? '🎉 클리어!' : '💦 게임 오버', cw/2, ch/2 - 24)
        ctx.fillStyle = '#FFF'; ctx.font = `bold ${Math.round(cw * 0.052)}px sans-serif`
        ctx.fillText(`점수: ${g.score}점`, cw/2, ch/2 + 22)
      }
    }

    function loop() {
      const ctx = canvas!.getContext('2d'); if (ctx) draw(ctx)
      g.rafId = requestAnimationFrame(loop)
    }
    g.rafId = requestAnimationFrame(loop)

    // ── 키보드 ──
    function moveUp() {
      if (g.state !== 'playing') return
      const next = Math.max(0, g.currentLane - 1)
      if (next !== g.currentLane) {
        g.currentLane = next
        g.targetY = laneY(next, canvas!.height)
        playClick()
      }
    }
    function moveDown() {
      if (g.state !== 'playing') return
      const next = Math.min(TOTAL_LANES - 1, g.currentLane + 1)
      if (next !== g.currentLane) {
        g.currentLane = next
        g.targetY = laneY(next, canvas!.height)
        playClick()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowUp')   { moveUp();   e.preventDefault() }
      if (e.key === 'ArrowDown') { moveDown(); e.preventDefault() }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(g.rafId)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function handleCanvasClick() {
    if (gameRef.current.state === 'idle') initGame()
  }

  const { w } = sizeRef.current

  return (
    <Layout title="단축키 퀴즈" onBack={onBack}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 0 24px' }}>

        {/* HUD */}
        <div style={{ display:'flex', gap:20, marginBottom:8, fontWeight:800, fontSize:15, color:'#333', alignItems:'center' }}>
          <span style={{ fontSize:20 }}>
            {Array.from({length:3}).map((_,i) => (
              <span key={i} style={{ opacity: i < lives ? 1 : 0.2 }}>❤️</span>
            ))}
          </span>
          <span style={{ color:'#4D72FB' }}>점수: {score}점</span>
        </div>

        {/* 현재 질문 */}
        {uiState === 'playing' && currentQ && (
          <div style={{
            background: 'linear-gradient(135deg, #4D72FB, #7B8FFC)',
            color: '#FFF',
            borderRadius: 16, padding: '10px 28px',
            marginBottom: 8, fontWeight: 900, fontSize: 19,
            textAlign: 'center',
            boxShadow: '0 4px 18px rgba(77,114,251,0.35)',
          }}>
            {currentQ.question}
          </div>
        )}

        {/* 캔버스 */}
        <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,80,180,0.22)' }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ display: 'block', touchAction: 'none', cursor: 'pointer' }}
          />
        </div>

        {/* 모바일 방향 버튼 */}
        {uiState === 'playing' && (
          <div style={{ display:'flex', gap:16, marginTop:14 }}>
            <button
              onPointerDown={() => {
                const g = gameRef.current; if (g.state !== 'playing') return
                const next = Math.max(0, g.currentLane - 1)
                if (next !== g.currentLane) { g.currentLane = next; g.targetY = laneY(next, sizeRef.current.h); playClick() }
              }}
              style={{
                width: Math.floor((w - 40) / 2),
                padding: '14px 0',
                background: 'linear-gradient(135deg, #4D72FB, #7B8FFC)',
                color: '#fff',
                border: 'none', borderRadius: 16,
                fontWeight: 900, fontSize: 22, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(77,114,251,0.3)',
              }}
            >↑ 위로</button>
            <button
              onPointerDown={() => {
                const g = gameRef.current; if (g.state !== 'playing') return
                const next = Math.min(TOTAL_LANES - 1, g.currentLane + 1)
                if (next !== g.currentLane) { g.currentLane = next; g.targetY = laneY(next, sizeRef.current.h); playClick() }
              }}
              style={{
                width: Math.floor((w - 40) / 2),
                padding: '14px 0',
                background: 'linear-gradient(135deg, #27AE60, #52C88A)',
                color: '#fff',
                border: 'none', borderRadius: 16,
                fontWeight: 900, fontSize: 22, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(39,174,96,0.3)',
              }}
            >↓ 아래로</button>
          </div>
        )}

        {(uiState === 'won' || uiState === 'lost') && (
          <div style={{ marginTop: 16 }}>
            <Button onClick={initGame}>다시 하기</Button>
          </div>
        )}

        <div style={{ marginTop: 10, color: '#AAA', fontSize: 11, textAlign: 'center' }}>
          ↑↓ 방향키 또는 버튼으로 잠수함 이동 · 정답 레인으로 통과!
        </div>
      </div>
    </Layout>
  )
}
