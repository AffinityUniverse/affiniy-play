import { useEffect, useRef, useState, useCallback, CSSProperties } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

type GameState = 'idle' | 'playing' | 'won' | 'lost'

const BRICK_ROWS = 8
const BRICK_COLS = 7
const BRICK_HEIGHT = 36
const BRICK_GAP = 3
const PADDLE_HEIGHT = 12
const PADDLE_WIDTH = 90
const BALL_RADIUS = 8
const BASE_SPEED = 4
const SPEED_INCREMENT = 0.2

const ROW_COLORS = [
  '#D5E8FF', '#FFE9D5', '#D5F5E3', '#FFD5E9',
  '#E9D5FF', '#FFFBD5', '#D5F5FF', '#FFD5D5',
]
const CHAR_SRCS = [
  'slice/slice2.png',
  'slice/slice3.png',
  'slice/slice4.png',
  'slice/slice5.png',
  'slice/slice6.png',
  'slice/slice7.png',
  'slice/slice9.png',
]

interface Brick {
  x: number; y: number; w: number; h: number
  alive: boolean; row: number; col: number
}

interface Ball { x: number; y: number; vx: number; vy: number }
interface Paddle { x: number }

interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}

interface FloatingText {
  x: number; y: number; text: string; life: number; maxLife: number
}

// Stars are fixed decorative dots
interface Star { x: number; y: number; r: number; alpha: number }

function buildBricks(canvasW: number): Brick[] {
  const margin = 10
  const brickW = (canvasW - margin * 2 - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS
  const bricks: Brick[] = []
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: margin + c * (brickW + BRICK_GAP),
        y: 40 + r * (BRICK_HEIGHT + BRICK_GAP),
        w: brickW,
        h: BRICK_HEIGHT,
        alive: true,
        row: r,
        col: c,
      })
    }
  }
  return bricks
}

function buildStars(canvasW: number, canvasH: number): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < 20; i++) {
    stars.push({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH * 0.85,
      r: 0.8 + Math.random() * 1.2,
      alpha: 0.4 + Math.random() * 0.6,
    })
  }
  return stars
}

export default function BrickBreakerGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<{
    ball: Ball
    paddle: Paddle
    bricks: Brick[]
    lives: number
    score: number
    gameState: GameState
    speed: number
    images: HTMLImageElement[]
    imagesLoaded: boolean
    rafId: number
    keys: Set<string>
    particles: Particle[]
    floatingTexts: FloatingText[]
    stars: Star[]
    ballTrail: { x: number; y: number }[]
    lastHitFrame: number
    combo: number
    frameCount: number
  }>({
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    paddle: { x: 0 },
    bricks: [],
    lives: 3,
    score: 0,
    gameState: 'idle',
    speed: BASE_SPEED,
    images: [],
    imagesLoaded: false,
    rafId: 0,
    keys: new Set(),
    particles: [],
    floatingTexts: [],
    stars: [],
    ballTrail: [],
    lastHitFrame: -999,
    combo: 0,
    frameCount: 0,
  })

  const [lives, setLives] = useState(3)
  const [score, setScore] = useState(0)
  const [gameState, setGameState] = useState<GameState>('idle')

  const getCanvasSize = () => {
    const w = Math.min(360, window.innerWidth - 20)
    const h = Math.round(w * (580 / 360))
    return { w, h }
  }

  const initGame = useCallback((canvasW: number, canvasH: number) => {
    const s = stateRef.current
    s.bricks = buildBricks(canvasW)
    s.stars = buildStars(canvasW, canvasH)
    s.paddle = { x: canvasW / 2 - PADDLE_WIDTH / 2 }
    s.ball = {
      x: canvasW / 2,
      y: canvasH - PADDLE_HEIGHT - 50,
      vx: BASE_SPEED * (Math.random() > 0.5 ? 1 : -1),
      vy: -BASE_SPEED,
    }
    s.lives = 3
    s.score = 0
    s.gameState = 'playing'
    s.speed = BASE_SPEED
    s.particles = []
    s.floatingTexts = []
    s.ballTrail = []
    s.lastHitFrame = -999
    s.combo = 0
    s.frameCount = 0
    setLives(3)
    setScore(0)
    setGameState('playing')
  }, [])

  useEffect(() => {
    const s = stateRef.current
    s.images = CHAR_SRCS.map(src => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        if (s.images.every(i => i.complete && i.naturalWidth > 0)) s.imagesLoaded = true
      }
      return img
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { w, h } = getCanvasSize()
    canvas.width = w
    canvas.height = h

    const s = stateRef.current
    s.stars = buildStars(w, h)

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      s.paddle.x = Math.max(0, Math.min(canvas.width - PADDLE_WIDTH, x - PADDLE_WIDTH / 2))
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const x = e.touches[0].clientX - rect.left
      s.paddle.x = Math.max(0, Math.min(canvas.width - PADDLE_WIDTH, x - PADDLE_WIDTH / 2))
    }

    const handleKeyDown = (e: KeyboardEvent) => { s.keys.add(e.key) }
    const handleKeyUp = (e: KeyboardEvent) => { s.keys.delete(e.key) }

    const handleClick = () => {
      if (s.gameState === 'idle') initGame(canvas.width, canvas.height)
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('click', handleClick)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const spawnParticles = (bx: number, by: number, color: string) => {
      const count = 6 + Math.floor(Math.random() * 3)
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
        const speed = 1.5 + Math.random() * 2.5
        s.particles.push({
          x: bx, y: by,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 30, maxLife: 30,
          color,
          size: 3 + Math.random() * 4,
        })
      }
    }

    const draw = (ctx: CanvasRenderingContext2D) => {
      const cw = canvas.width
      const ch = canvas.height
      s.frameCount++

      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, ch)
      grad.addColorStop(0, '#1A1A3E')
      grad.addColorStop(1, '#2D3A8C')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, cw, ch)

      // Stars
      for (const star of s.stars) {
        ctx.globalAlpha = star.alpha
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      if (s.gameState === 'idle') {
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 22px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('클릭해서 시작!', cw / 2, ch / 2)
        ctx.font = '15px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.fillText('마우스 또는 터치로 패들을 움직여요', cw / 2, ch / 2 + 32)
        return
      }

      // Keyboard paddle control
      if (s.keys.has('ArrowLeft')) s.paddle.x = Math.max(0, s.paddle.x - 10)
      if (s.keys.has('ArrowRight')) s.paddle.x = Math.min(cw - PADDLE_WIDTH, s.paddle.x + 10)

      if (s.gameState === 'playing') {
        // Ball trail: keep last 3 positions
        s.ballTrail.push({ x: s.ball.x, y: s.ball.y })
        if (s.ballTrail.length > 3) s.ballTrail.shift()

        // Move ball
        s.ball.x += s.ball.vx
        s.ball.y += s.ball.vy

        // Wall collisions
        if (s.ball.x - BALL_RADIUS < 0) { s.ball.x = BALL_RADIUS; s.ball.vx = Math.abs(s.ball.vx) }
        if (s.ball.x + BALL_RADIUS > cw) { s.ball.x = cw - BALL_RADIUS; s.ball.vx = -Math.abs(s.ball.vx) }
        if (s.ball.y - BALL_RADIUS < 0) { s.ball.y = BALL_RADIUS; s.ball.vy = Math.abs(s.ball.vy) }

        // Paddle collision
        const paddleTop = ch - PADDLE_HEIGHT - 25
        if (
          s.ball.y + BALL_RADIUS >= paddleTop &&
          s.ball.y - BALL_RADIUS <= paddleTop + PADDLE_HEIGHT &&
          s.ball.x >= s.paddle.x &&
          s.ball.x <= s.paddle.x + PADDLE_WIDTH &&
          s.ball.vy > 0
        ) {
          const hitPos = (s.ball.x - s.paddle.x) / PADDLE_WIDTH
          const angle = (hitPos - 0.5) * 2 * (Math.PI * 0.4)
          const spd = Math.sqrt(s.ball.vx ** 2 + s.ball.vy ** 2)
          s.ball.vx = spd * Math.sin(angle)
          s.ball.vy = -Math.abs(spd * Math.cos(angle))
          s.ball.y = paddleTop - BALL_RADIUS
          s.combo = 0
        }

        // Ball out of bounds (bottom)
        if (s.ball.y - BALL_RADIUS > ch) {
          s.lives -= 1
          setLives(s.lives)
          s.combo = 0
          if (s.lives <= 0) {
            s.gameState = 'lost'
            setGameState('lost')
          } else {
            s.ball = {
              x: cw / 2,
              y: ch - PADDLE_HEIGHT - 70,
              vx: s.speed * (Math.random() > 0.5 ? 1 : -1),
              vy: -s.speed,
            }
            s.ballTrail = []
          }
        }

        // Brick collisions
        for (const brick of s.bricks) {
          if (!brick.alive) continue
          const bLeft = brick.x, bRight = brick.x + brick.w
          const bTop = brick.y, bBottom = brick.y + brick.h

          if (
            s.ball.x + BALL_RADIUS > bLeft && s.ball.x - BALL_RADIUS < bRight &&
            s.ball.y + BALL_RADIUS > bTop && s.ball.y - BALL_RADIUS < bBottom
          ) {
            brick.alive = false
            s.combo++
            const points = 10 * (s.combo > 1 ? s.combo : 1)
            s.score += points
            setScore(s.score)

            // Spawn particles
            spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, ROW_COLORS[brick.row % ROW_COLORS.length])

            // Combo text
            if (s.combo >= 2) {
              s.floatingTexts.push({
                x: brick.x + brick.w / 2,
                y: brick.y,
                text: `×${s.combo}`,
                life: 45,
                maxLife: 45,
              })
            }

            // Bounce direction
            const overlapLeft = s.ball.x + BALL_RADIUS - bLeft
            const overlapRight = bRight - (s.ball.x - BALL_RADIUS)
            const overlapTop = s.ball.y + BALL_RADIUS - bTop
            const overlapBottom = bBottom - (s.ball.y - BALL_RADIUS)
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom)
            if (minOverlap === overlapTop || minOverlap === overlapBottom) s.ball.vy = -s.ball.vy
            else s.ball.vx = -s.ball.vx
            break
          }
        }

        // Speed increase based on score
        const newSpeed = BASE_SPEED + Math.floor(s.score / 70) * SPEED_INCREMENT
        if (newSpeed !== s.speed && newSpeed < BASE_SPEED + 3) {
          const ratio = newSpeed / s.speed
          s.ball.vx *= ratio
          s.ball.vy *= ratio
          s.speed = newSpeed
        }

        if (s.bricks.every(b => !b.alive)) {
          s.gameState = 'won'
          setGameState('won')
        }

        // Update particles
        s.particles = s.particles
          .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.1, life: p.life - 1 }))
          .filter(p => p.life > 0)

        // Update floating texts
        s.floatingTexts = s.floatingTexts
          .map(ft => ({ ...ft, y: ft.y - 1, life: ft.life - 1 }))
          .filter(ft => ft.life > 0)
      }

      // Draw bricks
      for (const brick of s.bricks) {
        if (!brick.alive) continue
        const color = ROW_COLORS[brick.row % ROW_COLORS.length]

        // Gradient fill
        const bGrad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h)
        bGrad.addColorStop(0, color)
        bGrad.addColorStop(1, color.replace(')', ', 0.7)').replace('rgb', 'rgba') || color)
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 4)
        ctx.fill()

        // Lighter top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.beginPath()
        ctx.roundRect(brick.x + 2, brick.y + 2, brick.w - 4, brick.h * 0.45, 3)
        ctx.fill()

        ctx.strokeStyle = 'rgba(0,0,0,0.12)'
        ctx.lineWidth = 1
        ctx.stroke()

        // Character image
        if (s.imagesLoaded) {
          const imgIdx = (brick.row * BRICK_COLS + brick.col) % CHAR_SRCS.length
          const img = s.images[imgIdx]
          if (img.complete && img.naturalWidth > 0) {
            const pad = 3
            const ratio = img.naturalWidth / img.naturalHeight
            const availW = brick.w - pad * 2
            const availH = brick.h - pad * 2
            let dw: number, dh: number
            if (ratio >= 1) {
              dw = Math.min(availW, availH * ratio)
              dh = dw / ratio
            } else {
              dh = Math.min(availH, availW / ratio)
              dw = dh * ratio
            }
            ctx.drawImage(img, brick.x + (brick.w - dw) / 2, brick.y + (brick.h - dh) / 2, dw, dh)
          }
        }
      }

      // Draw particles
      for (const p of s.particles) {
        ctx.globalAlpha = p.life / p.maxLife
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      }
      ctx.globalAlpha = 1

      // Draw floating combo texts
      for (const ft of s.floatingTexts) {
        ctx.globalAlpha = ft.life / ft.maxLife
        ctx.fillStyle = '#FFD700'
        ctx.font = 'bold 16px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(ft.text, ft.x, ft.y)
      }
      ctx.globalAlpha = 1

      // Ground/floor bar
      const floorGrad = ctx.createLinearGradient(0, canvas.height - 18, 0, canvas.height)
      floorGrad.addColorStop(0, '#3D5BCC')
      floorGrad.addColorStop(1, '#1A2A80')
      ctx.fillStyle = floorGrad
      ctx.fillRect(0, canvas.height - 18, cw, 18)

      // Paddle
      const paddleY = canvas.height - PADDLE_HEIGHT - 25
      const paddleGrad = ctx.createLinearGradient(s.paddle.x, 0, s.paddle.x + PADDLE_WIDTH, 0)
      paddleGrad.addColorStop(0, '#6B8FFF')
      paddleGrad.addColorStop(0.5, '#4D72FB')
      paddleGrad.addColorStop(1, '#6B8FFF')
      ctx.fillStyle = paddleGrad
      ctx.beginPath()
      ctx.roundRect(s.paddle.x, paddleY, PADDLE_WIDTH, PADDLE_HEIGHT, 6)
      ctx.fill()
      // Paddle shine
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.roundRect(s.paddle.x + 4, paddleY + 2, PADDLE_WIDTH - 8, 4, 3)
      ctx.fill()

      // Ball trail
      s.ballTrail.forEach((pos, i) => {
        const alpha = ((i + 1) / s.ballTrail.length) * 0.35
        const r = BALL_RADIUS * ((i + 1) / s.ballTrail.length) * 0.7
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#A0BFFF'
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1

      // Ball
      ctx.shadowColor = '#6B8FFF'
      ctx.shadowBlur = 12
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(s.ball.x, s.ball.y, BALL_RADIUS, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // End-state canvas overlay
      if (s.gameState === 'won' || s.gameState === 'lost') {
        ctx.fillStyle = 'rgba(0,0,0,0.60)'
        ctx.fillRect(0, 0, cw, ch)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 30px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(s.gameState === 'won' ? '클리어!' : '게임 오버', cw / 2, ch / 2 - 24)
        ctx.font = 'bold 22px sans-serif'
        ctx.fillStyle = '#FFD700'
        ctx.fillText(`점수: ${s.score}점`, cw / 2, ch / 2 + 16)
      }
    }

    const loop = () => {
      const ctx = canvas.getContext('2d')
      if (ctx) draw(ctx)
      s.rafId = requestAnimationFrame(loop)
    }
    s.rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(s.rafId)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [initGame])

  const handleRestart = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    initGame(canvas.width, canvas.height)
  }, [initGame])

  const { w, h } = getCanvasSize()

  const overlayStyle: CSSProperties = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    pointerEvents: 'none',
  }

  return (
    <Layout title="벽돌 깨기" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 24px' }}>
        {/* HUD */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 10, fontWeight: 800, fontSize: 15, color: '#333' }}>
          <span>{'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, 3 - lives))}</span>
          <span style={{ color: '#4D72FB' }}>점수: {score}점</span>
        </div>

        {/* Canvas wrapper */}
        <div style={{ position: 'relative', width: w, height: h }}>
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              borderRadius: 12,
              border: '2px solid #3D5BCC',
              touchAction: 'none',
            }}
          />
          {(gameState === 'won' || gameState === 'lost') && (
            <div style={{ ...overlayStyle, pointerEvents: 'auto' }}>
              <div style={{ height: 130 }} />
              <Button onClick={handleRestart}>다시 하기</Button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 10, color: '#AAA', fontSize: 12, textAlign: 'center' }}>
          마우스/터치로 패들 이동 | 방향키도 가능
        </div>
      </div>
    </Layout>
  )
}
