// src/main.ts
import * as THREE from 'three';
import { initializeAR } from './ar-setup';
import { launchFirework, launchPeonyFirework, updateFireworks } from './fireworks';

// 1. Three.jsシーンの初期化
const scene = new THREE.Scene();
const camera = new THREE.Camera(); // AR.jsがカメラを制御
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true, // AR表示のために背景を透過
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('ar-canvas-container')?.appendChild(renderer.domElement);

// 2. ARの初期化
const { arToolkitSource, arToolkitContext, markerRoot } = initializeAR(scene, camera, renderer);

// 3. 花火打ち上げロジック
let lastLaunchTime = 0;
const launchInterval = 5000; // 5秒ごとに花火 (ミリ秒)

// マーカーがなくても花火を表示するため、常に表示状態にする
scene.visible = true;

// 4. アニメーションループ
function animate(time: number) {
  requestAnimationFrame(animate);
  
  // マーカーの有無に関わらず花火を打ち上げる
  if (Date.now() - lastLaunchTime > launchInterval / 2) {
    // launchFirework(scene, markerRoot);
    launchPeonyFirework(scene, markerRoot); // 牡丹花火を打ち上げ
    console.log('Firework launched!');
    lastLaunchTime = Date.now();
  }
  updateFireworks(scene); // 花火のアニメーション更新
  
  renderer.render(scene, camera);
}
animate(0);

// 5. ウィンドウリサイズ対応
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (arToolkitSource) {
    arToolkitSource.onResizeElement();
    arToolkitSource.copyElementSizeTo(renderer.domElement);
    if (arToolkitContext.arController !== null) {
      arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
      if (arToolkitContext.arController.cameraParam) {
        arToolkitContext.arController.cameraParam.resize(window.innerWidth, window.innerHeight);
      }
    }
  }
  if (arToolkitContext) { // リサイズ時にカメラのprojectionMatrixも更新
    camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
  }
});