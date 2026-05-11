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

// Affinity Designer 단축키 퀴즈
const QUESTIONS: Question[] = [
  { question: '저장하려면?',             choices: ['Ctrl+S',       'Ctrl+E',       'Ctrl+D',       'Ctrl+P'],        answer: 0 },
  { question: '다른 이름으로 저장?',     choices: ['Ctrl+Alt+S',   'Ctrl+Shift+S', 'Ctrl+Shift+E', 'Ctrl+F12'],      answer: 1 },
  { question: '실행 취소(Undo)?',        choices: ['Ctrl+Y',       'Ctrl+R',       'Ctrl+Z',       'Ctrl+X'],        answer: 2 },
  { question: '다시 실행(Redo)?',        choices: ['Ctrl+Z',       'Ctrl+Shift+Z', 'Ctrl+R',       'Ctrl+U'],        answer: 1 },
  { question: '복제(Duplicate)?',        choices: ['Ctrl+C+V',     'Ctrl+D',       'Ctrl+J',       'Ctrl+Alt+C'],    answer: 2 },
  { question: '그룹 만들기?',            choices: ['Ctrl+Shift+G', 'Ctrl+Alt+G',   'Ctrl+G',       'Ctrl+L'],        answer: 2 },
  { question: '그룹 해제?',              choices: ['Ctrl+G',       'Ctrl+Shift+G', 'Ctrl+Alt+G',   'Ctrl+U'],        answer: 1 },
  { question: '맨 앞으로 보내기?',       choices: ['Ctrl+]',       'Ctrl+[',       'Ctrl+Shift+[', 'Ctrl+Shift+]'],  answer: 3 },
  { question: '맨 뒤로 보내기?',         choices: ['Ctrl+Shift+[', 'Ctrl+[',       'Ctrl+Shift+]', 'Ctrl+]'],        answer: 0 },
  { question: '한 단계 앞으로?',         choices: ['Ctrl+Shift+]', 'Ctrl+]',       'Ctrl+[',       'Ctrl+Shift+['],  answer: 1 },
  { question: '한 단계 뒤로?',           choices: ['Ctrl+]',       'Ctrl+Shift+]', 'Ctrl+[',       'Ctrl+Shift+['],  answer: 2 },
  { question: '이동 도구(Move Tool)?',   choices: ['A',            'P',            'T',            'V'],             answer: 3 },
  { question: '노드 도구(Node Tool)?',   choices: ['V',            'A',            'N',            'P'],             answer: 1 },
  { question: '펜 도구(Pen Tool)?',      choices: ['B',            'V',            'P',            'A'],             answer: 2 },
  { question: '텍스트 도구(Text Tool)?', choices: ['R',            'T',            'O',            'M'],             answer: 1 },
  { question: '사각형 도구?',            choices: ['O',            'T',            'M',            'P'],             answer: 2 },
  { question: '타원 도구?',              choices: ['M',            'O',            'E',            'C'],             answer: 1 },
  { question: '전체 선택?',              choices: ['Ctrl+D',       'Ctrl+E',       'Ctrl+A',       'Ctrl+F'],        answer: 2 },
  { question: '화면에 맞추기(Fit)?',     choices: ['Ctrl+1',       'Ctrl+Shift+0', 'Ctrl+0',       'Ctrl+F'],        answer: 2 },
  { question: '레이어 잠금?',            choices: ['Ctrl+G',       'Ctrl+L',       'Ctrl+K',       'Ctrl+Shift+L'],  answer: 1 },
  { question: '가로 반전(Flip H)?',      choices: ['Ctrl+Shift+H', 'Ctrl+H',       'Alt+H',        'Ctrl+Alt+H'],    answer: 0 },
  { question: '세로 반전(Flip V)?',      choices: ['Ctrl+Shift+V', 'Ctrl+V',       'Alt+V',        'Ctrl+Alt+V'],    answer: 0 },
  { question: '내보내기(Export)?',       choices: ['Ctrl+E',       'Ctrl+Shift+E', 'Ctrl+Alt+E',   'Ctrl+P'],        answer: 0 },
]

type GameState = 'idle' | 'playing' | 'won' | 'lost'

const TOTAL_LANES  = 4
const WALL_THICK   = 200     // wide for readability
const SUB_W = 72
const SUB_H = 36
const WALL_SPEED   = 2.5

const LANE_COLORS = ['#FF8C42', '#4D72FB', '#27AE60', '#9B59B6']
const LANE_LIGHT  = ['#FFE9D5', '#D5E8FF', '#D5F5E3', '#EDE0FF']

function getSize() {
  const screenW = window.innerWidth - 16
  const w = Math.min(900, screenW * 2)   // 2x canvas width
  const h = Math.round(Math.min(screenW, 500) * 1.18)  // height based on screen width
  return { w, h }
}

function laneY(lane: number, ch: number) {
  const topOff  = ch * 0.08
  const usableH = ch * 0.84
  return topOff + lane * (usableH / TOTAL_LANES) + (usableH / TOTAL_LANES) / 2
}

function laneGapH(ch: number) { return (ch * 0.84) / TOTAL_LANES }

interface WallObj { x: number; qIdx: number; passed: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
interface Bubble   { x: number; y: number; r: number; speed: number; alpha: number }

function drawSub(ctx: CanvasRenderingContext2D, x: number, y: number, fc: number) {
  ctx.save(); ctx.translate(x, y)
  // shadow
  ctx.fillStyle = 'rgba(0,80,160,0.15)'
  ctx.beginPath(); ctx.ellipse(4, 7, SUB_W/2, SUB_H/2, 0, 0, Math.PI*2); ctx.fill()
  // propeller
  const ph = fc * 0.2
  ctx.fillStyle = '#E8C000'
  for (let i = 0; i < 3; i++) {
    const a = ph + (i * Math.PI * 2) / 3
    ctx.save(); ctx.translate(-SUB_W/2 - 6, 0); ctx.rotate(a)
    ctx.beginPath(); ctx.ellipse(0, 0, 4, 12, 0, 0, Math.PI*2); ctx.fill(); ctx.restore()
  }
  ctx.strokeStyle = '#CC9900'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(-SUB_W/2-6, 0, 5, 0, Math.PI*2); ctx.stroke()
  // body
  const bg = ctx.createLinearGradient(-SUB_W/2, -SUB_H/2, SUB_W/2, SUB_H/2)
  bg.addColorStop(0,'#FFEE88'); bg.addColorStop(0.5,'#FFD700'); bg.addColorStop(1,'#E8B800')
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0,0,SUB_W/2,SUB_H/2,0,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle='#CC9900'; ctx.lineWidth=2.5; ctx.stroke()
  // conning tower
  ctx.fillStyle='#FFD700'; ctx.beginPath(); ctx.roundRect(-10,-SUB_H/2-14,20,16,4); ctx.fill()
  ctx.strokeStyle='#CC9900'; ctx.lineWidth=2; ctx.stroke()
  // periscope
  ctx.strokeStyle='#CC9900'; ctx.lineWidth=3; ctx.lineCap='round'
  ctx.beginPath(); ctx.moveTo(2,-SUB_H/2-14); ctx.lineTo(2,-SUB_H/2-25); ctx.lineTo(13,-SUB_H/2-25); ctx.stroke()
  ctx.fillStyle='#A0DFFF'; ctx.beginPath(); ctx.arc(13,-SUB_H/2-25,4,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle='#0077AA'; ctx.lineWidth=1.5; ctx.stroke()
  // porthole
  ctx.fillStyle='#A0DFFF'; ctx.beginPath(); ctx.arc(14,0,10,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle='#CC9900'; ctx.lineWidth=2.5; ctx.stroke()
  ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(10,-4,4,0,Math.PI*2); ctx.fill()
  // face
  ctx.fillStyle='#1A1A1A'
  ctx.beginPath(); ctx.arc(12,-1,1.8,0,Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(17,-1,1.8,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle='#1A1A1A'; ctx.lineWidth=1.5
  ctx.beginPath(); ctx.arc(14,0,4,0.1,Math.PI-0.1); ctx.stroke()
  // bubbles
  for (let i=0;i<4;i++) {
    const bx=-SUB_W/2-14-i*11+Math.sin(fc*0.15+i)*4
    const by=Math.sin(fc*0.1+i*1.4)*5
    ctx.globalAlpha=0.28-i*0.05; ctx.strokeStyle='#A0DFFF'; ctx.lineWidth=1
    ctx.beginPath(); ctx.arc(bx,by,4+i,0,Math.PI*2); ctx.stroke()
  }
  ctx.globalAlpha=1; ctx.restore()
}

export default function ShortcutQuizGame({ onBack }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const [uiState,  setUiState]  = useState<GameState>('idle')
  const [score,    setScore]    = useState(0)
  const [lives,    setLives]    = useState(3)
  const [currentQ, setCurrentQ] = useState<Question | null>(null)
  const sizeRef = useRef(getSize())

  const gameRef = useRef({
    state: 'idle' as GameState,
    subY: 0, targetY: 0, currentLane: 0,
    walls: [] as WallObj[], score: 0, lives: 3, frameCount: 0, rafId: 0,
    bubbles: [] as Bubble[], qOrder: [] as number[], qPointer: 0,
    particles: [] as Particle[], flashTimer: 0, flashLane: -1, flashCorrect: false,
  })

  const shuffleQ = useCallback(() => {
    const o = Array.from({ length: QUESTIONS.length }, (_, i) => i)
    for (let i = o.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [o[i],o[j]]=[o[j],o[i]] }
    return o
  }, [])

  const initGame = useCallback(() => {
    const g = gameRef.current; const { h } = sizeRef.current
    g.state='playing'; g.currentLane=0; g.subY=laneY(0,h); g.targetY=laneY(0,h)
    g.walls=[]; g.score=0; g.lives=3; g.frameCount=0; g.particles=[]
    g.flashTimer=0; g.flashLane=-1; g.qOrder=shuffleQ(); g.qPointer=0
    g.bubbles=Array.from({length:18},()=>({
      x:Math.random()*sizeRef.current.w, y:Math.random()*h,
      r:2+Math.random()*5, speed:0.25+Math.random()*0.5, alpha:0.07+Math.random()*0.13,
    }))
    setScore(0); setLives(3); setUiState('playing')
    setCurrentQ(QUESTIONS[g.qOrder[0]])
  }, [shuffleQ])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const { w, h } = sizeRef.current
    canvas.width=w; canvas.height=h
    const g = gameRef.current
    g.subY=laneY(0,h); g.targetY=laneY(0,h)

    function spawnWall() {
      const qIdx = g.qOrder[g.qPointer % g.qOrder.length]
      g.walls.push({ x: sizeRef.current.w + WALL_THICK, qIdx, passed:false })
      setCurrentQ(QUESTIONS[qIdx]); g.qPointer++
    }
    function spawnParticles(x:number,y:number,ok:boolean){
      const colors=ok?['#FFD700','#FFF','#4DFB72','#FF6']:['#FF4444','#FF8888','#FFF']
      for(let i=0;i<18;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*5;g.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:35+Math.random()*20,color:colors[i%colors.length]})}
    }

    function draw(ctx: CanvasRenderingContext2D) {
      const cw=canvas!.width, ch=canvas!.height; g.frameCount++
      // background
      const bg=ctx.createLinearGradient(0,0,0,ch)
      bg.addColorStop(0,'#B8E4FF'); bg.addColorStop(0.45,'#7DC8F5'); bg.addColorStop(1,'#3EB5E8')
      ctx.fillStyle=bg; ctx.fillRect(0,0,cw,ch)
      // surface ripples
      ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=2
      for(let wx=0;wx<cw;wx+=40){
        const wy=ch*0.08+Math.sin((wx+g.frameCount*0.8)*0.05)*4
        ctx.beginPath(); ctx.arc(wx,wy,12,Math.PI,0); ctx.stroke()
      }
      // lane dividers
      const gapH=laneGapH(ch), topOff=ch*0.08
      ctx.setLineDash([8,6]); ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1.5
      for(let lane=1;lane<TOTAL_LANES;lane++){
        const y=topOff+lane*gapH; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cw,y); ctx.stroke()
      }
      ctx.setLineDash([])
      // bubbles
      for(const b of g.bubbles){ctx.globalAlpha=b.alpha;ctx.strokeStyle='rgba(255,255,255,0.8)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.stroke();b.y-=b.speed;if(b.y<-b.r){b.y=ch+b.r;b.x=Math.random()*cw}}
      ctx.globalAlpha=1

      if(g.state==='idle'){
        ctx.fillStyle='rgba(0,80,160,0.5)'; ctx.beginPath(); ctx.roundRect(cw/2-165,ch/2-58,330,116,22); ctx.fill()
        ctx.fillStyle='#FFF'; ctx.font=`bold ${Math.round(cw*0.052)}px sans-serif`; ctx.textAlign='center'
        ctx.fillText('탭 또는 클릭하여 시작!',cw/2,ch/2-8)
        ctx.font=`${Math.round(cw*0.031)}px sans-serif`; ctx.fillStyle='rgba(255,255,255,0.8)'
        ctx.fillText('↑↓ 방향키로 잠수함 이동',cw/2,ch/2+26)
        drawSub(ctx,82,ch/2,g.frameCount); return
      }

      if(g.state==='playing'){
        g.subY+=(g.targetY-g.subY)*0.14
        if(g.frameCount%185===0||(g.walls.length===0&&g.frameCount>40)) spawnWall()
        for(const w of g.walls) w.x-=WALL_SPEED
        const sl=82, sr=82+SUB_W, st=g.subY-SUB_H/2, sb=g.subY+SUB_H/2
        for(const wall of g.walls){
          if(wall.passed) continue
          const wl=wall.x-WALL_THICK/2, wr=wall.x+WALL_THICK/2
          if(sr<wl||sl>wr) continue
          const q=QUESTIONS[wall.qIdx]; let inGap=false,hitLane=-1
          for(let lane=0;lane<TOTAL_LANES;lane++){
            const gy=laneY(lane,ch)
            if(st>=gy-gapH/2+6&&sb<=gy+gapH/2-6){inGap=true;hitLane=lane;break}
          }
          wall.passed=true; g.flashLane=hitLane; g.flashTimer=55
          if(inGap){g.flashCorrect=hitLane===q.answer;spawnParticles(wall.x,g.subY,g.flashCorrect);if(g.flashCorrect){g.score+=10;setScore(g.score);playSuccess()}else{g.lives-=1;setLives(g.lives);playError();if(g.lives<=0){g.state='lost';setUiState('lost')}}}
          else{g.flashCorrect=false;spawnParticles(wall.x,g.subY,false);g.lives-=1;setLives(g.lives);playError();if(g.lives<=0){g.state='lost';setUiState('lost')}}
        }
        g.walls=g.walls.filter(w=>w.x>-WALL_THICK-20)
        if(g.score>=100){g.state='won';setUiState('won');playSuccess()}
      }

      // ── 벽 그리기 ──
      for(const wall of g.walls){
        const q=QUESTIONS[wall.qIdx]; const wx=wall.x-WALL_THICK/2
        for(let lane=0;lane<TOTAL_LANES;lane++){
          const gy=laneY(lane,ch), gTop=gy-gapH/2, gBot=gy+gapH/2
          // solid wall above
          const segTop=lane===0?0:laneY(lane-1,ch)+gapH/2, segBot=gTop
          if(segBot>segTop){ctx.fillStyle=LANE_COLORS[lane];ctx.fillRect(wx,segTop,WALL_THICK,segBot-segTop);ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(wx,segTop,5,segBot-segTop)}
          // gap background
          const isCorrect=lane===q.answer, isFlash=g.flashTimer>0&&g.flashLane===lane
          // white bg for readability
          ctx.fillStyle='rgba(255,255,255,0.92)'
          ctx.beginPath(); ctx.roundRect(wx+2,gTop+3,WALL_THICK-4,gapH-6,8); ctx.fill()
          // colored border
          ctx.strokeStyle=isFlash?(g.flashCorrect?'#44FF44':'#FF4444'):isCorrect?LANE_COLORS[lane]:`${LANE_COLORS[lane]}88`
          ctx.lineWidth=isFlash?3:isCorrect?2.5:1.5
          ctx.beginPath(); ctx.roundRect(wx+2,gTop+3,WALL_THICK-4,gapH-6,8); ctx.stroke()
          // number badge
          ctx.fillStyle=LANE_COLORS[lane]
          ctx.beginPath(); ctx.roundRect(wall.x-14,gTop+7,28,20,10); ctx.fill()
          ctx.fillStyle='#FFF'; ctx.font=`bold ${Math.round(gapH*0.18)}px sans-serif`; ctx.textAlign='center'
          ctx.fillText(`${lane+1}`,wall.x,gTop+21)
          // shortcut text — dark, large, centered
          ctx.fillStyle=isCorrect?LANE_COLORS[lane]:'#222'
          ctx.textAlign='center'
          const txt=q.choices[lane]
          ctx.font=`bold ${Math.min(Math.round(WALL_THICK*0.13),22)}px monospace`
          ctx.fillText(txt,wall.x,gy+8)
        }
        // bottom wall
        const lb=laneY(TOTAL_LANES-1,ch)+gapH/2
        if(lb<ch){ctx.fillStyle=LANE_COLORS[TOTAL_LANES-1];ctx.fillRect(wx,lb,WALL_THICK,ch-lb);ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(wx,lb,5,ch-lb)}
        // top wall
        const ft=laneY(0,ch)-gapH/2
        if(ft>0){ctx.fillStyle=LANE_COLORS[0];ctx.fillRect(wx,0,WALL_THICK,ft);ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(wx,0,5,ft)}
      }

      // particles
      g.particles=g.particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.life-=1;ctx.globalAlpha=p.life/55;ctx.fillStyle=p.color;ctx.fillRect(p.x-3,p.y-3,6,6);return p.life>0}); ctx.globalAlpha=1
      // submarine
      drawSub(ctx,82+SUB_W/2,g.subY,g.frameCount)
      if(g.flashTimer>0) g.flashTimer--
      // end overlay
      if(g.state==='won'||g.state==='lost'){
        ctx.fillStyle='rgba(0,40,100,0.65)'; ctx.fillRect(0,0,cw,ch)
        ctx.fillStyle=g.state==='won'?'#FFD700':'#FF8888'
        ctx.font=`bold ${Math.round(cw*0.072)}px sans-serif`; ctx.textAlign='center'
        ctx.fillText(g.state==='won'?'🎉 클리어!':'💦 게임 오버',cw/2,ch/2-24)
        ctx.fillStyle='#FFF'; ctx.font=`bold ${Math.round(cw*0.05)}px sans-serif`
        ctx.fillText(`점수: ${g.score}점`,cw/2,ch/2+22)
      }
    }

    function loop(){const ctx=canvas!.getContext('2d');if(ctx)draw(ctx);g.rafId=requestAnimationFrame(loop)}
    g.rafId=requestAnimationFrame(loop)

    function moveUp(){if(g.state!=='playing')return;const n=Math.max(0,g.currentLane-1);if(n!==g.currentLane){g.currentLane=n;g.targetY=laneY(n,canvas!.height);playClick()}}
    function moveDown(){if(g.state!=='playing')return;const n=Math.min(TOTAL_LANES-1,g.currentLane+1);if(n!==g.currentLane){g.currentLane=n;g.targetY=laneY(n,canvas!.height);playClick()}}
    function onKey(e:KeyboardEvent){if(e.key==='ArrowUp'){moveUp();e.preventDefault()}if(e.key==='ArrowDown'){moveDown();e.preventDefault()}}
    window.addEventListener('keydown',onKey)
    return()=>{cancelAnimationFrame(g.rafId);window.removeEventListener('keydown',onKey)}
  }, [])

  const { w } = sizeRef.current

  return (
    <Layout title="단축키 퀴즈" onBack={onBack}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 0 24px' }}>

        {/* HUD */}
        <div style={{ display:'flex', gap:20, marginBottom:8, fontWeight:800, fontSize:15, color:'#333', alignItems:'center' }}>
          <span style={{ fontSize:20 }}>
            {Array.from({length:3}).map((_,i)=>(
              <span key={i} style={{ opacity:i<lives?1:0.2 }}>❤️</span>
            ))}
          </span>
          <span style={{ color:'#4D72FB' }}>점수: {score}점</span>
        </div>

        {/* 현재 질문 */}
        {uiState==='playing' && currentQ && (
          <div style={{
            background:'linear-gradient(135deg,#4D72FB,#7B8FFC)', color:'#FFF',
            borderRadius:16, padding:'10px 28px', marginBottom:8,
            fontWeight:900, fontSize:18, textAlign:'center',
            boxShadow:'0 4px 18px rgba(77,114,251,0.35)',
          }}>
            {currentQ.question}
          </div>
        )}

        {/* 캔버스 */}
        <div style={{ borderRadius:20, overflow:'hidden', overflowX:'auto', boxShadow:'0 8px 32px rgba(0,80,180,0.22)', maxWidth:'100vw' }}>
          <canvas
            ref={canvasRef}
            onClick={() => { if(gameRef.current.state==='idle') initGame() }}
            style={{ display:'block', touchAction:'none', cursor:'pointer' }}
          />
        </div>

        {/* 모바일 방향 버튼 */}
        {uiState==='playing' && (
          <div style={{ display:'flex', gap:14, marginTop:12 }}>
            {[
              { label:'↑ 위로', color1:'#4D72FB', color2:'#7B8FFC', shadow:'rgba(77,114,251,0.3)', fn:()=>{ const g=gameRef.current;if(g.state!=='playing')return;const n=Math.max(0,g.currentLane-1);if(n!==g.currentLane){g.currentLane=n;g.targetY=laneY(n,sizeRef.current.h);playClick()} } },
              { label:'↓ 아래로', color1:'#27AE60', color2:'#52C88A', shadow:'rgba(39,174,96,0.3)', fn:()=>{ const g=gameRef.current;if(g.state!=='playing')return;const n=Math.min(TOTAL_LANES-1,g.currentLane+1);if(n!==g.currentLane){g.currentLane=n;g.targetY=laneY(n,sizeRef.current.h);playClick()} } },
            ].map((btn,i) => (
              <button key={i} onPointerDown={btn.fn} style={{
                width:Math.floor((w-44)/2), padding:'14px 0',
                background:`linear-gradient(135deg,${btn.color1},${btn.color2})`,
                color:'#fff', border:'none', borderRadius:16,
                fontWeight:900, fontSize:20, cursor:'pointer',
                boxShadow:`0 4px 16px ${btn.shadow}`,
              }}>{btn.label}</button>
            ))}
          </div>
        )}

        {(uiState==='won'||uiState==='lost') && (
          <div style={{ marginTop:14 }}>
            <Button onClick={initGame}>다시 하기</Button>
          </div>
        )}

        <div style={{ marginTop:10, color:'#AAA', fontSize:11, textAlign:'center' }}>
          Affinity Designer 단축키 · ↑↓ 방향키로 잠수함 이동 · 정답 레인 통과!
        </div>
      </div>
    </Layout>
  )
}
