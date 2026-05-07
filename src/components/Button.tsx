import { CSSProperties, ReactNode } from 'react'

interface Props {
  onClick: () => void
  children: ReactNode
  color?: string
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  style?: CSSProperties
}

export default function Button({
  onClick, children,
  color = '#4D72FB',
  variant = 'solid',
  size = 'md',
  disabled,
  style,
}: Props) {
  const sizes: Record<string, CSSProperties> = {
    sm: { padding: '8px 20px',  fontSize: 13, borderRadius: 10 },
    md: { padding: '12px 28px', fontSize: 15, borderRadius: 14 },
    lg: { padding: '14px 36px', fontSize: 17, borderRadius: 16 },
  }

  const base: CSSProperties = {
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700,
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    letterSpacing: '-0.2px',
    transition: 'transform 0.14s ease, box-shadow 0.14s ease, opacity 0.14s ease',
    opacity: disabled ? 0.45 : 1,
    ...sizes[size],
    ...style,
  }

  const vars: Record<string, CSSProperties> = {
    solid: {
      background: color,
      color: '#fff',
      boxShadow: `0 3px 0 ${darken(color, 40)}, 0 4px 16px ${color}55`,
    },
    outline: {
      background: 'transparent',
      color: color,
      border: `2px solid ${color}`,
    },
    ghost: {
      background: 'transparent',
      color: color,
    },
  }

  return (
    <button
      style={{ ...base, ...vars[variant] }}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
      onMouseDown={e =>  { if (!disabled) (e.currentTarget as HTMLElement).style.transform = 'translateY(2px)' }}
      onMouseUp={e =>    { if (!disabled) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
    >
      {children}
    </button>
  )
}

function darken(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const n = parseInt(h, 16)
  const r = Math.min(255, Math.max(0, (n >> 16) - amount))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) - amount))
  const b = Math.min(255, Math.max(0, (n & 0xff) - amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
