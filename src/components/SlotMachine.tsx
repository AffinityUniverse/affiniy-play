import { useRef, useEffect, useState } from 'react'

interface Props { width?: number }

// ─── PNG 심볼 정의 ───────────────────────────────────────────────────
// 각 릴은 3개의 PNG 심볼을 가짐
// 릴1=얼굴, 릴2=소품, 릴3=배경

const REEL_DEFS = [
  {
    key: 'face', label: '얼굴',
    symbols: [
      { id: 'f1', label: '학생',   file: 'chars/student.png' },
      { id: 'f2', label: '소녀',   file: 'chars/girl.png'    },
      { id: 'f3', label: '곰돌이', file: 'chars/bear.png'    },
    ],
  },
  {
    key: 'item', label: '소품',
    symbols: [
      { id: 'i1', label: '고양이', file: 'chars/cat.png'     },
      { id: 'i2', label: '졸업장', file: 'chars/diploma.png' },
      { id: 'i3', label: '개구리', file: 'chars/frog.png'    },
    ],
  },
  {
    key: 'bg', label: '배경',
    symbols: [
      { id: 'b1', label: '여우',   file: 'chars/fox.png'     },
      { id: 'b2', label: '거북이', file: 'chars/turtle.png'  },
      { id: 'b3', label: '사슴',   file: 'chars/deer.png'    },
    ],
  },
]

type SymDef = { id: string; label: string; file: string }

const REPEATS = 9

const CSS = `
@keyframes slotShake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-5px,-1px)} 40%{transform:translate(5px,2px)} 60%{transform:translate(-3px,1px)} 80%{transform:translate(2px,-1px)} }
@keyframes jpPulse { from{box-shadow:0 0 0 3px rgba(255,215,0,0.6),0 0 30px rgba(255,215,0,0.3)} to{box-shadow:0 0 0 6px rgba(255,215,0,1),0 0 60px rgba(255,215,0,0.6)} }
@keyframes bfly { from{transform:translate(0,0) scale(1);opacity:1} to{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0} }
@keyframes bpipPulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.5);opacity:1} }
@keyframes resultFadeIn { from{opacity:0;transform:translateY(12px) scale(0.92)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes resultPop { 0%{transform:scale(0.7)} 70%{transform:scale(1.08)} 100%{transform:scale(1)} }
@keyframes glowPulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,215,0,0.4)} 50%{box-shadow:0 0 0 8px rgba(255,215,0,0)} }
#slot3-wrapper.shake { animation: slotShake 0.38s ease-out; }
.reel-spinning-border::after { content:''; position:absolute; inset:0; border-radius:12px; box-shadow:inset 0 0 0 3px rgba(255,255,255,0.55); pointer-events:none; z-index:5; }
.reel-jackpot { animation: jpPulse 0.24s ease-in-out infinite alternate !important; }
`

const E = {
  in3:    (t: number) => t ** 3,
  linear: (t: number) => t,
  out3:   (t: number) => 1 - (1 - t) ** 3,
  out5:   (t: number) => 1 - (1 - t) ** 5,
}

function kf(t: number, start: number, dist: number) {
  const ph: [number, number, number, number, (t: number) => number][] = [
    [0.00, 0.14, 0.00, 0.08, E.in3],
    [0.14, 0.72, 0.08, 0.82, E.linear],
    [0.72, 0.86, 0.82, 0.91, E.out3],
    [0.86, 1.00, 0.91, 1.00, E.out5],
  ]
  const p = ph.find(k => t <= k[1]) || ph[ph.length - 1]
  const lt = Math.max(0, Math.min(1, (t - p[0]) / (p[1] - p[0])))
  return start + dist * (p[2] + (p[3] - p[2]) * p[4](lt))
}

function pickSymbol(symbols: SymDef[]): SymDef {
  return symbols[Math.floor(Math.random() * symbols.length)]
}

export default function SlotMachine({ width = 340 }: Props) {
  const wrapperRef    = useRef<HTMLDivElement>(null)
  const leverGroupRef = useRef<SVGGElement>(null)
  const resultMsgRef  = useRef<HTMLDivElement>(null)

  // 3개 릴 viewport/strip 쌍
  const reelRefs = [
    useRef<{ vp: HTMLDivElement; strip: HTMLDivElement } | null>(null),
    useRef<{ vp: HTMLDivElement; strip: HTMLDivElement } | null>(null),
    useRef<{ vp: HTMLDivElement; strip: HTMLDivElement } | null>(null),
  ]

  // 결과 카드 상태
  const [resultCard, setResultCard] = useState<{ face: SymDef; item: SymDef; bg: SymDef } | null>(null)
  const [resultVisible, setResultVisible] = useState(false)

  const mountRef = useRef({
    spinning: false,
    posY: [0, 0, 0] as [number, number, number],
    symH: 0,
    setH: [0, 0, 0] as [number, number, number],
    ac: null as AudioContext | null,
    leverAngle: 0,
    leverDragging: false,
    leverDy0: 0,
    leverA0: 0,
    leverPulled: false,
    leverRaf: null as number | null,
  })

  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.textContent = CSS
    document.head.appendChild(styleEl)

    const m = mountRef.current

    function getCtx(): AudioContext {
      if (!m.ac) m.ac = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (m.ac.state === 'suspended') m.ac.resume()
      return m.ac
    }

    // ── Audio ──
    let spinNodes: { osc: OscillatorNode; ns: AudioBufferSourceNode; g: GainNode } | null = null

    const Sfx = {
      click() {
        try {
          const c = getCtx()
          const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.06), c.sampleRate)
          const d = buf.getChannelData(0)
          for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*Math.exp(-i/d.length*45)*0.8
          const s = c.createBufferSource(); s.buffer = buf; s.connect(c.destination); s.start()
        } catch(_) {}
      },
      startSpin() {
        try {
          this.stopSpin()
          const c = getCtx()
          const g = c.createGain(); g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(0.16, c.currentTime+0.3); g.connect(c.destination)
          const osc = c.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 90; osc.connect(g); osc.start()
          const nb = c.createBuffer(1, c.sampleRate*3, c.sampleRate)
          const nd = nb.getChannelData(0); for (let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1
          const ns = c.createBufferSource(); ns.buffer=nb; ns.loop=true
          const f = c.createBiquadFilter(); f.type='bandpass'; f.frequency.value=900; f.Q.value=2
          const ng = c.createGain(); ng.gain.value=0.022
          ns.connect(f).connect(ng).connect(g); ns.start()
          spinNodes = {osc,ns,g}
        } catch(_) {}
      },
      stopSpin() {
        try {
          if (!spinNodes) return
          const c = getCtx()
          spinNodes.g.gain.linearRampToValueAtTime(0, c.currentTime+0.3)
          const sn=spinNodes; spinNodes=null
          setTimeout(()=>{try{sn.osc.stop()}catch(_){}try{sn.ns.stop()}catch(_){}},400)
        } catch(_) {}
      },
      thud(i: number) {
        try {
          const c = getCtx()
          const t = c.currentTime + i*0.08
          const buf = c.createBuffer(1, Math.floor(c.sampleRate*0.14), c.sampleRate)
          const d = buf.getChannelData(0)
          for (let j=0;j<d.length;j++) d[j]=(Math.random()*2-1)*Math.exp(-j/d.length*20)*0.6
          const s = c.createBufferSource(); s.buffer=buf; s.connect(c.destination); s.start(t)
        } catch(_) {}
      },
      jackpot() {
        try {
          const c = getCtx()
          ;[523.25,659.25,783.99,880,1046.5,1318.5,1568].forEach((freq,i)=>{
            const t = c.currentTime+i*0.09
            const o = c.createOscillator(); o.type='sine'; o.frequency.value=freq
            const g = c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.28,t+0.04); g.gain.exponentialRampToValueAtTime(0.001,t+0.55)
            o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.6)
          })
        } catch(_) {}
      },
      match() {
        try {
          const c = getCtx()
          ;[784,988,1174].forEach((freq,i)=>{
            const t = c.currentTime+i*0.11
            const o = c.createOscillator(); o.type='sine'; o.frequency.value=freq
            const g = c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.18,t+0.03); g.gain.exponentialRampToValueAtTime(0.001,t+0.38)
            o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.4)
          })
        } catch(_) {}
      },
    }

    // ── 릴 빌드 ──
    function buildReel(ri: number) {
      const refs = reelRefs[ri].current; if (!refs) return
      const { vp, strip } = refs
      const syms = REEL_DEFS[ri].symbols
      const N = syms.length
      m.symH = vp.getBoundingClientRect().width
      m.setH[ri] = N * m.symH
      strip.innerHTML = ''
      for (let rep=0; rep<REPEATS; rep++) {
        for (const sym of syms) {
          const cell = document.createElement('div')
          cell.style.cssText = `width:${m.symH}px;height:${m.symH}px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;overflow:hidden;position:relative;`
          const img = document.createElement('img')
          img.src = sym.file; img.alt = sym.label; (img as any).draggable = false
          img.style.cssText = 'width:88%;height:88%;object-fit:cover;display:block;pointer-events:none;user-select:none;border-radius:8px;'
          const lbl = document.createElement('div')
          lbl.style.cssText = 'position:absolute;bottom:3px;right:5px;font-size:9px;font-weight:700;color:rgba(0,0,0,0.4);font-family:sans-serif;'
          lbl.textContent = sym.label
          cell.appendChild(img); cell.appendChild(lbl); strip.appendChild(cell)
        }
      }
      strip.style.height = (N*REPEATS*m.symH)+'px'
      applyY(ri, 0)
    }

    function applyY(ri: number, y: number) {
      m.posY[ri] = y
      const refs = reelRefs[ri].current; if (refs) refs.strip.style.transform = `translateY(${-y}px)`
    }

    function spinReel(ri: number, delay: number, onDone: (result: SymDef) => void) {
      const syms = REEL_DEFS[ri].symbols; const N = syms.length
      const result = pickSymbol(syms)
      const idx = syms.findIndex(s => s.id === result.id)
      let targetY = idx * m.symH
      const minY = m.posY[ri] + m.setH[ri] * 4
      while (targetY < minY) targetY += m.setH[ri]
      const startY = m.posY[ri]; const dist = targetY - startY; const TOTAL = 2600 + delay
      const refs = reelRefs[ri].current!
      refs.vp.classList.add('reel-spinning-border')
      setTimeout(() => {
        let t0: number | null = null
        function frame(ts: number) {
          if (!t0) t0 = ts
          const t = Math.min(1,(ts-t0)/TOTAL)
          applyY(ri, kf(t, startY, dist))
          if (t < 1) { requestAnimationFrame(frame); return }
          applyY(ri, targetY)
          const reset = targetY % m.setH[ri]
          requestAnimationFrame(() => {
            refs.strip.style.transition='none'; refs.strip.style.transform=`translateY(${-reset}px)`; m.posY[ri]=reset
            requestAnimationFrame(() => { refs.strip.style.transition='' })
          })
          refs.vp.classList.remove('reel-spinning-border')
          onDone(result)
        }
        requestAnimationFrame(frame)
      }, delay)
    }

    // ── 파티클 ──
    function spawnParticles(jackpot: boolean) {
      const wrapper = wrapperRef.current!; const rect = wrapper.getBoundingClientRect()
      const cx = rect.left+rect.width/2, cy = rect.top+rect.height/2
      const colors = jackpot ? ['#FFD700','#FFF','#FF6B8A','#4D72FB','#4DFB72','#FF8C42'] : ['#FFD700','#FFF','#4D72FB']
      for (let i=0; i<(jackpot?60:22); i++) {
        const el = document.createElement('div')
        const sz=(jackpot?8:4)+Math.random()*8, ang=Math.random()*Math.PI*2, spd=(jackpot?140:70)+Math.random()*160, dur=0.6+Math.random()*0.9
        el.style.cssText=`position:fixed;left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;border-radius:50%;background:${colors[i%colors.length]};pointer-events:none;z-index:9999;--tx:${(Math.cos(ang)*spd).toFixed(1)}px;--ty:${(Math.sin(ang)*spd).toFixed(1)}px;animation:bfly ${dur.toFixed(2)}s ease-out forwards;animation-delay:${(Math.random()*0.2).toFixed(2)}s;`
        document.body.appendChild(el); setTimeout(()=>el.remove(),(dur+0.4)*1000)
      }
    }

    // ── 스핀 ──
    function startSpin() {
      if (m.spinning) return; m.spinning = true
      setResultVisible(false)
      const wrapper = wrapperRef.current!
      wrapper.classList.remove('shake'); void wrapper.offsetWidth; wrapper.classList.add('shake')
      wrapper.addEventListener('animationend',()=>wrapper.classList.remove('shake'),{once:true})
      const msgEl = resultMsgRef.current!; msgEl.textContent = ''
      Sfx.startSpin()

      const results: SymDef[] = []
      let doneCount = 0

      for (let ri=0; ri<3; ri++) {
        spinReel(ri, ri*320, (result) => {
          results[ri] = result; doneCount++
          Sfx.thud(doneCount-1)
          if (doneCount === 3) {
            Sfx.stopSpin()
            const [face, item, bg] = results
            const fi = REEL_DEFS[0].symbols.findIndex(s=>s.id===face.id)
            const ii = REEL_DEFS[1].symbols.findIndex(s=>s.id===item.id)
            const bi = REEL_DEFS[2].symbols.findIndex(s=>s.id===bg.id)
            const isJackpot = fi===ii && ii===bi
            const isMatch2  = fi===ii || ii===bi || fi===bi

            spawnParticles(isJackpot)
            m.spinning = false

            if (isJackpot) {
              setTimeout(()=>Sfx.jackpot(), 150)
              msgEl.textContent = '🎉 JACKPOT!'
              for (const r of reelRefs) r.current?.vp.classList.add('reel-jackpot')
              setTimeout(()=>{ for (const r of reelRefs) r.current?.vp.classList.remove('reel-jackpot') }, 5000)
            } else if (isMatch2) {
              Sfx.match()
              msgEl.textContent = '✨ 2개 일치!'
            } else {
              msgEl.textContent = `${face.label} · ${item.label} · ${bg.label}`
            }

            // 결과 카드 표시
            setResultCard({ face, item, bg: bg })
            setTimeout(() => setResultVisible(true), 100)
          }
        })
      }
    }

    // 빌드
    setTimeout(()=>{ for(let i=0;i<3;i++) buildReel(i) }, 0)

    // ── 레버 ──
    const leverMount = document.getElementById('slot3-lever-mount')!
    const leverGroup = leverGroupRef.current!
    const PX=16, PY=118, MAX=62
    const easeIn3  = (t:number)=>t**3
    const easeOut2 = (t:number)=>1-(1-t)**2
    function easeBounce(t:number){const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d){t-=1.5/d;return n*t*t+0.75}if(t<2.5/d){t-=2.25/d;return n*t*t+0.9375}t-=2.625/d;return n*t*t+0.984375}

    function setLeverAngle(a:number){m.leverAngle=Math.max(0,Math.min(MAX,a));leverGroup.setAttribute('transform',`rotate(${m.leverAngle},${PX},${PY})`)}

    function animLeverTo(target:number,ms:number,efn:(t:number)=>number,done?:()=>void){
      if(m.leverRaf!==null)cancelAnimationFrame(m.leverRaf)
      const from=m.leverAngle,t0=performance.now()
      function step(ts:number){const t=Math.min(1,(ts-t0)/ms);setLeverAngle(from+(target-from)*efn(t));if(t<1){m.leverRaf=requestAnimationFrame(step)}else{m.leverRaf=null;if(done)done()}}
      m.leverRaf=requestAnimationFrame(step)
    }

    function pull(){if(m.leverPulled)return;m.leverPulled=true;Sfx.click();animLeverTo(MAX,165,easeIn3,()=>{startSpin();setTimeout(()=>animLeverTo(0,500,easeBounce,()=>{m.leverPulled=false}),100)})}

    function onMD(e:MouseEvent){m.leverDragging=true;m.leverDy0=e.clientY;m.leverA0=m.leverAngle;e.preventDefault()}
    function onTS(e:TouchEvent){m.leverDragging=true;m.leverDy0=e.touches[0].clientY;m.leverA0=m.leverAngle;e.preventDefault()}
    function onMM(e:MouseEvent){if(!m.leverDragging)return;setLeverAngle(m.leverA0+(e.clientY-m.leverDy0)*0.55);if(m.leverAngle>=MAX-1.5&&!m.leverPulled){m.leverDragging=false;pull()}}
    function onTM(e:TouchEvent){if(!m.leverDragging)return;setLeverAngle(m.leverA0+(e.touches[0].clientY-m.leverDy0)*0.55);if(m.leverAngle>=MAX-1.5&&!m.leverPulled){m.leverDragging=false;pull()}}
    function onMU(){if(m.leverDragging&&!m.leverPulled)animLeverTo(0,260,easeOut2);m.leverDragging=false}
    function onTE(){if(m.leverDragging&&!m.leverPulled)animLeverTo(0,260,easeOut2);m.leverDragging=false}
    function onMC(){if(!m.leverPulled&&!m.leverDragging)pull()}

    leverMount.addEventListener('mousedown',onMD)
    leverMount.addEventListener('touchstart',onTS,{passive:false})
    leverMount.addEventListener('click',onMC)
    document.addEventListener('mousemove',onMM)
    document.addEventListener('mouseup',onMU)
    document.addEventListener('touchmove',onTM,{passive:false})
    document.addEventListener('touchend',onTE)

    return () => {
      leverMount.removeEventListener('mousedown',onMD)
      leverMount.removeEventListener('touchstart',onTS)
      leverMount.removeEventListener('click',onMC)
      document.removeEventListener('mousemove',onMM)
      document.removeEventListener('mouseup',onMU)
      document.removeEventListener('touchmove',onTM)
      document.removeEventListener('touchend',onTE)
      if(m.leverRaf!==null)cancelAnimationFrame(m.leverRaf)
      document.head.removeChild(styleEl)
      if(m.ac){m.ac.close();m.ac=null}
    }
  }, [])

  const REEL_W = Math.floor((width - 80) / 3)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* 슬롯머신 본체 */}
      <div
        id="slot3-wrapper"
        ref={wrapperRef}
        style={{
          width,
          background: '#4D72FB',
          borderRadius: 32,
          padding: '20px 20px 22px',
          position: 'relative',
          boxShadow: [
            'inset 0 2px 0 rgba(255,255,255,0.22)',
            'inset 0 -3px 0 rgba(0,0,60,0.18)',
            '0 20px 52px rgba(77,114,251,0.4)',
          ].join(', '),
        }}
      >
        {/* 헤더 핍 */}
        <div style={{ display:'flex',justifyContent:'center',alignItems:'center',gap:7,marginBottom:16 }}>
          {[7,7,26,7,7].map((w,i)=>(
            <div key={i} style={{width:w,height:7,borderRadius:i===2?4:50,background:i===2?'rgba(255,255,255,0.75)':'rgba(255,255,255,0.35)'}}/>
          ))}
        </div>

        {/* 릴 라벨 */}
        <div style={{display:'flex',gap:6,marginBottom:5,justifyContent:'center'}}>
          {REEL_DEFS.map(r=>(
            <div key={r.key} style={{width:REEL_W+14,textAlign:'center',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.8)',letterSpacing:'1px'}}>
              {r.label}
            </div>
          ))}
        </div>

        {/* 3릴 */}
        <div style={{display:'flex',gap:6,background:'rgba(0,0,40,0.28)',borderRadius:18,padding:6}}>
          {REEL_DEFS.map((reel, i) => (
            <div
              key={reel.key}
              ref={(el) => {
                if (!el) return
                const strip = el.querySelector<HTMLDivElement>('.reel-strip')
                if (strip) reelRefs[i].current = { vp: el, strip }
              }}
              style={{
                width:REEL_W, height:REEL_W,
                borderRadius:12, overflow:'hidden',
                position:'relative', background:'#fff', flexShrink:0,
              }}
            >
              <div className="reel-strip" style={{position:'absolute',top:0,left:0,right:0,willChange:'transform'}} />
            </div>
          ))}
        </div>

        {/* 결과 메시지 */}
        <div ref={resultMsgRef} style={{marginTop:14,textAlign:'center',height:20,lineHeight:'20px',color:'rgba(255,255,255,0.92)',fontSize:13,fontWeight:700,letterSpacing:'1.5px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}} />

        {/* 하단 핍 */}
        <div style={{display:'flex',justifyContent:'center',gap:7,marginTop:16}}>
          {[0,0.3,0.6,0.9,1.2].map((delay,i)=>(
            <div key={i} style={{width:6,height:6,borderRadius:'50%',background:i===2?'rgba(255,255,255,0.8)':i===1||i===3?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.3)',animation:`bpipPulse 2s ease-in-out ${delay}s infinite`}}/>
          ))}
        </div>

        {/* 레버 */}
        <div id="slot3-lever-mount" style={{position:'absolute',right:-60,top:'50%',transform:'translateY(-50%)',cursor:'pointer',userSelect:'none',WebkitUserSelect:'none',touchAction:'none'}}>
          <svg width={48} height={220} viewBox="0 0 48 220" style={{display:'block',overflow:'visible'}}>
            <rect x={4} y={96} width={22} height={44} rx={11} fill="#3558D4"/>
            <g ref={leverGroupRef} id="slot3-lever-group">
              <rect x={13} y={18} width={6} height={103} rx={3} fill="white" opacity={0.88}/>
              <circle cx={16} cy={13} r={14} fill="white"/>
              <circle cx={16} cy={13} r={14} fill="none" stroke="rgba(77,114,251,0.12)" strokeWidth={3}/>
              <circle cx={11} cy={8} r={4} fill="rgba(255,255,255,0.5)"/>
            </g>
          </svg>
        </div>
      </div>

      {/* ── 결과 카드 ── */}
      {resultCard && (
        <div style={{
          marginTop: 14,
          background: 'linear-gradient(135deg, #fff8e1 0%, #e3f2fd 100%)',
          borderRadius: 20,
          padding: '14px 16px 16px',
          boxShadow: '0 6px 24px rgba(77,114,251,0.18)',
          animation: resultVisible ? 'resultFadeIn 0.45s cubic-bezier(.34,1.56,.64,1) forwards' : 'none',
          opacity: resultVisible ? 1 : 0,
          width: width,
          boxSizing: 'border-box' as const,
        }}>
          <div style={{textAlign:'center',fontWeight:900,fontSize:13,color:'#4D72FB',marginBottom:10,letterSpacing:'0.5px'}}>
            🎲 오늘의 조합
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'center',alignItems:'flex-end'}}>
            {([
              { sym: resultCard.face, role: '얼굴' },
              { sym: resultCard.item, role: '소품' },
              { sym: resultCard.bg,   role: '배경' },
            ] as const).map(({ sym, role }, idx) => (
              <div key={idx} style={{
                display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                animation: resultVisible ? `resultPop 0.4s cubic-bezier(.34,1.56,.64,1) ${idx*0.12}s both` : 'none',
              }}>
                <div style={{
                  width: REEL_W+2,
                  height: REEL_W+2,
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '2.5px solid rgba(77,114,251,0.3)',
                  boxShadow: '0 3px 12px rgba(0,0,0,0.1)',
                  animation: resultVisible ? 'glowPulse 2s ease-in-out infinite' : 'none',
                }}>
                  <img src={sym.file} alt={sym.label} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:10,color:'#4D72FB',fontWeight:700,letterSpacing:'0.5px'}}>{role}</div>
                  <div style={{fontSize:12,color:'#333',fontWeight:800}}>{sym.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
