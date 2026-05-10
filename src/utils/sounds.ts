let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

/** 짧은 클릭음 */
export function playClick() {
  try {
    const c = getCtx()
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.055), c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / d.length * 50) * 0.7
    const s = c.createBufferSource(); s.buffer = buf
    s.connect(c.destination); s.start()
  } catch (_) { /* ignore */ }
}

/** 성공/정답 팡파레 */
export function playSuccess() {
  try {
    const c = getCtx()
    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const t = c.currentTime + i * 0.11
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq
      const g = c.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.22, t + 0.04)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.42)
    })
  } catch (_) { /* ignore */ }
}

/** 오답/실패 버저 */
export function playError() {
  try {
    const c = getCtx()
    const o = c.createOscillator(); o.type = 'sawtooth'
    o.frequency.setValueAtTime(220, c.currentTime)
    o.frequency.linearRampToValueAtTime(150, c.currentTime + 0.25)
    const g = c.createGain()
    g.gain.setValueAtTime(0.18, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.28)
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.28)
  } catch (_) { /* ignore */ }
}

/** 팝 효과음 (풍선/두더지 등) */
export function playPop() {
  try {
    const c = getCtx()
    const o = c.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(900, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.14)
    const g = c.createGain()
    g.gain.setValueAtTime(0.28, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.14)
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.14)
  } catch (_) { /* ignore */ }
}

/** 짧은 이동/점프음 */
export function playMove() {
  try {
    const c = getCtx()
    const o = c.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(440, c.currentTime)
    o.frequency.linearRampToValueAtTime(660, c.currentTime + 0.07)
    const g = c.createGain()
    g.gain.setValueAtTime(0.12, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1)
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.1)
  } catch (_) { /* ignore */ }
}

/** 완전 클리어 팡파레 */
export function playJackpot() {
  try {
    const c = getCtx()
    ;[523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((freq, i) => {
      const t = c.currentTime + i * 0.1
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq
      const g = c.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.3, t + 0.04)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.65)
    })
  } catch (_) { /* ignore */ }
}
