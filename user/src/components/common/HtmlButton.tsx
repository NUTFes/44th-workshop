import { Html } from '@react-three/drei'

export default function HtmlButton({ onClick }: { onClick: () => void }) {
  return (
    <Html position={[0, -5, 0]}>
      <button
        onClick={onClick}
        style={{
          padding: '8px 16px',
          background: '#0af',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Click Me
      </button>
    </Html>
  )
}
