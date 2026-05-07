import { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import Button from '../components/Button'

interface Props { onBack: () => void }

interface Question {
  text: string
  options: string[]
  correct: number
  explanation: string
}

const ALL_QUESTIONS: Question[] = [
  {
    text: '다음 중 산세리프(Sans-serif) 폰트는?',
    options: ['Arial', 'Times New Roman', 'Georgia', 'Garamond'],
    correct: 0,
    explanation: 'Arial은 글자 끝에 장식이 없는 산세리프 폰트예요.',
  },
  {
    text: '다음 중 세리프(Serif) 폰트는?',
    options: ['Helvetica', 'Futura', 'Times New Roman', 'Gill Sans'],
    correct: 2,
    explanation: 'Times New Roman은 글자 끝에 작은 장식(세리프)이 있어요.',
  },
  {
    text: '가독성을 위한 본문 텍스트의 적절한 줄 간격은?',
    options: ['1.0배', '1.5배', '3.0배', '0.5배'],
    correct: 1,
    explanation: '본문 텍스트는 1.5배 줄 간격이 읽기 편해요.',
  },
  {
    text: '로고에 주로 사용하는 폰트 스타일은?',
    options: ['Display/Decorative', 'Monospace', 'Small Caps', 'Script만'],
    correct: 0,
    explanation: '로고에는 브랜드 개성을 표현하는 Display 폰트를 자주 사용해요.',
  },
  {
    text: '빨강과 노랑을 섞으면?',
    options: ['주황', '초록', '보라', '파랑'],
    correct: 0,
    explanation: '빨강 + 노랑 = 주황! 이런 색을 2차색이라고 해요.',
  },
  {
    text: '색상환에서 빨강의 보색(반대색)은?',
    options: ['주황', '초록', '청록', '보라'],
    correct: 2,
    explanation: '보색은 색상환의 정반대에 있는 색이에요. 빨강의 보색은 청록이에요.',
  },
  {
    text: '따뜻한 느낌을 주는 색은?',
    options: ['파랑', '초록', '빨강', '보라'],
    correct: 2,
    explanation: '빨강, 주황, 노랑은 따뜻한 색(난색)이에요.',
  },
  {
    text: '투명도(opacity)가 0이면?',
    options: ['완전 불투명', '반투명', '완전 투명', '검정'],
    correct: 2,
    explanation: 'opacity 0은 완전히 투명, 1은 완전히 불투명이에요.',
  },
  {
    text: '여백(margin/padding)의 역할은?',
    options: ['파일 크기 줄이기', '시각적 숨 공간 제공', '색상 변경', '폰트 굵기 조절'],
    correct: 1,
    explanation: '여백은 요소들이 숨쉴 공간을 만들어 디자인을 깔끔하게 해요.',
  },
  {
    text: '그리드 시스템을 사용하는 이유는?',
    options: ['색상 통일', '일관된 레이아웃 유지', '폰트 선택', '이미지 편집'],
    correct: 1,
    explanation: '그리드는 요소들을 정렬해 통일감 있는 레이아웃을 만들어요.',
  },
  {
    text: 'UI에서 CTA(Call to Action)란?',
    options: ['배경 이미지', '사용자 행동 유도 버튼', '헤더 텍스트', '아이콘'],
    correct: 1,
    explanation: "'지금 시작하기' 같은 사용자를 행동하게 만드는 요소가 CTA예요.",
  },
  {
    text: '반응형 디자인(Responsive Design)이란?',
    options: ['애니메이션 디자인', '화면 크기에 맞게 변하는 디자인', '3D 디자인', '프린트 디자인'],
    correct: 1,
    explanation: '반응형 디자인은 스마트폰, 태블릿, PC 모두에서 잘 보이게 해요.',
  },
  {
    text: "아이콘 디자인에서 '일관성'이 중요한 이유는?",
    options: ['더 빠른 로딩', '통일된 시각 경험 제공', '파일 크기 감소', '색상 절약'],
    correct: 1,
    explanation: '같은 스타일의 아이콘을 써야 디자인이 통일되고 전문적으로 보여요.',
  },
  {
    text: '픽셀(px)과 벡터(SVG)의 차이는?',
    options: ['픽셀은 확대해도 선명함', '벡터는 확대해도 선명함', '벡터는 사진에만 사용', '픽셀이 더 작은 파일'],
    correct: 1,
    explanation: 'SVG 같은 벡터는 아무리 확대해도 선명하게 유지돼요.',
  },
  {
    text: "디자인에서 '여백'을 영어로?",
    options: ['Margin', 'Border', 'Padding', '여백에는 두 가지 모두'],
    correct: 3,
    explanation: 'Margin은 바깥 여백, Padding은 안쪽 여백이에요. 둘 다 여백이에요!',
  },
]

const CHARS = [
  'slice/slice2.png',
  'slice/slice3.png',
  'slice/slice4.png',
  'slice/slice5.png',
  'slice/slice6.png',
  'slice/slice7.png',
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function DesignQuizGame({ onBack }: Props) {
  const questions = useMemo(() => shuffle(ALL_QUESTIONS).slice(0, 10), [])

  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const q = questions[qIndex]
  const answered = selected !== null

  function handleSelect(optIdx: number) {
    if (answered) return
    setSelected(optIdx)
    if (optIdx === q.correct) setScore(s => s + 1)
  }

  function handleNext() {
    if (qIndex + 1 >= questions.length) {
      setDone(true)
    } else {
      setQIndex(i => i + 1)
      setSelected(null)
    }
  }

  function handleRestart() {
    setQIndex(0)
    setSelected(null)
    setScore(0)
    setDone(false)
  }

  function getGrade(s: number) {
    if (s >= 9) return '🏆 디자인 천재!'
    if (s >= 7) return '🎨 훌륭해요!'
    if (s >= 5) return '👍 잘했어요!'
    return '📚 더 공부해봐요!'
  }

  function getCharImg(s: number) {
    const idx = Math.min(Math.floor((s / 10) * CHARS.length), CHARS.length - 1)
    return CHARS[idx]
  }

  const btnBase: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
    border: '2px solid #4D72FB',
    background: '#fff',
    color: '#222',
  }

  function optionStyle(optIdx: number): React.CSSProperties {
    if (!answered) {
      return { ...btnBase }
    }
    if (optIdx === q.correct) {
      return { ...btnBase, background: '#D5F5D5', borderColor: '#27AE60', color: '#1a6e1a' }
    }
    if (optIdx === selected) {
      return { ...btnBase, background: '#FFD5D5', borderColor: '#E74C3C', color: '#8b0000' }
    }
    return { ...btnBase, opacity: 0.5 }
  }

  if (done) {
    return (
      <Layout title="디자인 퀴즈" onBack={onBack}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <img src={getCharImg(score)} alt="" style={{ width: 100, height: 100, objectFit: 'contain' }} />
          <div style={{ fontSize: 32, fontWeight: 900, color: '#4D72FB', textAlign: 'center' }}>
            {score} / 10
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, textAlign: 'center' }}>{getGrade(score)}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Button onClick={handleRestart}>다시 도전!</Button>
            <Button onClick={onBack}>홈으로</Button>
          </div>
        </div>
      </Layout>
    )
  }

  const progress = ((qIndex) / questions.length) * 100

  return (
    <Layout title="디자인 퀴즈" onBack={onBack}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 8, background: '#EEE', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#4D72FB', borderRadius: 99, transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#4D72FB', minWidth: 40, textAlign: 'right' }}>
            {qIndex + 1} / {questions.length}
          </span>
        </div>

        {/* Score tracker */}
        <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#27AE60' }}>
          현재 점수: {score}점
        </div>

        {/* Question */}
        <div style={{
          background: '#F0F4FF',
          borderRadius: 18,
          padding: '18px 20px',
          fontSize: 17,
          fontWeight: 800,
          color: '#1a1a3e',
          lineHeight: 1.5,
          textAlign: 'center',
          minHeight: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {q.text}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              style={optionStyle(i)}
            >
              <span style={{ marginRight: 10, opacity: 0.6 }}>{['A', 'B', 'C', 'D'][i]}.</span>
              {opt}
              {answered && i === q.correct && <span style={{ float: 'right' }}>✓</span>}
              {answered && i === selected && i !== q.correct && <span style={{ float: 'right' }}>✗</span>}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {answered && (
          <div style={{
            borderRadius: 14,
            padding: '14px 16px',
            background: selected === q.correct ? '#D5F5D5' : '#FFD5D5',
            border: `2px solid ${selected === q.correct ? '#27AE60' : '#E74C3C'}`,
            fontSize: 14,
            fontWeight: 700,
            color: selected === q.correct ? '#1a6e1a' : '#8b0000',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{selected === q.correct ? '🎉' : '💡'}</span>
            <div>
              <div style={{ fontSize: 15, marginBottom: 4 }}>
                {selected === q.correct ? '정답이에요!' : '아쉬워요!'}
              </div>
              <div style={{ fontWeight: 500, color: 'inherit', opacity: 0.85 }}>{q.explanation}</div>
            </div>
          </div>
        )}

        {/* Next button */}
        {answered && (
          <Button onClick={handleNext} style={{ alignSelf: 'center', minWidth: 140 }}>
            {qIndex + 1 >= questions.length ? '결과 보기 →' : '다음 문제 →'}
          </Button>
        )}
      </div>
    </Layout>
  )
}
