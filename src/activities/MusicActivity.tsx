import { useRef, useState } from 'react'
import Layout from '../components/Layout'

interface Props { onBack: () => void }

const NOTES = [
  { name: '도', freq: 261.63, color: '#FF4444', char: 'slice/slice2.png' },
  { name: '레', freq: 293.66, color: '#FF8800', char: 'slice/slice3.png' },
  { name: '미', freq: 329.63, color: '#FFD700', char: 'slice/slice4.png' },
  { name: '파', freq: 349.23, color: '#88CC44', char: 'slice/slice5.png' },
  { name: '솔', freq: 392.00, color: '#44AAFF', char: 'slice/slice6.png' },
  { name: '라', freq: 440.00, color: '#4D72FB', char: 'slice/slice7.png' },
  { name: '시', freq: 493.88, color: '#9944CC', char: 'slice/slice9.png' },
  { name: '도♪', freq: 523.25, color: '#FF66AA', char: 'slice/slice2.png' },
]

export default function MusicActivity({ onBack }: Props) {
  const ctxRef = useRef<AudioContext | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const [history, setHistory] = useState<number[]>([])

  const getCtx = () => {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    return ctxRef.current
  }

  const playNote = (idx: number) => {
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()

    const { freq } = NOTES[idx]
    const now = ctx.currentTime

    // Oscillator (triangle wave for soft tone)
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now)

    // Gain envelope: quick attack, smooth release
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.5, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

    // Subtle harmonic overtone
    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(freq * 2, now)
    const gain2 = ctx.createGain()
    gain2.gain.setValueAtTime(0, now)
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.01)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

    osc.connect(gain)
    osc2.connect(gain2)
    gain.connect(ctx.destination)
    gain2.connect(ctx.destination)

    osc.start(now)
    osc2.start(now)
    osc.stop(now + 0.9)
    osc2.stop(now + 0.5)

    setActive(idx)
    setHistory(h => [...h.slice(-11), idx])
    setTimeout(() => setActive(a => a === idx ? null : a), 300)
  }

  return (
    <Layout title="악기 놀이" onBack={onBack}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Instruction */}
        <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#aaa' }}>
          건반을 눌러 소리를 내봐요! 🎵
        </p>

        {/* History display — mini colored dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, minHeight: 24, flexWrap: 'wrap' }}>
          {history.map((idx, i) => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: '50%',
              background: NOTES[idx].color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 900, color: '#fff',
            }}>
              {NOTES[idx].name[0]}
            </div>
          ))}
        </div>

        {/* Xylophone keys — vertical stacked bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {NOTES.map((note, idx) => {
            const isActive = active === idx
            // Keys get progressively shorter from do to do♪ (like real xylophone)
            const widthPct = 100 - idx * 5

            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Character mascot */}
                <img
                  src={note.char}
                  alt=""
                  style={{
                    width: 36, height: 36, objectFit: 'contain', flexShrink: 0,
                    transform: isActive ? 'scale(1.3) translateY(-4px)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                    filter: isActive ? `drop-shadow(0 4px 8px ${note.color}88)` : 'none',
                  }}
                />

                {/* The key bar */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    onPointerDown={() => playNote(idx)}
                    style={{
                      width: `${widthPct}%`,
                      height: 52,
                      borderRadius: 12,
                      background: isActive
                        ? `linear-gradient(135deg, ${note.color}, ${note.color}cc)`
                        : `linear-gradient(135deg, ${note.color}cc, ${note.color}88)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                      touchAction: 'none',
                      transform: isActive ? 'translateY(3px) scale(0.98)' : 'translateY(0) scale(1)',
                      transition: 'transform 0.1s ease, background 0.1s ease, box-shadow 0.1s ease',
                      boxShadow: isActive
                        ? `0 2px 0 ${note.color}99, 0 4px 12px ${note.color}44`
                        : `0 4px 0 ${note.color}99, 0 6px 16px ${note.color}33`,
                    }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                      {note.name}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Clear history */}
        {history.length > 0 && (
          <button
            onClick={() => setHistory([])}
            style={{ alignSelf: 'center', background: 'none', border: 'none', color: '#ccc', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 12px' }}
          >
            기록 지우기
          </button>
        )}
      </div>
    </Layout>
  )
}
