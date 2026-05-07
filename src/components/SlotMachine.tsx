import { useRef, useEffect } from 'react'

interface Props { compact?: boolean }

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

const CSS = `
@keyframes jpPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(255,220,0,0); }
  50%     { box-shadow: 0 0 24px 8px rgba(255,220,0,0.7); }
}
@keyframes bfly {
  0%   { transform: translate(0,0) scale(1); opacity: 1; }
  100% { transform: translate(var(--dx),var(--dy)) scale(0); opacity: 0; }
}
@keyframes slotShake {
  0%,100% { transform: translateX(0); }
  20%,60% { transform: translateX(-5px); }
  40%,80% { transform: translateX(5px); }
}
@keyframes jpBlink {
  0%,100% { opacity: 1; }
  50%     { opacity: 0; }
}
.slot-spinning::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  box-shadow: inset 0 0 0 3px rgba(255,255,255,0.35), inset 0 0 20px rgba(0,0,0,0.18);
  pointer-events: none;
}
.slot-jackpot-glow {
  animation: jpPulse 0.8s ease-in-out infinite;
}
.slot-machine-shake {
  animation: slotShake 0.35s ease both;
}
.slot-jp-blink {
  animation: jpBlink 0.4s ease infinite;
}
`

export default function SlotMachine({ compact = false }: Props) {
  const machineWidth = compact ? 220 : 280

  const wrapperRef   = useRef<HTMLDivElement>(null)
  const reelRefs     = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const leverMountRef = useRef<HTMLDivElement>(null)
  const leverGroupRef = useRef<SVGGElement>(null)
  const resultMsgRef  = useRef<HTMLDivElement>(null)
  const pip0Ref = useRef<HTMLDivElement>(null)
  const pip1Ref = useRef<HTMLDivElement>(null)
  const pip2Ref = useRef<HTMLDivElement>(null)
  const pip3Ref = useRef<HTMLDivElement>(null)
  const pip4Ref = useRef<HTMLDivElement>(null)
  const audioCtxRef  = useRef<AudioContext | null>(null)
  const spinNodesRef = useRef<{ osc: OscillatorNode; noise: AudioBufferSourceNode; gainOsc: GainNode; gainNoise: GainNode } | null>(null)

  useEffect(() => {
    // ── inject CSS ──
    const styleEl = document.createElement('style')
    styleEl.textContent = CSS
    document.head.appendChild(styleEl)

    // ── helpers ──
    function getAudioCtx(): AudioContext {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      return audioCtxRef.current
    }

    function makeNoise(ctx: AudioContext, duration: number): AudioBufferSourceNode {
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource()
      src.buffer = buf
      return src
    }

    const Sfx = {
      click() {
        try {
          const ctx = getAudioCtx()
          const noise = makeNoise(ctx, 0.04)
          const filt = ctx.createBiquadFilter()
          filt.type = 'bandpass'; filt.frequency.value = 1200; filt.Q.value = 0.8
          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0.18, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
          noise.connect(filt); filt.connect(gain); gain.connect(ctx.destination)
          noise.start(); noise.stop(ctx.currentTime + 0.04)
        } catch (_) { /* ignore */ }
      },
      startSpin() {
        try {
          const ctx = getAudioCtx()
          const osc = ctx.createOscillator()
          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(55, ctx.currentTime)
          osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.3)
          const gainOsc = ctx.createGain()
          gainOsc.gain.setValueAtTime(0.06, ctx.currentTime)

          const noise = makeNoise(ctx, 10)
          const filt = ctx.createBiquadFilter()
          filt.type = 'bandpass'; filt.frequency.value = 800; filt.Q.value = 1.2
          const gainNoise = ctx.createGain()
          gainNoise.gain.setValueAtTime(0.12, ctx.currentTime)

          osc.connect(gainOsc); gainOsc.connect(ctx.destination)
          noise.connect(filt); filt.connect(gainNoise); gainNoise.connect(ctx.destination)

          osc.start(); noise.start()
          spinNodesRef.current = { osc, noise, gainOsc, gainNoise }
        } catch (_) { /* ignore */ }
      },
      stopSpin() {
        try {
          const nodes = spinNodesRef.current
          if (!nodes) return
          const ctx = getAudioCtx()
          nodes.gainOsc.gain.setValueAtTime(nodes.gainOsc.gain.value, ctx.currentTime)
          nodes.gainOsc.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
          nodes.gainNoise.gain.setValueAtTime(nodes.gainNoise.gain.value, ctx.currentTime)
          nodes.gainNoise.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
          nodes.osc.stop(ctx.currentTime + 0.45)
          nodes.noise.stop(ctx.currentTime + 0.45)
          spinNodesRef.current = null
        } catch (_) { /* ignore */ }
      },
      thud() {
        try {
          const ctx = getAudioCtx()
          const noise = makeNoise(ctx, 0.12)
          const filt = ctx.createBiquadFilter()
          filt.type = 'lowpass'; filt.frequency.value = 200
          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0.55, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
          noise.connect(filt); filt.connect(gain); gain.connect(ctx.destination)
          noise.start(); noise.stop(ctx.currentTime + 0.12)
        } catch (_) { /* ignore */ }
      },
      jackpot() {
        try {
          const ctx = getAudioCtx()
          const freqs = [523, 659, 784, 1047]
          freqs.forEach((f, i) => {
            const osc = ctx.createOscillator()
            osc.type = 'sine'; osc.frequency.value = f
            const gain = ctx.createGain()
            const t = ctx.currentTime + i * 0.18
            gain.gain.setValueAtTime(0, t)
            gain.gain.linearRampToValueAtTime(0.22, t + 0.06)
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
            osc.connect(gain); gain.connect(ctx.destination)
            osc.start(t); osc.stop(t + 0.6)
          })
        } catch (_) { /* ignore */ }
      },
    }

    // ── weighted random ──
    function pickSymbol() {
      const totalWeight = SYMBOLS.reduce((s, sym) => s + sym.weight, 0)
      let r = Math.random() * totalWeight
      for (const sym of SYMBOLS) {
        r -= sym.weight
        if (r <= 0) return sym
      }
      return SYMBOLS[0]
    }

    // ── build reel strips ──
    const CELL_H = compact ? 60 : 76
    const SET_H = SYMBOLS.length * CELL_H * REPEATS

    const reelSymbols: typeof SYMBOLS[0][][] = [[], [], []]

    reelRefs.forEach((ref, ri) => {
      const el = ref.current
      if (!el) return
      el.innerHTML = ''
      el.style.position = 'absolute'
      el.style.top = '0'
      el.style.left = '0'
      el.style.right = '0'
      el.style.willChange = 'transform'

      const syms: typeof SYMBOLS[0][] = []
      for (let rep = 0; rep < REPEATS; rep++) {
        for (const sym of SYMBOLS) {
          syms.push(sym)
          const cell = document.createElement('div')
          cell.style.cssText = `
            width: 100%;
            height: ${CELL_H}px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
          `
          const img = document.createElement('img')
          img.src = sym.file
          img.alt = sym.label
          img.style.cssText = `width: 76%; height: 76%; object-fit: contain; display: block;`
          cell.appendChild(img)
          el.appendChild(cell)
        }
      }
      reelSymbols[ri] = syms
      el.style.height = `${syms.length * CELL_H}px`
    })

    // ── reel positions ──
    const reelPositions = [0, 0, 0]

    function setReelY(ri: number, y: number) {
      const el = reelRefs[ri].current
      if (el) el.style.transform = `translateY(${-y}px)`
    }

    // ── easing ──
    function easeIn3(t: number) { return t * t * t }
    function easeOut3(t: number) { const u = 1 - t; return 1 - u * u * u }
    function easeOut5(t: number) { const u = 1 - t; return 1 - u * u * u * u * u }

    // ── spin one reel ──
    function spinReel(ri: number, targetSymIdx: number, onDone: () => void) {
      const DURATION = 3800
      const startY = reelPositions[ri]
      const fullSets = 3
      const targetY = startY + SET_H * fullSets + targetSymIdx * CELL_H - startY % SET_H + SET_H - (startY % SET_H)

      // actually: travel a fixed distance to land on target
      // compute how much to travel so final pos lands on targetSymIdx
      const currentIdxInStrip = Math.round(startY / CELL_H) % (SYMBOLS.length * REPEATS)
      const nearTargetIdx = targetSymIdx + SYMBOLS.length * REPEATS * Math.floor(currentIdxInStrip / (SYMBOLS.length * REPEATS))
      const shortTravel = nearTargetIdx * CELL_H - startY
      const travel = shortTravel + SET_H * fullSets + (shortTravel < 0 ? SET_H : 0)

      const start = performance.now()

      function tick(now: number) {
        let t = Math.min((now - start) / DURATION, 1)
        let progress: number

        if (t < 0.14) {
          progress = easeIn3(t / 0.14) * 0.14
        } else if (t < 0.72) {
          progress = 0.14 + (t - 0.14)
        } else if (t < 0.86) {
          progress = 0.14 + 0.58 + easeOut3((t - 0.72) / 0.14) * 0.10
        } else {
          progress = 0.14 + 0.58 + 0.10 + easeOut5((t - 0.86) / 0.14) * 0.18
        }

        const y = (startY + travel * Math.min(progress / (0.14 + 0.58 + 0.10 + 0.18), 1)) % SET_H
        reelPositions[ri] = y < 0 ? y + SET_H : y
        setReelY(ri, reelPositions[ri])

        if (t < 1) {
          requestAnimationFrame(tick)
        } else {
          reelPositions[ri] = (targetSymIdx * CELL_H) % SET_H
          setReelY(ri, reelPositions[ri])
          onDone()
        }
      }

      requestAnimationFrame(tick)
    }

    // ── game state ──
    let isSpinning = false
    const results: typeof SYMBOLS[0][] = [SYMBOLS[0], SYMBOLS[0], SYMBOLS[0]]

    function doSpin() {
      if (isSpinning) return
      isSpinning = true

      const wrapper = wrapperRef.current
      if (wrapper) {
        wrapper.classList.remove('slot-machine-shake')
        void wrapper.offsetWidth
        wrapper.classList.add('slot-machine-shake')
        wrapper.addEventListener('animationend', () => {
          wrapper.classList.remove('slot-machine-shake')
        }, { once: true })
      }

      reelRefs.forEach(r => {
        if (r.current) r.current.parentElement?.classList.add('slot-spinning')
      })

      if (resultMsgRef.current) {
        resultMsgRef.current.textContent = ''
        resultMsgRef.current.classList.remove('slot-jp-blink')
      }

      Sfx.click()
      setTimeout(() => Sfx.startSpin(), 80)

      const picked = [pickSymbol(), pickSymbol(), pickSymbol()]
      let done = 0

      reelRefs.forEach((_, ri) => {
        const targetSym = picked[ri]
        const targetIdx = reelSymbols[ri].findIndex(s => s.id === targetSym.id)
        const delay = ri * 600

        setTimeout(() => {
          spinReel(ri, targetIdx >= 0 ? targetIdx : 0, () => {
            results[ri] = targetSym
            Sfx.thud()
            if (reelRefs[ri].current) {
              reelRefs[ri].current!.parentElement?.classList.remove('slot-spinning')
            }
            done++
            if (done === 3) {
              Sfx.stopSpin()
              onAllDone()
            }
          })
        }, delay)
      })

      function onAllDone() {
        isSpinning = false
        const isJackpot = results.every(r => r.jackpot)
        const allSame = results[0].id === results[1].id && results[1].id === results[2].id

        if (isJackpot) {
          showResult('🎉 JACKPOT! 🎉', true)
          Sfx.jackpot()
          spawnParticles(true)
          reelRefs.forEach(r => r.current?.parentElement?.classList.add('slot-jackpot-glow'))
          setTimeout(() => {
            reelRefs.forEach(r => r.current?.parentElement?.classList.remove('slot-jackpot-glow'))
          }, 3000)
        } else if (allSame) {
          showResult(`✨ ${results[0].label}! ✨`, false)
          Sfx.jackpot()
          spawnParticles(false)
        } else {
          showResult(results.map(r => r.label).join(' · '), false)
        }
      }
    }

    function showResult(text: string, blink: boolean) {
      const el = resultMsgRef.current
      if (!el) return
      el.textContent = text
      el.classList.toggle('slot-jp-blink', blink)
    }

    function spawnParticles(jackpot: boolean) {
      const count = jackpot ? 55 : 20
      const colors = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF922B','#CC5DE8','#F06595']
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2

      for (let i = 0; i < count; i++) {
        const p = document.createElement('div')
        const angle = Math.random() * Math.PI * 2
        const dist = 80 + Math.random() * (jackpot ? 260 : 160)
        const dx = Math.cos(angle) * dist
        const dy = Math.sin(angle) * dist
        const size = 6 + Math.random() * (jackpot ? 14 : 10)
        const dur = 0.5 + Math.random() * 0.7

        p.style.cssText = `
          position: fixed;
          left: ${cx}px;
          top: ${cy}px;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          pointer-events: none;
          z-index: 9999;
          --dx: ${dx}px;
          --dy: ${dy}px;
          animation: bfly ${dur}s ease-out forwards;
        `
        document.body.appendChild(p)
        setTimeout(() => p.remove(), dur * 1000 + 100)
      }
    }

    // ── lever ──
    let leverDragging = false
    let leverAngle = 0
    let leverStartY = 0
    const MAX_ANGLE = 62

    function setLeverAngle(angle: number) {
      const g = leverGroupRef.current
      if (g) g.setAttribute('transform', `rotate(${angle}, 16, 118)`)
    }

    function leverPull(clientY: number) {
      if (!leverDragging) return
      const delta = clientY - leverStartY
      const angle = Math.max(0, Math.min(MAX_ANGLE, delta * 0.6))
      leverAngle = angle
      setLeverAngle(angle)
      if (angle >= MAX_ANGLE) {
        leverDragging = false
        leverReturn()
        doSpin()
      }
    }

    function leverReturn() {
      const startAngle = leverAngle
      const dur = 350
      const start = performance.now()
      function tick(now: number) {
        const t = Math.min((now - start) / dur, 1)
        const u = 1 - t
        // bounce ease
        const ease = 1 - u * u * (3 - 2 * u)
        leverAngle = startAngle * (1 - ease)
        setLeverAngle(leverAngle)
        if (t < 1) requestAnimationFrame(tick)
        else { leverAngle = 0; setLeverAngle(0) }
      }
      requestAnimationFrame(tick)
    }

    function onMouseDown(e: MouseEvent) {
      leverDragging = true
      leverStartY = e.clientY - leverAngle / 0.6
      e.preventDefault()
    }
    function onTouchStart(e: TouchEvent) {
      leverDragging = true
      leverStartY = e.touches[0].clientY - leverAngle / 0.6
    }
    function onMouseMove(e: MouseEvent) { leverPull(e.clientY) }
    function onTouchMove(e: TouchEvent) { leverPull(e.touches[0].clientY) }
    function onMouseUp() {
      if (leverDragging) { leverDragging = false; leverReturn() }
    }
    function onTouchEnd() {
      if (leverDragging) { leverDragging = false; leverReturn() }
    }
    function onClick() {
      if (!isSpinning) {
        Sfx.click()
        const fakeDown = new MouseEvent('mousedown', { clientY: 0 })
        const mount = leverMountRef.current
        if (mount) {
          leverDragging = true
          leverStartY = -MAX_ANGLE / 0.6
          leverPull(0)
          setTimeout(() => {
            leverDragging = false
            leverReturn()
            doSpin()
          }, 80)
        }
      }
    }

    const mount = leverMountRef.current
    if (mount) {
      mount.addEventListener('mousedown', onMouseDown)
      mount.addEventListener('touchstart', onTouchStart, { passive: true })
      mount.addEventListener('click', onClick)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)

    // ── pip pulse ──
    const pipRefs = [pip0Ref, pip1Ref, pip2Ref, pip3Ref, pip4Ref]
    let pipInterval: ReturnType<typeof setInterval>
    let pipIdx = 0
    pipInterval = setInterval(() => {
      pipRefs.forEach((p, i) => {
        if (p.current) p.current.style.opacity = i === pipIdx ? '1' : '0.35'
      })
      pipIdx = (pipIdx + 1) % 5
    }, 400)

    return () => {
      // cleanup
      if (mount) {
        mount.removeEventListener('mousedown', onMouseDown)
        mount.removeEventListener('touchstart', onTouchStart)
        mount.removeEventListener('click', onClick)
      }
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      clearInterval(pipInterval)
      document.head.removeChild(styleEl)
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
    }
  }, [compact])

  const CELL_H = compact ? 60 : 76
  const machineWidthPx = `${machineWidth}px`

  return (
    <div
      ref={wrapperRef}
      style={{
        width: machineWidthPx,
        background: '#4D72FB',
        borderRadius: 32,
        padding: compact ? '20px 18px 18px' : '28px 24px 26px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Screen wrap */}
      <div style={{
        background: 'rgba(0,0,40,0.28)',
        borderRadius: 22,
        padding: 7,
        marginBottom: 10,
      }}>
        {/* Reels */}
        <div style={{ display: 'flex', gap: 5 }}>
          {reelRefs.map((ref, ri) => (
            <div
              key={ri}
              style={{
                flex: 1,
                background: '#fff',
                borderRadius: 16,
                overflow: 'hidden',
                aspectRatio: '1',
                position: 'relative',
              }}
            >
              <div ref={ref} />
            </div>
          ))}
        </div>

        {/* Result message */}
        <div
          ref={resultMsgRef}
          style={{
            textAlign: 'center',
            height: 22,
            color: 'rgba(255,255,255,0.9)',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '2.5px',
            marginTop: 6,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        />
      </div>

      {/* Bottom pips */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 4 }}>
        {[pip0Ref, pip1Ref, pip2Ref, pip3Ref, pip4Ref].map((pipRef, i) => (
          <div
            key={i}
            ref={pipRef}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#fff',
              opacity: i === 0 ? 1 : 0.35,
              transition: 'opacity 0.3s',
            }}
          />
        ))}
      </div>

      {/* Lever mount */}
      <div
        ref={leverMountRef}
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
        {/* Mount bracket */}
        <div style={{
          width: 18,
          height: 44,
          background: '#2A4BD4',
          borderRadius: '4px 12px 12px 4px',
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          boxShadow: '2px 0 6px rgba(0,0,0,0.28)',
        }} />
        <svg
          width={48}
          height={220}
          style={{ display: 'block', overflow: 'visible' }}
        >
          <g ref={leverGroupRef} transform="rotate(0, 16, 118)">
            {/* Shaft */}
            <rect
              x={12} y={18}
              width={8} height={100}
              rx={4}
              fill="#C0C0D0"
              style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.35))' }}
            />
            {/* Knob */}
            <circle
              cx={16} cy={14}
              r={13}
              fill="#FF4D4D"
              style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))' }}
            />
            <circle cx={13} cy={11} r={4} fill="rgba(255,255,255,0.35)" />
          </g>
        </svg>
      </div>
    </div>
  )
}
