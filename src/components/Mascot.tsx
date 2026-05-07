interface Props {
  size?: number
  animate?: boolean
  image?: string   // slice image path — defaults to 파랑이
}

// Uses a slice character image as the app mascot
export default function Mascot({ size = 60, animate = false, image = 'slice/slice5.png' }: Props) {
  return (
    <img
      src={image}
      alt="캐릭터"
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
        animation: animate ? 'float 3s ease-in-out infinite' : undefined,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  )
}
