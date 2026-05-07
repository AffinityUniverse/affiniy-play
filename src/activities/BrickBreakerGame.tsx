import { useEffect, useRef, useState, useCallback, CSSProperties } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

type GameState = 'idle' | 'playing' | 'won' | 'lost'

const BRICK_ROWS = 6
const BRICK_COLS = 7
const BRICK_HEIGHT = 30
const BRICK_GAP = 3
const PADDLE_HEIGHT = 12
const PADDLE_WIDTH = 80
const BALL_RADIUS = 8
const BASE_SPEED = 4
const SPEED_INCREMENT = 0.2

const ROW_COLORS = ['#D5E8FF', '#FFE9D5', '#D5F5E3', '#FFD5E9', '#E9D5FF', '#FFFBD5']
// cycle through slice2-slice9 skipping slice8
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
  x: number
  y: number
  w: number
  h: number
  alive: boolean
  row: number
  col: number
}

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
}

interface Paddle {
  x: number
}

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

export default function BrickBreakerGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<{
    ball: Ball
    paddle: Paddle
    bricks: Brick[]
    lives: number
    score: number
    gameState: GameState
    rowsCleared: number
    speed: number
    images: HTMLImageElement[]
    imagesLoaded: boolean
    rafId: number
    keys: Set<string>
  }>({
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    paddle: { x: 0 },
    bricks: [],
    lives: 3,
    score: 0,
    gameState: 'idle',
    rowsCleared: 0,
    speed: BASE_SPEED,
    images: [],
    imagesLoaded: false,
    rafId: 0,
    keys: new Set(),
  })

  const [lives, setLives] = useState(3)
  const [score, setScore] = useState(0)
  const [gameState, setGameState] = useState<GameState>('idle')

  const getCanvasSize = () => {
    const w = Math.min(360, window.innerWidth - 20)
    const h = Math.round(w * (500 / 360))
    return { w, h }
  }

  const initGame = useCallback((canvasW: number, canvasH: number) => {
    const s = stateRef.current
    s.bricks = buildBricks(canvasW)
    s.paddle = { x: canvasW / 2 - PADDLE_WIDTH / 2 }
    s.ball = {
      x: canvasW / 2,
      y: canvasH - PADDLE_HEIGHT - 40,
      vx: BASE_SPEED * (Math.random() > 0.5 ? 1 : -1),
      vy: -BASE_SPEED,
    }
    s.lives = 3
    s.score = 0
    s.gameState = 'playing'
    s.rowsCleared = 0
    s.speed = BASE_SPEED
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
        const allLoaded = s.images.every(i => i.complete && i.naturalWidth > 0)
        if (allLoaded) s.imagesLoaded = true
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

    const handleKeyDown = (e: KeyboardEvent) => {
      s.keys.add(e.key)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      s.keys.delete(e.key)
    }

    const handleClick = () => {
      if (s.gameState === 'idle') {
        initGame(canvas.width, canvas.height)
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('click', handleClick)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const draw = (ctx: CanvasRenderingContext2D) => {
      const cw = canvas.width
      const ch = canvas.height

      // Background
      ctx.fillStyle = '#F0F4FF'
      ctx.fillRect(0, 0, cw, ch)

      if (s.gameState === 'idle') {
        ctx.fillStyle = '#4D72FB'
        ctx.font = 'bold 22px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('클릭해서 시작!', cw / 2, ch / 2)
        ctx.font = '15px sans-serif'
        ctx.fillStyle = '#888'
        ctx.fillText('마우스 또는 터치로 패들을 움직여요', cw / 2, ch / 2 + 32)
        return
      }

      // Keyboard paddle control
      if (s.keys.has('ArrowLeft')) {
        s.paddle.x = Math.max(0, s.paddle.x - 10)
      }
      if (s.keys.has('ArrowRight')) {
        s.paddle.x = Math.min(cw - PADDLE_WIDTH, s.paddle.x + 10)
      }

      if (s.gameState === 'playing') {
        // Move ball
        s.ball.x += s.ball.vx
        s.ball.y += s.ball.vy

        // Wall collisions
        if (s.ball.x - BALL_RADIUS < 0) {
          s.ball.x = BALL_RADIUS
          s.ball.vx = Math.abs(s.ball.vx)
        }
        if (s.ball.x + BALL_RADIUS > cw) {
          s.ball.x = cw - BALL_RADIUS
          s.ball.vx = -Math.abs(s.ball.vx)
        }
        if (s.ball.y - BALL_RADIUS < 0) {
          s.ball.y = BALL_RADIUS
          s.ball.vy = Math.abs(s.ball.vy)
        }

        // Paddle collision
        const paddleTop = ch - PADDLE_HEIGHT - 20
        if (
          s.ball.y + BALL_RADIUS >= paddleTop &&
          s.ball.y - BALL_RADIUS <= paddleTop + PADDLE_HEIGHT &&
          s.ball.x >= s.paddle.x &&
          s.ball.x <= s.paddle.x + PADDLE_WIDTH &&
          s.ball.vy > 0
        ) {
          const hitPos = (s.ball.x - s.paddle.x) / PADDLE_WIDTH // 0..1
          const angle = (hitPos - 0.5) * 2 * (Math.PI * 0.4) // -36 to +36 deg from vertical
          const spd = Math.sqrt(s.ball.vx * s.ball.vx + s.ball.vy * s.ball.vy)
          s.ball.vx = spd * Math.sin(angle)
          s.ball.vy = -Math.abs(spd * Math.cos(angle))
          s.ball.y = paddleTop - BALL_RADIUS
        }

        // Ball out of bounds (bottom)
        if (s.ball.y - BALL_RADIUS > ch) {
          s.lives -= 1
          setLives(s.lives)
          if (s.lives <= 0) {
            s.gameState = 'lost'
            setGameState('lost')
          } else {
            // Reset ball
            s.ball = {
              x: cw / 2,
              y: ch - PADDLE_HEIGHT - 60,
              vx: s.speed * (Math.random() > 0.5 ? 1 : -1),
              vy: -s.speed,
            }
          }
        }

        // Brick collisions
        let bricksThisFrame = 0
        for (const brick of s.bricks) {
          if (!brick.alive) continue
          const bLeft = brick.x
          const bRight = brick.x + brick.w
          const bTop = brick.y
          const bBottom = brick.y + brick.h

          if (
            s.ball.x + BALL_RADIUS > bLeft &&
            s.ball.x - BALL_RADIUS < bRight &&
            s.ball.y + BALL_RADIUS > bTop &&
            s.ball.y - BALL_RADIUS < bBottom
          ) {
            brick.alive = false
            bricksThisFrame++
            s.score += 10
            setScore(s.score)

            // Determine bounce direction
            const overlapLeft = s.ball.x + BALL_RADIUS - bLeft
            const overlapRight = bRight - (s.ball.x - BALL_RADIUS)
            const overlapTop = s.ball.y + BALL_RADIUS - bTop
            const overlapBottom = bBottom - (s.ball.y - BALL_RADIUS)
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom)
            if (minOverlap === overlapTop || minOverlap === overlapBottom) {
              s.ball.vy = -s.ball.vy
            } else {
              s.ball.vx = -s.ball.vx
            }
            break
          }
        }

        // Check row cleared (speed up)
        for (let r = 0; r < BRICK_ROWS; r++) {
          const rowBricks = s.bricks.filter(b => b.row === r)
          if (rowBricks.every(b => !b.alive)) {
            const wasCleared = s.rowsCleared
            const cleared = BRICK_ROWS - rowBricks.filter(b => !b.alive).length
            if (s.rowsCleared < BRICK_ROWS) {
              // count distinct cleared rows
            }
          }
        }

        // Simpler speed tracking: increase speed based on score
        const newSpeed = BASE_SPEED + Math.floor(s.score / 70) * SPEED_INCREMENT
        if (newSpeed !== s.speed && newSpeed < BASE_SPEED + 3) {
          const ratio = newSpeed / s.speed
          s.ball.vx *= ratio
          s.ball.vy *= ratio
          s.speed = newSpeed
        }

        // Check win
        if (s.bricks.every(b => !b.alive)) {
          s.gameState = 'won'
          setGameState('won')
        }
      }

      // Draw bricks
      for (const brick of s.bricks) {
        if (!brick.alive) continue
        ctx.fillStyle = ROW_COLORS[brick.row % ROW_COLORS.length]
        ctx.beginPath()
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 4)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'
        ctx.lineWidth = 1
        ctx.stroke()

        if (s.imagesLoaded) {
          const imgIdx = (brick.row * BRICK_COLS + brick.col) % CHAR_SRCS.length
          const img = s.images[imgIdx]
          if (img.complete && img.naturalWidth > 0) {
            const pad = 3
            const drawSize = Math.min(brick.w - pad * 2, brick.h - pad * 2)
            ctx.drawImage(
              img,
              brick.x + (brick.w - drawSize) / 2,
              brick.y + (brick.h - drawSize) / 2,
              drawSize,
              drawSize
            )
          }
        }
      }

      // Draw paddle
      ctx.fillStyle = '#4D72FB'
      const paddleY = canvas.height - PADDLE_HEIGHT - 20
      ctx.beginPath()
      ctx.roundRect(s.paddle.x, paddleY, PADDLE_WIDTH, PADDLE_HEIGHT, 6)
      ctx.fill()
      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.roundRect(s.paddle.x + 4, paddleY + 2, PADDLE_WIDTH - 8, 4, 3)
      ctx.fill()

      // Draw ball
      ctx.shadowColor = '#4D72FB'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(s.ball.x, s.ball.y, BALL_RADIUS, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // Ground line
      ctx.fillStyle = '#C8D4FF'
      ctx.fillRect(0, ch - 8, cw, 8)

      // Overlay on end
      if (s.gameState === 'won' || s.gameState === 'lost') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(0, 0, cw, ch)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 30px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(s.gameState === 'won' ? '클리어!' : '게임 오버', cw / 2, ch / 2 - 20)
        ctx.font = 'bold 20px sans-serif'
        ctx.fillStyle = '#FFD700'
        ctx.fillText(`점수: ${s.score}점`, cw / 2, ch / 2 + 20)
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
        <div style={{
          display: 'flex',
          gap: 24,
          marginBottom: 10,
          fontWeight: 800,
          fontSize: 15,
          color: '#333',
        }}>
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
              border: '2px solid #C8D4FF',
              touchAction: 'none',
            }}
          />
          {(gameState === 'won' || gameState === 'lost') && (
            <div style={{ ...overlayStyle, pointerEvents: 'auto' }}>
              <div style={{ height: 120 }} />
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
