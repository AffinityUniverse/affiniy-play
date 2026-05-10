import { useRef, useEffect, useState } from 'react'

interface Props { width?: number }

// ─── 심볼 정의 ────────────────────────────────────────────────────────────────

interface FaceSym  { id: string; label: string; file: string }
interface ItemSym  { id: string; label: string; svg: string; anchorTop: number } // anchorTop: 0~1 (relative to card height)
interface BgSym    { id: string; label: string; svg: string; color: string }

const FACES: FaceSym[] = [
  { id: 'student', label: '학생',   file: 'chars/student.png' },
  { id: 'girl',    label: '소녀',   file: 'chars/girl.png'    },
  { id: 'bear',    label: '곰돌이', file: 'chars/bear.png'    },
  { id: 'cat',     label: '고양이', file: 'chars/cat.png'     },
  { id: 'fox',     label: '여우',   file: 'chars/fox.png'     },
  { id: 'turtle',  label: '거북이', file: 'chars/turtle.png'  },
  { id: 'deer',    label: '사슴',   file: 'chars/deer.png'    },
]

// SVG accessories — each is a 100×100 viewBox SVG string
const ITEMS: ItemSym[] = [
  {
    id: 'pencil', label: '연필', anchorTop: 0.55,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="42" y="12" width="16" height="62" rx="4" fill="#FFD740"/>
      <rect x="42" y="12" width="16" height="10" rx="3" fill="#FF7043"/>
      <polygon points="42,74 58,74 50,92" fill="#FFCCBC"/>
      <polygon points="46,82 54,82 50,92" fill="#795548"/>
      <rect x="42" y="68" width="16" height="6" fill="#BDBDBD"/>
      <rect x="44" y="20" width="4" height="50" rx="2" fill="rgba(255,255,255,0.35)"/>
    </svg>`,
  },
  {
    id: 'map', label: '지도', anchorTop: 0.52,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="20" width="72" height="58" rx="6" fill="#FFF9C4"/>
      <rect x="14" y="20" width="72" height="58" rx="6" fill="none" stroke="#FBC02D" stroke-width="3"/>
      <line x1="38" y1="20" x2="38" y2="78" stroke="#FBC02D" stroke-width="2" stroke-dasharray="4,3"/>
      <line x1="62" y1="20" x2="62" y2="78" stroke="#FBC02D" stroke-width="2" stroke-dasharray="4,3"/>
      <line x1="14" y1="43" x2="86" y2="43" stroke="#FBC02D" stroke-width="2" stroke-dasharray="4,3"/>
      <line x1="14" y1="60" x2="86" y2="60" stroke="#FBC02D" stroke-width="2" stroke-dasharray="4,3"/>
      <circle cx="50" cy="50" r="7" fill="#FF5252"/>
      <polygon points="50,30 56,42 44,42" fill="#4CAF50"/>
    </svg>`,
  },
  {
    id: 'hat', label: '모자', anchorTop: 0.22,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="68" rx="38" ry="10" fill="#5C3D2E"/>
      <rect x="28" y="30" width="44" height="40" rx="12" fill="#7B4F2E"/>
      <rect x="28" y="52" width="44" height="8" fill="#FF7043"/>
      <rect x="28" y="52" width="44" height="8" fill="none" stroke="#FFF" stroke-width="1.5" stroke-dasharray="5,4"/>
      <ellipse cx="50" cy="30" rx="22" ry="6" fill="#7B4F2E"/>
    </svg>`,
  },
  {
    id: 'sunglasses', label: '선글라스', anchorTop: 0.38,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="8"  y="38" width="34" height="24" rx="12" fill="#222"/>
      <rect x="58" y="38" width="34" height="24" rx="12" fill="#222"/>
      <rect x="42" y="46" width="16" height="6"  rx="3"  fill="#222"/>
      <line x1="8"  y1="50" x2="2"  y2="50" stroke="#222" stroke-width="4" stroke-linecap="round"/>
      <line x1="92" y1="50" x2="98" y2="50" stroke="#222" stroke-width="4" stroke-linecap="round"/>
      <rect x="10" y="40" width="30" height="20" rx="10" fill="#1565C0" opacity="0.7"/>
      <rect x="60" y="40" width="30" height="20" rx="10" fill="#1565C0" opacity="0.7"/>
      <rect x="10" y="40" width="10" height="8" rx="4" fill="rgba(255,255,255,0.25)"/>
      <rect x="60" y="40" width="10" height="8" rx="4" fill="rgba(255,255,255,0.25)"/>
    </svg>`,
  },
  {
    id: 'eyepatch', label: '안대', anchorTop: 0.36,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="38" width="36" height="26" rx="13" fill="#1a1a1a"/>
      <rect x="22" y="40" width="32" height="22" rx="11" fill="#333"/>
      <line x1="56" y1="48" x2="90" y2="42" stroke="#1a1a1a" stroke-width="4" stroke-linecap="round"/>
      <line x1="20" y1="48" x2="10" y2="42" stroke="#1a1a1a" stroke-width="4" stroke-linecap="round"/>
      <rect x="24" y="42" width="12" height="8" rx="4" fill="rgba(255,255,255,0.1)"/>
      <line x1="38" y1="38" x2="38" y2="64" stroke="#FF5252" stroke-width="2" stroke-linecap="round"/>
      <line x1="30" y1="46" x2="46" y2="56" stroke="#FF5252" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'crown', label: '왕관', anchorTop: 0.18,
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <polygon points="10,70 10,38 28,55 50,20 72,55 90,38 90,70" fill="#FFD700"/>
      <polygon points="10,70 10,38 28,55 50,20 72,55 90,38 90,70" fill="none" stroke="#F9A825" stroke-width="2"/>
      <rect x="10" y="68" width="80" height="14" rx="4" fill="#FFB300"/>
      <circle cx="50" cy="20" r="7" fill="#FF5252"/>
      <circle cx="10" cy="38" r="5" fill="#4CAF50"/>
      <circle cx="90" cy="38" r="5" fill="#4CAF50"/>
      <circle cx="25" cy="72" r="4" fill="#E91E63"/>
      <circle cx="50" cy="72" r="4" fill="#E91E63"/>
      <circle cx="75" cy="72" r="4" fill="#E91E63"/>
    </svg>`,
  },
]

const BACKGROUNDS: BgSym[] = [
  {
    id: 'ocean', label: '바다', color: '#0277BD',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#87CEEB"/>
      <ellipse cx="160" cy="40" rx="30" ry="20" fill="white" opacity="0.9"/>
      <ellipse cx="148" cy="38" rx="20" ry="14" fill="white" opacity="0.9"/>
      <ellipse cx="40" cy="55" rx="22" ry="14" fill="white" opacity="0.8"/>
      <ellipse cx="30" cy="53" rx="14" ry="10" fill="white" opacity="0.8"/>
      <rect x="0" y="110" width="200" height="90" fill="#0277BD"/>
      <path d="M0,118 Q25,108 50,118 Q75,128 100,118 Q125,108 150,118 Q175,128 200,118 L200,200 L0,200Z" fill="#0288D1"/>
      <path d="M0,130 Q25,120 50,130 Q75,140 100,130 Q125,120 150,130 Q175,140 200,130 L200,200 L0,200Z" fill="#0299D1" opacity="0.7"/>
      <ellipse cx="30" cy="155" rx="18" ry="8" fill="#FF8F00" opacity="0.6"/>
      <ellipse cx="170" cy="165" rx="14" ry="6" fill="#FF8F00" opacity="0.5"/>
      <circle cx="100" cy="75" r="28" fill="#F9A825"/>
      <circle cx="100" cy="75" r="28" fill="none" stroke="#FFD54F" stroke-width="6" opacity="0.5"/>
    </svg>`,
  },
  {
    id: 'jungle', label: '정글', color: '#2E7D32',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#81C784"/>
      <rect x="0" y="130" width="200" height="70" fill="#388E3C"/>
      <ellipse cx="30" cy="130" rx="40" ry="55" fill="#2E7D32"/>
      <ellipse cx="30" cy="120" rx="30" ry="45" fill="#388E3C"/>
      <ellipse cx="170" cy="140" rx="42" ry="50" fill="#1B5E20"/>
      <ellipse cx="170" cy="128" rx="32" ry="42" fill="#2E7D32"/>
      <ellipse cx="100" cy="90" rx="50" ry="70" fill="#1B5E20"/>
      <ellipse cx="100" cy="75" rx="38" ry="55" fill="#388E3C"/>
      <ellipse cx="60" cy="160" rx="28" ry="35" fill="#2E7D32"/>
      <ellipse cx="140" cy="165" rx="24" ry="30" fill="#388E3C"/>
      <circle cx="150" cy="35" r="22" fill="#FFF176" opacity="0.7"/>
      <circle cx="52" cy="60" r="7" fill="#FFEE58" opacity="0.6"/>
      <circle cx="148" cy="80" r="5" fill="#FFEE58" opacity="0.6"/>
    </svg>`,
  },
  {
    id: 'space', label: '우주', color: '#1A237E',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#0D0D2B"/>
      <circle cx="20"  cy="15"  r="1.5" fill="white" opacity="0.9"/>
      <circle cx="60"  cy="30"  r="1"   fill="white" opacity="0.8"/>
      <circle cx="100" cy="10"  r="2"   fill="white"/>
      <circle cx="145" cy="25"  r="1.5" fill="white" opacity="0.9"/>
      <circle cx="185" cy="12"  r="1"   fill="white" opacity="0.7"/>
      <circle cx="35"  cy="55"  r="1"   fill="white" opacity="0.8"/>
      <circle cx="80"  cy="45"  r="1.5" fill="white"/>
      <circle cx="160" cy="60"  r="1"   fill="white" opacity="0.9"/>
      <circle cx="190" cy="45"  r="2"   fill="white" opacity="0.6"/>
      <circle cx="10"  cy="80"  r="1"   fill="white" opacity="0.7"/>
      <circle cx="55"  cy="90"  r="1.5" fill="white" opacity="0.8"/>
      <circle cx="175" cy="90"  r="1"   fill="white"/>
      <circle cx="120" cy="75"  r="1"   fill="white" opacity="0.9"/>
      <circle cx="90"  cy="100" r="1.5" fill="white" opacity="0.7"/>
      <ellipse cx="100" cy="148" rx="55" ry="40" fill="#3949AB"/>
      <ellipse cx="100" cy="148" rx="55" ry="40" fill="none" stroke="#7986CB" stroke-width="2" opacity="0.6"/>
      <ellipse cx="100" cy="145" rx="40" ry="29" fill="#5C6BC0"/>
      <ellipse cx="85"  cy="140" rx="10" ry="8"  fill="#7986CB" opacity="0.6"/>
      <ellipse cx="115" cy="152" rx="8"  ry="6"  fill="#3F51B5" opacity="0.7"/>
      <ellipse cx="100" cy="148" rx="70" ry="12" fill="none" stroke="#9FA8DA" stroke-width="3" opacity="0.5"/>
      <circle  cx="60"  cy="38"  r="12"  fill="#FFF9C4" opacity="0.9"/>
      <circle  cx="57"  cy="35"  r="4"   fill="#FFF176" opacity="0.5"/>
    </svg>`,
  },
  {
    id: 'city', label: '도시', color: '#37474F',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#B0BEC5"/>
      <rect x="0" y="140" width="200" height="60" fill="#546E7A"/>
      <rect x="10"  y="80"  width="35" height="120" fill="#455A64"/>
      <rect x="15"  y="95"  width="7"  height="8"   fill="#FFF9C4" opacity="0.8"/>
      <rect x="27"  y="95"  width="7"  height="8"   fill="#FFF9C4" opacity="0.6"/>
      <rect x="15"  y="108" width="7"  height="8"   fill="#B0BEC5" opacity="0.5"/>
      <rect x="27"  y="108" width="7"  height="8"   fill="#FFF9C4" opacity="0.9"/>
      <rect x="55"  y="60"  width="45" height="140" fill="#37474F"/>
      <rect x="62"  y="70"  width="9"  height="10"  fill="#FFF9C4" opacity="0.8"/>
      <rect x="76"  y="70"  width="9"  height="10"  fill="#FFF9C4" opacity="0.6"/>
      <rect x="62"  y="86"  width="9"  height="10"  fill="#B0BEC5" opacity="0.5"/>
      <rect x="76"  y="86"  width="9"  height="10"  fill="#FFF9C4" opacity="0.9"/>
      <rect x="62"  y="102" width="9"  height="10"  fill="#FFF9C4" opacity="0.7"/>
      <rect x="76"  y="102" width="9"  height="10"  fill="#B0BEC5" opacity="0.4"/>
      <rect x="115" y="75"  width="38" height="125" fill="#455A64"/>
      <rect x="122" y="85"  width="7"  height="8"   fill="#FFF9C4" opacity="0.9"/>
      <rect x="134" y="85"  width="7"  height="8"   fill="#FFF9C4" opacity="0.6"/>
      <rect x="122" y="98"  width="7"  height="8"   fill="#FFF9C4" opacity="0.7"/>
      <rect x="134" y="98"  width="7"  height="8"   fill="#B0BEC5" opacity="0.5"/>
      <rect x="163" y="95"  width="30" height="105" fill="#546E7A"/>
      <rect x="168" y="103" width="6"  height="7"   fill="#FFF9C4" opacity="0.8"/>
      <rect x="179" y="103" width="6"  height="7"   fill="#B0BEC5" opacity="0.5"/>
      <circle cx="155" cy="35" r="20" fill="#FFD54F" opacity="0.6"/>
      <rect x="0" y="140" width="200" height="6" fill="#78909C"/>
      <rect x="30" y="143" width="20" height="4" fill="#CFD8DC" opacity="0.6"/>
      <rect x="90" y="143" width="20" height="4" fill="#CFD8DC" opacity="0.6"/>
      <rect x="150" y="143" width="20" height="4" fill="#CFD8DC" opacity="0.6"/>
    </svg>`,
  },
  {
    id: 'mountains', label: '산', color: '#4CAF50',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#87CEEB"/>
      <ellipse cx="60" cy="55" rx="28" ry="16" fill="white" opacity="0.85"/>
      <ellipse cx="50" cy="53" rx="20" ry="12" fill="white" opacity="0.85"/>
      <ellipse cx="150" cy="40" rx="32" ry="18" fill="white" opacity="0.8"/>
      <ellipse cx="140" cy="38" rx="22" ry="13" fill="white" opacity="0.8"/>
      <polygon points="0,200 60,80  120,200" fill="#4CAF50"/>
      <polygon points="40,200 110,70 180,200" fill="#388E3C"/>
      <polygon points="80,200 150,90 200,200" fill="#2E7D32"/>
      <polygon points="80,200 150,90 175,200" fill="#1B5E20"/>
      <polygon points="40,200 110,70 115,200" fill="#33691E"/>
      <polygon points="110,70  140,90  115,90" fill="white" opacity="0.85"/>
      <polygon points="150,90  175,108 155,108" fill="white" opacity="0.75"/>
      <rect x="0" y="175" width="200" height="25" fill="#558B2F"/>
      <circle cx="170" cy="30" r="22" fill="#FFD54F" opacity="0.8"/>
    </svg>`,
  },
]

// ─── reel defs for loop ───────────────────────────────────────────────────────
const REEL_LABELS = ['얼굴', '소품', '배경']
const REEL_COUNTS = [FACES.length, ITEMS.length, BACKGROUNDS.length]

const CSS = `
@keyframes slotShake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-5px,-1px)} 40%{transform:translate(5px,2px)} 60%{transform:translate(-3px,1px)} 80%{transform:translate(2px,-1px)} }
@keyframes jpPulse { from{box-shadow:0 0 0 3px rgba(255,215,0,0.6),0 0 30px rgba(255,215,0,0.3)} to{box-shadow:0 0 0 6px rgba(255,215,0,1),0 0 60px rgba(255,215,0,0.6)} }
@keyframes bfly { from{transform:translate(0,0) scale(1);opacity:1} to{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0} }
@keyframes bpipPulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.5);opacity:1} }
@keyframes resultFadeIn { from{opacity:0;transform:translateY(14px) scale(0.93)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes resultPop { 0%{transform:scale(0.7)} 70%{transform:scale(1.06)} 100%{transform:scale(1)} }
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

const REPEATS = 9

export default function SlotMachine({ width = 340 }: Props) {
  const wrapperRef    = useRef<HTMLDivElement>(null)
  const leverGroupRef = useRef<SVGGElement>(null)
  const resultMsgRef  = useRef<HTMLDivElement>(null)

  const reelRefs = [
    useRef<{ vp: HTMLDivElement; strip: HTMLDivElement } | null>(null),
    useRef<{ vp: HTMLDivElement; strip: HTMLDivElement } | null>(null),
    useRef<{ vp: HTMLDivElement; strip: HTMLDivElement } | null>(null),
  ]

  const [resultCard, setResultCard] = useState<{ face: FaceSym; item: ItemSym; bg: BgSym } | null>(null)
  const [resultVisible, setResultVisible] = useState(false)

  const mountRef = useRef({
    spinning: false,
    posY:  [0, 0, 0] as [number, number, number],
    symH:  0,
    setH:  [0, 0, 0] as [number, number, number],
    ac:    null as AudioContext | null,
    leverAngle:    0,
    leverDragging: false,
    leverDy0:      0,
    leverA0:       0,
    leverPulled:   false,
    leverRaf:      null as number | null,
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
          spinNodes = {osc, ns, g}
        } catch(_) {}
      },
      stopSpin() {
        try {
          if (!spinNodes) return
          const c = getCtx()
          spinNodes.g.gain.linearRampToValueAtTime(0, c.currentTime+0.3)
          const sn=spinNodes; spinNodes=null
          setTimeout(()=>{ try{sn.osc.stop()}catch(_){} try{sn.ns.stop()}catch(_){} }, 400)
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
    }

    // ── 릴 빌드 ──
    function buildReel(ri: number) {
      const refs = reelRefs[ri].current; if (!refs) return
      const { vp, strip } = refs
      const N = REEL_COUNTS[ri]
      m.symH = vp.getBoundingClientRect().width
      m.setH[ri] = N * m.symH
      strip.innerHTML = ''
      for (let rep=0; rep<REPEATS; rep++) {
        for (let si=0; si<N; si++) {
          const cell = document.createElement('div')
          cell.style.cssText = `width:${m.symH}px;height:${m.symH}px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;box-sizing:border-box;`

          if (ri === 0) {
            // 얼굴: PNG image
            const face = FACES[si]
            cell.style.background = '#fff'
            const img = document.createElement('img')
            img.src = face.file; img.alt = face.label; (img as any).draggable = false
            img.style.cssText = 'width:90%;height:90%;object-fit:contain;display:block;pointer-events:none;'
            const lbl = document.createElement('div')
            lbl.style.cssText = 'position:absolute;bottom:3px;right:5px;font-size:9px;font-weight:700;color:rgba(0,0,0,0.4);font-family:sans-serif;'
            lbl.textContent = face.label
            cell.appendChild(img); cell.appendChild(lbl)

          } else if (ri === 1) {
            // 소품: SVG inline
            const item = ITEMS[si]
            cell.style.background = '#FAFAFA'
            cell.style.padding = '4px'
            const wrapper2 = document.createElement('div')
            wrapper2.style.cssText = `width:${m.symH-10}px;height:${m.symH-10}px;display:flex;align-items:center;justify-content:center;`
            wrapper2.innerHTML = item.svg.replace('<svg', `<svg width="${m.symH-10}" height="${m.symH-10}"`)
            const lbl = document.createElement('div')
            lbl.style.cssText = 'position:absolute;bottom:3px;right:5px;font-size:9px;font-weight:700;color:rgba(0,0,0,0.4);font-family:sans-serif;'
            lbl.textContent = item.label
            cell.appendChild(wrapper2); cell.appendChild(lbl)

          } else {
            // 배경: SVG scene
            const bg = BACKGROUNDS[si]
            cell.style.background = bg.color
            const wrapper2 = document.createElement('div')
            wrapper2.style.cssText = `width:${m.symH}px;height:${m.symH}px;overflow:hidden;display:flex;align-items:center;justify-content:center;`
            wrapper2.innerHTML = bg.svg.replace('<svg', `<svg width="${m.symH}" height="${m.symH}"`)
            const lbl = document.createElement('div')
            lbl.style.cssText = 'position:absolute;bottom:3px;right:5px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.8);font-family:sans-serif;text-shadow:0 1px 2px rgba(0,0,0,0.5);'
            lbl.textContent = bg.label
            cell.appendChild(wrapper2); cell.appendChild(lbl)
          }

          strip.appendChild(cell)
        }
      }
      strip.style.height = (N*REPEATS*m.symH)+'px'
      applyY(ri, 0)
    }

    function applyY(ri: number, y: number) {
      m.posY[ri] = y
      const refs = reelRefs[ri].current; if (refs) refs.strip.style.transform = `translateY(${-y}px)`
    }

    function spinReel(ri: number, delay: number, onDone: (idx: number) => void) {
      const N = REEL_COUNTS[ri]
      const resultIdx = Math.floor(Math.random() * N)
      let targetY = resultIdx * m.symH
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
            refs.strip.style.transition='none'
            refs.strip.style.transform=`translateY(${-reset}px)`
            m.posY[ri]=reset
            requestAnimationFrame(() => { refs.strip.style.transition='' })
          })
          refs.vp.classList.remove('reel-spinning-border')
          onDone(resultIdx)
        }
        requestAnimationFrame(frame)
      }, delay)
    }

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

    function startSpin() {
      if (m.spinning) return; m.spinning = true
      setResultVisible(false)
      const wrapper = wrapperRef.current!
      wrapper.classList.remove('shake'); void wrapper.offsetWidth; wrapper.classList.add('shake')
      wrapper.addEventListener('animationend',()=>wrapper.classList.remove('shake'),{once:true})
      const msgEl = resultMsgRef.current!; msgEl.textContent = ''
      Sfx.startSpin()

      const resultIdxs: number[] = []
      let doneCount = 0

      for (let ri=0; ri<3; ri++) {
        spinReel(ri, ri*320, (idx) => {
          resultIdxs[ri] = idx; doneCount++
          Sfx.thud(doneCount-1)
          if (doneCount === 3) {
            Sfx.stopSpin()
            const face = FACES[resultIdxs[0]]
            const item = ITEMS[resultIdxs[1]]
            const bg   = BACKGROUNDS[resultIdxs[2]]

            spawnParticles(false)
            m.spinning = false

            msgEl.textContent = `${face.label} · ${item.label} · ${bg.label}`
            setTimeout(()=>Sfx.jackpot(), 200)

            setResultCard({ face, item, bg })
            setTimeout(() => setResultVisible(true), 100)
          }
        })
      }
    }

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

  // Composite card dimensions
  const CARD_W = width
  const CARD_H = Math.round(width * 0.88)
  const BG_H   = Math.round(CARD_H * 0.52)  // top half: background scene
  const CHAR_H  = CARD_H - BG_H              // bottom half: character

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
          {REEL_LABELS.map(label=>(
            <div key={label} style={{width:REEL_W+14,textAlign:'center',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.8)',letterSpacing:'1px'}}>
              {label}
            </div>
          ))}
        </div>

        {/* 3릴 */}
        <div style={{display:'flex',gap:6,background:'rgba(0,0,40,0.28)',borderRadius:18,padding:6}}>
          {[0,1,2].map(i => (
            <div
              key={i}
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

      {/* ── 결과 카드 (조합 이미지) ── */}
      {resultCard && (
        <div style={{
          marginTop: 16,
          width: CARD_W,
          boxSizing: 'border-box',
          animation: resultVisible ? 'resultFadeIn 0.5s cubic-bezier(.34,1.56,.64,1) forwards' : 'none',
          opacity: resultVisible ? 1 : 0,
        }}>
          <div style={{textAlign:'center',fontWeight:900,fontSize:13,color:'#4D72FB',marginBottom:10,letterSpacing:'0.5px'}}>
            🎲 오늘의 조합
          </div>

          {/* 합성 이미지 카드 */}
          <div style={{
            position: 'relative',
            width: CARD_W,
            height: CARD_H,
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(77,114,251,0.25), 0 2px 8px rgba(0,0,0,0.12)',
            animation: resultVisible ? 'resultPop 0.5s cubic-bezier(.34,1.56,.64,1) 0.1s both' : 'none',
          }}>
            {/* 배경 (위쪽) */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: BG_H,
              overflow: 'hidden',
            }}
              dangerouslySetInnerHTML={{ __html:
                resultCard.bg.svg.replace('<svg', `<svg width="${CARD_W}" height="${BG_H}" preserveAspectRatio="xMidYMid slice"`)
              }}
            />

            {/* 캐릭터 (아래쪽) */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: CHAR_H + 30,
              background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.85) 28%, #fff 55%)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: 12,
            }}>
              <img
                src={resultCard.face.file}
                alt={resultCard.face.label}
                style={{
                  height: CHAR_H * 1.1,
                  width: 'auto',
                  maxWidth: CARD_W * 0.7,
                  objectFit: 'contain',
                  display: 'block',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))',
                }}
              />
            </div>

            {/* 소품 오버레이 — 배경과 캐릭터 경계쯤에 */}
            <div style={{
              position: 'absolute',
              top: Math.round(CARD_H * resultCard.item.anchorTop),
              left: '50%',
              transform: 'translateX(-50%)',
              width: Math.round(CARD_W * 0.38),
              height: Math.round(CARD_W * 0.38),
              pointerEvents: 'none',
              filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.3))',
            }}
              dangerouslySetInnerHTML={{ __html:
                resultCard.item.svg.replace('<svg', `<svg width="${Math.round(CARD_W*0.38)}" height="${Math.round(CARD_W*0.38)}"`)
              }}
            />

            {/* 라벨 배지들 */}
            <div style={{
              position: 'absolute', bottom: 8, left: 0, right: 0,
              display: 'flex', justifyContent: 'center', gap: 6, padding: '0 12px',
            }}>
              {[
                { label: resultCard.face.label, color: '#4D72FB' },
                { label: resultCard.item.label, color: '#E8731A' },
                { label: resultCard.bg.label,   color: '#27AE60' },
              ].map(({ label, color }, i) => (
                <div key={i} style={{
                  background: color,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 20,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  letterSpacing: '0.3px',
                }}>{label}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
