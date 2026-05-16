import { activities, ActivityId } from '../data/activities'
import ActivityCard from '../components/ActivityCard'
import SlotMachine from '../components/SlotMachine'

interface Props { onSelect: (id: ActivityId) => void }

export default function Home({ onSelect }: Props) {
  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Header */}
      <header style={{ background: '#4D72FB', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="slice/slice5.png" alt="" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>놀이터</span>
        </div>
      </header>

      {/* Hero */}
      <div style={{ background: '#4D72FB', paddingBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 20 }}>
        <SlotMachine width={440} />
        <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.2px' }}>어떤 놀이를 할까요?</p>
      </div>

      {/* Wave */}
      <div style={{ background: '#fff' }}>
        <svg viewBox="0 0 480 28" width="100%" style={{ display: 'block', marginTop: -1 }}>
          <path d="M0 28 Q120 0 240 18 Q360 36 480 8 L480 0 L0 0 Z" fill="#4D72FB" />
        </svg>
      </div>

      {/* 4×3 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '12px 20px 40px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        {activities.map((act, i) => (
          <ActivityCard key={act.id} activity={act} onSelect={id => onSelect(id as ActivityId)} delay={i * 45} />
        ))}
      </div>
    </div>
  )
}
