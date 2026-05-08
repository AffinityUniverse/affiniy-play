import { useEffect, useRef, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

type GameState = 'select' | 'playing' | 'lost'

const CANVAS_H = 300
const CEILING = 12
const FLOOR = 284
const CHAR_X = 90
const CHAR_SIZE = 44
const GRAVITY = 0.38
const THRUST = -0.62
const MAX_VY_DOWN = 11
const MAX_VY_UP = -9
const BASE_SPEED = 3.2
const GAP_H = 128
const OBS_W = 54
const OBS_SPACING = 230

const CHAR_SRCS = [
  'slice/slice2.png', 'slice/slice3.png', 'slice/slice4.png',
  'slice/slice5.png', 'slice/slice6.png', 'slice/slice7.png', 'slice/slice9.png',
]

interface Obstacle { x: number; gapY: number }
interface Cloud { x: number; y: number; w: number }

export default function PlaneGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>('select')
  const [selectedChar, setSelectedChar] = useState(0)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)

  const s = useRef({
    charY: CANVAS_H / 2,
    charVY: 0,
    pressing: false,
    obstacles: [] as Obstacle[],
    clouds: [
      { x: 80, y: 55, w: 72 },
      { x: 240, y: 38, w: 58 },
      { x: 390, y: 78, w: 64 },
    ] as Cloud[],
    speed: BASE_SPEED,
    frameCount: 0,
    score: 0,
    bestScore: 0,
    gameState: 'select' as GameState,
    selectedChar: 0,
    rafId: 0,
    images: [] as HTMLImageElement[],
    imagesLoaded: false,
    nextObstacleIn: 90,
  })

  useEffect(() => {
    const st = s.current
    st.images = CHAR_SRCS.map(src => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        if (st.images.every(i => i.complete && i.naturalWidth > 0)) st.imagesLoaded = true
      }
      return img
    })
  }, [])

  const startGame = useCallback((charIdx: number) => {
    const st = s.current
    st.charY = CANVAS_H / 2
    st.charVY = -2
    st.pressing = false
    st.obstacles = []
    st.speed = BASE_SPEED
    st.frameCount = 0
    st.score = 0
    st.gameState = 'playing'
    st.selectedChar = charIdx
    st.nextObstacleIn = 90
    setScore(0)
    setGameState('playing')
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getW = () => Math.min(480, Math.max(320, window.innerWidth - 20))
    canvas.width = getW()
    canvas.height = CANVAS_H

    const st = s.current

    const setPress = (v: boolean) => { if (st.gameState === 'playing') st.pressing = v }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); setPress(true) }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') setPress(false)
    }
    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); setPress(true) }
    const onTouchEnd = () => setPress(false)
    const onMouseDown = () => setPress(true)
    const onMouseUp = () => setPress(false)

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const drawCloud = (ctx: CanvasRenderingContext2D, c: Cloud) => {
      ctx.fillStyle = 'rgba(255,255,255,0.88)'
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w/2, 14, 0, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(c.x - c.w*0.22, c.y+5, c.w*0.3, 10, 0, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(c.x + c.w*0.22, c.y+5, c.w*0.28, 9, 0, 0, Math.PI*2); ctx.fill()
    }

    const drawObs = (ctx: CanvasRenderingContext2D, obs: Obstacle, cw: number) => {
      const topH = obs.gapY - GAP_H / 2
      const bottomY = obs.gapY + GAP_H / 2

      const grad = ctx.createLinearGradient(obs.x, 0, obs.x + OBS_W, 0)
      grad.addColorStop(0, '#C8A060')
      grad.addColorStop(0.35, '#E2BC7A')
      grad.addColorStop(0.65, '#D0A86A')
      grad.addColorStop(1, '#A07040')

      const drawBrickRect = (x: number, y: number, w: number, h: number) => {
        if (h <= 0) return
        ctx.fillStyle = grad
        ctx.fillRect(x, y, w, h)
        ctx.strokeStyle = 'rgba(0,0,0,0.13)'
        ctx.lineWidth = 1
        for (let ly = y + 18; ly < y + h; ly += 20) {
          ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + w, ly); ctx.stroke()
        }
        for (let ly = y; ly < y + h; ly += 20) {
          const off = ((Math.floor((ly - y) / 20)) % 2 === 0) ? w * 0.5 : w * 0.25
          ctx.beginPath(); ctx.moveTo(x + off, ly); ctx.lineTo(x + off, Math.min(ly + 20, y + h)); ctx.stroke()
        }
      }

      const capH = 10, capOvr = 5
      // Top wall
      if (topH > 0) {
        drawBrickRect(obs.x, 0, OBS_W, topH)
        ctx.fillStyle = '#A07840'
        ctx.fillRect(obs.x - capOvr, topH - capH, OBS_W + capOvr*2, capH)
        ctx.fillStyle = '#C8A060'
        ctx.fillRect(obs.x - capOvr, topH - capH, OBS_W + capOvr*2, capH - 3)
      }
      // Bottom wall
      const bottomH = CANVAS_H - bottomY
      if (bottomH > 0) {
        drawBrickRect(obs.x, bottomY, OBS_W, bottomH)
        ctx.fillStyle = '#A07840'
        ctx.fillRect(obs.x - capOvr, bottomY, OBS_W + capOvr*2, capH)
        ctx.fillStyle = '#C8A060'
        ctx.fillRect(obs.x - capOvr, bottomY + 3, OBS_W + capOvr*2, capH - 3)
      }
      void cw
    }

    const loop = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) { st.rafId = requestAnimationFrame(loop); return }
      const cw = canvas.width

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      sky.addColorStop(0, '#7EC8E3')
      sky.addColorStop(1, '#C8E8FF')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, cw, CANVAS_H)

      // Clouds
      for (const c of st.clouds) drawCloud(ctx, c)

      // Ceiling & floor grass
      ctx.fillStyle = '#7DBF50'
      ctx.fillRect(0, 0, cw, CEILING)
      ctx.fillStyle = '#5EA032'
      ctx.fillRect(0, CEILING - 3, cw, 3)
      ctx.fillStyle = '#7DBF50'
      ctx.fillRect(0, FLOOR, cw, CANVAS_H - FLOOR)
      ctx.fillStyle = '#5EA032'
      ctx.fillRect(0, FLOOR, cw, 3)

      if (st.gameState === 'playing') {
        st.frameCount++
        st.speed = BASE_SPEED + st.frameCount * 0.0009
        st.score = Math.floor(st.frameCount / 6)

        // Physics
        st.charVY = st.pressing
          ? Math.max(st.charVY + THRUST, MAX_VY_UP)
          : Math.min(st.charVY + GRAVITY, MAX_VY_DOWN)
        st.charY += st.charVY

        const endGame = () => {
          st.gameState = 'lost'
          if (st.score > st.bestScore) st.bestScore = st.score
          setScore(st.score)
          setBestScore(st.bestScore)
          setGameState('lost')
        }

        // Ceiling / floor hit
        if (st.charY - CHAR_SIZE/2 < CEILING) { st.charY = CEILING + CHAR_SIZE/2; endGame() }
        if (st.charY + CHAR_SIZE/2 > FLOOR)   { st.charY = FLOOR - CHAR_SIZE/2; endGame() }

        // Clouds
        for (const c of st.clouds) c.x -= 0.45
        st.clouds = st.clouds.filter(c => c.x + 80 > 0)
        if (Math.random() < 0.004) {
          st.clouds.push({ x: cw + 60, y: 18 + Math.random() * 80, w: 50 + Math.random() * 44 })
        }

        // Spawn obstacles
        st.nextObstacleIn--
        if (st.nextObstacleIn <= 0) {
          const minGY = GAP_H/2 + CEILING + 22
          const maxGY = FLOOR - GAP_H/2 - 22
          st.obstacles.push({ x: cw + 10, gapY: minGY + Math.random() * (maxGY - minGY) })
          st.nextObstacleIn = Math.round(OBS_SPACING / st.speed)
        }
        for (const o of st.obstacles) o.x -= st.speed
        st.obstacles = st.obstacles.filter(o => o.x + OBS_W + 10 > 0)

        // Collision (circle vs rects)
        const cx = CHAR_X + CHAR_SIZE/2
        const cy = st.charY
        const r = CHAR_SIZE/2 - 7

        for (const obs of st.obstacles) {
          const ol = obs.x - 5, or2 = obs.x + OBS_W + 5
          if (cx + r > ol && cx - r < or2) {
            const topH = obs.gapY - GAP_H/2
            const botY = obs.gapY + GAP_H/2
            if (cy - r < topH || cy + r > botY) { endGame(); break }
          }
        }

        if (st.frameCount % 8 === 0) setScore(st.score)
      }

      // Obstacles
      for (const obs of st.obstacles) drawObs(ctx, obs, cw)

      // Character
      if (st.gameState === 'playing' || st.gameState === 'lost') {
        const img = st.images[st.selectedChar]
        const tilt = Math.max(-28, Math.min(28, st.charVY * 2.8)) * Math.PI / 180
        ctx.save()
        ctx.translate(CHAR_X + CHAR_SIZE/2, st.charY)
        ctx.rotate(tilt)
        if (st.imagesLoaded && img?.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -CHAR_SIZE/2, -CHAR_SIZE/2, CHAR_SIZE, CHAR_SIZE)
        } else {
          ctx.fillStyle = '#4D72FB'
          ctx.beginPath(); ctx.arc(0, 0, CHAR_SIZE/2, 0, Math.PI*2); ctx.fill()
        }
        ctx.restore()
      }

      // HUD
      if (st.gameState === 'playing') {
        ctx.font = 'bold 13px sans-serif'
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.textAlign = 'right'
        ctx.fillText(`${st.score}점`, cw - 10, 28)
        if (st.bestScore > 0) {
          ctx.textAlign = 'left'
          ctx.fillText(`최고 ${st.bestScore}점`, 10, 28)
        }
        if (st.frameCount < 90) {
          ctx.fillStyle = 'rgba(255,255,255,0.88)'
          ctx.font = 'bold 14px sans-serif'
          ctx.textAlign = 'center'
          const alpha = Math.min(1, (90 - st.frameCount) / 30)
          ctx.globalAlpha = alpha
          ctx.fillText('꾹 누르면 올라가요!', cw/2, CANVAS_H/2 + 34)
          ctx.globalAlpha = 1
        }
      }

      // Game over overlay
      if (st.gameState === 'lost') {
        ctx.fillStyle = 'rgba(0,0,0,0.44)'
        ctx.fillRect(0, 0, cw, CANVAS_H)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 26px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('충돌!', cw/2, CANVAS_H/2 - 14)
        ctx.fillStyle = '#FFD700'
        ctx.font = 'bold 15px sans-serif'
        ctx.fillText(`점수: ${st.score}점   최고: ${st.bestScore}점`, cw/2, CANVAS_H/2 + 14)
      }

      st.rafId = requestAnimationFrame(loop)
    }

    st.rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(st.rafId)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const handleCharSelect = (i: number) => {
    setSelectedChar(i)
    s.current.selectedChar = i
  }

  const handleRestart = () => startGame(selectedChar)

  const handleChangeChar = () => {
    s.current.gameState = 'select'
    setGameState('select')
  }

  const canvasW = Math.min(480, Math.max(320, typeof window !== 'undefined' ? window.innerWidth - 20 : 360))

  return (
    <Layout title="비행기 게임" onBack={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 24px', gap: 12 }}>

        {/* Character select */}
        {gameState === 'select' && (
          <div style={{ background: '#F0F4FF', borderRadius: 16, padding: '20px 16px', width: canvasW, boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 17, color: '#333', marginBottom: 16 }}>
              캐릭터를 선택하세요!
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {CHAR_SRCS.map((src, i) => (
                <button
                  key={i}
                  onClick={() => handleCharSelect(i)}
                  style={{
                    background: selectedChar === i ? '#4D72FB' : '#fff',
                    border: selectedChar === i ? '3px solid #2A50D8' : '3px solid #C8D4FF',
                    borderRadius: 14, padding: 6, cursor: 'pointer',
                    transform: selectedChar === i ? 'scale(1.12)' : 'scale(1)',
                    transition: 'all 0.15s',
                  }}
                >
                  <img src={src} alt={`캐릭터 ${i+1}`} style={{ width: 44, height: 44, objectFit: 'contain', display: 'block' }} />
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center' }}>
              <Button onClick={() => startGame(selectedChar)} size="lg">시작하기!</Button>
            </div>
          </div>
        )}

        {/* Score display */}
        {gameState !== 'select' && (
          <div style={{ fontWeight: 800, fontSize: 15, color: '#4D72FB', textAlign: 'center' }}>
            점수: {score}점{bestScore > 0 ? `  |  최고: ${bestScore}점` : ''}
          </div>
        )}

        {/* Canvas wrapper */}
        <div style={{
          position: 'relative', width: canvasW,
          visibility: gameState === 'select' ? 'hidden' : 'visible',
          height: gameState === 'select' ? 0 : 'auto',
          overflow: 'hidden',
        }}>
          <canvas
            ref={canvasRef}
            style={{
              display: 'block', borderRadius: 12,
              border: '2px solid #C8D4FF',
              touchAction: 'none', cursor: 'pointer',
              width: canvasW, height: CANVAS_H,
            }}
          />
          {gameState === 'lost' && (
            <div style={{ position: 'absolute', bottom: 22, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 10 }}>
              <Button onClick={handleRestart}>다시 하기</Button>
              <Button onClick={handleChangeChar} variant="outline">캐릭터 변경</Button>
            </div>
          )}
        </div>

        {gameState === 'playing' && (
          <div style={{ color: '#AAA', fontSize: 12, textAlign: 'center' }}>
            꾹 누르고 있으면 올라가요 | 벽에 닿으면 게임 오버!
          </div>
        )}
      </div>
    </Layout>
  )
}
