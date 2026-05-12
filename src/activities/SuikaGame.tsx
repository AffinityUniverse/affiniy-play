import { useEffect, useRef, useState, useCallback, CSSProperties } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }
type GameState = 'idle' | 'playing' | 'over'

interface Fruit {
  id: number
  x: number; y: number
  vx: number; vy: number
  r: number; level: number
}

// 11단계 과일 — 앱 팔레트 색상 기반
const FRUITS = [
  { name: '체리',    r: 16,  color: '#FF5FA0', dark: '#CC2277', score: 10  },
  { name: '딸기',    r: 22,  color: '#FF4444', dark: '#BB1111', score: 20  },
  { name: '포도',    r: 29,  color: '#8E44AD', dark: '#5E2C7E', score: 40  },
  { name: '귤',     r: 36,  color: '#FF8C42', dark: '#CC5500', score: 70  },
  { name: '레몬',    r: 43,  color: '#FFE234', dark: '#CC9900', score: 100 },
  { name: '사과',    r: 50,  color: '#27AE60', dark: '#156B3A', score: 150 },
  { name: '배',     r: 57,  color: '#4D72FB', dark: '#1E3FC0', score: 220 },
  { name: '복숭아',  r: 64,  color: '#FFB347', dark: '#E07000', score: 300 },
  { name: '파인애플', r: 71,  color: '#E8C000', dark: '#947A00', score: 400 },
  { name: '멜론',    r: 79,  color: '#82E0AA', dark: '#27AE60', score: 520 },
  { name: '수박',    r: 87,  color: '#27AE60', dark: '#145A32', score: 700 },
]

const GRAVITY    = 0.38
const RESTITUTION = 0.25
const FRICTION   = 0.992
const WALL_T     = 7
const FLOOR_T    = 10
const DANGER_Y   = 95     // 이 선 위로 과일이 쌓이면 위험
const DROP_Y     = 52     // 과일이 떨어지는 시작 y
const COOLDOWN   = 55     // 다음 과일까지 대기 프레임
const PHYS_STEPS = 5      // 충돌 해결 반복 횟수
const MAX_LEVEL_DROP = 4  // 랜덤으로 떨어지는 최대 레벨

let _nextId = 0
const freshId = () => ++_nextId

function randLevel() { return Math.floor(Math.random() * (MAX_LEVEL_DROP + 1)) }

function drawFruitShape(ctx: CanvasRenderingContext2D, f: Fruit) {
  const ft = FRUITS[f.level]
  ctx.save()
  ctx.beginPath()
  ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
  ctx.fillStyle = ft.color
  ctx.fill()
  ctx.strokeStyle = ft.dark
  ctx.lineWidth = 2.5
  ctx.stroke()

  // 수박 전용 줄무늬
  if (f.level === 10) {
    ctx.clip()
    ctx.strokeStyle = ft.dark
    ctx.lineWidth = 3
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(f.x + i * 28, f.y - f.r)
      ctx.lineTo(f.x + i * 28, f.y + f.r)
      ctx.stroke()
    }
  }
  ctx.restore()

  // 하이라이트
  ctx.save()
  ctx.beginPath()
  ctx.arc(f.x - f.r * 0.3, f.y - f.r * 0.3, f.r * 0.22, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fill()
  ctx.restore()

  // 이름 레이블
  const fontSize = Math.max(9, Math.min(13, f.r * 0.38))
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = f.level === 4 ? '#7A5A00' : 'rgba(255,255,255,0.9)'
  ctx.fillText(ft.name, f.x, f.y)
  ctx.textBaseline = 'alphabetic'
}

export default function SuikaGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sRef = useRef<{
    fruits: Fruit[]
    score: number
    gameState: GameState
    rafId: number
    dropX: number
    currentLevel: number | null
    nextLevel: number
    cooldown: number
    dangerFrames: number
    cw: number; ch: number
    lastTime: number
    accumulator: number
  }>({
    fruits: [], score: 0, gameState: 'idle', rafId: 0,
    dropX: 170, currentLevel: randLevel(), nextLevel: randLevel(),
    cooldown: 0, dangerFrames: 0, cw: 340, ch: 520,
    lastTime: 0, accumulator: 0,
  })

  const [score, setScore] = useState(0)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [nextLevel, setNextLevel] = useState(0)
  const [currentLevel, setCurrentLevel] = useState<number | null>(null)

  const getCanvasSize = () => {
    const w = Math.min(340, window.innerWidth - 24)
    const h = Math.round(w * (520 / 340))
    return { w, h }
  }

  const startGame = useCallback(() => {
    const s = sRef.current
    _nextId = 0
    s.fruits = []
    s.score = 0
    s.gameState = 'playing'
    s.currentLevel = randLevel()
    s.nextLevel = randLevel()
    s.cooldown = 0
    s.dangerFrames = 0
    s.lastTime = 0
    s.accumulator = 0
    const { w } = getCanvasSize()
    s.dropX = w / 2
    setScore(0)
    setGameState('playing')
    setCurrentLevel(s.currentLevel)
    setNextLevel(s.nextLevel)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { w, h } = getCanvasSize()
    canvas.width = w; canvas.height = h
    const s = sRef.current
    s.cw = w; s.ch = h
    s.dropX = w / 2

    const gameL = WALL_T
    const gameR = (cw: number) => cw - WALL_T
    const gameB = (ch: number) => ch - FLOOR_T

    function clampDropX(x: number, level: number | null, cw: number) {
      const r = level != null ? FRUITS[level].r : 20
      return Math.max(gameL + r, Math.min(gameR(cw) - r, x))
    }

    function getX(e: MouseEvent | Touch, rect: DOMRect): number {
      const scale = s.cw / rect.width
      return (e.clientX - rect.left) * scale
    }

    function dropFruit() {
      const s = sRef.current
      if (s.gameState !== 'playing') return
      if (s.currentLevel == null || s.cooldown > 0) return
      const lvl = s.currentLevel
      s.fruits.push({
        id: freshId(), x: s.dropX, y: DROP_Y,
        vx: 0, vy: 1, r: FRUITS[lvl].r, level: lvl,
      })
      s.currentLevel = null
      s.cooldown = COOLDOWN
      setCurrentLevel(null)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (sRef.current.gameState !== 'playing') return
      const rect = canvas.getBoundingClientRect()
      sRef.current.dropX = clampDropX(getX(e, rect), sRef.current.currentLevel, sRef.current.cw)
    }
    const onClick = () => {
      if (sRef.current.gameState === 'idle') { startGame(); return }
      if (sRef.current.gameState === 'over') return
      dropFruit()
    }

    let touchStartX = 0
    const onTouchStart = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      touchStartX = getX(e.touches[0], rect)
      if (sRef.current.gameState === 'idle') { startGame(); return }
      if (sRef.current.gameState === 'over') return
      sRef.current.dropX = clampDropX(touchStartX, sRef.current.currentLevel, sRef.current.cw)
    }
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (sRef.current.gameState !== 'playing') return
      const rect = canvas.getBoundingClientRect()
      sRef.current.dropX = clampDropX(getX(e.touches[0], rect), sRef.current.currentLevel, sRef.current.cw)
    }
    const onTouchEnd = () => { dropFruit() }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    // ── Physics ──
    function physicsStep(fruits: Fruit[], cw: number, ch: number) {
      const GL = gameL, GR = gameR(cw), GB = gameB(ch)
      for (const f of fruits) {
        f.vy += GRAVITY
        f.vx *= FRICTION
        f.vy *= FRICTION
        f.x += f.vx
        f.y += f.vy
        if (f.x - f.r < GL) { f.x = GL + f.r; f.vx = Math.abs(f.vx) * RESTITUTION }
        if (f.x + f.r > GR) { f.x = GR - f.r; f.vx = -Math.abs(f.vx) * RESTITUTION }
        if (f.y + f.r > GB) { f.y = GB - f.r; f.vy = -Math.abs(f.vy) * RESTITUTION }
      }
      for (let i = 0; i < fruits.length; i++) {
        for (let j = i + 1; j < fruits.length; j++) {
          const a = fruits[i], b = fruits[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const d2 = dx * dx + dy * dy
          const minD = a.r + b.r
          if (d2 < minD * minD && d2 > 0.0001) {
            const dist = Math.sqrt(d2)
            const nx = dx / dist, ny = dy / dist
            const overlap = minD - dist
            const push = overlap * 0.52
            a.x -= nx * push; a.y -= ny * push
            b.x += nx * push; b.y += ny * push
            const rvx = b.vx - a.vx, rvy = b.vy - a.vy
            const dot = rvx * nx + rvy * ny
            if (dot < 0) {
              const imp = dot * (1 + RESTITUTION) * 0.5
              a.vx += imp * nx; a.vy += imp * ny
              b.vx -= imp * nx; b.vy -= imp * ny
            }
          }
        }
      }
    }

    function checkMerges(fruits: Fruit[]): number {
      const merged = new Set<number>()
      const toAdd: Fruit[] = []
      let gained = 0
      for (let i = 0; i < fruits.length; i++) {
        if (merged.has(fruits[i].id)) continue
        for (let j = i + 1; j < fruits.length; j++) {
          if (merged.has(fruits[j].id)) continue
          const a = fruits[i], b = fruits[j]
          if (a.level !== b.level || a.level >= FRUITS.length - 1) continue
          const dx = b.x - a.x, dy = b.y - a.y
          const d2 = dx * dx + dy * dy
          const contact = a.r + b.r
          if (d2 < contact * contact * 1.02) {
            merged.add(a.id); merged.add(b.id)
            const nl = a.level + 1
            toAdd.push({
              id: freshId(),
              x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
              vx: (a.vx + b.vx) / 2, vy: (a.vy + b.vy) / 2 - 2,
              r: FRUITS[nl].r, level: nl,
            })
            gained += FRUITS[nl].score
            break
          }
        }
      }
      if (merged.size) {
        fruits.splice(0, fruits.length, ...fruits.filter(f => !merged.has(f.id)), ...toAdd)
      }
      return gained
    }

    const cv = canvas  // non-null reference for closures
    const FIXED_DT = 1000 / 60  // 16.667ms — 주사율과 무관한 고정 물리 스텝

    // ── 게임 로직 업데이트 (고정 60fps로만 실행) ──
    function update() {
      if (s.gameState !== 'playing') return
      const cw = cv.width, ch = cv.height
      if (s.cooldown > 0) {
        s.cooldown--
        if (s.cooldown === 0) {
          s.currentLevel = s.nextLevel
          s.nextLevel = randLevel()
          setCurrentLevel(s.currentLevel)
          setNextLevel(s.nextLevel)
        }
      }
      for (let i = 0; i < PHYS_STEPS; i++) physicsStep(s.fruits, cw, ch)
      const gained = checkMerges(s.fruits)
      if (gained) { s.score += gained; setScore(s.score) }
      const danger = s.fruits.some(f => f.y - f.r < DANGER_Y && Math.abs(f.vy) < 0.8 && Math.abs(f.vx) < 0.8)
      if (danger) { s.dangerFrames++ } else { s.dangerFrames = 0 }
      if (s.dangerFrames > 80) { s.gameState = 'over'; setGameState('over') }
    }

    // ── 렌더링 (매 rAF 프레임마다 실행) ──
    function draw(ctx: CanvasRenderingContext2D) {
      const cw = cv.width, ch = cv.height
      const GL = gameL, GR = gameR(cw), GB = gameB(ch)

      // 배경
      ctx.fillStyle = '#FFF9F0'
      ctx.fillRect(0, 0, cw, ch)

      // 파스텔 그라디언트 배경
      const bg = ctx.createLinearGradient(0, 0, 0, ch)
      bg.addColorStop(0, '#FFF9F0'); bg.addColorStop(1, '#FFE9D5')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch)

      // 벽 (주황 계열)
      ctx.fillStyle = '#FF8C42'
      ctx.fillRect(0, 0, WALL_T, ch)
      ctx.fillRect(cw - WALL_T, 0, WALL_T, ch)
      ctx.fillRect(0, ch - FLOOR_T, cw, FLOOR_T)

      // 벽 하이라이트
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillRect(WALL_T, 0, 3, ch)
      ctx.fillRect(cw - WALL_T - 3, 0, 3, ch)
      ctx.fillRect(0, ch - FLOOR_T, cw, 3)

      // 위험선
      ctx.strokeStyle = 'rgba(255,80,80,0.55)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 5])
      ctx.beginPath()
      ctx.moveTo(GL, DANGER_Y); ctx.lineTo(GR, DANGER_Y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.font = '10px sans-serif'; ctx.fillStyle = 'rgba(220,60,60,0.7)'
      ctx.textAlign = 'right'
      ctx.fillText('위험선', GR - 4, DANGER_Y - 4)

      if (s.gameState === 'idle') {
        ctx.textAlign = 'center'
        ctx.font = 'bold 24px sans-serif'; ctx.fillStyle = '#FF8C42'
        ctx.fillText('수박 게임', cw / 2, ch / 2 - 50)
        ctx.font = '15px sans-serif'; ctx.fillStyle = '#666'
        ctx.fillText('같은 과일끼리 합쳐서', cw / 2, ch / 2 - 10)
        ctx.fillText('수박을 만들어봐요!', cw / 2, ch / 2 + 14)
        ctx.font = '13px sans-serif'; ctx.fillStyle = '#999'
        ctx.fillText('클릭 / 터치하면 시작', cw / 2, ch / 2 + 50)
        return
      }

      // 과일 그리기
      for (const f of s.fruits) drawFruitShape(ctx, f)

      // 드롭 인디케이터
      if (s.gameState === 'playing' && s.currentLevel != null && s.cooldown === 0) {
        const ft = FRUITS[s.currentLevel]
        ctx.globalAlpha = 0.55
        ctx.beginPath(); ctx.arc(s.dropX, DROP_Y, ft.r, 0, Math.PI * 2)
        ctx.fillStyle = ft.color; ctx.fill()
        ctx.strokeStyle = ft.dark; ctx.lineWidth = 2.5; ctx.stroke()
        ctx.globalAlpha = 1
        // 드롭 가이드선
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'
        ctx.lineWidth = 1; ctx.setLineDash([4, 5])
        ctx.beginPath()
        ctx.moveTo(s.dropX, DROP_Y + ft.r + 2)
        ctx.lineTo(s.dropX, GB)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // 게임 오버 오버레이
      if (s.gameState === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(0, 0, cw, ch)
        ctx.textAlign = 'center'
        ctx.font = 'bold 32px sans-serif'; ctx.fillStyle = '#FFF'
        ctx.fillText('게임 오버!', cw / 2, ch / 2 - 36)
        ctx.font = 'bold 22px sans-serif'; ctx.fillStyle = '#FFD700'
        ctx.fillText(`점수: ${s.score}점`, cw / 2, ch / 2 + 8)
      }
    }

    // 고정 타임스텝 루프: 물리는 항상 16.67ms(60fps) 단위, 렌더는 매 프레임
    const loop = (timestamp: number) => {
      if (s.lastTime === 0) s.lastTime = timestamp
      const elapsed = Math.min(timestamp - s.lastTime, 50)  // 최대 50ms (탭 비활성 등 방지)
      s.lastTime = timestamp
      s.accumulator += elapsed

      while (s.accumulator >= FIXED_DT) {
        update()
        s.accumulator -= FIXED_DT
      }

      const ctx = cv.getContext('2d')
      if (ctx) draw(ctx)
      s.rafId = requestAnimationFrame(loop)
    }
    s.rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(s.rafId)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [startGame])

  const { w, h } = getCanvasSize()
  const s = sRef.current

  const panelStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: w, padding: '8px 12px', boxSizing: 'border-box',
    background: '#FFF5EE', borderRadius: 12, marginBottom: 8,
    border: '1.5px solid #FFCBA0',
  }

  return (
    <Layout title="수박 게임" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 24px' }}>

        {/* 상단 패널: 점수 + 다음 과일 */}
        <div style={panelStyle}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#FF8C42' }}>
            점수: <span style={{ color: '#333' }}>{score}점</span>
          </div>
          {gameState === 'playing' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#666' }}>
              <span>다음:</span>
              {s.nextLevel != null && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: '50%', fontWeight: 800, fontSize: 11,
                  background: FRUITS[s.nextLevel].color, color: s.nextLevel === 4 ? '#7A5A00' : '#fff',
                  border: `2px solid ${FRUITS[s.nextLevel].dark}`,
                }}>
                  {FRUITS[s.nextLevel].name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 캔버스 */}
        <div style={{ position: 'relative', width: w, height: h }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', borderRadius: 12, border: '2px solid #FFCBA0', touchAction: 'none' }}
          />
          {gameState === 'over' && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 16, paddingTop: 80,
            }}>
              <Button onClick={startGame}>다시 하기</Button>
            </div>
          )}
        </div>

        {/* 안내 문구 */}
        <div style={{
          marginTop: 12, width: w, background: '#FFF5EE',
          borderRadius: 12, border: '1.5px solid #FFCBA0', padding: '10px 16px',
          boxSizing: 'border-box',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#FF8C42', marginBottom: 6 }}>
            🍉 수박 게임 방법
          </div>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>
            • 마우스/터치로 위치를 정하고 <b>클릭</b>하면 과일이 떨어져요<br />
            • <b>같은 과일</b>끼리 만나면 더 큰 과일로 합쳐져요!<br />
            • 체리 → 딸기 → 포도 → 귤 → 레몬 → 사과 → 배 → 복숭아 → 파인애플 → 멜론 → <b>수박!</b><br />
            • 과일이 <b>빨간 위험선</b> 위로 쌓이면 게임이 끝나요
          </div>
        </div>
      </div>
    </Layout>
  )
}
