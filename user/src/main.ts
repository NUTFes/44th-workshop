// src/main.ts
import * as THREE from 'three';
import { initializeAR } from './ar-setup';
import { launchFirework, launchPeonyFirework, updateFireworks } from './fireworks';
import { initializeComposer } from './composer-setup';

// 1. Three.jsシーンの初期化
const scene = new THREE.Scene();
const camera = new THREE.Camera(); // AR.jsがカメラを制御
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true, // AR表示のために背景を透過
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; // 色空間をsRGBに設定
renderer.toneMapping = THREE.ACESFilmicToneMapping; // トーンマッピングをACESToneMappingに設定(くっきりした色合いになる)
renderer.toneMappingExposure = 1.2; // ブルームが映えるように露出を調整(ブルームの強さを調整)
// renderer.autoClear = false; // 手動でクリアするため自動クリアを無効に
document.getElementById('ar-canvas-container')?.appendChild(renderer.domElement); // HTMLの要素にcanvasを追加

const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); // 環境光（少しだけ追加）
scene.add(ambientLight);

// 2. ARの初期化
const { arToolkitSource, arToolkitContext, markerRoot, videoTexture } = initializeAR(scene, camera, renderer);

// 3. コンポーザーの初期化(ポストプロセッシングの適用)
const composer = initializeComposer(scene, camera, renderer, videoTexture);

// 4. 花火打ち上げロジック
let lastLaunchTime = 0;
const launchInterval = 5000; // 5秒ごとに花火 (ミリ秒)
// const textureLoader = new THREE.TextureLoader();

// 5. アニメーションループ
function animate(time: number) {
  requestAnimationFrame(animate);
  
  // マーカーの有無に関わらず花火を打ち上げる
  if (Date.now() - lastLaunchTime > launchInterval / 2) {
    // launchFirework(scene, markerRoot);
    launchPeonyFirework(scene, markerRoot); // 牡丹花火を打ち上げ
    console.log('Firework launched!');
    lastLaunchTime = Date.now();
  }
  
  // マーカーの有無に関わらず花火を打ち上げる
  if (Date.now() - lastLaunchTime > launchInterval / 3) {
    launchPeonyFirework(scene, markerRoot); // 牡丹花火を打ち上げ
    console.log('Firework launched!');
    lastLaunchTime = Date.now();
  }
  
  updateFireworks(scene); // 花火のアニメーション更新
  
  // renderer.clear(); // 画面をクリア
  // renderer.render(scene, camera);
  composer.render(); // ポストプロセッシングを適用してレンダリング
}
animate(0);

// 6. ウィンドウリサイズ対応
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (arToolkitSource) {
    arToolkitSource.onResizeElement();
    arToolkitSource.copyElementSizeTo(renderer.domElement);
    if (arToolkitContext.arController !== null) { // AR.jsのコントローラが存在する場合
      arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
      if (arToolkitContext.arController.cameraParam) {  // カメラパラメータが存在する場合
        arToolkitContext.arController.cameraParam.resize(window.innerWidth, window.innerHeight);
      }
    }
  }
  if (arToolkitContext) { // リサイズ時にカメラのprojectionMatrixも更新
    camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
  }
});