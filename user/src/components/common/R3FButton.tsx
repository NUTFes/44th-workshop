import { useRef } from 'react'
// import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'

export default function R3FButton({ onClick }: { onClick: () => void }) {
  const meshRef = useRef<Mesh>(null!)

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, 0]}
      onClick={onClick}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'default'}
    >
      <boxGeometry args={[1, 5, 0.2]} />
      <meshStandardMaterial color="skyblue" />
    </mesh>
  )
}
