import { CSSProperties, useState } from 'react'
import { ActivityInfo } from '../data/activities'

interface Props {
  activity: ActivityInfo
  onSelect: (id: string) => void
  delay?: number
}

export default function ActivityCard({ activity, onSelect, delay = 0 }: Props) {
  const [hovered, setHovered] = useState(false)

  const cardStyle: CSSProperties = {
    background: activity.bg,
    borderRadius: 28,
    padding: '0 0 16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
    animation: `pop 0.4s cubic-bezier(.34,1.56,.64,1) ${delay}ms both`,
    transform: hovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
    boxShadow: hovered
      ? `0 12px 32px ${activity.accent}44`
      : `0 2px 10px ${activity.accent}22`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    overflow: 'hidden',
  }

  return (
    <div
      style={cardStyle}
      onClick={() => onSelect(activity.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => { setHovered(false); onSelect(activity.id) }}
    >
      {/* Character image — fixed 96×96 box, uniform across all cards */}
      <div style={{
        width: '100%',
        height: 112,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img
          src={activity.image}
          alt={activity.title}
          style={{
            width: 96,
            height: 96,
            objectFit: 'contain',
            transform: hovered ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.25s ease',
            display: 'block',
          }}
        />
      </div>

      {/* Label */}
      <div style={{ textAlign: 'center', padding: '0 12px' }}>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: activity.accent,
          lineHeight: 1.3,
          letterSpacing: '-0.3px',
        }}>
          {activity.title}
        </div>
        <div style={{
          fontSize: 12,
          fontWeight: 500,
          color: '#888',
          marginTop: 2,
          letterSpacing: '-0.1px',
        }}>
          {activity.tagline}
        </div>
      </div>
    </div>
  )
}
