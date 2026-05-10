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

// Mosaic character: a large student character SVG drawn on an offscreen canvas
// We'll draw the character image across the brick grid — each brick shows a portion
const MOSAIC_CHARS = [
  {
    name: '파랑이',
    draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, w, h)
      bg.addColorStop(0, '#4D72FB')
      bg.addColorStop(1, '#2244CC')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)

      const cx = w / 2, cy = h * 0.48, r = Math.min(w, h) * 0.34

      // Body (oval)
      ctx.fillStyle = '#4D72FB'
      ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.55, r * 0.8, r * 0.6, 0, 0, Math.PI * 2); ctx.fill()

      // Head
      ctx.fillStyle = '#A0BFFF'
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

      // Ears
      ctx.fillStyle = '#A0BFFF'
      ctx.beginPath(); ctx.ellipse(cx - r * 0.85, cy - r * 0.2, r * 0.18, r * 0.28, -0.3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx + r * 0.85, cy - r * 0.2, r * 0.18, r * 0.28, 0.3, 0, Math.PI * 2); ctx.fill()
      // Inner ears
      ctx.fillStyle = '#80A0FF'
      ctx.beginPath(); ctx.ellipse(cx - r * 0.85, cy - r * 0.2, r * 0.1, r * 0.17, -0.3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx + r * 0.85, cy - r * 0.2, r * 0.1, r * 0.17, 0.3, 0, Math.PI * 2); ctx.fill()

      // Eyes
      ctx.fillStyle = 'white'
      ctx.beginPath(); ctx.ellipse(cx - r*0.32, cy - r*0.1, r*0.18, r*0.2, 0, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx + r*0.32, cy - r*0.1, r*0.18, r*0.2, 0, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#1A1A1A'
      ctx.beginPath(); ctx.arc(cx - r*0.3, cy - r*0.08, r*0.12, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + r*0.3, cy - r*0.08, r*0.12, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = 'white'
      ctx.beginPath(); ctx.arc(cx - r*0.34, cy - r*0.12, r*0.045, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + r*0.26, cy - r*0.12, r*0.045, 0, Math.PI*2); ctx.fill()

      // Smile
      ctx.strokeStyle = '#2244CC'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cx - r*0.28, cy + r*0.18)
      ctx.quadraticCurveTo(cx, cy + r*0.38, cx + r*0.28, cy + r*0.18)
      ctx.stroke()

      // Cheeks
      ctx.fillStyle = 'rgba(255,150,150,0.35)'
      ctx.beginPath(); ctx.ellipse(cx - r*0.55, cy + r*0.1, r*0.18, r*0.12, 0, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx + r*0.55, cy + r*0.1, r*0.18, r*0.12, 0, 0, Math.PI*2); ctx.fill()

      // Arms
      ctx.fillStyle = '#A0BFFF'
      ctx.beginPath(); ctx.ellipse(cx - r*0.95, cy + r*0.55, r*0.15, r*0.3, 0.3, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx + r*0.95, cy + r*0.55, r*0.15, r*0.3, -0.3, 0, Math.PI*2); ctx.fill()

      // Star accessory
      ctx.fillStyle = '#FFD700'
      const sr = r * 0.12, sx = cx + r * 0.6, sy = cy - r * 0.6
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI / 5) - Math.PI / 2
        const ai = (i * 4 * Math.PI / 5) + Math.PI / 10 - Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(sx + Math.cos(a) * sr, sy + Math.sin(a) * sr)
        ctx.lineTo(sx + Math.cos(ai) * sr * 0.4, sy + Math.sin(ai) * sr * 0.4)
        if (i === 0) ctx.moveTo(sx + Math.cos(a) * sr, sy + Math.sin(a) * sr)
      }
      // simple star
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI / 5) - Math.PI / 2
        const rd = i % 2 === 0 ? sr : sr * 0.4
        if (i === 0) ctx.moveTo(sx + Math.cos(a) * rd, sy + Math.sin(a) * rd)
        else ctx.lineTo(sx + Math.cos(a) * rd, sy + Math.sin(a) * rd)
      }
      ctx.closePath(); ctx.fill()
    },
  },
  {
    name: '오렌지',
    draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const bg = ctx.createLinearGradient(0, 0, w, h)
      bg.addColorStop(0, '#FF8C42')
      bg.addColorStop(1, '#CC5500')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)

      const cx = w/2, cy = h*0.46, r = Math.min(w,h)*0.34

      // Body
      ctx.fillStyle = '#FF8C42'
      ctx.beginPath(); ctx.ellipse(cx, cy+r*0.55, r*0.8, r*0.6, 0, 0, Math.PI*2); ctx.fill()
      // Head
      ctx.fillStyle = '#FFBD7A'
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill()
      // Ears
      ctx.fillStyle = '#FFBD7A'
      ctx.beginPath(); ctx.ellipse(cx-r*0.85, cy-r*0.25, r*0.16, r*0.26, -0.2, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx+r*0.85, cy-r*0.25, r*0.16, r*0.26, 0.2, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#FFD5A8'
      ctx.beginPath(); ctx.ellipse(cx-r*0.85, cy-r*0.25, r*0.08, r*0.14, -0.2, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx+r*0.85, cy-r*0.25, r*0.08, r*0.14, 0.2, 0, Math.PI*2); ctx.fill()
      // Tummy
      ctx.fillStyle = '#FFD5A8'
      ctx.beginPath(); ctx.ellipse(cx, cy+r*0.12, r*0.5, r*0.4, 0, 0, Math.PI*2); ctx.fill()
      // Eyes
      ctx.fillStyle = 'white'
      ctx.beginPath(); ctx.ellipse(cx-r*0.3, cy-r*0.1, r*0.17, r*0.19, 0, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx+r*0.3, cy-r*0.1, r*0.17, r*0.19, 0, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#1A1A1A'
      ctx.beginPath(); ctx.arc(cx-r*0.28, cy-r*0.08, r*0.11, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx+r*0.28, cy-r*0.08, r*0.11, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = 'white'
      ctx.beginPath(); ctx.arc(cx-r*0.32, cy-r*0.12, r*0.04, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx+r*0.24, cy-r*0.12, r*0.04, 0, Math.PI*2); ctx.fill()
      // Smile
      ctx.strokeStyle = '#CC5500'; ctx.lineWidth = r*0.07; ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cx-r*0.25, cy+r*0.17)
      ctx.quadraticCurveTo(cx, cy+r*0.36, cx+r*0.25, cy+r*0.17)
      ctx.stroke()
      // Cheeks
      ctx.fillStyle = 'rgba(255,100,50,0.3)'
      ctx.beginPath(); ctx.ellipse(cx-r*0.52, cy+r*0.08, r*0.17, r*0.11, 0, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx+r*0.52, cy+r*0.08, r*0.17, r*0.11, 0, 0, Math.PI*2); ctx.fill()
      // Arms
      ctx.fillStyle = '#FFBD7A'
      ctx.beginPath(); ctx.ellipse(cx-r*0.95, cy+r*0.5, r*0.14, r*0.28, 0.3, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx+r*0.95, cy+r*0.5, r*0.14, r*0.28, -0.3, 0, Math.PI*2); ctx.fill()
    },
  },
]

interface Brick {
  x: number; y: number; w: number; h: number
  alive: boolean; row: number; col: number
}
interface Ball { x: number; y: number; vx: number; vy: number }
interface Paddle { x: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }
interface FloatingText { x: number; y: number; text: string; life: number; maxLife: number }
interface Star { x: number; y: number; r: number; alpha: number }

function buildBricks(canvasW: number): Brick[] {
  const margin = 10
  const brickW = (canvasW - margin*2 - BRICK_GAP*(BRICK_COLS-1)) / BRICK_COLS
  const bricks: Brick[] = []
  for (let r=0; r<BRICK_ROWS; r++)
    for (let c=0; c<BRICK_COLS; c++)
      bricks.push({ x: margin+c*(brickW+BRICK_GAP), y: 40+r*(BRICK_HEIGHT+BRICK_GAP), w: brickW, h: BRICK_HEIGHT, alive: true, row: r, col: c })
  return bricks
}

function buildStars(w: number, h: number): Star[] {
  return Array.from({length:20}, () => ({
    x: Math.random()*w, y: Math.random()*h*0.85,
    r: 0.8+Math.random()*1.2, alpha: 0.4+Math.random()*0.6,
  }))
}

// Draw mosaic character offscreen and return ImageData slices per brick
function buildMosaicCanvas(canvasW: number, bricks: Brick[], charIdx: number): HTMLCanvasElement {
  const mc = document.createElement('canvas')
  mc.width = canvasW
  const totalH = BRICK_ROWS*(BRICK_HEIGHT+BRICK_GAP) + 40
  mc.height = totalH
  const mctx = mc.getContext('2d')!
  MOSAIC_CHARS[charIdx].draw(mctx, canvasW, totalH)
  return mc
}

export default function BrickBreakerGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<{
    ball: Ball; paddle: Paddle; bricks: Brick[]
    lives: number; score: number; gameState: GameState; speed: number
    rafId: number; keys: Set<string>
    particles: Particle[]; floatingTexts: FloatingText[]
    stars: Star[]; ballTrail: {x:number;y:number}[]
    combo: number; frameCount: number
    mosaicCanvas: HTMLCanvasElement | null
    charIdx: number
  }>({
    ball:{x:0,y:0,vx:0,vy:0}, paddle:{x:0}, bricks:[], lives:3, score:0,
    gameState:'idle', speed:BASE_SPEED, rafId:0, keys:new Set(),
    particles:[], floatingTexts:[], stars:[], ballTrail:[],
    combo:0, frameCount:0, mosaicCanvas:null, charIdx:0,
  })

  const [lives, setLives] = useState(3)
  const [score, setScore] = useState(0)
  const [gameState, setGameState] = useState<GameState>('idle')

  const getCanvasSize = () => {
    const w = Math.min(360, window.innerWidth-20)
    const h = Math.round(w*(580/360))
    return {w,h}
  }

  const initGame = useCallback((cw: number, ch: number) => {
    const s = stateRef.current
    s.bricks = buildBricks(cw)
    s.stars  = buildStars(cw, ch)
    s.paddle = {x: cw/2 - PADDLE_WIDTH/2}
    s.ball   = {x: cw/2, y: ch-PADDLE_HEIGHT-50, vx: BASE_SPEED*(Math.random()>0.5?1:-1), vy:-BASE_SPEED}
    s.lives=3; s.score=0; s.gameState='playing'; s.speed=BASE_SPEED
    s.particles=[]; s.floatingTexts=[]; s.ballTrail=[]; s.combo=0; s.frameCount=0
    s.charIdx = Math.floor(Math.random()*MOSAIC_CHARS.length)
    s.mosaicCanvas = buildMosaicCanvas(cw, s.bricks, s.charIdx)
    setLives(3); setScore(0); setGameState('playing')
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const {w,h} = getCanvasSize()
    canvas.width=w; canvas.height=h

    const s = stateRef.current
    s.stars = buildStars(w,h)

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      s.paddle.x = Math.max(0, Math.min(canvas.width-PADDLE_WIDTH, e.clientX-rect.left-PADDLE_WIDTH/2))
    }
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      s.paddle.x = Math.max(0, Math.min(canvas.width-PADDLE_WIDTH, e.touches[0].clientX-rect.left-PADDLE_WIDTH/2))
    }
    const handleKeyDown = (e: KeyboardEvent) => { s.keys.add(e.key) }
    const handleKeyUp   = (e: KeyboardEvent) => { s.keys.delete(e.key) }
    const handleClick   = () => { if(s.gameState==='idle') initGame(canvas.width,canvas.height) }

    canvas.addEventListener('mousemove',handleMouseMove)
    canvas.addEventListener('touchmove',handleTouchMove,{passive:false})
    canvas.addEventListener('click',handleClick)
    window.addEventListener('keydown',handleKeyDown)
    window.addEventListener('keyup',handleKeyUp)

    function spawnParticles(bx:number,by:number,color:string) {
      const count = 6+Math.floor(Math.random()*4)
      for (let i=0;i<count;i++) {
        const angle = (Math.PI*2*i)/count+Math.random()*0.5
        const speed = 1.5+Math.random()*2.5
        s.particles.push({x:bx,y:by,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:30,maxLife:30,color,size:3+Math.random()*4})
      }
    }

    // Row colors for particles (behind mosaic)
    const ROW_COLORS = ['#D5E8FF','#FFE9D5','#D5F5E3','#FFD5E9','#E9D5FF','#FFFBD5','#D5F5FF','#FFD5D5']

    const draw = (ctx: CanvasRenderingContext2D) => {
      const cw=canvas.width, ch=canvas.height
      s.frameCount++

      // Background
      const grad = ctx.createLinearGradient(0,0,0,ch)
      grad.addColorStop(0,'#1A1A3E'); grad.addColorStop(1,'#2D3A8C')
      ctx.fillStyle=grad; ctx.fillRect(0,0,cw,ch)

      // Stars
      for (const star of s.stars) {
        ctx.globalAlpha=star.alpha; ctx.fillStyle='#FFF'
        ctx.beginPath(); ctx.arc(star.x,star.y,star.r,0,Math.PI*2); ctx.fill()
      }
      ctx.globalAlpha=1

      if (s.gameState==='idle') {
        ctx.fillStyle='#FFF'; ctx.font='bold 22px sans-serif'; ctx.textAlign='center'
        ctx.fillText('클릭해서 시작!', cw/2, ch/2)
        ctx.font='15px sans-serif'; ctx.fillStyle='rgba(255,255,255,0.6)'
        ctx.fillText('캐릭터를 숨긴 블럭을 모두 깨세요!', cw/2, ch/2+32)
        return
      }

      // Keyboard control
      if (s.keys.has('ArrowLeft')) s.paddle.x=Math.max(0,s.paddle.x-10)
      if (s.keys.has('ArrowRight')) s.paddle.x=Math.min(cw-PADDLE_WIDTH,s.paddle.x+10)

      if (s.gameState==='playing') {
        s.ballTrail.push({x:s.ball.x,y:s.ball.y})
        if (s.ballTrail.length>4) s.ballTrail.shift()

        s.ball.x+=s.ball.vx; s.ball.y+=s.ball.vy
        if (s.ball.x-BALL_RADIUS<0){s.ball.x=BALL_RADIUS;s.ball.vx=Math.abs(s.ball.vx)}
        if (s.ball.x+BALL_RADIUS>cw){s.ball.x=cw-BALL_RADIUS;s.ball.vx=-Math.abs(s.ball.vx)}
        if (s.ball.y-BALL_RADIUS<0){s.ball.y=BALL_RADIUS;s.ball.vy=Math.abs(s.ball.vy)}

        const paddleTop=ch-PADDLE_HEIGHT-25
        if (s.ball.y+BALL_RADIUS>=paddleTop&&s.ball.y-BALL_RADIUS<=paddleTop+PADDLE_HEIGHT&&s.ball.x>=s.paddle.x&&s.ball.x<=s.paddle.x+PADDLE_WIDTH&&s.ball.vy>0) {
          const hitPos=(s.ball.x-s.paddle.x)/PADDLE_WIDTH
          const angle=(hitPos-0.5)*2*(Math.PI*0.4)
          const spd=Math.sqrt(s.ball.vx**2+s.ball.vy**2)
          s.ball.vx=spd*Math.sin(angle); s.ball.vy=-Math.abs(spd*Math.cos(angle))
          s.ball.y=paddleTop-BALL_RADIUS; s.combo=0
        }

        if (s.ball.y-BALL_RADIUS>ch) {
          s.lives-=1; setLives(s.lives); s.combo=0
          if (s.lives<=0){s.gameState='lost';setGameState('lost')}
          else {
            s.ball={x:cw/2,y:ch-PADDLE_HEIGHT-70,vx:s.speed*(Math.random()>0.5?1:-1),vy:-s.speed}
            s.ballTrail=[]
          }
        }

        for (const brick of s.bricks) {
          if (!brick.alive) continue
          if (s.ball.x+BALL_RADIUS>brick.x&&s.ball.x-BALL_RADIUS<brick.x+brick.w&&s.ball.y+BALL_RADIUS>brick.y&&s.ball.y-BALL_RADIUS<brick.y+brick.h) {
            brick.alive=false; s.combo++
            const pts=10*(s.combo>1?s.combo:1); s.score+=pts; setScore(s.score)
            spawnParticles(brick.x+brick.w/2, brick.y+brick.h/2, ROW_COLORS[brick.row%ROW_COLORS.length])
            if (s.combo>=2) s.floatingTexts.push({x:brick.x+brick.w/2,y:brick.y,text:`×${s.combo}`,life:45,maxLife:45})
            const ol=s.ball.x+BALL_RADIUS-brick.x, or2=brick.x+brick.w-(s.ball.x-BALL_RADIUS)
            const ot=s.ball.y+BALL_RADIUS-brick.y, ob=brick.y+brick.h-(s.ball.y-BALL_RADIUS)
            const minO=Math.min(ol,or2,ot,ob)
            if(minO===ot||minO===ob) s.ball.vy=-s.ball.vy; else s.ball.vx=-s.ball.vx
            break
          }
        }

        const newSpeed=BASE_SPEED+Math.floor(s.score/70)*SPEED_INCREMENT
        if (newSpeed!==s.speed&&newSpeed<BASE_SPEED+3) {
          const ratio=newSpeed/s.speed; s.ball.vx*=ratio; s.ball.vy*=ratio; s.speed=newSpeed
        }

        if (s.bricks.every(b=>!b.alive)){s.gameState='won';setGameState('won')}

        s.particles=s.particles.map(p=>({...p,x:p.x+p.vx,y:p.y+p.vy,vy:p.vy+0.1,life:p.life-1})).filter(p=>p.life>0)
        s.floatingTexts=s.floatingTexts.map(ft=>({...ft,y:ft.y-1,life:ft.life-1})).filter(ft=>ft.life>0)
      }

      // ── Draw bricks with mosaic ──
      if (s.mosaicCanvas) {
        for (const brick of s.bricks) {
          if (!brick.alive) continue

          // Draw the mosaic slice for this brick
          ctx.save()
          ctx.beginPath()
          ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 4)
          ctx.clip()
          ctx.drawImage(s.mosaicCanvas, brick.x, brick.y, brick.w, brick.h, brick.x, brick.y, brick.w, brick.h)

          // Highlight/bevel overlay
          ctx.fillStyle='rgba(255,255,255,0.22)'
          ctx.fillRect(brick.x, brick.y, brick.w, brick.h*0.4)
          ctx.fillStyle='rgba(0,0,0,0.08)'
          ctx.fillRect(brick.x, brick.y+brick.h*0.6, brick.w, brick.h*0.4)

          // Grid border
          ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.lineWidth=1.5
          ctx.beginPath(); ctx.roundRect(brick.x,brick.y,brick.w,brick.h,4); ctx.stroke()
          ctx.restore()
        }

        // Show "ghost" outline of broken bricks so player knows the original shape
        for (const brick of s.bricks) {
          if (brick.alive) continue
          ctx.globalAlpha=0.08
          ctx.drawImage(s.mosaicCanvas, brick.x, brick.y, brick.w, brick.h, brick.x, brick.y, brick.w, brick.h)
          ctx.globalAlpha=1
        }
      }

      // Particles
      for (const p of s.particles) {
        ctx.globalAlpha=p.life/p.maxLife; ctx.fillStyle=p.color
        ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size)
      }
      ctx.globalAlpha=1

      // Floating texts
      for (const ft of s.floatingTexts) {
        ctx.globalAlpha=ft.life/ft.maxLife; ctx.fillStyle='#FFD700'
        ctx.font='bold 16px sans-serif'; ctx.textAlign='center'
        ctx.fillText(ft.text,ft.x,ft.y)
      }
      ctx.globalAlpha=1

      // Floor bar
      const floorGrad=ctx.createLinearGradient(0,canvas.height-18,0,canvas.height)
      floorGrad.addColorStop(0,'#3D5BCC'); floorGrad.addColorStop(1,'#1A2A80')
      ctx.fillStyle=floorGrad; ctx.fillRect(0,canvas.height-18,cw,18)

      // Paddle
      const paddleY=canvas.height-PADDLE_HEIGHT-25
      const paddleGrad=ctx.createLinearGradient(s.paddle.x,0,s.paddle.x+PADDLE_WIDTH,0)
      paddleGrad.addColorStop(0,'#6B8FFF'); paddleGrad.addColorStop(0.5,'#4D72FB'); paddleGrad.addColorStop(1,'#6B8FFF')
      ctx.fillStyle=paddleGrad; ctx.beginPath(); ctx.roundRect(s.paddle.x,paddleY,PADDLE_WIDTH,PADDLE_HEIGHT,6); ctx.fill()
      ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.roundRect(s.paddle.x+4,paddleY+2,PADDLE_WIDTH-8,4,3); ctx.fill()

      // Ball trail
      s.ballTrail.forEach((pos,i)=>{
        ctx.globalAlpha=((i+1)/s.ballTrail.length)*0.35
        ctx.fillStyle='#A0BFFF'; ctx.beginPath()
        ctx.arc(pos.x,pos.y,BALL_RADIUS*((i+1)/s.ballTrail.length)*0.7,0,Math.PI*2); ctx.fill()
      })
      ctx.globalAlpha=1

      // Ball
      ctx.shadowColor='#6B8FFF'; ctx.shadowBlur=12; ctx.fillStyle='#FFF'
      ctx.beginPath(); ctx.arc(s.ball.x,s.ball.y,BALL_RADIUS,0,Math.PI*2); ctx.fill()
      ctx.shadowBlur=0

      // End overlay
      if (s.gameState==='won'||s.gameState==='lost') {
        ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,cw,ch)
        ctx.fillStyle='#FFF'; ctx.font='bold 30px sans-serif'; ctx.textAlign='center'
        ctx.fillText(s.gameState==='won'?'🎉 클리어!':'게임 오버', cw/2, ch/2-24)
        ctx.font='bold 22px sans-serif'; ctx.fillStyle='#FFD700'
        ctx.fillText(`점수: ${s.score}점`, cw/2, ch/2+16)
      }
    }

    const loop=()=>{ const ctx=canvas.getContext('2d'); if(ctx)draw(ctx); s.rafId=requestAnimationFrame(loop) }
    s.rafId=requestAnimationFrame(loop)

    return ()=>{
      cancelAnimationFrame(s.rafId)
      canvas.removeEventListener('mousemove',handleMouseMove)
      canvas.removeEventListener('touchmove',handleTouchMove)
      canvas.removeEventListener('click',handleClick)
      window.removeEventListener('keydown',handleKeyDown)
      window.removeEventListener('keyup',handleKeyUp)
    }
  }, [initGame])

  const handleRestart = useCallback(()=>{
    const canvas=canvasRef.current; if(!canvas)return; initGame(canvas.width,canvas.height)
  },[initGame])

  const {w,h}=getCanvasSize()
  const overlayStyle: CSSProperties = {
    position:'absolute',top:0,left:0,right:0,bottom:0,
    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
    gap:16,pointerEvents:'none',
  }

  return (
    <Layout title="벽돌 깨기" onBack={onBack}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 0 24px'}}>
        <div style={{display:'flex',gap:24,marginBottom:10,fontWeight:800,fontSize:15,color:'#333'}}>
          <span>{'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0,3-lives))}</span>
          <span style={{color:'#4D72FB'}}>점수: {score}점</span>
        </div>
        <div style={{position:'relative',width:w,height:h}}>
          <canvas ref={canvasRef} style={{display:'block',borderRadius:12,border:'2px solid #3D5BCC',touchAction:'none'}}/>
          {(gameState==='won'||gameState==='lost')&&(
            <div style={{...overlayStyle,pointerEvents:'auto'}}>
              <div style={{height:130}}/>
              <Button onClick={handleRestart}>다시 하기</Button>
            </div>
          )}
        </div>
        <div style={{marginTop:10,color:'#AAA',fontSize:12,textAlign:'center'}}>
          캐릭터를 숨긴 블럭을 모두 깨세요! | 마우스/터치/방향키
        </div>
      </div>
    </Layout>
  )
}
