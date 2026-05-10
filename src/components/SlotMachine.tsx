import { useRef, useEffect, useCallback } from 'react'

interface Props { width?: number }

// ── SVG symbol definitions ──────────────────────────────────────────
// Each symbol is an SVG path/element string rendered inside a viewBox="0 0 80 80"

const FACES = [
  { id: 'f1', label: '웃음',  bg: '#FFF0CC', svg: `
    <circle cx="40" cy="40" r="32" fill="#FDBCAA"/>
    <ellipse cx="40" cy="36" rx="28" ry="22" fill="#FDBCAA"/>
    <circle cx="29" cy="34" r="5" fill="white"/><circle cx="51" cy="34" r="5" fill="white"/>
    <circle cx="29.5" cy="34.5" r="3.2" fill="#1A1A1A"/><circle cx="51.5" cy="34.5" r="3.2" fill="#1A1A1A"/>
    <circle cx="28.5" cy="33.5" r="1.1" fill="white"/><circle cx="50.5" cy="33.5" r="1.1" fill="white"/>
    <path d="M30 44 Q40 52 50 44" stroke="#CC7755" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="40" cy="24" rx="18" ry="14" fill="#1A1A1A"/>
  ` },
  { id: 'f2', label: '윙크',  bg: '#E8F0FF', svg: `
    <circle cx="40" cy="40" r="32" fill="#FDBCAA"/>
    <ellipse cx="40" cy="36" rx="28" ry="22" fill="#FDBCAA"/>
    <circle cx="29" cy="34" r="5" fill="white"/><circle cx="51" cy="34" r="5" fill="white"/>
    <circle cx="29.5" cy="34.5" r="3.2" fill="#1A1A1A"/>
    <path d="M48 32 Q51 34 54 32" stroke="#1A1A1A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="28.5" cy="33.5" r="1.1" fill="white"/>
    <path d="M30 44 Q40 52 50 44" stroke="#CC7755" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="40" cy="24" rx="18" ry="14" fill="#FF8C00"/>
  ` },
  { id: 'f3', label: '놀람',  bg: '#FFE8E8', svg: `
    <circle cx="40" cy="40" r="32" fill="#FDBCAA"/>
    <ellipse cx="40" cy="36" rx="28" ry="22" fill="#FDBCAA"/>
    <circle cx="29" cy="32" r="6" fill="white"/><circle cx="51" cy="32" r="6" fill="white"/>
    <circle cx="29.5" cy="32.5" r="4" fill="#1A1A1A"/><circle cx="51.5" cy="32.5" r="4" fill="#1A1A1A"/>
    <circle cx="28" cy="31" r="1.4" fill="white"/><circle cx="50" cy="31" r="1.4" fill="white"/>
    <ellipse cx="40" cy="47" rx="5" ry="6" fill="#CC7755"/>
    <ellipse cx="40" cy="22" rx="20" ry="14" fill="#1A1A1A"/>
  ` },
  { id: 'f4', label: '하트',  bg: '#FFE0F0', svg: `
    <circle cx="40" cy="40" r="32" fill="#FDBCAA"/>
    <ellipse cx="40" cy="36" rx="28" ry="22" fill="#FDBCAA"/>
    <circle cx="29" cy="34" r="5" fill="#FFB0C8"/><circle cx="51" cy="34" r="5" fill="#FFB0C8"/>
    <circle cx="29.5" cy="34.5" r="3.2" fill="#AA1155"/><circle cx="51.5" cy="34.5" r="3.2" fill="#AA1155"/>
    <path d="M30 44 Q40 52 50 44" stroke="#CC3366" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="40" cy="24" rx="18" ry="14" fill="#1A1A1A"/>
    <text x="40" y="16" text-anchor="middle" font-size="12" fill="#FF6699">♥</text>
  ` },
  { id: 'f5', label: '쿨',    bg: '#E0F5FF', svg: `
    <circle cx="40" cy="40" r="32" fill="#FDBCAA"/>
    <ellipse cx="40" cy="36" rx="28" ry="22" fill="#FDBCAA"/>
    <rect x="20" y="27" width="14" height="9" rx="4" fill="#1A1A1A"/>
    <rect x="38" y="27" width="22" height="9" rx="4" fill="#1A1A1A"/>
    <rect x="32" y="30" width="8" height="4" rx="2" fill="#1A1A1A"/>
    <path d="M30 44 Q40 50 50 44" stroke="#CC7755" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="40" cy="24" rx="18" ry="14" fill="#222"/>
    <ellipse cx="50" cy="19" rx="12" ry="5" fill="#222"/>
  ` },
]

const ITEMS = [
  { id: 'i1', label: '가방',  bg: '#E8F0FF', svg: `
    <rect x="20" y="22" width="40" height="38" rx="8" fill="#4D72FB"/>
    <rect x="24" y="28" width="32" height="26" rx="5" fill="#3558D4"/>
    <rect x="32" y="14" width="16" height="12" rx="4" fill="#4D72FB"/>
    <circle cx="40" cy="44" r="5" fill="#FFD700"/>
    <rect x="36" y="58" width="8" height="14" rx="3" fill="#3558D4"/>
    <rect x="26" y="58" width="10" height="14" rx="3" fill="#3558D4"/>
    <rect x="44" y="58" width="10" height="14" rx="3" fill="#3558D4"/>
  ` },
  { id: 'i2', label: '연필',  bg: '#FFF8D5', svg: `
    <rect x="34" y="8" width="12" height="58" rx="3" fill="#FFD700"/>
    <polygon points="34,66 40,76 46,66" fill="#FDBCAA"/>
    <rect x="34" y="8" width="12" height="8" rx="2" fill="#FF8888"/>
    <rect x="35" y="16" width="2" height="44" fill="rgba(255,255,255,0.4)"/>
    <rect x="34" y="60" width="12" height="6" fill="#CCC"/>
  ` },
  { id: 'i3', label: '책',    bg: '#E8FFE8', svg: `
    <rect x="16" y="14" width="48" height="58" rx="4" fill="#FF6B8A"/>
    <rect x="20" y="14" width="44" height="58" rx="4" fill="#FF8FB0"/>
    <rect x="24" y="20" width="36" height="2" rx="1" fill="white" opacity="0.7"/>
    <rect x="24" y="26" width="36" height="2" rx="1" fill="white" opacity="0.5"/>
    <rect x="24" y="32" width="28" height="2" rx="1" fill="white" opacity="0.5"/>
    <rect x="24" y="44" width="36" height="2" rx="1" fill="white" opacity="0.7"/>
    <rect x="24" y="50" width="30" height="2" rx="1" fill="white" opacity="0.5"/>
    <rect x="16" y="14" width="6" height="58" rx="3" fill="#CC4466"/>
    <text x="40" y="42" text-anchor="middle" font-size="16" fill="white" font-weight="bold">A+</text>
  ` },
  { id: 'i4', label: '왕관',  bg: '#FFF0CC', svg: `
    <polygon points="10,60 22,28 40,44 58,28 70,60" fill="#FFD700" stroke="#CC8800" stroke-width="2"/>
    <circle cx="22" cy="28" r="6" fill="#FF4444"/>
    <circle cx="40" cy="44" r="6" fill="#4444FF"/>
    <circle cx="58" cy="28" r="6" fill="#44AA44"/>
    <rect x="10" y="58" width="60" height="10" rx="4" fill="#FFD700" stroke="#CC8800" stroke-width="2"/>
    <circle cx="20" cy="63" r="3" fill="#CC8800"/>
    <circle cx="40" cy="63" r="3" fill="#CC8800"/>
    <circle cx="60" cy="63" r="3" fill="#CC8800"/>
  ` },
  { id: 'i5', label: '졸업장', bg: '#F0F0F0', svg: `
    <rect x="18" y="20" width="44" height="34" rx="4" fill="#F5E6C8" stroke="#C8A87A" stroke-width="2"/>
    <rect x="22" y="26" width="36" height="2" rx="1" fill="#C8A87A" opacity="0.6"/>
    <rect x="22" y="32" width="36" height="2" rx="1" fill="#C8A87A" opacity="0.6"/>
    <rect x="22" y="38" width="28" height="2" rx="1" fill="#C8A87A" opacity="0.6"/>
    <path d="M30 54 Q40 48 50 54 L46 68 Q40 64 34 68 Z" fill="#4D72FB"/>
    <circle cx="40" cy="54" r="6" fill="#FFD700" stroke="#CC8800" stroke-width="1.5"/>
    <path d="M34 68 Q40 72 46 68" stroke="#C8A87A" stroke-width="2" fill="none"/>
  ` },
]

const BACKGROUNDS = [
  { id: 'b1', label: '교실',  bg: '#E8F0FF', svg: `
    <rect x="0" y="0" width="80" height="80" fill="#E8F0FF"/>
    <rect x="0" y="50" width="80" height="30" fill="#D4A874"/>
    <rect x="5" y="10" width="30" height="22" rx="2" fill="#A0C0FF"/>
    <rect x="45" y="10" width="30" height="22" rx="2" fill="#A0C0FF"/>
    <rect x="7" y="12" width="10" height="8" fill="rgba(0,0,0,0.05)"/>
    <rect x="20" y="12" width="13" height="8" fill="rgba(0,0,0,0.05)"/>
    <rect x="47" y="12" width="26" height="8" fill="rgba(0,0,0,0.05)"/>
    <rect x="10" y="50" width="20" height="15" rx="2" fill="#8B6B4A"/>
    <rect x="50" y="50" width="20" height="15" rx="2" fill="#8B6B4A"/>
    <rect x="30" y="40" width="20" height="10" rx="1" fill="#3558D4"/>
  ` },
  { id: 'b2', label: '운동장', bg: '#D5F5E3', svg: `
    <rect x="0" y="0" width="80" height="80" fill="#87CEEB"/>
    <ellipse cx="20" cy="15" rx="14" ry="10" fill="white"/>
    <ellipse cx="55" cy="10" rx="18" ry="12" fill="white"/>
    <rect x="0" y="48" width="80" height="32" fill="#5DC85D"/>
    <circle cx="40" cy="32" r="10" fill="white" stroke="#FF4444" stroke-width="2"/>
    <line x1="40" y1="22" x2="40" y2="0" stroke="#888" stroke-width="2"/>
    <rect x="36" y="4" width="8" height="2" fill="#FF4444"/>
    <ellipse cx="15" cy="50" rx="12" ry="3" fill="#4A9E3A"/>
    <ellipse cx="65" cy="50" rx="12" ry="3" fill="#4A9E3A"/>
    <rect x="33" y="60" width="14" height="20" rx="2" fill="#DEB887"/>
    <ellipse cx="40" cy="58" rx="10" ry="4" fill="#5DC85D"/>
  ` },
  { id: 'b3', label: '도서관', bg: '#E9D5FF', svg: `
    <rect x="0" y="0" width="80" height="80" fill="#2C1654"/>
    <rect x="0" y="55" width="80" height="25" fill="#3D2870"/>
    <rect x="4" y="8" width="10" height="48" rx="1" fill="#FF6B8A"/>
    <rect x="16" y="8" width="10" height="48" rx="1" fill="#4D72FB"/>
    <rect x="28" y="8" width="10" height="48" rx="1" fill="#FFD700"/>
    <rect x="40" y="8" width="10" height="48" rx="1" fill="#4DFB72"/>
    <rect x="52" y="8" width="10" height="48" rx="1" fill="#FB4DCC"/>
    <rect x="64" y="8" width="12" height="48" rx="1" fill="#FF8C42"/>
    <rect x="0" y="54" width="80" height="4" rx="1" fill="#5A3E9E"/>
    <rect x="0" y="4" width="80" height="6" rx="1" fill="#5A3E9E"/>
    <circle cx="60" cy="18" r="5" fill="rgba(255,255,200,0.3)"/>
    <circle cx="20" cy="22" r="4" fill="rgba(255,255,200,0.2)"/>
  ` },
  { id: 'b4', label: '집',     bg: '#FFFBD5', svg: `
    <rect x="0" y="0" width="80" height="80" fill="#87CEEB"/>
    <rect x="10" y="38" width="60" height="42" rx="4" fill="#F5DEB3"/>
    <rect x="10" y="38" width="60" height="42" rx="4" stroke="#D4A874" stroke-width="2" fill="none"/>
    <polygon points="5,40 40,12 75,40" fill="#CC4444"/>
    <polygon points="5,40 40,12 75,40" stroke="#AA2222" stroke-width="2" fill="none"/>
    <rect x="32" y="55" width="16" height="25" rx="3" fill="#8B5E3C"/>
    <rect x="18" y="46" width="14" height="12" rx="2" fill="#A0C0FF"/>
    <rect x="48" y="46" width="14" height="12" rx="2" fill="#A0C0FF"/>
    <circle cx="47" cy="66" r="2" fill="#FFD700"/>
    <ellipse cx="20" cy="12" rx="8" ry="6" fill="white"/>
    <ellipse cx="60" cy="16" rx="10" ry="7" fill="white"/>
  ` },
  { id: 'b5', label: '하늘',   bg: '#D5EEFF', svg: `
    <rect x="0" y="0" width="80" height="80" fill="#4FC3F7"/>
    <ellipse cx="25" cy="20" rx="20" ry="14" fill="white"/>
    <ellipse cx="18" cy="22" rx="14" ry="10" fill="white"/>
    <ellipse cx="32" cy="22" rx="16" ry="11" fill="white"/>
    <ellipse cx="58" cy="14" rx="18" ry="12" fill="white"/>
    <ellipse cx="50" cy="16" rx="12" ry="9" fill="white"/>
    <ellipse cx="66" cy="16" rx="14" ry="10" fill="white"/>
    <path d="M10 50 Q20 44 30 50 Q40 56 50 50 Q60 44 70 50" stroke="rgba(255,255,255,0.4)" stroke-width="2" fill="none"/>
    <text x="40" y="68" text-anchor="middle" font-size="18">🌈</text>
    <text x="16" y="44" text-anchor="middle" font-size="14">☀️</text>
  ` },
]

const REEL_DEFS = [
  { key: 'face', label: '얼굴',  symbols: FACES },
  { key: 'item', label: '소품',  symbols: ITEMS },
  { key: 'bg',   label: '배경',  symbols: BACKGROUNDS },
]

const REPEATS = 8

const CSS = `
@keyframes slotShake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-5px,-1px)} 40%{transform:translate(5px,2px)} 60%{transform:translate(-3px,1px)} 80%{transform:translate(2px,-1px)} }
@keyframes jpPulse { from{box-shadow:0 0 0 3px rgba(255,215,0,0.6),0 0 30px rgba(255,215,0,0.3)} to{box-shadow:0 0 0 6px rgba(255,215,0,1),0 0 60px rgba(255,215,0,0.6)} }
@keyframes bfly { from{transform:translate(0,0) scale(1);opacity:1} to{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0} }
@keyframes bpipPulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.5);opacity:1} }
@keyframes reelGlow { from{box-shadow:inset 0 0 0 2px rgba(255,255,255,0.3)} to{box-shadow:inset 0 0 0 3px rgba(255,255,255,0.7),0 0 20px rgba(255,255,255,0.2)} }
#slot3-wrapper.shake { animation: slotShake 0.38s ease-out; }
.reel-spinning { animation: reelGlow 0.3s ease-in-out infinite alternate; }
.reel-jackpot  { animation: jpPulse 0.24s ease-in-out infinite alternate; }
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

function pickSymbol<T extends { id: string }>(symbols: T[]): T {
  return symbols[Math.floor(Math.random() * symbols.length)]
}

export default function SlotMachine({ width = 340 }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const leverGroupRef = useRef<SVGGElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  // 3 reel refs
  const reelRefs = [
    useRef<{ viewport: HTMLDivElement; strip: HTMLDivElement } | null>(null),
    useRef<{ viewport: HTMLDivElement; strip: HTMLDivElement } | null>(null),
    useRef<{ viewport: HTMLDivElement; strip: HTMLDivElement } | null>(null),
  ]

  const mountRef = useRef<{
    spinning: boolean
    posY: [number, number, number]
    symH: number
    setH: [number, number, number]
    ac: AudioContext | null
    raf: number | null
    leverAngle: number
    leverDragging: boolean
    leverDy0: number
    leverA0: number
    leverPulled: boolean
    leverRaf: number | null
  }>({
    spinning: false,
    posY: [0, 0, 0],
    symH: 0,
    setH: [0, 0, 0],
    ac: null,
    raf: null,
    leverAngle: 0,
    leverDragging: false,
    leverDy0: 0,
    leverA0: 0,
    leverPulled: false,
    leverRaf: null,
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
          const g = c.createGain()
          g.gain.setValueAtTime(0, c.currentTime)
          g.gain.linearRampToValueAtTime(0.18, c.currentTime + 0.3)
          g.connect(c.destination)
          // reel spin: bouncy drum roll feel
          const osc = c.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 88
          osc.connect(g); osc.start()
          const nb = c.createBuffer(1, c.sampleRate*3, c.sampleRate)
          const nd = nb.getChannelData(0)
          for (let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1
          const ns = c.createBufferSource(); ns.buffer=nb; ns.loop=true
          const f = c.createBiquadFilter(); f.type='bandpass'; f.frequency.value=800; f.Q.value=2
          const ng = c.createGain(); ng.gain.value=0.025
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
      thud() {
        try {
          const c = getCtx()
          ;[0, 80, 160].forEach(delay => {
            const t = c.currentTime + delay/1000
            const buf = c.createBuffer(1, Math.floor(c.sampleRate*0.14), c.sampleRate)
            const d = buf.getChannelData(0)
            for (let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/d.length*18)*0.55
            const s = c.createBufferSource(); s.buffer=buf; s.connect(c.destination); s.start(t)
          })
        } catch(_) {}
      },
      jackpot() {
        try {
          const c = getCtx()
          ;[523.25,659.25,783.99,880,1046.5,1318.5,1568].forEach((freq,i)=>{
            const t = c.currentTime+i*0.09
            const o = c.createOscillator(); o.type='sine'; o.frequency.value=freq
            const g = c.createGain()
            g.gain.setValueAtTime(0,t)
            g.gain.linearRampToValueAtTime(0.28,t+0.04)
            g.gain.exponentialRampToValueAtTime(0.001,t+0.55)
            o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.6)
          })
        } catch(_) {}
      },
      match() {
        try {
          const c = getCtx()
          ;[784,988,1174].forEach((freq,i)=>{
            const t = c.currentTime+i*0.1
            const o = c.createOscillator(); o.type='sine'; o.frequency.value=freq
            const g = c.createGain()
            g.gain.setValueAtTime(0,t)
            g.gain.linearRampToValueAtTime(0.2,t+0.03)
            g.gain.exponentialRampToValueAtTime(0.001,t+0.35)
            o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.38)
          })
        } catch(_) {}
      },
    }

    // ── Build reels ──
    function buildReel(reelIdx: number) {
      const refs = reelRefs[reelIdx].current
      if (!refs) return
      const {viewport, strip} = refs
      const {symbols} = REEL_DEFS[reelIdx]
      const N = symbols.length
      m.symH = viewport.getBoundingClientRect().width
      m.setH[reelIdx] = N * m.symH
      strip.innerHTML = ''
      for (let rep=0; rep<REPEATS; rep++) {
        for (const sym of symbols) {
          const cell = document.createElement('div')
          cell.style.cssText = `width:${m.symH}px;height:${m.symH}px;display:flex;align-items:center;justify-content:center;background:${sym.bg || '#fff'};position:relative;`
          const svgEl = document.createElementNS('http://www.w3.org/2000/svg','svg')
          svgEl.setAttribute('viewBox','0 0 80 80')
          svgEl.setAttribute('width','72')
          svgEl.setAttribute('height','72')
          svgEl.style.cssText='display:block;'
          svgEl.innerHTML = sym.svg
          cell.appendChild(svgEl)
          // label
          const lbl = document.createElement('div')
          lbl.style.cssText = `position:absolute;bottom:4px;right:6px;font-size:9px;font-weight:700;color:rgba(0,0,0,0.45);font-family:sans-serif;`
          lbl.textContent = sym.label
          cell.appendChild(lbl)
          strip.appendChild(cell)
        }
      }
      strip.style.height = (N*REPEATS*m.symH)+'px'
      applyY(reelIdx, 0)
    }

    function applyY(reelIdx: number, y: number) {
      m.posY[reelIdx] = y
      const refs = reelRefs[reelIdx].current
      if (refs) refs.strip.style.transform = `translateY(${-y}px)`
    }

    function spinReel(reelIdx: number, delay: number, onDone: (result: typeof REEL_DEFS[0]['symbols'][0]) => void) {
      const {symbols} = REEL_DEFS[reelIdx]
      const N = symbols.length
      const result = pickSymbol(symbols)
      const targetIdx = symbols.indexOf(result as any)
      let targetY = targetIdx * m.symH
      const minY = m.posY[reelIdx] + m.setH[reelIdx] * 4
      while (targetY < minY) targetY += m.setH[reelIdx]

      const startY = m.posY[reelIdx]
      const dist = targetY - startY
      const TOTAL = 2800 + delay

      const refs = reelRefs[reelIdx].current!
      refs.viewport.classList.add('reel-spinning')

      let t0: number | null = null
      setTimeout(() => {
        function frame(ts: number) {
          if (!t0) t0 = ts
          const t = Math.min(1,(ts-t0)/TOTAL)
          applyY(reelIdx, kf(t, startY, dist))
          if (t < 1) { requestAnimationFrame(frame); return }
          applyY(reelIdx, targetY)
          const reset = targetY % m.setH[reelIdx]
          requestAnimationFrame(() => {
            const r = reelRefs[reelIdx].current!
            r.strip.style.transition = 'none'
            r.strip.style.transform = `translateY(${-reset}px)`
            m.posY[reelIdx] = reset
            requestAnimationFrame(() => { r.strip.style.transition = '' })
          })
          refs.viewport.classList.remove('reel-spinning')
          onDone(result as any)
        }
        requestAnimationFrame(frame)
      }, delay)
    }

    // ── Particles ──
    function spawnParticles(jackpot: boolean) {
      const wrapper = wrapperRef.current!
      const rect = wrapper.getBoundingClientRect()
      const cx = rect.left + rect.width/2
      const cy = rect.top + rect.height/2
      const colors = jackpot
        ? ['#FFD700','#FFF','#FF6B8A','#4D72FB','#4DFB72','#FF8C42']
        : ['#FFD700','#FFF','#4D72FB']
      const count = jackpot ? 60 : 25
      for (let i=0;i<count;i++) {
        const el = document.createElement('div')
        const sz = (jackpot?8:4)+Math.random()*8
        const ang = Math.random()*Math.PI*2
        const spd = (jackpot?140:70)+Math.random()*160
        const dur = 0.6+Math.random()*0.9
        el.style.cssText=`
          position:fixed;left:${cx}px;top:${cy}px;
          width:${sz}px;height:${sz}px;border-radius:50%;
          background:${colors[i%colors.length]};pointer-events:none;z-index:9999;
          --tx:${(Math.cos(ang)*spd).toFixed(1)}px;--ty:${(Math.sin(ang)*spd).toFixed(1)}px;
          animation:bfly ${dur.toFixed(2)}s ease-out forwards;
          animation-delay:${(Math.random()*0.2).toFixed(2)}s;
        `
        document.body.appendChild(el)
        setTimeout(()=>el.remove(),(dur+0.4)*1000)
      }
    }

    // ── Spin all 3 reels ──
    function startSpin() {
      if (m.spinning) return
      m.spinning = true
      const resultEl = resultRef.current!
      resultEl.textContent = ''
      const wrapper = wrapperRef.current!
      wrapper.classList.remove('shake'); void wrapper.offsetWidth; wrapper.classList.add('shake')
      wrapper.addEventListener('animationend', ()=>wrapper.classList.remove('shake'), {once:true})
      Sfx.startSpin()

      const results: (typeof REEL_DEFS[0]['symbols'][0])[] = []
      let doneCount = 0

      for (let i=0; i<3; i++) {
        spinReel(i, i*300, (result) => {
          results[i] = result
          doneCount++
          Sfx.thud()
          if (doneCount === 3) {
            Sfx.stopSpin()
            spawnParticles(false)
            m.spinning = false

            // Check results
            const [f, it, bg] = results
            const allMatch = f.id[0] === it.id[0] && it.id[0] === bg.id[0] // impossible by design; check labels
            const faceLabel = FACES.find(x=>x.id===f.id)?.label || f.label
            const itemLabel = ITEMS.find(x=>x.id===it.id)?.label || it.label
            const bgLabel   = BACKGROUNDS.find(x=>x.id===bg.id)?.label || bg.label

            // Jackpot: all 3 same category index (simplistic)
            const fi = FACES.indexOf(f as any)
            const ii = ITEMS.indexOf(it as any)
            const bi = BACKGROUNDS.indexOf(bg as any)

            if (fi === ii && ii === bi) {
              // Full jackpot
              setTimeout(()=>Sfx.jackpot(),150)
              spawnParticles(true)
              for (const r of reelRefs) r.current?.viewport.classList.add('reel-jackpot')
              setTimeout(()=>{ for (const r of reelRefs) r.current?.viewport.classList.remove('reel-jackpot') },5000)
              resultEl.textContent = '🎉 JACKPOT!'
            } else if (fi===ii || ii===bi || fi===bi) {
              Sfx.match()
              resultEl.textContent = '✨ 2개 일치!'
            } else {
              resultEl.textContent = `${faceLabel} · ${itemLabel} · ${bgLabel}`
            }
          }
        })
      }
    }

    // Build all reels after mount
    setTimeout(() => {
      for (let i=0;i<3;i++) buildReel(i)
    }, 0)

    // ── Lever ──
    const leverMount = document.getElementById('slot3-lever-mount')!
    const leverGroup = leverGroupRef.current!
    const PX=16, PY=118, MAX=62
    const easeIn3  = (t:number)=>t**3
    const easeOut2 = (t:number)=>1-(1-t)**2
    function easeBounce(t:number) {
      const n=7.5625,d=2.75
      if(t<1/d) return n*t*t
      if(t<2/d){t-=1.5/d;return n*t*t+0.75}
      if(t<2.5/d){t-=2.25/d;return n*t*t+0.9375}
      t-=2.625/d;return n*t*t+0.984375
    }

    function setLeverAngle(a:number) {
      m.leverAngle = Math.max(0,Math.min(MAX,a))
      leverGroup.setAttribute('transform',`rotate(${m.leverAngle},${PX},${PY})`)
    }

    function animLeverTo(target:number,ms:number,efn:(t:number)=>number,done?:()=>void) {
      if (m.leverRaf!==null) cancelAnimationFrame(m.leverRaf)
      const from=m.leverAngle, t0=performance.now()
      function step(ts:number) {
        const t=Math.min(1,(ts-t0)/ms)
        setLeverAngle(from+(target-from)*efn(t))
        if(t<1){m.leverRaf=requestAnimationFrame(step)}else{m.leverRaf=null;if(done)done()}
      }
      m.leverRaf=requestAnimationFrame(step)
    }

    function pull() {
      if(m.leverPulled) return; m.leverPulled=true
      Sfx.click()
      animLeverTo(MAX,165,easeIn3,()=>{
        startSpin()
        setTimeout(()=>animLeverTo(0,500,easeBounce,()=>{m.leverPulled=false}),100)
      })
    }

    function onMouseDown(e:MouseEvent){m.leverDragging=true;m.leverDy0=e.clientY;m.leverA0=m.leverAngle;e.preventDefault()}
    function onTouchStart(e:TouchEvent){m.leverDragging=true;m.leverDy0=e.touches[0].clientY;m.leverA0=m.leverAngle;e.preventDefault()}
    function onMouseMove(e:MouseEvent){if(!m.leverDragging)return;setLeverAngle(m.leverA0+(e.clientY-m.leverDy0)*0.55);if(m.leverAngle>=MAX-1.5&&!m.leverPulled){m.leverDragging=false;pull()}}
    function onTouchMove(e:TouchEvent){if(!m.leverDragging)return;setLeverAngle(m.leverA0+(e.touches[0].clientY-m.leverDy0)*0.55);if(m.leverAngle>=MAX-1.5&&!m.leverPulled){m.leverDragging=false;pull()}}
    function onMouseUp(){if(m.leverDragging&&!m.leverPulled)animLeverTo(0,260,easeOut2);m.leverDragging=false}
    function onTouchEnd(){if(m.leverDragging&&!m.leverPulled)animLeverTo(0,260,easeOut2);m.leverDragging=false}
    function onMountClick(){if(!m.leverPulled&&!m.leverDragging)pull()}

    leverMount.addEventListener('mousedown',onMouseDown)
    leverMount.addEventListener('touchstart',onTouchStart,{passive:false})
    leverMount.addEventListener('click',onMountClick)
    document.addEventListener('mousemove',onMouseMove)
    document.addEventListener('mouseup',onMouseUp)
    document.addEventListener('touchmove',onTouchMove,{passive:false})
    document.addEventListener('touchend',onTouchEnd)

    return () => {
      leverMount.removeEventListener('mousedown',onMouseDown)
      leverMount.removeEventListener('touchstart',onTouchStart)
      leverMount.removeEventListener('click',onMountClick)
      document.removeEventListener('mousemove',onMouseMove)
      document.removeEventListener('mouseup',onMouseUp)
      document.removeEventListener('touchmove',onTouchMove)
      document.removeEventListener('touchend',onTouchEnd)
      if(m.leverRaf!==null) cancelAnimationFrame(m.leverRaf)
      document.head.removeChild(styleEl)
      if(m.ac){m.ac.close();m.ac=null}
    }
  }, [])

  const REEL_W = Math.floor((width - 80) / 3)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
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
        {/* Header pips */}
        <div style={{ display:'flex',justifyContent:'center',alignItems:'center',gap:7,marginBottom:18 }}>
          {[7,7,26,7,7].map((w,i)=>(
            <div key={i} style={{width:w,height:7,borderRadius:i===2?4:50,background:i===2?'rgba(255,255,255,0.75)':'rgba(255,255,255,0.35)'}}/>
          ))}
        </div>

        {/* Reel labels */}
        <div style={{ display:'flex',gap:6,marginBottom:6,justifyContent:'center' }}>
          {REEL_DEFS.map(r => (
            <div key={r.key} style={{
              width: REEL_W+14,
              textAlign:'center',
              fontSize:11,
              fontWeight:700,
              color:'rgba(255,255,255,0.75)',
              letterSpacing:'1px',
            }}>
              {r.label}
            </div>
          ))}
        </div>

        {/* 3 Reels */}
        <div style={{ display:'flex',gap:6,background:'rgba(0,0,40,0.28)',borderRadius:18,padding:6 }}>
          {REEL_DEFS.map((reel, i) => (
            <div
              key={reel.key}
              id={`slot3-viewport-${i}`}
              ref={(el) => {
                if (!el) return
                const strip = el.querySelector<HTMLDivElement>('.reel-strip')
                if (strip) reelRefs[i].current = { viewport: el, strip }
              }}
              className="reel-viewport"
              style={{
                width: REEL_W,
                height: REEL_W,
                borderRadius: 12,
                overflow: 'hidden',
                position: 'relative',
                background: '#fff',
                flexShrink: 0,
              }}
            >
              <div
                className="reel-strip"
                style={{ position:'absolute',top:0,left:0,right:0,willChange:'transform' }}
              />
            </div>
          ))}
        </div>

        {/* Result message */}
        <div
          ref={resultRef}
          style={{
            marginTop:16,
            textAlign:'center',
            height:22,
            lineHeight:'22px',
            color:'rgba(255,255,255,0.92)',
            fontSize:13,
            fontWeight:700,
            letterSpacing:'1.5px',
            overflow:'hidden',
            whiteSpace:'nowrap',
            textOverflow:'ellipsis',
          }}
        />

        {/* Bottom pips */}
        <div style={{display:'flex',justifyContent:'center',gap:7,marginTop:18}}>
          {[0,0.3,0.6,0.9,1.2].map((delay,i)=>(
            <div key={i} style={{
              width:6,height:6,borderRadius:'50%',
              background: i===2?'rgba(255,255,255,0.8)':i===1||i===3?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.3)',
              animation:`bpipPulse 2s ease-in-out ${delay}s infinite`,
            }}/>
          ))}
        </div>

        {/* Lever */}
        <div
          id="slot3-lever-mount"
          style={{
            position:'absolute',
            right:-60,top:'50%',
            transform:'translateY(-50%)',
            cursor:'pointer',
            userSelect:'none',
            WebkitUserSelect:'none',
            touchAction:'none',
          }}
        >
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
    </div>
  )
}
