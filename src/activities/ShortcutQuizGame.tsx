import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { playClick, playSuccess, playError } from '../utils/sounds'

interface Props { onBack: () => void }

interface Question {
  question: string
  choices: string[]
  answer: number
  emoji: string
}

const QUESTIONS: Question[] = [
  { question: '저장하려면?',        emoji: '💾', choices: ['Ctrl+S', 'Ctrl+C', 'Ctrl+Z', 'Ctrl+V'],  answer: 0 },
  { question: '복사하려면?',        emoji: '📋', choices: ['Ctrl+X', 'Ctrl+V', 'Ctrl+C', 'Ctrl+A'],  answer: 2 },
  { question: '붙여넣기?',          emoji: '📌', choices: ['Ctrl+C', 'Ctrl+V', 'Ctrl+Z', 'Ctrl+S'],  answer: 1 },
  { question: '실행 취소?',         emoji: '↩️',  choices: ['Ctrl+Y', 'Ctrl+R', 'Ctrl+Z', 'Ctrl+X'],  answer: 2 },
  { question: '전체 선택?',         emoji: '✅', choices: ['Ctrl+F', 'Ctrl+A', 'Ctrl+D', 'Ctrl+H'],  answer: 1 },
  { question: '찾기?',              emoji: '🔍', choices: ['Ctrl+G', 'Ctrl+H', 'Ctrl+F', 'Ctrl+L'],  answer: 2 },
  { question: '잘라내기?',          emoji: '✂️',  choices: ['Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+D'],  answer: 0 },
  { question: '다시 실행(Redo)?',   emoji: '↪️',  choices: ['Ctrl+Z', 'Ctrl+Y', 'Ctrl+R', 'Ctrl+U'],  answer: 1 },
  { question: '새 탭 열기?',        emoji: '🗂️',  choices: ['Ctrl+W', 'Ctrl+N', 'Ctrl+T', 'Ctrl+O'],  answer: 2 },
  { question: '탭 닫기?',           emoji: '❌', choices: ['Ctrl+T', 'Ctrl+Q', 'Ctrl+X', 'Ctrl+W'],  answer: 3 },
  { question: '인쇄?',              emoji: '🖨️',  choices: ['Ctrl+I', 'Ctrl+P', 'Ctrl+L', 'Ctrl+K'],  answer: 1 },
  { question: '굵게(Bold)?',        emoji: '𝐁',  choices: ['Ctrl+I', 'Ctrl+U', 'Ctrl+B', 'Ctrl+G'],  answer: 2 },
  { question: '기울임(Italic)?',    emoji: '𝐼',  choices: ['Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+E'],  answer: 1 },
  { question: '밑줄(Underline)?',   emoji: '͟U',  choices: ['Ctrl+U', 'Ctrl+I', 'Ctrl+B', 'Ctrl+L'],  answer: 0 },
  { question: '화면 새로고침?',     emoji: '🔄', choices: ['F1',     'F3',     'F5',     'F12'],       answer: 2 },
  { question: '개발자 도구 열기?',  emoji: '🛠️',  choices: ['F5',     'F10',    'F11',    'F12'],       answer: 3 },
  { question: '전체화면?',          emoji: '⛶',  choices: ['F9',     'F10',    'F11',    'F12'],       answer: 2 },
  { question: '새 창 열기?',        emoji: '🪟', choices: ['Ctrl+T', 'Ctrl+N', 'Ctrl+O', 'Ctrl+W'],  answer: 1 },
]

const CHOICE_COLORS = [
  { bg: '#FF8C42', light: '#FFE9D5', border: '#E8731A' },
  { bg: '#4D72FB', light: '#D5E8FF', border: '#3558D4' },
  { bg: '#27AE60', light: '#D5F5E3', border: '#1E8449' },
  { bg: '#E8731A', light: '#FFF0D5', border: '#CC5500' },
]

const TOTAL_Q = 10
const TIME_PER_Q = 12

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type GameState = 'idle' | 'playing' | 'feedback' | 'done'

export default function ShortcutQuizGame({ onBack }: Props) {
  const [state, setState]       = useState<GameState>('idle')
  const [qList, setQList]       = useState<Question[]>([])
  const [qIndex, setQIndex]     = useState(0)
  const [score, setScore]       = useState(0)
  const [lives, setLives]       = useState(3)
  const [selected, setSelected] = useState<number | null>(null)
  const [correct, setCorrect]   = useState<boolean>(false)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q)
  const [shake, setShake]       = useState(false)
  const [popIdx, setPopIdx]     = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const startGame = useCallback(() => {
    const questions = shuffle(QUESTIONS).slice(0, TOTAL_Q)
    setQList(questions)
    setQIndex(0)
    setScore(0)
    setLives(3)
    setSelected(null)
    setTimeLeft(TIME_PER_Q)
    setState('playing')
  }, [])

  // 타이머
  useEffect(() => {
    if (state !== 'playing') { stopTimer(); return }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stopTimer()
          // 시간 초과 = 오답
          setSelected(-1)
          setCorrect(false)
          setShake(true)
          setTimeout(() => setShake(false), 500)
          playError()
          setState('feedback')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return stopTimer
  }, [state, qIndex, stopTimer])

  const handleAnswer = useCallback((idx: number) => {
    if (state !== 'playing') return
    stopTimer()
    const q = qList[qIndex]
    const isCorrect = idx === q.answer
    setSelected(idx)
    setCorrect(isCorrect)
    setPopIdx(idx)
    setTimeout(() => setPopIdx(null), 400)

    if (isCorrect) {
      playSuccess()
      setScore(s => s + Math.max(10, timeLeft * 2))
    } else {
      playError()
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setLives(l => l - 1)
    }
    setState('feedback')
  }, [state, qList, qIndex, timeLeft, stopTimer])

  const handleNext = useCallback(() => {
    const nextLives = correct ? lives : lives - 1 < 0 ? 0 : lives
    if (!correct && nextLives <= 0) { setState('done'); return }
    if (qIndex + 1 >= TOTAL_Q) { setState('done'); return }
    setQIndex(i => i + 1)
    setSelected(null)
    setTimeLeft(TIME_PER_Q)
    setState('playing')
  }, [correct, lives, qIndex])

  // feedback 후 자동 넘기기
  useEffect(() => {
    if (state !== 'feedback') return
    const actualLives = correct ? lives : lives - 1
    const t = setTimeout(() => {
      if (!correct && actualLives <= 0) { setState('done'); return }
      if (qIndex + 1 >= TOTAL_Q) { setState('done'); return }
      setQIndex(i => i + 1)
      setSelected(null)
      setTimeLeft(TIME_PER_Q)
      setState('playing')
    }, 1400)
    return () => clearTimeout(t)
  }, [state]) // eslint-disable-line

  // 키보드 1~4
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (state !== 'playing') return
      if (['1','2','3','4'].includes(e.key)) handleAnswer(Number(e.key) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, handleAnswer])

  const q = qList[qIndex]
  const displayLives = state === 'feedback' && !correct ? lives - 1 : lives

  // ── 시작 화면 ──
  if (state === 'idle') {
    return (
      <Layout title="단축키 퀴즈" onBack={onBack}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 20px' }}>
          <div style={{ fontSize:56, marginBottom:12 }}>⌨️</div>
          <div style={{ fontSize:22, fontWeight:900, color:'#333', marginBottom:8 }}>단축키 퀴즈</div>
          <div style={{ fontSize:14, color:'#888', marginBottom:8, textAlign:'center' }}>
            자주 쓰는 단축키를 얼마나 알고 있나요?
          </div>
          <div style={{ fontSize:12, color:'#AAA', marginBottom:32, textAlign:'center' }}>
            {TOTAL_Q}문제 · 하트 3개 · 키보드 1~4로도 선택 가능
          </div>
          <Button onClick={startGame} size="lg">시작하기 🚀</Button>
        </div>
      </Layout>
    )
  }

  // ── 결과 화면 ──
  if (state === 'done') {
    const pct = Math.round((score / (TOTAL_Q * TIME_PER_Q * 2)) * 100)
    const grade = score >= 160 ? { text:'🏆 완벽해요!', color:'#FFD700' }
                : score >= 100 ? { text:'🌟 잘했어요!', color:'#4D72FB' }
                : score >= 60  ? { text:'👍 좋아요!',   color:'#27AE60' }
                : { text:'💪 더 연습해요!', color:'#E8731A' }
    return (
      <Layout title="단축키 퀴즈" onBack={onBack}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 20px' }}>
          <div style={{ fontSize:52, marginBottom:12 }}>{score >= 100 ? '🎉' : '😅'}</div>
          <div style={{ fontSize:26, fontWeight:900, color:grade.color, marginBottom:6 }}>{grade.text}</div>
          <div style={{ fontSize:48, fontWeight:900, color:'#333', marginBottom:4 }}>{score}<span style={{fontSize:18,color:'#999'}}>점</span></div>
          <div style={{
            background:'#F0F4FF', borderRadius:16, padding:'16px 32px',
            marginTop:12, marginBottom:28, textAlign:'center',
          }}>
            <div style={{ fontSize:13, color:'#888', marginBottom:4 }}>맞힌 문제</div>
            <div style={{ fontSize:28, fontWeight:900, color:'#4D72FB' }}>{Math.floor(score/20)} / {TOTAL_Q}</div>
          </div>
          <div style={{ display:'flex', gap:12 }}>
            <Button onClick={startGame} size="lg">다시 하기</Button>
          </div>
        </div>
      </Layout>
    )
  }

  // ── 게임 화면 ──
  const timerPct = (timeLeft / TIME_PER_Q) * 100
  const timerColor = timeLeft > 7 ? '#27AE60' : timeLeft > 4 ? '#E8731A' : '#CC0000'

  return (
    <Layout title="단축키 퀴즈" onBack={onBack}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 16px 32px', maxWidth:480, margin:'0 auto', width:'100%' }}>

        {/* HUD 상단 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', marginBottom:10 }}>
          <div style={{ display:'flex', gap:4, fontSize:20 }}>
            {Array.from({length:3}).map((_,i) => (
              <span key={i} style={{ opacity: i < displayLives ? 1 : 0.2, transition:'opacity 0.3s' }}>❤️</span>
            ))}
          </div>
          <div style={{
            background:'#F0F4FF', borderRadius:20, padding:'4px 14px',
            fontWeight:900, fontSize:14, color:'#4D72FB',
          }}>
            {qIndex+1} / {TOTAL_Q}
          </div>
          <div style={{ fontWeight:900, fontSize:16, color:'#333' }}>
            {score}<span style={{fontSize:12,color:'#999',fontWeight:600}}>점</span>
          </div>
        </div>

        {/* 타이머 바 */}
        <div style={{ width:'100%', height:8, background:'#EEE', borderRadius:8, marginBottom:16, overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:8,
            width:`${timerPct}%`,
            background:timerColor,
            transition:'width 1s linear, background 0.3s',
          }}/>
        </div>

        {/* 질문 카드 */}
        <div style={{
          width:'100%',
          background:'linear-gradient(135deg, #4D72FB 0%, #7B8FFC 100%)',
          borderRadius:24,
          padding:'24px 20px',
          marginBottom:16,
          boxShadow:'0 8px 24px rgba(77,114,251,0.3)',
          textAlign:'center',
          animation: shake ? 'shake 0.4s ease-out' : 'none',
        }}>
          <div style={{ fontSize:40, marginBottom:8 }}>{q?.emoji}</div>
          <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-0.3px', lineHeight:1.3 }}>
            {q?.question}
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', marginTop:6 }}>
            ⏱ {timeLeft}초
          </div>
        </div>

        {/* 선택지 버튼 2×2 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, width:'100%' }}>
          {q?.choices.map((choice, i) => {
            const col = CHOICE_COLORS[i]
            const isSelected = selected !== null && i === selected
            const isAnswer   = selected !== null && i === q.answer
            const isPop      = popIdx === i

            let bg = col.light
            let border = col.border
            let textColor = col.bg
            let scale = 1

            if (state === 'feedback') {
              if (isAnswer) { bg = col.bg; textColor = '#fff'; border = col.border }
              else if (isSelected && !correct) { bg = '#FFEEEE'; textColor = '#CC0000'; border = '#CC0000' }
            }
            if (isPop) scale = 0.93

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={state !== 'playing'}
                style={{
                  padding:'0',
                  background: bg,
                  border: `2.5px solid ${border}`,
                  borderRadius:18,
                  cursor: state === 'playing' ? 'pointer' : 'default',
                  textAlign:'center',
                  transition:'transform 0.12s, background 0.2s, border-color 0.2s',
                  transform: `scale(${scale})`,
                  boxShadow: state === 'playing' ? `0 4px 16px ${col.bg}44` : 'none',
                  overflow:'hidden',
                }}
              >
                <div style={{
                  padding:'16px 8px',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                }}>
                  <div style={{
                    fontSize:10, fontWeight:700, color: textColor, opacity:0.7,
                    letterSpacing:'0.5px',
                  }}>
                    {i+1}번
                  </div>
                  <div style={{
                    fontSize:20, fontWeight:900,
                    color: textColor,
                    fontFamily:'monospace',
                    letterSpacing:'-0.5px',
                  }}>
                    {choice}
                  </div>
                  {state === 'feedback' && isAnswer && (
                    <div style={{ fontSize:16 }}>✓</div>
                  )}
                  {state === 'feedback' && isSelected && !correct && i === selected && (
                    <div style={{ fontSize:16 }}>✗</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* 피드백 메시지 */}
        {state === 'feedback' && (
          <div style={{
            marginTop:16, padding:'12px 24px',
            background: correct ? '#D5F5E3' : '#FFEEEE',
            border: `2px solid ${correct ? '#27AE60' : '#CC0000'}`,
            borderRadius:14,
            textAlign:'center',
            width:'100%',
            boxSizing:'border-box',
          }}>
            <div style={{ fontSize:18, fontWeight:900, color: correct ? '#1E8449' : '#CC0000' }}>
              {correct ? '🎉 정답이에요!' : selected === -1 ? '⏰ 시간 초과!' : '😅 틀렸어요!'}
            </div>
            {!correct && (
              <div style={{ fontSize:13, color:'#555', marginTop:4 }}>
                정답은 <strong style={{color:'#4D72FB'}}>{q?.choices[q.answer]}</strong> 이에요
              </div>
            )}
          </div>
        )}

        {/* 키 안내 */}
        <div style={{ marginTop:14, color:'#BBB', fontSize:11, textAlign:'center' }}>
          키보드 1 · 2 · 3 · 4 로도 선택할 수 있어요
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-5px)}
          80%{transform:translateX(5px)}
        }
      `}</style>
    </Layout>
  )
}
