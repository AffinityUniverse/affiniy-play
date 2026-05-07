import { useEffect, useRef, useState, useCallback, CSSProperties } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

type GameState = 'select' | 'playing' | 'lost'

const CANVAS_H = 260
const GROUND_Y = 200
const CHAR_SIZE = 50
const GRAVITY = 0.6
const JUMP_VELOCITY = -14
const CHAR_X = 60

const CHAR_SRCS = [
  'slice/slice2.png',
  'slice/slice3.png',
  'slice/slice4.png',
  'slice/slice5.png',
  'slice/slice6.png',
]

interface Obstacle {
  x: number
  w: number
  h: number
}

interface Cloud {
  x: number
  y: number
  w: number
}

export default function DinoGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>('select')
  const [selectedChar, setSelectedChar] = useState(0)
  const [score, setScore] = useState(0)
  const [finalScore, setFinalScore] = useState(0)

  const stateRef = useRef<{
    charY: number
    charVY: number
    onGround: boolean
    jumpsUsed: number
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
    jumpsUsed: 0,
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
        if (s.images.every(i => i.complete && i.naturalWidth > 0)) {
          s.imagesLoaded = true
        }
      }
      return img
    })
    // Initial clouds
    s.clouds = [
      { x: 80, y: 30, w: 60 },
      { x: 200, y: 50, w: 80 },
      { x: 320, y: 20, w: 50 },
    ]
  }, [])

  const jump = useCallback(() => {
    const s = stateRef.current
    if (s.gameState !== 'playing') return
    if (s.jumpsUsed < 2) {
      s.charVY = JUMP_VELOCITY
      s.onGround = false
      s.jumpsUsed++
    }
  }, [])

  const startGame = useCallback((charIdx: number) => {
    const s = stateRef.current
    s.charY = GROUND_Y
    s.charVY = 0
    s.onGround = true
    s.jumpsUsed = 0
    s.obstacles = []
    s.speed = 4
    s.frameCount = 0
    s.score = 0
    s.gameState = 'playing'
    s.selectedChar = charIdx
    s.nextObstacleIn = 80 + Math.floor(Math.random() * 60)
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
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        jump()
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      jump()
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    window.addEventListener('keydown', handleKeyDown)

    const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle) => {
      const cactusColor = '#5D8A3C'
      const darkColor = '#3D6020'

      // Body
      ctx.fillStyle = cactusColor
      ctx.beginPath()
      ctx.roundRect(obs.x + obs.w * 0.3, GROUND_Y - obs.h, obs.w * 0.4, obs.h, 3)
      ctx.fill()

      if (obs.h >= 60) {
        // Tall: two arms
        ctx.fillStyle = cactusColor
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
      } else {
        // Short: one arm
        ctx.fillStyle = cactusColor
        ctx.fillRect(obs.x, GROUND_Y - obs.h * 0.6, obs.w * 0.32, obs.h * 0.18)
        ctx.beginPath()
        ctx.roundRect(obs.x, GROUND_Y - obs.h * 0.6 - obs.h * 0.18, obs.w * 0.32, obs.h * 0.18, 3)
        ctx.fill()
      }

      // Dark stripe
      ctx.fillStyle = darkColor
      ctx.fillRect(obs.x + obs.w * 0.38, GROUND_Y - obs.h, obs.w * 0.08, obs.h)
    }

    const loop = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        s.rafId = requestAnimationFrame(loop)
        return
      }
      const cw = canvas.width
      const ch = canvas.height

      // Sky background
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
        s.speed = 4 + s.frameCount * 0.001
        s.score = Math.floor(s.frameCount / 10)

        // Gravity
        s.charVY += GRAVITY
        s.charY += s.charVY

        if (s.charY >= GROUND_Y) {
          s.charY = GROUND_Y
          s.charVY = 0
          s.onGround = true
          s.jumpsUsed = 0
        }

        // Move clouds
        for (const cloud of s.clouds) {
          cloud.x -= 0.5
        }
        s.clouds = s.clouds.filter(c => c.x + 80 > 0)
        if (Math.random() < 0.003) {
          s.clouds.push({ x: cw + 60, y: 15 + Math.random() * 50, w: 50 + Math.random() * 50 })
        }

        // Obstacles
        s.nextObstacleIn--
        if (s.nextObstacleIn <= 0) {
          const tall = Math.random() > 0.5
          s.obstacles.push({
            x: cw + 10,
            w: 28 + Math.random() * 14,
            h: tall ? 60 : 40,
          })
          s.nextObstacleIn = 300 + Math.floor(Math.random() * 300)
        }

        for (const obs of s.obstacles) {
          obs.x -= s.speed
        }
        s.obstacles = s.obstacles.filter(o => o.x + o.w > 0)

        // Collision detection
        const charLeft = CHAR_X + 6
        const charRight = CHAR_X + CHAR_SIZE - 6
        const charTop = s.charY - CHAR_SIZE + 4
        const charBottom = s.charY

        for (const obs of s.obstacles) {
          const obsLeft = obs.x + 4
          const obsRight = obs.x + obs.w - 4
          const obsTop = GROUND_Y - obs.h
          if (
            charRight > obsLeft &&
            charLeft < obsRight &&
            charBottom > obsTop &&
            charTop < GROUND_Y
          ) {
            s.gameState = 'lost'
            setFinalScore(s.score)
            setGameState('lost')
            break
          }
        }

        // Update score display periodically
        if (s.frameCount % 10 === 0) {
          setScore(s.score)
        }

        // Animation frame
        s.animFrame = Math.floor(s.frameCount / 12) % 2
      }

      // Draw obstacles
      for (const obs of s.obstacles) {
        drawObstacle(ctx, obs)
      }

      // Draw character
      if (s.gameState === 'playing' || s.gameState === 'lost') {
        const img = s.images[s.selectedChar]
        const crouchOffset = (!s.onGround) ? 0 : (s.animFrame === 1 ? 4 : 0)

        if (s.imagesLoaded && img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(
            img,
            CHAR_X,
            s.charY - CHAR_SIZE + crouchOffset,
            CHAR_SIZE,
            CHAR_SIZE - crouchOffset
          )
        } else {
          // Fallback circle
          ctx.fillStyle = '#4D72FB'
          ctx.beginPath()
          ctx.arc(CHAR_X + CHAR_SIZE / 2, s.charY - CHAR_SIZE / 2 + crouchOffset, CHAR_SIZE / 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Score display on canvas
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
    }
  }, [jump])

  const handleCharSelect = (idx: number) => {
    setSelectedChar(idx)
    stateRef.current.selectedChar = idx
  }

  const handleStart = () => {
    startGame(selectedChar)
  }

  const handleRestart = () => {
    setGameState('select')
    stateRef.current.gameState = 'select'
  }

  const canvasW = Math.min(480, Math.max(360, typeof window !== 'undefined' ? window.innerWidth - 20 : 360))

  return (
    <Layout title="달리기 게임" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 24px', gap: 12 }}>

        {/* Character selection */}
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
              <Button onClick={handleStart} size="lg">
                시작하기!
              </Button>
            </div>
          </div>
        )}

        {/* Canvas — always mounted so the ref stays stable */}
        <div style={{ display: gameState !== 'select' ? 'block' : 'none' }}>
          {gameState !== 'select' && (
            <div style={{ fontWeight: 800, fontSize: 15, color: '#4D72FB', textAlign: 'center', marginBottom: 6 }}>
              점수: {score}점
            </div>
          )}
          <div style={{ position: 'relative', width: canvasW }}>
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
              <div style={{
                position: 'absolute',
                bottom: 24,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
              }}>
                <Button onClick={handleRestart}>다시 하기</Button>
              </div>
            )}
          </div>
          {gameState === 'playing' && (
            <div style={{ color: '#AAA', fontSize: 12, textAlign: 'center', marginTop: 6 }}>
              스페이스바 또는 화면 터치 = 점프 (2단 점프 가능)
            </div>
          )}
        </div>
        {/* Hidden canvas placeholder during select so ref initialises */}
        {gameState === 'select' && (
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        )}
      </div>
    </Layout>
  )
}
