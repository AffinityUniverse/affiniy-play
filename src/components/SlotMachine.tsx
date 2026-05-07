import { useRef, useEffect } from 'react'

interface Props { width?: number }

const SYMBOLS = [
  { id: 's2', file: 'slice/slice2.png', label: '주황이',   weight: 22, jackpot: false },
  { id: 's3', file: 'slice/slice3.png', label: '초록이',   weight: 20, jackpot: false },
  { id: 's4', file: 'slice/slice4.png', label: '노랑이',   weight: 18, jackpot: false },
  { id: 's5', file: 'slice/slice5.png', label: '파랑이',   weight: 16, jackpot: false },
  { id: 's6', file: 'slice/slice6.png', label: '분홍이',   weight: 14, jackpot: false },
  { id: 's7', file: 'slice/slice7.png', label: '모자언니', weight:  8, jackpot: false },
  { id: 's9', file: 'slice/slice9.png', label: 'JACKPOT',  weight:  2, jackpot: true  },
]
const REPEATS = 10
const N = SYMBOLS.length

const CSS = `
@keyframes jpPulse { from{box-shadow:0 0 0 4px rgba(255,255,255,0.6),0 0 40px rgba(255,255,255,0.4)} to{box-shadow:0 0 0 6px rgba(255,255,255,1),0 0 80px rgba(255,255,255,0.7)} }
@keyframes bfly { from{transform:translate(0,0) scale(1);opacity:1} to{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0} }
@keyframes slotShake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-6px,-2px)} 40%{transform:translate(6px,2px)} 60%{transform:translate(-4px,2px)} 80%{transform:translate(3px,-1px)} }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
@keyframes bpipPulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.5);opacity:1} }
#slot-machine-wrapper.shake { animation: slotShake 0.38s ease-out; }
#slot-reel-viewport.spinning::after { content:''; position:absolute; inset:0; border-radius:16px; box-shadow:inset 0 0 0 3px rgba(255,255,255,0.45),0 0 28px rgba(255,255,255,0.3); pointer-events:none; z-index:5; }
#slot-reel-viewport.jackpot-glow { animation:jpPulse 0.24s ease-in-out infinite alternate; }
`

export default function SlotMachine({ width = 300 }: Props) {
  const wrapperRef    = useRef<HTMLDivElement>(null)
  const viewportRef   = useRef<HTMLDivElement>(null)
  const stripRef      = useRef<HTMLDivElement>(null)
  const leverGroupRef = useRef<SVGGElement>(null)
  const resultRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // ── inject CSS ──
    const styleEl = document.createElement('style')
    styleEl.textContent = CSS
    document.head.appendChild(styleEl)

    // ── audio ──
    let ac: AudioContext | null = null
    let spinNodes: { osc: OscillatorNode; ns: AudioBufferSourceNode; m: GainNode } | null = null

    function getCtx(): AudioContext {
      if (!ac) ac = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (ac.state === 'suspended') ac.resume()
      return ac
    }

    const Sfx = {
      click() {
        try {
          const c = getCtx()
          const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.07), c.sampleRate)
          const d = buf.getChannelData(0)
          for (let i = 0; i < d.length; i++)
            d[i] = (Math.random() * 2 - 1) * Math.exp(-i / d.length * 45) * 0.9
          const s = c.createBufferSource(); s.buffer = buf
          s.connect(c.destination); s.start()
        } catch (_) { /* ignore */ }
      },
      startSpin() {
        try {
          this.stopSpin()
          const c = getCtx()
          const m = c.createGain()
          m.gain.setValueAtTime(0, c.currentTime)
          m.gain.linearRampToValueAtTime(0.22, c.currentTime + 0.28)
          m.connect(c.destination)

          const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 72
          const dc = new Float32Array(256)
          for (let i = 0; i < 256; i++) { const x = i / 128 - 1; dc[i] = (Math.PI + 180) * x / (Math.PI + 180 * Math.abs(x)) }
          const dist = c.createWaveShaper(); dist.curve = dc
          osc.connect(dist).connect(m); osc.start()

          const nb = c.createBuffer(1, c.sampleRate * 3, c.sampleRate)
          const nd = nb.getChannelData(0)
          for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
          const ns = c.createBufferSource(); ns.buffer = nb; ns.loop = true
          const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 2.5
          const ng = c.createGain(); ng.gain.value = 0.038
          ns.connect(f).connect(ng).connect(m); ns.start()

          spinNodes = { osc, ns, m }
        } catch (_) { /* ignore */ }
      },
      stopSpin() {
        try {
          if (!spinNodes) return
          const c = getCtx()
          spinNodes.m.gain.linearRampToValueAtTime(0, c.currentTime + 0.35)
          const sn = spinNodes; spinNodes = null
          setTimeout(() => { try { sn.osc.stop() } catch (_) {} try { sn.ns.stop() } catch (_) {} }, 420)
        } catch (_) { /* ignore */ }
      },
      thud() {
        try {
          const c = getCtx()
          const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.12), c.sampleRate)
          const d = buf.getChannelData(0)
          for (let i = 0; i < d.length; i++)
            d[i] = (Math.random() * 2 - 1) * Math.exp(-i / d.length * 22) * 0.6
          const s = c.createBufferSource(); s.buffer = buf
          s.connect(c.destination); s.start()
        } catch (_) { /* ignore */ }
      },
      jackpot() {
        try {
          const c = getCtx()
          ;[523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((freq, i) => {
            const t = c.currentTime + i * 0.1
            const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq
            const g = c.createGain()
            g.gain.setValueAtTime(0, t)
            g.gain.linearRampToValueAtTime(0.34, t + 0.04)
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.62)
            o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.68)
          })
        } catch (_) { /* ignore */ }
      },
    }

    // ── reel state ──
    const viewport = viewportRef.current!
    const strip    = stripRef.current!

    let SYM_H = 0
    let SET_H = 0
    let posY   = 0

    function build() {
      SYM_H = viewport.getBoundingClientRect().width
      SET_H = N * SYM_H
      strip.innerHTML = ''
      for (let rep = 0; rep < REPEATS; rep++) {
        for (const sym of SYMBOLS) {
          const cell = document.createElement('div')
          cell.className = 'sym-cell'
          cell.style.cssText = `width:${SYM_H}px;height:${SYM_H}px;display:flex;align-items:center;justify-content:center;background:#fff;`
          const img = document.createElement('img')
          img.src = sym.file; img.alt = sym.label; (img as any).draggable = false
          img.style.cssText = 'width:76%;height:76%;object-fit:contain;display:block;pointer-events:none;user-select:none;'
          cell.appendChild(img); strip.appendChild(cell)
        }
      }
      strip.style.height = (N * REPEATS * SYM_H) + 'px'
      applyY(0)
    }

    function applyY(y: number) { posY = y; strip.style.transform = `translateY(${-y}px)` }

    function pickSymbol() {
      const tot = SYMBOLS.reduce((s, x) => s + x.weight, 0)
      let r = Math.random() * tot
      for (const sym of SYMBOLS) { r -= sym.weight; if (r <= 0) return sym }
      return SYMBOLS[SYMBOLS.length - 1]
    }

    function targetForIdx(idx: number, minY: number) {
      let y = idx * SYM_H
      while (y < minY) y += SET_H
      return y
    }

    // multi-phase easing identical to slot.html
    const E = {
      in3:     (t: number) => t ** 3,
      linear:  (t: number) => t,
      out3:    (t: number) => 1 - (1 - t) ** 3,
      out5:    (t: number) => 1 - (1 - t) ** 5,
    }
    function kf(t: number, s: number, dist: number) {
      const ph: [number, number, number, number, (t: number) => number][] = [
        [0.00, 0.14, 0.00, 0.08, E.in3   ],
        [0.14, 0.72, 0.08, 0.82, E.linear],
        [0.72, 0.86, 0.82, 0.91, E.out3  ],
        [0.86, 1.00, 0.91, 1.00, E.out5  ],
      ]
      const p = ph.find(k => t <= k[1]) || ph[ph.length - 1]
      const lt = Math.max(0, Math.min(1, (t - p[0]) / (p[1] - p[0])))
      return s + dist * (p[2] + (p[3] - p[2]) * p[4](lt))
    }

    let spinning = false

    function spinReel(onDone: (result: typeof SYMBOLS[0]) => void) {
      if (spinning) return; spinning = true
      const result  = pickSymbol()
      const targetY = targetForIdx(SYMBOLS.indexOf(result), posY + SET_H * 5)
      const startY  = posY
      const dist    = targetY - startY
      const TOTAL   = 3800
      let t0: number | null = null
      viewport.classList.add('spinning')

      function frame(ts: number) {
        if (!t0) t0 = ts
        const t = Math.min(1, (ts - t0) / TOTAL)
        applyY(kf(t, startY, dist))
        if (t < 1) { requestAnimationFrame(frame); return }
        applyY(targetY)
        const reset = targetY % SET_H
        requestAnimationFrame(() => {
          strip.style.transition = 'none'
          strip.style.transform  = `translateY(${-reset}px)`
          posY = reset
          requestAnimationFrame(() => { strip.style.transition = '' })
        })
        spinning = false
        viewport.classList.remove('spinning')
        onDone(result)
      }
      requestAnimationFrame(frame)
    }

    // ── game manager ──
    const wrapper  = wrapperRef.current!
    const resultEl = resultRef.current!

    function shake() {
      wrapper.classList.remove('shake'); void wrapper.offsetWidth
      wrapper.classList.add('shake')
      wrapper.addEventListener('animationend', () => wrapper.classList.remove('shake'), { once: true })
    }

    function spawnParticles(jackpot: boolean) {
      const rect = viewport.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top  + rect.height / 2
      const colors = jackpot
        ? ['#ffffff', '#D4E0FF', '#B0C4FF', '#4D72FB', '#e8eeff']
        : ['#ffffff', '#D4E0FF', '#B0C4FF']
      const count = jackpot ? 55 : 20
      for (let i = 0; i < count; i++) {
        const el  = document.createElement('div')
        const sz  = (jackpot ? 7 : 4) + Math.random() * 7
        const ang = Math.random() * Math.PI * 2
        const spd = (jackpot ? 130 : 60) + Math.random() * 160
        const dur = 0.6 + Math.random() * 0.8
        el.style.cssText = `
          position:fixed;
          left:${cx}px;top:${cy}px;
          width:${sz}px;height:${sz}px;
          border-radius:50%;
          background:${colors[i % colors.length]};
          pointer-events:none;z-index:9999;
          --tx:${(Math.cos(ang) * spd).toFixed(1)}px;
          --ty:${(Math.sin(ang) * spd).toFixed(1)}px;
          animation:bfly ${dur.toFixed(2)}s ease-out forwards;
          animation-delay:${(Math.random() * 0.18).toFixed(2)}s;
        `
        document.body.appendChild(el)
        setTimeout(() => el.remove(), (dur + 0.4) * 1000)
      }
    }

    function startSpin() {
      if (spinning) return
      resultEl.textContent = ''; resultEl.style.animation = ''
      shake()
      Sfx.startSpin()

      spinReel(result => {
        Sfx.stopSpin(); Sfx.thud()
        spawnParticles(result.jackpot)
        if (result.jackpot) {
          setTimeout(() => Sfx.jackpot(), 150)
          viewport.classList.add('jackpot-glow')
          setTimeout(() => viewport.classList.remove('jackpot-glow'), 5000)
          resultEl.textContent = 'JACKPOT'
          resultEl.style.animation = 'blink .3s ease-in-out infinite'
        } else {
          resultEl.textContent = result.label
        }
      })
    }

    // ── lever controller ──
    const leverMount  = document.getElementById('slot-lever-mount')!
    const leverGroup  = leverGroupRef.current!
    const PX = 16, PY = 118, MAX = 62
    let angle = 0, dragging = false, dy0 = 0, a0 = 0, pulled = false
    let raf: number | null = null

    function setAngle(a: number) {
      angle = Math.max(0, Math.min(MAX, a))
      leverGroup.setAttribute('transform', `rotate(${angle},${PX},${PY})`)
    }

    function animTo(target: number, ms: number, efn: (t: number) => number, done?: () => void) {
      if (raf !== null) cancelAnimationFrame(raf)
      const from = angle, t0 = performance.now()
      function step(ts: number) {
        const t = Math.min(1, (ts - t0) / ms)
        setAngle(from + (target - from) * efn(t))
        if (t < 1) { raf = requestAnimationFrame(step) } else { raf = null; if (done) done() }
      }
      raf = requestAnimationFrame(step)
    }

    const easeIn3  = (t: number) => t ** 3
    const easeOut2 = (t: number) => 1 - (1 - t) ** 2
    function easeBounce(t: number) {
      const n = 7.5625, d = 2.75
      if (t < 1 / d) return n * t * t
      if (t < 2 / d) { t -= 1.5 / d; return n * t * t + 0.75 }
      if (t < 2.5 / d) { t -= 2.25 / d; return n * t * t + 0.9375 }
      t -= 2.625 / d; return n * t * t + 0.984375
    }

    function pull() {
      if (pulled) return; pulled = true
      Sfx.click()
      animTo(MAX, 165, easeIn3, () => {
        startSpin()
        setTimeout(() => animTo(0, 500, easeBounce, () => { pulled = false }), 100)
      })
    }

    function onMouseDown(e: MouseEvent) {
      dragging = true; dy0 = e.clientY; a0 = angle; e.preventDefault()
    }
    function onTouchStart(e: TouchEvent) {
      dragging = true; dy0 = e.touches[0].clientY; a0 = angle; e.preventDefault()
    }
    function onMouseMove(e: MouseEvent) {
      if (!dragging) return
      setAngle(a0 + (e.clientY - dy0) * 0.55)
      if (angle >= MAX - 1.5 && !pulled) { dragging = false; pull() }
    }
    function onTouchMove(e: TouchEvent) {
      if (!dragging) return
      setAngle(a0 + (e.touches[0].clientY - dy0) * 0.55)
      if (angle >= MAX - 1.5 && !pulled) { dragging = false; pull() }
    }
    function onMouseUp() { if (dragging && !pulled) animTo(0, 260, easeOut2); dragging = false }
    function onTouchEnd() { if (dragging && !pulled) animTo(0, 260, easeOut2); dragging = false }
    function onMountClick() { if (!pulled && !dragging) pull() }

    leverMount.addEventListener('mousedown',  onMouseDown)
    leverMount.addEventListener('touchstart', onTouchStart, { passive: false })
    leverMount.addEventListener('click',      onMountClick)
    document.addEventListener('mousemove',    onMouseMove)
    document.addEventListener('mouseup',      onMouseUp)
    document.addEventListener('touchmove',    onTouchMove, { passive: false })
    document.addEventListener('touchend',     onTouchEnd)

    // ── build reel after layout ──
    build()

    return () => {
      leverMount.removeEventListener('mousedown',  onMouseDown)
      leverMount.removeEventListener('touchstart', onTouchStart)
      leverMount.removeEventListener('click',      onMountClick)
      document.removeEventListener('mousemove',    onMouseMove)
      document.removeEventListener('mouseup',      onMouseUp)
      document.removeEventListener('touchmove',    onTouchMove)
      document.removeEventListener('touchend',     onTouchEnd)
      if (raf !== null) cancelAnimationFrame(raf)
      document.head.removeChild(styleEl)
      if (ac) { ac.close(); ac = null }
    }
  }, [])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Machine body */}
      <div
        id="slot-machine-wrapper"
        ref={wrapperRef}
        style={{
          width: width,
          background: '#4D72FB',
          borderRadius: 32,
          padding: '28px 24px 26px',
          position: 'relative',
          boxShadow: [
            'inset 0 2px 0 rgba(255,255,255,0.22)',
            'inset 0 -3px 0 rgba(0,0,60,0.18)',
            '0 20px 52px rgba(77,114,251,0.38)',
            '0 6px 18px rgba(77,114,251,0.22)',
          ].join(', '),
        }}
      >
        {/* Header pips: dot dot wide dot dot */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, marginBottom: 24 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
          <div style={{ width: 26, height: 7, borderRadius: 4,    background: 'rgba(255,255,255,0.75)' }} />
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
        </div>

        {/* Screen wrap */}
        <div style={{ background: 'rgba(0,0,40,0.28)', borderRadius: 22, padding: 7 }}>
          {/* Reel viewport — square */}
          <div
            id="slot-reel-viewport"
            ref={viewportRef}
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative',
              background: '#fff',
              aspectRatio: '1',
            }}
          >
            <div
              ref={stripRef}
              id="slot-reel-strip"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                willChange: 'transform',
              }}
            />
          </div>
        </div>

        {/* Result message */}
        <div
          ref={resultRef}
          id="slot-result-msg"
          style={{
            marginTop: 18,
            textAlign: 'center',
            height: 22,
            lineHeight: '22px',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '2.5px',
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        />

        {/* Bottom pips — pulse with bpipPulse animation */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 20 }}>
          {[0, 0.3, 0.6, 0.9, 1.2].map((delay, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: i === 2 ? 'rgba(255,255,255,0.8)' : i === 1 || i === 3 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)',
                animation: `bpipPulse 2s ease-in-out ${delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Lever mount — absolute, right side */}
        <div
          id="slot-lever-mount"
          style={{
            position: 'absolute',
            right: -60,
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
          }}
        >
          <svg
            id="slot-lever-svg"
            width={48}
            height={220}
            viewBox="0 0 48 220"
            style={{ display: 'block', overflow: 'visible' }}
          >
            {/* Mount bracket — static */}
            <rect x={4} y={96} width={22} height={44} rx={11} fill="#3558D4" />

            {/* Lever arm group — rotates around pivot (16, 118) */}
            <g ref={leverGroupRef} id="slot-lever-group">
              {/* Shaft */}
              <rect x={13} y={18} width={6} height={103} rx={3} fill="white" opacity={0.88} />
              {/* Knob */}
              <circle cx={16} cy={13} r={14} fill="white" />
              {/* Knob inner depth ring */}
              <circle cx={16} cy={13} r={14} fill="none" stroke="rgba(77,114,251,0.12)" strokeWidth={3} />
              {/* Knob glint */}
              <circle cx={11} cy={8} r={4} fill="rgba(255,255,255,0.5)" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
}
