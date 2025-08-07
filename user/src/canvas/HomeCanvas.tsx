import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { 
  Suspense,
  useEffect,
  useMemo,
} from 'react'
import { 
  Canvas,
  useThree,
} from '@react-three/fiber'
import { initializeAR } from '../lib/ar-setup';
import * as THREE from 'three';
import HomeScene from '../scenes/HomeScene';
import type { IllustrationFireworksType } from '../types/illustrationFireworksType';
import { useDeviceMotionCamera } from './hooks/useDeviceMotionCamera';

interface HomeCanvasProps {
  illustrationFireworks: IllustrationFireworksType | null; // イラスト花火のデータ
}

// ===== HomeCanvas =====
// Three.jsの「土台構成」を行う
// - カメラ
// - ライト
// - レンダラー（マルチレンダーやポストプロセス）
// - orbit controls などの操作系
// - MediaPipe連携（Webカメラ映像→Three.jsへ）
export default function HomeCanvas({ illustrationFireworks }: HomeCanvasProps) {
  console.log('HomeCanvas rendered');

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas 
        gl={{ alpha: true }}                  // 背景を透明にするためにalphaをtrueに設定
        style={{ background: 'transparent' }} // 背景を透明に設定
        // camera={{ position: [0, 0, 30], fov: 50 }} // カメラの初期位置と視野角を設定
      >
        <Suspense fallback={null}>
          <CanvasSetup />
          {illustrationFireworks && (
            <HomeScene
              illustrationFireworks={illustrationFireworks} // イラスト花火のデータを渡す
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  )
}

// Canvasの初期設定(useThreeはcanvas内でのみ使用可能なため切り分けている)
const CanvasSetup = () => {
  // THREE.Scene, THREE.Camera, THREE.WebGLRendererを取得
  const { scene, camera, gl } = useThree();
  
  // ARの初期化（video要素を受け取る）
  const arData = useMemo(() => {
    return initializeAR(scene, camera, gl);
  }, [scene, camera, gl]);
  const { arToolkitSource, arToolkitContext, markerRoot, videoElement, videoTexture } = arData;
  
  console.log('ARToolkitSource:', arToolkitSource);
  
  // カメラの位置を設定
  useEffect(() => {
    camera.position.set(0, 0, 30);
  }, [camera]);
  
  // デバイスの回転を検知してカメラを動かすフックを使用
  useDeviceMotionCamera(0.7);

  // 色空間とトーンマッピングの設定
  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace; // 色空間をsRGBに設定
    gl.toneMapping = THREE.ACESFilmicToneMapping; // トーンマッピングをACESToneMappingに設定(くっきりした色合いになる)
    gl.toneMappingExposure = 1; // ブルームが映えるように露出を調整(ブルームの強さを調整)
  }, [gl]);

  return (
    <>
      {/* ポイントライト */}
      <pointLight
        position={[10, 10, 10]} // 光源の位置
        intensity={2}           // 光の強さ
        distance={50}           // 光の届く距離
        decay={1}               // 光の減衰率
        color="white"           // 光の色
        // castShadow           // 影を落とす
      />
      
      {/* 環境光 */}
      {/* <ambientLight
        intensity={10} // 環境光の強さ
        color="white"  // 環境光の色
      /> */}

      {/* Unreal Bloom */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}    // ブルームがかかる明るさの閾値 (調整: 低いほど光る)
          luminanceSmoothing={0.2}    // ブルームのスムージング(調整: 1.0で滑らか)
          intensity={0.6}             // bloomの強さ
          width={window.innerWidth}    // ブルームの幅
          height={window.innerHeight}  // ブルームの高さ
          mipmapBlur={true}            // ミップマップを使用してブルームを適用
          resolutionScale={1.5}        // 解像度を上げる（デフォルト1）
        />
      </EffectComposer>
    </>
  )
}