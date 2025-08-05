import { 
  useState, 
  forwardRef, 
  useImperativeHandle, 
} from 'react'
import * as THREE from 'three';
import PeonyFireworks from '../components/fireworks/PeonyFireworks/PeonyFireworks';



// コンポーネントの外部から呼び出せる関数を定義
export type DetectorSceneHandle = {
  handleLaunch: (jumpPosition: number | null) => void; // 花火を打ち上げる関数
}

// ===== DetectorSceneコンポーネント =====
// Three.js空間の「中身（オブジェクト）」を構成する
// HTMLボタンはpageに置くべきだが、面倒なのでここに置く
const DetectorScene = forwardRef<DetectorSceneHandle>((_, ref) => {
  const explodingHeight = 10;     // 花火の打ち上げ高さ
  const explosionRadius = 1;      // 花火の爆発半径
  const explosionColor = 'blue';  // 花火の色
  
  // 花火の打ち上げ位置を管理する状態(この配列の長さ分、花火が打ち上がる)
  const [fireworks, setFireworks] = useState<{ id: string; position: THREE.Vector3 }[]>([])
  console.log('Fireworks:', fireworks)
  
  
  // コンポーネントの外部から呼び出せる関数を定義
  useImperativeHandle(ref, () => ({
    handleLaunch,
  }));
  
  
  // ボタンをクリックしたときに花火を発射する関数
  const handleLaunch = (jumpPosition: number | null) => {
    // 一意のIDを生成
    const id = crypto.randomUUID()
    
    // 花火の打ち上げ位置を決定
    const position = new THREE.Vector3(
      jumpPosition ?? 0, // ジャンプ位置が指定されていればそれを使用
      -10,
      0
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
        <PeonyFireworks
          key={fw.id}
          from={fw.position}  // 花火の打ち上げの始点
          to={new THREE.Vector3(fw.position.x, fw.position.y + explodingHeight, fw.position.z)} // 花火の打ち上げの終点
          color={explosionColor}        // 花火の色を指定
          size={explosionRadius}        // 花火のサイズを指定
          onComplete={() => onFinished(fw.id)}    // 花火が終了したときのコールバック
        />
      ))}
    </>
  )
});

export default DetectorScene;