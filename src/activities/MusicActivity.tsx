import { useRef, useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'

interface Props { onBack: () => void }

const WHITE_KEYS = [
  { name: '도',  freq: 261.63, key: 'a', charIdx: 0 },
  { name: '레',  freq: 293.66, key: 's', charIdx: 1 },
  { name: '미',  freq: 329.63, key: 'd', charIdx: 2 },
  { name: '파',  freq: 349.23, key: 'f', charIdx: 3 },
  { name: '솔',  freq: 392.00, key: 'g', charIdx: 4 },
  { name: '라',  freq: 440.00, key: 'h', charIdx: 5 },
  { name: '시',  freq: 493.88, key: 'j', charIdx: 6 },
  { name: '도♪', freq: 523.25, key: 'k', charIdx: 0 },
]

// Black key positions: between white keys 0-1, 1-2, 3-4, 4-5, 5-6
// afterWhiteIdx = index of white key to the LEFT of the black key
const BLACK_KEYS = [
  { name: '도#', freq: 277.18, key: 'w', afterWhiteIdx: 0 },
  { name: '레#', freq: 311.13, key: 'e', afterWhiteIdx: 1 },
  { name: '파#', freq: 369.99, key: 't', afterWhiteIdx: 3 },
  { name: '솔#', freq: 415.30, key: 'y', afterWhiteIdx: 4 },
  { name: '라#', freq: 466.16, key: 'u', afterWhiteIdx: 5 },
]

const CHARS = [
  'slice/slice2.png',
  'slice/slice3.png',
  'slice/slice4.png',
  'slice/slice5.png',
  'slice/slice6.png',
  'slice/slice7.png',
  'slice/slice9.png',
]

const NOTE_COLORS = ['#FF4444','#FF8800','#FFD700','#88CC44','#44AAFF','#4D72FB','#9944CC','#FF66AA']

// Build lookup maps: key -> { type, idx }
const KEY_MAP: Record<string, { type: 'white'|'black'; idx: number }> = {}
WHITE_KEYS.forEach((k, i) => { KEY_MAP[k.key] = { type: 'white', idx: i } })
BLACK_KEYS.forEach((k, i) => { KEY_MAP[k.key] = { type: 'black', idx: i } })

export default function MusicActivity({ onBack }: Props) {
  const ctxRef = useRef<AudioContext | null>(null)
  const activeNodesRef = useRef<Map<string, { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode; gain2: GainNode }>>(new Map())

  // activeWhite / activeBlack = set of indices currently held
  const [activeWhite, setActiveWhite] = useState<Set<number>>(new Set())
  const [activeBlack, setActiveBlack] = useState<Set<number>>(new Set())
  const [history, setHistory] = useState<{ color: string; label: string }[]>([])

  const getCtx = () => {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }

  const startNote = useCallback((freq: number, nodeKey: string) => {
    if (activeNodesRef.current.has(nodeKey)) return
    const ctx = getCtx()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.45, now + 0.02)

    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(freq * 2, now)
    const gain2 = ctx.createGain()
    gain2.gain.setValueAtTime(0, now)
    gain2.gain.linearRampToValueAtTime(0.10, now + 0.01)

    osc.connect(gain); gain.connect(ctx.destination)
    osc2.connect(gain2); gain2.connect(ctx.destination)
    osc.start(now); osc2.start(now)

    activeNodesRef.current.set(nodeKey, { osc, osc2, gain, gain2 })
  }, [])

  const stopNote = useCallback((nodeKey: string) => {
    const nodes = activeNodesRef.current.get(nodeKey)
    if (!nodes) return
    const ctx = ctxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    nodes.gain.gain.cancelScheduledValues(now)
    nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, now)
    nodes.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    nodes.gain2.gain.cancelScheduledValues(now)
    nodes.gain2.gain.setValueAtTime(Math.max(nodes.gain2.gain.value, 0.001), now)
    nodes.gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    nodes.osc.stop(now + 0.3)
    nodes.osc2.stop(now + 0.2)
    activeNodesRef.current.delete(nodeKey)
  }, [])

  const pressWhite = useCallback((idx: number) => {
    const { freq } = WHITE_KEYS[idx]
    const nodeKey = `w${idx}`
    startNote(freq, nodeKey)
    setActiveWhite(prev => { const s = new Set(prev); s.add(idx); return s })
    setHistory(h => [...h.slice(-15), { color: NOTE_COLORS[idx], label: WHITE_KEYS[idx].name }])
  }, [startNote])

  const releaseWhite = useCallback((idx: number) => {
    stopNote(`w${idx}`)
    setActiveWhite(prev => { const s = new Set(prev); s.delete(idx); return s })
  }, [stopNote])

  const pressBlack = useCallback((idx: number) => {
    const { freq } = BLACK_KEYS[idx]
    const nodeKey = `b${idx}`
    startNote(freq, nodeKey)
    setActiveBlack(prev => { const s = new Set(prev); s.add(idx); return s })
    setHistory(h => [...h.slice(-15), { color: '#555', label: BLACK_KEYS[idx].name }])
  }, [startNote])

  const releaseBlack = useCallback((idx: number) => {
    stopNote(`b${idx}`)
    setActiveBlack(prev => { const s = new Set(prev); s.delete(idx); return s })
  }, [stopNote])

  // Keyboard events
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const k = e.key.toLowerCase()
      const mapped = KEY_MAP[k]
      if (!mapped) return
      if (mapped.type === 'white') pressWhite(mapped.idx)
      else pressBlack(mapped.idx)
    }
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const mapped = KEY_MAP[k]
      if (!mapped) return
      if (mapped.type === 'white') releaseWhite(mapped.idx)
      else releaseBlack(mapped.idx)
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [pressWhite, releaseWhite, pressBlack, releaseBlack])

  const WHITE_KEY_W = 100 / 8 // percent width each white key

  return (
    <Layout title="악기 놀이" onBack={onBack}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '8px 12px 32px', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>

        <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#aaa', margin: 0 }}>
          건반을 눌러 소리를 내봐요! 🎵
        </p>

        {/* History dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, minHeight: 22, flexWrap: 'wrap' }}>
          {history.map((h, i) => (
            <div key={i} style={{
              width: 20, height: 20, borderRadius: '50%',
              background: h.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 7, fontWeight: 900, color: '#fff',
              boxShadow: `0 2px 6px ${h.color}88`,
            }}>
              {h.label[0]}
            </div>
          ))}
        </div>

        {/* Character row — one per white key */}
        <div style={{ display: 'flex', width: '100%' }}>
          {WHITE_KEYS.map((wk, idx) => {
            const isActive = activeWhite.has(idx)
            return (
              <div key={idx} style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                height: 56,
              }}>
                <img
                  src={CHARS[wk.charIdx]}
                  alt=""
                  style={{
                    width: 34, height: 34, objectFit: 'contain',
                    transform: isActive ? 'scale(1.3) translateY(-8px)' : 'scale(1) translateY(0)',
                    transition: 'transform 0.12s ease',
                    filter: isActive ? `drop-shadow(0 4px 8px ${NOTE_COLORS[idx]}99)` : 'none',
                    animation: isActive ? 'charDance 0.3s ease infinite alternate' : 'none',
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Piano keyboard */}
        <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
          {/* White keys */}
          <div style={{ display: 'flex', width: '100%', gap: 2 }}>
            {WHITE_KEYS.map((wk, idx) => {
              const isActive = activeWhite.has(idx)
              return (
                <div
                  key={idx}
                  onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); pressWhite(idx) }}
                  onPointerUp={() => releaseWhite(idx)}
                  onPointerLeave={() => { if (activeWhite.has(idx)) releaseWhite(idx) }}
                  style={{
                    flex: 1,
                    height: 130,
                    background: isActive ? '#DDEEFF' : '#ffffff',
                    border: '2px solid #4D72FB',
                    borderRadius: '0 0 8px 8px',
                    cursor: 'pointer',
                    touchAction: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingBottom: 6,
                    gap: 2,
                    transform: isActive ? 'translateY(4px)' : 'translateY(0)',
                    transition: 'transform 0.08s ease, background 0.08s ease',
                    boxShadow: isActive
                      ? '0 2px 4px rgba(77,114,251,0.3)'
                      : '0 4px 8px rgba(77,114,251,0.15)',
                    zIndex: 1,
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 900, color: '#4D72FB', lineHeight: 1 }}>{wk.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#aaa', lineHeight: 1, textTransform: 'uppercase' }}>{wk.key}</span>
                </div>
              )
            })}
          </div>

          {/* Black keys — absolutely positioned */}
          {BLACK_KEYS.map((bk, idx) => {
            const isActive = activeBlack.has(idx)
            // Center of the black key: between white key afterWhiteIdx and afterWhiteIdx+1
            // White key width = WHITE_KEY_W% each, with 2px gaps
            // Approximate: left edge of each white key i = i * (WHITE_KEY_W%) + gaps
            // For simplicity use percentage: position at (afterWhiteIdx + 1) * WHITE_KEY_W% - half black key width
            const leftPct = (bk.afterWhiteIdx + 1) * WHITE_KEY_W

            return (
              <div
                key={idx}
                onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); pressBlack(idx) }}
                onPointerUp={() => releaseBlack(idx)}
                onPointerLeave={() => { if (activeBlack.has(idx)) releaseBlack(idx) }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `calc(${leftPct}% - 5%)`,
                  width: '10%',
                  height: 82,
                  background: isActive ? '#3A3A5E' : '#1A1A2E',
                  borderRadius: '0 0 6px 6px',
                  cursor: 'pointer',
                  touchAction: 'none',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingBottom: 5,
                  gap: 1,
                  transform: isActive ? 'translateY(4px)' : 'translateY(0)',
                  transition: 'transform 0.08s ease, background 0.08s ease',
                  boxShadow: isActive
                    ? '0 2px 4px rgba(0,0,0,0.5)'
                    : '0 4px 10px rgba(0,0,0,0.4)',
                }}
              >
                <span style={{ fontSize: 7.5, fontWeight: 900, color: '#aaa', lineHeight: 1 }}>{bk.name}</span>
                <span style={{ fontSize: 7, fontWeight: 700, color: '#666', lineHeight: 1, textTransform: 'uppercase' }}>{bk.key}</span>
              </div>
            )
          })}
        </div>

        {history.length > 0 && (
          <button
            onClick={() => setHistory([])}
            style={{ alignSelf: 'center', background: 'none', border: 'none', color: '#ccc', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 12px' }}
          >
            기록 지우기
          </button>
        )}
      </div>

      <style>{`
        @keyframes charDance {
          from { transform: scale(1.3) translateY(-8px) rotate(-5deg); }
          to   { transform: scale(1.3) translateY(-12px) rotate(5deg); }
        }
      `}</style>
    </Layout>
  )
}
