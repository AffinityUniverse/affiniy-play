import { useRef, useEffect, useState, useCallback } from 'react'
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import Layout from '../components/Layout'
import { drawSkeleton, type FrameHandler } from './finger/shared'
import FingerDrawing from './finger/FingerDrawing'
import FruitSlash from './finger/FruitSlash'
import BalloonPop from './finger/BalloonPop'
import StarCatch from './finger/StarCatch'
import MoleWhack from './finger/MoleWhack'

type GameId = 'draw' | 'fruit' | 'balloon' | 'star' | 'mole'

const GAMES: { id: GameId; emoji: string; name: string; desc: string; color: string }[] = [
  { id: 'draw',    emoji: '🖊️', name: '손가락 그림',  desc: '검지로 허공에 그림 그리기',        color: '#4D72FB' },
  { id: 'fruit',   emoji: '🍎', name: '과일 자르기',  desc: '손가락을 빠르게 휘둘러 과일 슬래시!', color: '#FF4444' },
  { id: 'balloon', emoji: '🎈', name: '풍선 팡팡',   desc: '검지로 올라오는 풍선을 터뜨려요',    color: '#FF8800' },
  { id: 'star',    emoji: '⭐', name: '별 모으기',   desc: '손바닥으로 떨어지는 별을 잡아요',    color: '#E8C000' },
  { id: 'mole',    emoji: '🐹', name: '두더지 잡기', desc: '검지로 튀어나온 두더지를 잡아요!',   color: '#27AE60' },
]

interface Props { onBack: () => void }

export default function FingerPlayHub({ onBack }: Props) {
  const videoRef       = useRef<HTMLVideoElement>(null)
  const overlayRef     = useRef<HTMLCanvasElement>(null)
  const frameHandlerRef = useRef<FrameHandler | null>(null)
  const landmarkerRef  = useRef<HandLandmarker | null>(null)
  const streamRef      = useRef<MediaStream | null>(null)
  const rafRef         = useRef(0)

  const [status,     setStatus]     = useState<'loading' | 'ready' | 'nocam' | 'error'>('loading')
  const [activeGame, setActiveGame] = useState<GameId | null>(null)

  // Sub-game registration
  const setFrameHandler = useCallback((fn: FrameHandler | null) => {
    frameHandlerRef.current = fn
  }, [])

  // ── RAF detection loop ──
  const tick = useCallback(() => {
    const video = videoRef.current
    const lmkr  = landmarkerRef.current
    if (!video || !lmkr || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    const vw = video.videoWidth  || 640
    const vh = video.videoHeight || 480
    const results = lmkr.detectForVideo(video, performance.now())
    const lm = results.landmarks?.[0] ?? null

    // Hub menu: draw skeleton on shared overlay canvas
    if (!frameHandlerRef.current) {
      const oc = overlayRef.current
      if (oc) {
        if (oc.width !== vw) { oc.width = vw; oc.height = vh }
        const ctx = oc.getContext('2d')!
        ctx.clearRect(0, 0, vw, vh)
        if (lm) drawSkeleton(ctx, lm, vw, vh)
      }
    }

    frameHandlerRef.current?.(lm, vw, vh)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  // ── Init camera + MediaPipe ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
        )
        if (cancelled) return
        const lmkr = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        })
        if (cancelled) { lmkr.close(); return }
        landmarkerRef.current = lmkr

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream

        const vid = videoRef.current
        if (!vid) return
        vid.srcObject = stream
        await vid.play()
        if (!cancelled) setStatus('ready')
      } catch (e: any) {
        if (!cancelled)
          setStatus(e.name === 'NotAllowedError' || e.name === 'NotFoundError' ? 'nocam' : 'error')
      }
    })()
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (status === 'ready') rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [status, tick])

  const selectGame = (id: GameId) => {
    frameHandlerRef.current = null
    setActiveGame(id)
  }

  const backToHub = useCallback(() => {
    frameHandlerRef.current = null
    setActiveGame(null)
  }, [])

  return (
    <Layout title="손 인식 게임" onBack={onBack}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '8px 14px 24px', width: '100%' }}>

        {/* ── Camera viewport ── */}
        <div style={{
          position: 'relative',
          borderRadius: 20, overflow: 'hidden',
          background: '#111',
          aspectRatio: '4/3',
          border: '2px solid #E8ECF4',
          boxShadow: '0 4px 24px rgba(77,114,251,0.15)',
        }}>
          {/* Status overlays */}
          {status === 'loading' && <CamOverlay type="loading" />}
          {status === 'nocam'   && <CamOverlay type="nocam" />}
          {status === 'error'   && <CamOverlay type="error" />}

          {/* Mirrored video feed */}
          <video
            ref={videoRef}
            playsInline muted
            style={{
              display: 'block', width: '100%', height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              opacity: status === 'ready' ? 1 : 0,
              transition: 'opacity 0.4s',
            }}
          />

          {/* Skeleton overlay (hub menu only) */}
          {!activeGame && (
            <canvas ref={overlayRef} style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%', pointerEvents: 'none',
            }} />
          )}

          {/* Hub menu prompt */}
          {!activeGame && status === 'ready' && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '20px 16px 14px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
              color: '#fff', fontWeight: 800, fontSize: 14,
              textShadow: '0 1px 6px rgba(0,0,0,0.5)',
            }}>
              손을 카메라에 보여주고 아래 게임을 선택하세요 👇
            </div>
          )}

          {/* Active sub-game */}
          {activeGame === 'draw'    && <FingerDrawing setFrameHandler={setFrameHandler} onBack={backToHub} />}
          {activeGame === 'fruit'   && <FruitSlash    setFrameHandler={setFrameHandler} onBack={backToHub} />}
          {activeGame === 'balloon' && <BalloonPop    setFrameHandler={setFrameHandler} onBack={backToHub} />}
          {activeGame === 'star'    && <StarCatch     setFrameHandler={setFrameHandler} onBack={backToHub} />}
          {activeGame === 'mole'    && <MoleWhack     setFrameHandler={setFrameHandler} onBack={backToHub} />}
        </div>

        {/* ── Game selection grid (hub menu only) ── */}
        {!activeGame && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            {GAMES.map(g => (
              <button
                key={g.id}
                onClick={() => selectGame(g.id)}
                disabled={status !== 'ready'}
                style={{
                  background: '#fff',
                  border: `2px solid #E8ECF4`,
                  borderRadius: 16, padding: '14px 12px',
                  cursor: status === 'ready' ? 'pointer' : 'not-allowed',
                  opacity: status === 'ready' ? 1 : 0.5,
                  textAlign: 'left',
                  boxShadow: '0 2px 12px rgba(77,114,251,0.07)',
                  transition: 'transform 0.13s ease, box-shadow 0.13s ease',
                }}
                onMouseEnter={e => {
                  if (status !== 'ready') return
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'translateY(-3px)'
                  el.style.boxShadow = `0 8px 24px rgba(77,114,251,0.18)`
                  el.style.borderColor = g.color
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = ''
                  el.style.boxShadow = '0 2px 12px rgba(77,114,251,0.07)'
                  el.style.borderColor = '#E8ECF4'
                }}
              >
                <div style={{ fontSize: 30, marginBottom: 6 }}>{g.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1A1A2E', marginBottom: 3 }}>
                  {g.name}
                </div>
                <div style={{ fontSize: 11, color: '#888', lineHeight: 1.45 }}>{g.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

// ── Loading / error overlay ──
function CamOverlay({ type }: { type: 'loading' | 'nocam' | 'error' }) {
  const cfg = {
    loading: { icon: '✋', title: '카메라 · AI 불러오는 중…', sub: '처음엔 10-20초 걸릴 수 있어요', bounce: true },
    nocam:   { icon: '📷', title: '카메라 권한이 필요해요',   sub: '브라우저에서 카메라를 허용해 주세요', bounce: false },
    error:   { icon: '⚠️', title: '카메라를 불러올 수 없어요', sub: '',                                  bounce: false },
  }[type]
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', gap: 10,
      alignItems: 'center', justifyContent: 'center',
      padding: 20, textAlign: 'center',
    }}>
      <div style={{ fontSize: 44 }} className={cfg.bounce ? 'bounce' : ''}>{cfg.icon}</div>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>{cfg.title}</div>
      {cfg.sub && <div style={{ fontSize: 12, color: '#aaa' }}>{cfg.sub}</div>}
    </div>
  )
}
