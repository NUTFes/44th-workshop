import { useRef, useState, useEffect, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FireworkLayerProps {
  position: THREE.Vector3 // 花火の爆発の中心位置
  color?: THREE.ColorRepresentation // 花火の色
  velocityMultiplier?: number // 速度の倍率
}

// 牡丹花火
const PeonyTrailLayer = memo(function PeonyTrailLayer({ position, color, velocityMultiplier }: FireworkLayerProps) {  
  // 重力の強さ
  const gravity = 0.05
  // パチパチの位置をランダムにずらす範囲
  const randomRange = 0.01
  
  // 星のパーティクルを描画するための参照
  const starPointsRef = useRef<THREE.Points>(null)
  // const currentStarPosition = useRef(new THREE.Vector3(position.x, position.y, position.z)) // 現在の位置を保持する変数
  const segments = 20 // 分割数（粒子の数を決定するためのパラメータ）
  const starParticleCount = segments * segments // 粒子の総数（分割数の二乗）
  const starPositions = useRef(new Float32Array(3 * starParticleCount)) // パーティクルの位置を格納する配列
  // const starVelocities = useRef(new Float32Array(3 * starParticleCount)) // パーティクルの速度を格納する配列
  const starVelocities = useRef<THREE.Vector3[]>([]) // パーティクルの速度を格納する配列
  const starLifespan = useRef(200) // パーティクルの寿命
  // const starOpacity = useRef(0) // パーティクルの不透明度

  // トレイルのパーティクルを描画するための参照
  const trailPointsRef = useRef<THREE.Points>(null)
  // const currentTrailPosition = useRef(new THREE.Vector3(position.x, position.y, position.z)) // 現在の位置を保持する変数
  const maxTrailLength = 15000    // トレイルの最大長さ
  const trailParticleCount = 1 // トレイルのパチパチのパーティクル数
  const trailPositions = useRef(new Float32Array(3 * trailParticleCount * maxTrailLength)) // パーティクルの位置を格納する配列
  const trailLifespan = useRef(200) // パーティクルの寿命
  // const trailOpacity = useRef(0) // パーティクルの不透明度

  // マウント時の処理とアンマウント時の処理
  useEffect(() => {
    // ====== マウント時の処理 ======
    // 星のパーティクルのジオメトリを初期化
    const starGeometry = new THREE.BufferGeometry()
    starGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(starPositions.current, 3)
      .setUsage(THREE.DynamicDrawUsage) // 動的に更新するための設定
    )
    // トレイルのパーティクルのジオメトリを初期化
    const trailGeometry = new THREE.BufferGeometry()
    trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(trailPositions.current, 3)
      .setUsage(THREE.DynamicDrawUsage) // 動的に更新するための設定
    )
    // ポイントのジオメトリを設定
    starPointsRef.current!.geometry = starGeometry
    trailPointsRef.current!.geometry = trailGeometry
    
    // 星のパーティクルの初期化
    for (let i = 0, theta = 0; theta < 2 * Math.PI; theta += 2 * Math.PI / segments) {
      for (let phi = 0; phi < 2 * Math.PI; phi += 2 * Math.PI / segments) {
        // 初期座標
        starPositions.current[i * 3 + 0] = position.x
        starPositions.current[i * 3 + 1] = position.y
        starPositions.current[i * 3 + 2] = position.z
        // 速度ベクトル
        starVelocities.current[i] = new THREE.Vector3(
          Math.sin(theta) * Math.cos(phi),
          Math.cos(theta),
          Math.sin(theta) * Math.sin(phi)
        ).multiplyScalar(0.3) // 速度を設定
        i++
      }
    }
    
    // トレイルのパーティクルの初期化
    for (let j = 0; j < trailParticleCount * maxTrailLength; j++) {
      // トレイルの位置をposition.x, position.y, position.zで初期化
      trailPositions.current[j * 3 + 0] = position.x
      trailPositions.current[j * 3 + 1] = position.y
      trailPositions.current[j * 3 + 2] = position.z
    }

    // ====== アンマウント時の処理 ======
    return () => {
      // コンポーネントがアンマウントされたときの処理
      if (starPointsRef.current) {
        // ジオメトリを解放
        starPointsRef.current.geometry.dispose()
        // マテリアルも解放
        if (Array.isArray(starPointsRef.current.material)) {
          starPointsRef.current.material.forEach((mat) => mat.dispose())
        } else {
          starPointsRef.current.material.dispose()
        }
      }
      if (trailPointsRef.current) {
        // ジオメトリを解放
        trailPointsRef.current.geometry.dispose()
        // マテリアルも解放
        if (Array.isArray(trailPointsRef.current.material)) {
          trailPointsRef.current.material.forEach((mat) => mat.dispose())
        } else {
          trailPointsRef.current.material.dispose()
        }
      }
      // onComplete() // 親コンポーネントに完了を通知
    }
  }, [])
  
  let count = 0

  // フレームごとの更新
  useFrame(() => {
    if (!starPointsRef.current || !trailPointsRef.current) return // 存在しなければ何もしない

    // 各星のパーティクルの位置を更新
    for (let i = 0; i < starParticleCount; i++) {
      if (!starVelocities.current[i]) continue // 安全性チェック

      // 速度を計算
      const vx = starVelocities.current[i].x * (velocityMultiplier || 1)
      const vy = starVelocities.current[i].y * (velocityMultiplier || 1) - gravity // 重力を適用
      const vz = starVelocities.current[i].z * (velocityMultiplier || 1)
      
      if (starLifespan.current <= 200) {
        // 寿命少なくなったら速度を減衰していく
        starVelocities.current[i].multiplyScalar(0.98)
      }
      
      // 位置を更新
      starPositions.current[i * 3 + 0] += vx
      starPositions.current[i * 3 + 1] += vy
      starPositions.current[i * 3 + 2] += vz
      
      if(count % 2 === 0) {
        // 軌跡を追加
        for (let j = 0; j < trailParticleCount; j++) {
          trailPositions.current.copyWithin(0, 3) // 先頭の3つの要素を削除
          const lastIndex = (maxTrailLength * trailParticleCount - 1) * 3
          trailPositions.current[lastIndex] = starPositions.current[i * 3 + 0] + gaussianRandom() * randomRange
          trailPositions.current[lastIndex + 1] = starPositions.current[i * 3 + 1] + gaussianRandom() * randomRange
          trailPositions.current[lastIndex + 2] = starPositions.current[i * 3 + 2] + gaussianRandom() * randomRange
        }
      }
    }
    
    // if (starLifespan.current <= 200) {
    //   // 寿命少なくなったら透明度を減少していく
    //   const material = starPointsRef.current.material as THREE.PointsMaterial
    //   // starOpacity.current = Math.max(0, starOpacity.current - 0.01)
    //   // material.opacity = starOpacity.current
    //   material.opacity = Math.max(0, material.opacity - 0.005) // 透明度を減少
    // }
    
    // 最後のパチパチ
    if(count % 2 === 0) {
      if (starLifespan.current <= -50) {
        // 寿命少なくなったら透明度を減少していく
        const material = starPointsRef.current.material as THREE.PointsMaterial
        material.visible = !material.visible // 可視性を反転
        material.opacity > 0 ? (material.opacity -= 0.03) : (material.visible = false) // 透明度を反転
        material.size = 0.2 // サイズを大きくする
        material.color = new THREE.Color('white') // 色を白にする
      }
    }
    if (trailLifespan.current <= 200) {
      // 寿命少なくなったら透明度を減少していく
      const material = trailPointsRef.current.material as THREE.PointsMaterial
      material.opacity = Math.max(0, material.opacity - 0.005) // 透明度を減少
    }
    
    // 寿命を減少
    starLifespan.current -= 2
    trailLifespan.current -= 2
    
    // 更新を反映
    const starPosAttr = starPointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    starPosAttr.needsUpdate = true
    const trailPosAttr = trailPointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    trailPosAttr.needsUpdate = true
    
    count++
  })

  return (
    <>
      <points ref={starPointsRef}>
        <bufferGeometry />
        <pointsMaterial
          size={0.5}
          // color={color || 'white'}
          color={'white'}
          vertexColors={false}
          depthWrite={false}
          // opacity={starOpacity.current}
          transparent={true}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points ref={trailPointsRef}>
        <bufferGeometry />
        <pointsMaterial
          size={0.5}
          color={color || 'white'}
          vertexColors={false}
          // opacity={trailOpacity.current}
          transparent={true}
          // depthWrite={false}
          depthWrite={false} // 深度書き込みを無効化(トレイルが重なっても消えないように)
          // sizeAttenuation={true} // サイズの減衰を有効化(トレイルのサイズがカメラからの距離に応じて変化)
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  )
})

// 平均 `mean`、標準偏差 `stdDev` の正規分布に従う乱数を返す
function gaussianRandom(mean = 0, stdDev = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // 0を除く
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}


export default PeonyTrailLayer