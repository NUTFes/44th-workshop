import { useState } from 'react'
import * as THREE from 'three';
import HtmlButton from '../components/common/HtmlButton';
import IllustrationFireworks from '../components/fireworks/Illustration/IllustrationFireworks';
import type { IllustrationFireworksType } from '../types/illustrationFireworksType';

interface HomeSceneProps {
  illustrationFireworks: IllustrationFireworksType; // イラスト花火のデータ
}

// ===== HomeSceneコンポーネント =====
// Three.js空間の「中身（オブジェクト）」を構成する
// HTMLボタンはpageに置くべきだが、面倒なのでここに置く
export default function HomeScene({ illustrationFireworks }: HomeSceneProps) {
  const explodingHeight = 10;     // 花火の打ち上げ高さ
  const explosionRadius = 1;      // 花火の爆発半径
  const explosionColor = 'Yellow';  // 花火の色
  
  // 花火の打ち上げ位置を管理する状態(この配列の長さ分、花火が打ち上がる)
  const [fireworks, setFireworks] = useState<{ id: string; position: THREE.Vector3 }[]>([])
  console.log('Fireworks:', fireworks)
  
  // ボタンをクリックしたときに花火を発射する関数
  const handleLaunch = () => {
    // 一意のIDを生成
    const id = crypto.randomUUID()
    // 花火の打ち上げ位置をランダムに決定
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      -10,
      (Math.random() - 0.5) * 10
    )
    // 花火の打ち上げ座標を配列に格納(この配列の長さ分、花火が打ち上がる)
    setFireworks((prev) => [...prev, { id, position }])
  }
  
  // 花火が終了したときの処理
  const onFinished = (id: string) => {
    // 終了した花火を配列から削除
    setFireworks((prev) => prev.filter(fw => fw.id !== id))
    console.log('Firework finished:', id)
  }
  
  return (
    <>
      {fireworks.map((fw) => (
        <IllustrationFireworks
          key={fw.id}
          from={fw.position}  // 花火の打ち上げの始点
          to={new THREE.Vector3(fw.position.x, fw.position.y + explodingHeight, fw.position.z)} // 花火の打ち上げの終点
          color={explosionColor}        // 花火の色を指定
          size={explosionRadius}        // 花火のサイズを指定
          data={illustrationFireworks.pixelData}  // 花火のデータを指定
          onComplete={() => onFinished(fw.id)}    // 花火が終了したときのコールバック
        />
      ))}
      <HtmlButton onClick={handleLaunch} />
    </>
  )
}
