import { useEffect, useRef, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

type GameState = 'select' | 'playing' | 'lost'

const CANVAS_H = 260
const GROUND_Y = 200
const CHAR_SIZE = 50
const GRAVITY = 0.72
const JUMP_VELOCITY = -13
const CHAR_X = 60

const CHAR_SRCS = [
  'slice/slice2.png',
  'slice/slice3.png',
  'slice/slice4.png',
  'slice/slice5.png',
  'slice/slice6.png',
]

type ObstacleType = 'cactus_short' | 'cactus_tall' | 'cactus_double' | 'cactus_cluster' | 'rock' | 'bird_low' | 'bird_mid'

interface Obstacle {
  x: number
  w: number
  h: number
  type: ObstacleType
  // For birds: their actual flight Y (top of bird sprite)
  birdY?: number
}

interface Cloud { x: number; y: number; w: number }

function pickObstacleType(score: number): ObstacleType {
  const rand = Math.random()
  if (score >= 40) {
    // Full pool
    if (rand < 0.28) return 'cactus_short'
    if (rand < 0.50) return 'cactus_tall'
    if (rand < 0.65) return 'cactus_double'
    if (rand < 0.75) return 'rock'
    if (rand < 0.85) return 'cactus_cluster'
    if (rand < 0.93) return 'bird_low'
    return 'bird_mid'
  }
  if (score >= 20) {
    // Extended pool
    if (rand < 0.35) return 'cactus_short'
    if (rand < 0.62) return 'cactus_tall'
    if (rand < 0.78) return 'cactus_double'
    return 'rock'
  }
  // Basic pool
  return rand < 0.55 ? 'cactus_short' : 'cactus_tall'
}

function obstacleParams(type: ObstacleType): { w: number; h: number; birdY?: number } {
  switch (type) {
    case 'cactus_short':   return { w: 24, h: 40 }
    case 'cactus_tall':    return { w: 28, h: 65 }
    case 'cactus_double':  return { w: 55, h: 45 }
    case 'cactus_cluster': return { w: 70, h: 50 }
    case 'rock':           return { w: 45, h: 28 }
    case 'bird_low':       return { w: 36, h: 24, birdY: GROUND_Y - 60 }
    case 'bird_mid':       return { w: 36, h: 24, birdY: GROUND_Y - 90 }
  }
}

export default function DinoGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>('select')
  const [selectedChar, setSelectedChar] = useState(0)
  const [score, setScore] = useState(0)

  const stateRef = useRef<{
    charY: number
    charVY: number
    onGround: boolean
    crouching: boolean
    obstacles: Obstacle[]
    clouds: Cloud[]
    speed: number
    frameCount: number
    score: number
    gameState: GameState
    selectedChar: number
    rafId: number
    images: HTMLImageElement[]
    imagesLoaded: boolean
    nextObstacleIn: number
    animFrame: number
  }>({
    charY: GROUND_Y,
    charVY: 0,
    onGround: true,
    crouching: false,
    obstacles: [],
    clouds: [],
    speed: 4,
    frameCount: 0,
    score: 0,
    gameState: 'select',
    selectedChar: 0,
    rafId: 0,
    images: [],
    imagesLoaded: false,
    nextObstacleIn: 100,
    animFrame: 0,
  })

  // Load images
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
    s.clouds = [
      { x: 80,  y: 30, w: 60 },
      { x: 200, y: 50, w: 80 },
      { x: 320, y: 20, w: 50 },
    ]
  }, [])

  const jump = useCallback(() => {
    const s = stateRef.current
    if (s.gameState !== 'playing') return
    if (s.onGround) {
      s.charVY = JUMP_VELOCITY
      s.onGround = false
      s.crouching = false
    }
  }, [])

  const startGame = useCallback((charIdx: number) => {
    const s = stateRef.current
    s.charY = GROUND_Y
    s.charVY = 0
    s.onGround = true
    s.crouching = false
    s.obstacles = []
    s.speed = 5
    s.frameCount = 0
    s.score = 0
    s.gameState = 'playing'
    s.selectedChar = charIdx
    s.nextObstacleIn = 55 + Math.floor(Math.random() * 35)
    s.animFrame = 0
    setScore(0)
    setGameState('playing')
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getW = () => Math.min(480, Math.max(360, window.innerWidth - 20))
    canvas.width = getW()
    canvas.height = CANVAS_H

    const s = stateRef.current

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault()
        jump()
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault()
        if (s.gameState === 'playing') s.crouching = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        s.crouching = false
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      jump()
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // --- Drawing helpers ---

    const drawCactus = (ctx: CanvasRenderingContext2D, obs: Obstacle) => {
      const cactusColor = '#5D8A3C'
      const darkColor = '#3D6020'

      if (obs.type === 'cactus_short') {
        // Body
        ctx.fillStyle = cactusColor
        ctx.beginPath()
        ctx.roundRect(obs.x + obs.w * 0.3, GROUND_Y - obs.h, obs.w * 0.4, obs.h, 3)
        ctx.fill()
        // One arm
        ctx.fillRect(obs.x, GROUND_Y - obs.h * 0.6, obs.w * 0.32, obs.h * 0.18)
        ctx.beginPath()
        ctx.roundRect(obs.x, GROUND_Y - obs.h * 0.6 - obs.h * 0.18, obs.w * 0.32, obs.h * 0.18, 3)
        ctx.fill()
        ctx.fillStyle = darkColor
        ctx.fillRect(obs.x + obs.w * 0.38, GROUND_Y - obs.h, obs.w * 0.08, obs.h)

      } else if (obs.type === 'cactus_tall') {
        ctx.fillStyle = cactusColor
        ctx.beginPath()
        ctx.roundRect(obs.x + obs.w * 0.3, GROUND_Y - obs.h, obs.w * 0.4, obs.h, 3)
        ctx.fill()
        // Left arm
        ctx.fillRect(obs.x, GROUND_Y - obs.h * 0.65, obs.w * 0.32, obs.h * 0.22)
        ctx.beginPath()
        ctx.roundRect(obs.x, GROUND_Y - obs.h * 0.65 - obs.h * 0.22, obs.w * 0.32, obs.h * 0.22, 3)
        ctx.fill()
        // Right arm
        ctx.fillRect(obs.x + obs.w * 0.68, GROUND_Y - obs.h * 0.55, obs.w * 0.32, obs.h * 0.18)
        ctx.beginPath()
        ctx.roundRect(obs.x + obs.w * 0.68, GROUND_Y - obs.h * 0.55 - obs.h * 0.18, obs.w * 0.32, obs.h * 0.18, 3)
        ctx.fill()
        ctx.fillStyle = darkColor
        ctx.fillRect(obs.x + obs.w * 0.38, GROUND_Y - obs.h, obs.w * 0.08, obs.h)

      } else if (obs.type === 'cactus_double') {
        // Two side-by-side short cacti
        const unitW = obs.w * 0.44
        for (let i = 0; i < 2; i++) {
          const ox = obs.x + i * (obs.w * 0.54)
          ctx.fillStyle = cactusColor
          ctx.beginPath()
          ctx.roundRect(ox + unitW * 0.28, GROUND_Y - obs.h, unitW * 0.44, obs.h, 3)
          ctx.fill()
          ctx.fillRect(ox, GROUND_Y - obs.h * 0.6, unitW * 0.3, obs.h * 0.18)
          ctx.beginPath()
          ctx.roundRect(ox, GROUND_Y - obs.h * 0.6 - obs.h * 0.18, unitW * 0.3, obs.h * 0.18, 3)
          ctx.fill()
          ctx.fillStyle = darkColor
          ctx.fillRect(ox + unitW * 0.34, GROUND_Y - obs.h, unitW * 0.08, obs.h)
        }

      } else if (obs.type === 'cactus_cluster') {
        // Three small cacti in a group
        const positions = [0, obs.w * 0.32, obs.w * 0.62]
        const heights = [obs.h * 0.8, obs.h, obs.h * 0.75]
        const widths = [obs.w * 0.3, obs.w * 0.28, obs.w * 0.28]
        for (let i = 0; i < 3; i++) {
          const ox = obs.x + positions[i]
          const oh = heights[i]
          const ow = widths[i]
          ctx.fillStyle = cactusColor
          ctx.beginPath()
          ctx.roundRect(ox + ow * 0.28, GROUND_Y - oh, ow * 0.44, oh, 3)
          ctx.fill()
          ctx.fillStyle = darkColor
          ctx.fillRect(ox + ow * 0.34, GROUND_Y - oh, ow * 0.1, oh)
        }
      }
    }

    const drawRock = (ctx: CanvasRenderingContext2D, obs: Obstacle) => {
      ctx.fillStyle = '#8B7355'
      ctx.beginPath()
      ctx.roundRect(obs.x, GROUND_Y - obs.h, obs.w, obs.h, 8)
      ctx.fill()
      // Shadow
      ctx.fillStyle = '#6B5535'
      ctx.fillRect(obs.x + 4, GROUND_Y - 8, obs.w - 8, 6)
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.beginPath()
      ctx.ellipse(obs.x + obs.w * 0.35, GROUND_Y - obs.h + obs.h * 0.3, obs.w * 0.22, obs.h * 0.12, -0.3, 0, Math.PI * 2)
      ctx.fill()
    }

    const drawBird = (ctx: CanvasRenderingContext2D, obs: Obstacle) => {
      const bx = obs.x
      const by = obs.birdY ?? (GROUND_Y - 60)
      const bw = obs.w
      const bh = obs.h
      // Body
      ctx.fillStyle = '#E8604C'
      ctx.beginPath()
      ctx.ellipse(bx + bw * 0.5, by + bh * 0.55, bw * 0.22, bh * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()
      // Left wing
      ctx.fillStyle = '#CC4030'
      ctx.beginPath()
      ctx.moveTo(bx + bw * 0.3, by + bh * 0.5)
      ctx.bezierCurveTo(bx + bw * 0.05, by, bx, by + bh * 0.2, bx + bw * 0.25, by + bh * 0.6)
      ctx.closePath()
      ctx.fill()
      // Right wing
      ctx.beginPath()
      ctx.moveTo(bx + bw * 0.7, by + bh * 0.5)
      ctx.bezierCurveTo(bx + bw * 0.95, by, bx + bw, by + bh * 0.2, bx + bw * 0.75, by + bh * 0.6)
      ctx.closePath()
      ctx.fill()
      // Eye
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(bx + bw * 0.56, by + bh * 0.45, bh * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#222'
      ctx.beginPath()
      ctx.arc(bx + bw * 0.57, by + bh * 0.46, bh * 0.06, 0, Math.PI * 2)
      ctx.fill()
      // Beak
      ctx.fillStyle = '#FFB300'
      ctx.beginPath()
      ctx.moveTo(bx + bw * 0.63, by + bh * 0.52)
      ctx.lineTo(bx + bw * 0.78, by + bh * 0.52)
      ctx.lineTo(bx + bw * 0.63, by + bh * 0.60)
      ctx.closePath()
      ctx.fill()
    }

    const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle) => {
      if (obs.type === 'rock') drawRock(ctx, obs)
      else if (obs.type === 'bird_low' || obs.type === 'bird_mid') drawBird(ctx, obs)
      else drawCactus(ctx, obs)
    }

    const loop = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) { s.rafId = requestAnimationFrame(loop); return }
      const cw = canvas.width
      const ch = canvas.height

      // Sky
      ctx.fillStyle = '#D6EEFF'
      ctx.fillRect(0, 0, cw, ch)

      // Clouds
      for (const cloud of s.clouds) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.beginPath()
        ctx.ellipse(cloud.x, cloud.y, cloud.w / 2, 14, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(cloud.x - cloud.w * 0.2, cloud.y + 4, cloud.w * 0.32, 10, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(cloud.x + cloud.w * 0.2, cloud.y + 5, cloud.w * 0.28, 9, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      // Ground
      ctx.fillStyle = '#C8A878'
      ctx.fillRect(0, GROUND_Y, cw, ch - GROUND_Y)
      ctx.fillStyle = '#B09060'
      ctx.fillRect(0, GROUND_Y, cw, 4)

      if (s.gameState === 'playing') {
        s.frameCount++
        s.speed = 5 + s.frameCount * 0.002
        s.score = Math.floor(s.frameCount / 10)

        // If crouching in air: no special physics, just crouching visual
        // Gravity
        s.charVY += GRAVITY
        s.charY += s.charVY

        if (s.charY >= GROUND_Y) {
          s.charY = GROUND_Y
          s.charVY = 0
          s.onGround = true
        }

        // Clouds
        for (const cloud of s.clouds) cloud.x -= 0.5
        s.clouds = s.clouds.filter(c => c.x + 80 > 0)
        if (Math.random() < 0.003) {
          s.clouds.push({ x: cw + 60, y: 15 + Math.random() * 50, w: 50 + Math.random() * 50 })
        }

        // Obstacle spawning
        s.nextObstacleIn--
        if (s.nextObstacleIn <= 0) {
          const type = pickObstacleType(s.score)
          const params = obstacleParams(type)
          s.obstacles.push({
            x: cw + 10,
            ...params,
            type,
          })
          s.nextObstacleIn = 150 + Math.floor(Math.random() * 150)
        }

        for (const obs of s.obstacles) obs.x -= s.speed
        s.obstacles = s.obstacles.filter(o => o.x + o.w > 0)

        // Collision detection
        const isCrouching = s.crouching && s.onGround
        const charH = isCrouching ? 25 : CHAR_SIZE
        const charLeft  = CHAR_X + 6
        const charRight = CHAR_X + (isCrouching ? 60 : CHAR_SIZE) - 6
        const charTop   = s.charY - charH + 4
        const charBottom = s.charY

        for (const obs of s.obstacles) {
          const isBird = obs.type === 'bird_low' || obs.type === 'bird_mid'
          let obsLeft: number, obsRight: number, obsTop: number, obsBottom: number

          if (isBird) {
            obsLeft   = obs.x + 4
            obsRight  = obs.x + obs.w - 4
            obsTop    = (obs.birdY ?? 0) + 2
            obsBottom = (obs.birdY ?? 0) + obs.h - 2
          } else {
            obsLeft   = obs.x + 4
            obsRight  = obs.x + obs.w - 4
            obsTop    = GROUND_Y - obs.h
            obsBottom = GROUND_Y
          }

          if (
            charRight > obsLeft  &&
            charLeft  < obsRight &&
            charBottom > obsTop  &&
            charTop   < obsBottom
          ) {
            s.gameState = 'lost'
            setGameState('lost')
            break
          }
        }

        if (s.frameCount % 10 === 0) setScore(s.score)
        s.animFrame = Math.floor(s.frameCount / 12) % 2
      }

      // Draw obstacles
      for (const obs of s.obstacles) drawObstacle(ctx, obs)

      // Draw character
      if (s.gameState === 'playing' || s.gameState === 'lost') {
        const img = s.images[s.selectedChar]
        const isCrouching = s.crouching && s.onGround
        const crouchOffset = (!s.onGround || isCrouching) ? 0 : (s.animFrame === 1 ? 4 : 0)

        if (s.imagesLoaded && img && img.complete && img.naturalWidth > 0) {
          if (isCrouching) {
            // Wider and shorter when crouching
            ctx.drawImage(img, CHAR_X - 5, s.charY - 28, 60, 28)
          } else {
            ctx.drawImage(img, CHAR_X, s.charY - CHAR_SIZE + crouchOffset, CHAR_SIZE, CHAR_SIZE - crouchOffset)
          }
        } else {
          ctx.fillStyle = '#4D72FB'
          ctx.beginPath()
          ctx.arc(CHAR_X + CHAR_SIZE / 2, s.charY - CHAR_SIZE / 2 + crouchOffset, CHAR_SIZE / 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Score on canvas
      if (s.gameState === 'playing') {
        ctx.fillStyle = '#555'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(`${s.score}점`, cw - 12, 24)
      }

      // Game over overlay
      if (s.gameState === 'lost') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(0, 0, cw, ch)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 26px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('게임 오버!', cw / 2, ch / 2 - 10)
        ctx.font = 'bold 17px sans-serif'
        ctx.fillStyle = '#FFD700'
        ctx.fillText(`점수: ${s.score}점`, cw / 2, ch / 2 + 18)
      }

      s.rafId = requestAnimationFrame(loop)
    }

    s.rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(s.rafId)
      canvas.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [jump])

  const handleCharSelect = (idx: number) => {
    setSelectedChar(idx)
    stateRef.current.selectedChar = idx
  }

  const handleStart = () => { startGame(selectedChar) }

  const handleRestart = () => {
    setGameState('select')
    stateRef.current.gameState = 'select'
  }

  const canvasW = Math.min(480, Math.max(360, typeof window !== 'undefined' ? window.innerWidth - 20 : 360))

  return (
    <Layout title="달리기 게임" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 24px', gap: 12 }}>

        {/* Character selection panel */}
        {gameState === 'select' && (
          <div style={{
            background: '#F0F4FF',
            borderRadius: 16,
            padding: '20px 16px',
            width: canvasW,
            boxSizing: 'border-box',
          }}>
            <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 17, color: '#333', marginBottom: 16 }}>
              캐릭터를 선택하세요!
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
              {CHAR_SRCS.map((src, i) => (
                <button
                  key={i}
                  onClick={() => handleCharSelect(i)}
                  style={{
                    background: selectedChar === i ? '#4D72FB' : '#fff',
                    border: selectedChar === i ? '3px solid #2A50D8' : '3px solid #C8D4FF',
                    borderRadius: 14,
                    padding: 6,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    transform: selectedChar === i ? 'scale(1.12)' : 'scale(1)',
                  }}
                >
                  <img src={src} alt={`캐릭터 ${i + 1}`} style={{ width: 48, height: 48, objectFit: 'contain', display: 'block' }} />
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center' }}>
              <Button onClick={handleStart} size="lg">시작하기!</Button>
            </div>
          </div>
        )}

        {/* Score */}
        {gameState !== 'select' && (
          <div style={{ fontWeight: 800, fontSize: 15, color: '#4D72FB', textAlign: 'center' }}>
            점수: {score}점
          </div>
        )}

        {/* Canvas wrapper */}
        <div style={{
          position: 'relative',
          width: canvasW,
          visibility: gameState === 'select' ? 'hidden' : 'visible',
          height: gameState === 'select' ? 0 : 'auto',
          overflow: 'hidden',
        }}>
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              borderRadius: 12,
              border: '2px solid #C8D4FF',
              touchAction: 'none',
              width: canvasW,
              height: CANVAS_H,
            }}
          />
          {gameState === 'lost' && (
            <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
              <Button onClick={handleRestart}>다시 하기</Button>
            </div>
          )}
        </div>

        {gameState === 'playing' && (
          <div style={{ color: '#AAA', fontSize: 12, textAlign: 'center' }}>
            점프: 스페이스/위 | 숙이기: 아래
          </div>
        )}
      </div>
    </Layout>
  )
}
