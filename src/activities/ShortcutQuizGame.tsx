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
  { question: '저장하려면?',        choices: ['Ctrl+S', 'Ctrl+C', 'Ctrl+Z', 'Ctrl+V'],   answer: 0 },
  { question: '복사하려면?',        choices: ['Ctrl+X', 'Ctrl+V', 'Ctrl+C', 'Ctrl+A'],   answer: 2 },
  { question: '붙여넣기?',          choices: ['Ctrl+C', 'Ctrl+V', 'Ctrl+Z', 'Ctrl+S'],   answer: 1 },
  { question: '실행 취소?',         choices: ['Ctrl+Y', 'Ctrl+R', 'Ctrl+Z', 'Ctrl+X'],   answer: 2 },
  { question: '전체 선택?',         choices: ['Ctrl+F', 'Ctrl+A', 'Ctrl+D', 'Ctrl+H'],   answer: 1 },
  { question: '찾기?',              choices: ['Ctrl+G', 'Ctrl+H', 'Ctrl+F', 'Ctrl+L'],   answer: 2 },
  { question: '잘라내기?',          choices: ['Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+D'],   answer: 0 },
  { question: '다시 실행(Redo)?',   choices: ['Ctrl+Z', 'Ctrl+Y', 'Ctrl+R', 'Ctrl+U'],   answer: 1 },
  { question: '새 탭 열기?',        choices: ['Ctrl+W', 'Ctrl+N', 'Ctrl+T', 'Ctrl+O'],   answer: 2 },
  { question: '탭 닫기?',           choices: ['Ctrl+T', 'Ctrl+Q', 'Ctrl+X', 'Ctrl+W'],   answer: 3 },
  { question: '인쇄?',              choices: ['Ctrl+I', 'Ctrl+P', 'Ctrl+L', 'Ctrl+K'],   answer: 1 },
  { question: '굵게(Bold)?',        choices: ['Ctrl+I', 'Ctrl+U', 'Ctrl+B', 'Ctrl+G'],   answer: 2 },
  { question: '기울임(Italic)?',    choices: ['Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+E'],   answer: 1 },
  { question: '밑줄(Underline)?',   choices: ['Ctrl+U', 'Ctrl+I', 'Ctrl+B', 'Ctrl+L'],   answer: 0 },
  { question: '화면 새로고침?',     choices: ['F1',     'F3',     'F5',    'F12'],          answer: 2 },
  { question: '개발자 도구 열기?',  choices: ['F5',     'F10',    'F11',   'F12'],          answer: 3 },
  { question: '전체화면?',          choices: ['F9',     'F10',    'F11',   'F12'],          answer: 2 },
  { question: '새 창 열기?',        choices: ['Ctrl+T', 'Ctrl+N', 'Ctrl+O', 'Ctrl+W'],   answer: 1 },
]

type GameState = 'idle' | 'playing' | 'won' | 'lost'

const TOTAL_LANES = 4
const WALL_THICK = 52
const SUB_W = 60
const SUB_H = 30
const WALL_SPEED = 2.8
const GAP_H_RATIO = 0.2   // each lane takes 20% of canvas height

function getSize() {
  const w = Math.min(520, window.innerWidth - 16)
  const h = Math.round(w * 1.2)
  return { w, h }
}

function laneY(lane: number, canvasH: number) {
  const topOffset = canvasH * 0.06
  const usableH   = canvasH * 0.88
  const gapH      = usableH / TOTAL_LANES
  return topOffset + lane * gapH + gapH / 2
}

function laneGapH(canvasH: number) {
  return (canvasH * 0.88) / TOTAL_LANES
}

interface WallObj {
  x: number
  qIdx: number
  passed: boolean
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; color: string
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
    subY: 0,
    targetY: 0,
    walls: [] as WallObj[],
    score: 0,
    lives: 3,
    frameCount: 0,
    rafId: 0,
    bubbles: [] as { x: number; y: number; r: number; speed: number; alpha: number }[],
    qOrder: [] as number[],
    qPointer: 0,
    particles: [] as Particle[],
    flashTimer: 0,
    flashLane: -1,
    flashCorrect: false,
  })

  const shuffleQ = useCallback(() => {
    const order = Array.from({length: QUESTIONS.length}, (_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]]
    }
    return order
  }, [])

  const initGame = useCallback(() => {
    const g = gameRef.current
    const { h } = sizeRef.current
    g.state = 'playing'; g.subY = h / 2; g.targetY = h / 2
    g.walls = []; g.score = 0; g.lives = 3; g.frameCount = 0
    g.particles = []; g.flashTimer = 0; g.flashLane = -1
    g.qOrder = shuffleQ(); g.qPointer = 0
    g.bubbles = Array.from({length:14}, () => ({
      x: Math.random() * sizeRef.current.w,
      y: Math.random() * h,
      r: 3 + Math.random() * 5,
      speed: 0.3 + Math.random() * 0.6,
      alpha: 0.12 + Math.random() * 0.18,
    }))
    setScore(0); setLives(3); setUiState('playing')
    setCurrentQ(QUESTIONS[g.qOrder[0]])
  }, [shuffleQ])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const { w, h } = sizeRef.current
    canvas.width = w; canvas.height = h
    const g = gameRef.current
    g.subY = h / 2; g.targetY = h / 2

    function spawnWall() {
      const qIdx = g.qOrder[g.qPointer % g.qOrder.length]
      g.walls.push({ x: sizeRef.current.w + WALL_THICK, qIdx, passed: false })
      setCurrentQ(QUESTIONS[qIdx])
      g.qPointer++
    }

    function spawnParticles(x: number, y: number, ok: boolean) {
      const colors = ok ? ['#FFD700','#FFF','#4DFB72','#FF6'] : ['#FF4444','#FF8888','#FFF']
      for (let i = 0; i < 16; i++) {
        const ang = Math.random() * Math.PI * 2, spd = 2 + Math.random() * 5
        g.particles.push({ x, y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, life: 35 + Math.random()*20, color: colors[i%colors.length] })
      }
    }

    const draw = (ctx: CanvasRenderingContext2D) => {
      const cw = canvas.width, ch = canvas.height
      g.frameCount++

      // 배경
      const bgGrad = ctx.createLinearGradient(0, 0, 0, ch)
      bgGrad.addColorStop(0, '#062A52'); bgGrad.addColorStop(1, '#0A1A3E')
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, cw, ch)

      // 물 물결 라인
      ctx.strokeStyle = 'rgba(100,180,255,0.07)'; ctx.lineWidth = 2
      for (let row = 0; row < TOTAL_LANES + 1; row++) {
        const y = ch * 0.06 + row * (ch * 0.88 / TOTAL_LANES)
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke()
      }

      // 버블
      for (const b of g.bubbles) {
        ctx.globalAlpha = b.alpha; ctx.strokeStyle = '#8BBFFF'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.stroke()
        b.y -= b.speed; if (b.y < -b.r) { b.y = ch + b.r; b.x = Math.random() * cw }
      }
      ctx.globalAlpha = 1

      if (g.state === 'idle') {
        ctx.fillStyle = '#FFF'; ctx.font = `bold ${Math.round(cw*0.055)}px sans-serif`; ctx.textAlign = 'center'
        ctx.fillText('클릭 또는 탭하여 시작', cw/2, ch/2 - 10)
        ctx.font = `${Math.round(cw*0.033)}px sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.65)'
        ctx.fillText('↑↓ 키 또는 1234 키로 잠수함 조종', cw/2, ch/2 + 26)
        return
      }

      if (g.state === 'playing') {
        // 잠수함 이동
        g.subY += (g.targetY - g.subY) * 0.13

        // 벽 스폰
        if (g.frameCount % 190 === 0 || (g.walls.length === 0 && g.frameCount > 50)) spawnWall()

        // 벽 이동
        for (const wall of g.walls) wall.x -= WALL_SPEED

        // 충돌 체크
        const subLeft = 80, subRight = 80 + SUB_W
        const subTop = g.subY - SUB_H/2, subBot = g.subY + SUB_H/2
        const gapH = laneGapH(ch)

        for (const wall of g.walls) {
          if (wall.passed) continue
          const wLeft = wall.x - WALL_THICK/2, wRight = wall.x + WALL_THICK/2
          if (subRight < wLeft || subLeft > wRight) continue

          const q = QUESTIONS[wall.qIdx]
          let inGap = false, hitLane = -1
          for (let lane = 0; lane < TOTAL_LANES; lane++) {
            const gy = laneY(lane, ch)
            if (subTop >= gy - gapH/2 + 5 && subBot <= gy + gapH/2 - 5) {
              inGap = true; hitLane = lane; break
            }
          }

          wall.passed = true
          g.flashLane = hitLane; g.flashTimer = 50
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
      const gapH = laneGapH(ch)
      const topOff = ch * 0.06
      const usableH = ch * 0.88

      for (const wall of g.walls) {
        const q = QUESTIONS[wall.qIdx]
        const wx = wall.x - WALL_THICK/2

        // 각 레인 사이의 벽 채우기
        for (let lane = 0; lane < TOTAL_LANES; lane++) {
          const gy = laneY(lane, ch)
          const gTop = gy - gapH/2, gBot = gy + gapH/2

          // 이 레인 위의 벽 세그먼트
          const segTop = lane === 0 ? 0 : laneY(lane-1, ch) + gapH/2
          const segBot = gTop
          if (segBot > segTop) {
            const wg = ctx.createLinearGradient(wx, 0, wx+WALL_THICK, 0)
            wg.addColorStop(0, '#1252BB'); wg.addColorStop(0.5, '#1E72E8'); wg.addColorStop(1, '#1252BB')
            ctx.fillStyle = wg; ctx.fillRect(wx, segTop, WALL_THICK, segBot-segTop)
            // 벽 하이라이트
            ctx.fillStyle = 'rgba(255,255,255,0.08)'
            ctx.fillRect(wx, segTop, 4, segBot-segTop)
          }

          // 통로 레이블
          const isCorrect = lane === q.answer
          const isFlash = g.flashTimer > 0 && g.flashLane === lane

          // 통로 배경
          const laneAlpha = isCorrect ? 0.18 : 0.07
          ctx.fillStyle = isCorrect ? `rgba(255,215,0,${laneAlpha})` : `rgba(255,255,255,${laneAlpha})`
          ctx.beginPath(); ctx.roundRect(wx-4, gTop+3, WALL_THICK+8, gapH-6, 8); ctx.fill()

          // 테두리
          ctx.strokeStyle = isFlash ? (g.flashCorrect ? '#FFD700' : '#FF4444') : isCorrect ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.2)'
          ctx.lineWidth = isFlash ? 3 : 1.5
          ctx.beginPath(); ctx.roundRect(wx-4, gTop+3, WALL_THICK+8, gapH-6, 8); ctx.stroke()

          // 번호 뱃지
          ctx.fillStyle = isCorrect ? '#FFD700' : 'rgba(255,255,255,0.55)'
          ctx.font = `bold ${Math.round(WALL_THICK*0.18)}px monospace`
          ctx.textAlign = 'center'
          ctx.fillText(`${lane+1}`, wall.x, gy - gapH*0.22)

          // 단축키 텍스트
          ctx.fillStyle = isCorrect ? '#FFD700' : 'rgba(255,255,255,0.9)'
          ctx.font = `bold ${Math.min(Math.round(WALL_THICK*0.22), 14)}px monospace`
          ctx.textAlign = 'center'
          ctx.fillText(q.choices[lane], wall.x, gy + gapH*0.12)
        }
        // 마지막 레인 아래의 벽
        const lastBot = laneY(TOTAL_LANES-1, ch) + gapH/2
        if (lastBot < ch) {
          const wg = ctx.createLinearGradient(wx, 0, wx+WALL_THICK, 0)
          wg.addColorStop(0, '#1252BB'); wg.addColorStop(0.5, '#1E72E8'); wg.addColorStop(1, '#1252BB')
          ctx.fillStyle = wg; ctx.fillRect(wx, lastBot, WALL_THICK, ch-lastBot)
          ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(wx, lastBot, 4, ch-lastBot)
        }
        // 맨 위의 벽
        const firstTop = laneY(0, ch) - gapH/2
        if (firstTop > 0) {
          const wg = ctx.createLinearGradient(wx, 0, wx+WALL_THICK, 0)
          wg.addColorStop(0, '#1252BB'); wg.addColorStop(0.5, '#1E72E8'); wg.addColorStop(1, '#1252BB')
          ctx.fillStyle = wg; ctx.fillRect(wx, 0, WALL_THICK, firstTop)
          ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(wx, 0, 4, firstTop)
        }
      }

      // 파티클
      g.particles = g.particles.filter(p => {
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.life-=1
        ctx.globalAlpha = p.life/55
        ctx.fillStyle = p.color; ctx.fillRect(p.x-3, p.y-3, 6, 6)
        return p.life > 0
      })
      ctx.globalAlpha = 1

      // 잠수함
      const sx = 80, sy = g.subY
      ctx.save(); ctx.translate(sx + SUB_W/2, sy)
      // 본체
      const sg = ctx.createLinearGradient(-SUB_W/2, -SUB_H/2, SUB_W/2, SUB_H/2)
      sg.addColorStop(0, '#FFD700'); sg.addColorStop(1, '#FFA500')
      ctx.fillStyle = sg
      ctx.beginPath(); ctx.ellipse(0, 0, SUB_W/2, SUB_H/2, 0, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = '#CC8800'; ctx.lineWidth = 2; ctx.stroke()
      // 함교
      ctx.fillStyle = '#FFC200'
      ctx.beginPath(); ctx.roundRect(-7, -SUB_H/2-11, 14, 13, 3); ctx.fill()
      ctx.strokeStyle = '#CC8800'; ctx.lineWidth = 1.5; ctx.stroke()
      // 잠망경
      ctx.strokeStyle = '#CC8800'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(0, -SUB_H/2-11); ctx.lineTo(0, -SUB_H/2-22); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, -SUB_H/2-22); ctx.lineTo(10, -SUB_H/2-22); ctx.stroke()
      // 포트홀
      ctx.fillStyle = '#A0DFFF'
      ctx.beginPath(); ctx.arc(10, 0, 8, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = '#CC8800'; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.beginPath(); ctx.arc(7, -3, 3.5, 0, Math.PI*2); ctx.fill()
      // 프로펠러
      ctx.fillStyle = '#CC8800'
      ctx.beginPath(); ctx.ellipse(-SUB_W/2-3, -10, 4.5, 10, 0.3, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(-SUB_W/2-3,  10, 4.5, 10, -0.3, 0, Math.PI*2); ctx.fill()
      // 버블 트레일
      for (let i = 0; i < 4; i++) {
        const bx = -SUB_W/2 - 10 - i*12 + Math.sin(g.frameCount*0.15+i)*5
        const by = Math.sin(g.frameCount*0.1+i*1.3)*6
        ctx.globalAlpha = 0.35 - i*0.08; ctx.strokeStyle = '#A0DFFF'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(bx, by, 3.5+i, 0, Math.PI*2); ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.restore()

      // 플래시 타이머
      if (g.flashTimer > 0) g.flashTimer--

      // 종료 오버레이
      if (g.state === 'won' || g.state === 'lost') {
        ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, cw, ch)
        ctx.fillStyle = g.state === 'won' ? '#FFD700' : '#FF6666'
        ctx.font = `bold ${Math.round(cw*0.075)}px sans-serif`; ctx.textAlign = 'center'
        ctx.fillText(g.state === 'won' ? '🎉 클리어!' : '💦 게임 오버', cw/2, ch/2 - 24)
        ctx.fillStyle = '#FFF'; ctx.font = `bold ${Math.round(cw*0.052)}px sans-serif`
        ctx.fillText(`점수: ${g.score}점`, cw/2, ch/2 + 20)
      }
    }

    function loop() {
      const ctx = canvas!.getContext('2d'); if (ctx) draw(ctx)
      g.rafId = requestAnimationFrame(loop)
    }
    g.rafId = requestAnimationFrame(loop)

    // 키보드
    function getCurrentLane(): number {
      const ch = canvas!.height
      let closest = 0, minDist = Infinity
      for (let i = 0; i < TOTAL_LANES; i++) {
        const d = Math.abs(g.targetY - laneY(i, ch))
        if (d < minDist) { minDist = d; closest = i }
      }
      return closest
    }
    function moveToLane(lane: number) {
      g.targetY = laneY(lane, canvas!.height); playClick()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (g.state !== 'playing') return
      if (e.key === 'ArrowUp')   { moveToLane(Math.max(0, getCurrentLane()-1)); e.preventDefault() }
      if (e.key === 'ArrowDown') { moveToLane(Math.min(TOTAL_LANES-1, getCurrentLane()+1)); e.preventDefault() }
      if (e.key === '1') moveToLane(0)
      if (e.key === '2') moveToLane(1)
      if (e.key === '3') moveToLane(2)
      if (e.key === '4') moveToLane(3)
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

  function handleLaneBtn(lane: number) {
    const g = gameRef.current
    if (g.state === 'idle') { initGame(); return }
    if (g.state !== 'playing') return
    g.targetY = laneY(lane, sizeRef.current.h)
    playClick()
  }

  const { w, h } = sizeRef.current

  return (
    <Layout title="단축키 퀴즈" onBack={onBack}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 0 24px' }}>

        {/* HUD */}
        <div style={{ display:'flex', gap:20, marginBottom:10, fontWeight:800, fontSize:15, color:'#333' }}>
          <span>{'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, 3-lives))}</span>
          <span style={{ color:'#0066CC' }}>점수: {score}점</span>
        </div>

        {/* 현재 질문 */}
        {uiState === 'playing' && currentQ && (
          <div style={{
            background:'#062A52', color:'#FFD700',
            borderRadius:12, padding:'8px 24px',
            marginBottom:10, fontWeight:900, fontSize:17,
            textAlign:'center',
            boxShadow:'0 4px 16px rgba(6,42,82,0.3)',
          }}>
            {currentQ.question}
          </div>
        )}

        {/* 캔버스 */}
        <div style={{ borderRadius:14, overflow:'hidden', boxShadow:'0 8px 32px rgba(6,42,82,0.5)' }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ display:'block', touchAction:'none', cursor:'pointer' }}
          />
        </div>

        {/* 레인 버튼 (터치/모바일) */}
        {uiState === 'playing' && (
          <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap', justifyContent:'center' }}>
            {QUESTIONS[0].choices.map((_, i) => (
              <button
                key={i}
                onPointerDown={() => handleLaneBtn(i)}
                style={{
                  padding:'10px 0', width:Math.floor((w-40)/4),
                  background:'#062A52', color:'#FFD700',
                  border:'2px solid #1E72E8', borderRadius:10,
                  fontWeight:800, fontSize:15, cursor:'pointer',
                  userSelect:'none',
                }}
              >
                {i+1}번
              </button>
            ))}
          </div>
        )}

        {(uiState === 'won' || uiState === 'lost') && (
          <div style={{ marginTop:16 }}>
            <Button onClick={initGame}>다시 하기</Button>
          </div>
        )}

        <div style={{ marginTop:12, color:'#888', fontSize:12, textAlign:'center' }}>
          ↑↓ 키 또는 1~4 키 | 버튼으로도 레인 선택
        </div>
      </div>
    </Layout>
  )
}
