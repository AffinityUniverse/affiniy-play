import { CSSProperties, ReactNode } from 'react'

interface Props {
  children: ReactNode
  title?: string
  onBack?: () => void
  headerColor?: string   // defaults to white
  showBorder?: boolean
}

export default function Layout({
  children,
  title,
  onBack,
  headerColor = '#fff',
  showBorder = true,
}: Props) {
  const headerStyle: CSSProperties = {
    background: headerColor,
    borderBottom: showBorder ? '1px solid #E8ECF4' : 'none',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    height: 60,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={headerStyle}>
        {/* Back button */}
        <div style={{ width: 40, flexShrink: 0 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 10,
                color: '#4D72FB',
                fontSize: 22,
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#EEF3FF')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              ←
            </button>
          )}
        </div>

        {/* Title */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          {title && (
            <span style={{
              fontSize: 17,
              fontWeight: 700,
              color: '#1A1A2E',
              letterSpacing: '-0.3px',
            }}>
              {title}
            </span>
          )}
        </div>

        {/* Right placeholder for balance */}
        <div style={{ width: 40 }} />
      </header>

      {/* Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
