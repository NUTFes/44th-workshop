// src/main.ts
import * as THREE from 'three';
import { initializeAR } from './ar-setup';
import { launchFirework, launchPeonyFirework, updateFireworks } from './fireworks';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

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
renderer.autoClear = false; // 手動でクリアするため自動クリアを無効に
document.getElementById('ar-canvas-container')?.appendChild(renderer.domElement);

// 2. ARの初期化
const { arToolkitSource, arToolkitContext, markerRoot } = initializeAR(scene, camera, renderer);

// 2.1. ARカメラ映像のテクスチャ化
const videoElement = arToolkitSource.domElement as HTMLVideoElement;
const videoTexture = new THREE.VideoTexture(videoElement);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.format = THREE.RGBAFormat; // または RGBFormat

// --- ポストプロセッシング ---
const composer = new EffectComposer(renderer);

// 1. RenderPass: シーンをレンダリング
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 2. UnrealBloomPass: ブルーム効果
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8, // strength: ブルームの強さ (調整)
    0.5, // radius: ブルームの広がり (調整)
    0.1  // threshold: ブルームがかかる明るさの閾値 (調整: 低いほど光る)
);
composer.addPass(bloomPass);

// 3. OutputPass: 最終出力を画面に (トーンマッピングなどを適用)
const outputPass = new OutputPass();
composer.addPass(outputPass);

// 4. ShaderPass: ブルーム結果とARカメラ映像を加算合成
const finalCompositeShader = {
    uniforms: {
        tDiffuse: { value: null }, // Composerが設定
        tBackground: { value: videoTexture }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;    // Bloom Passの結果 (黒背景 + 光るCube + Bloom)
        uniform sampler2D tBackground; // ARカメラの映像
        varying vec2 vUv;

        void main() {
            vec4 bloomResult = texture2D(tDiffuse, vUv);
            vec4 background = texture2D(tBackground, vUv);

            // 加算合成: 背景色にブルーム結果のRGB値を加算する
            // clampで白飛びを抑える (0.0～1.0の範囲に収める)
            vec3 finalColor = clamp(background.rgb + bloomResult.rgb, 0.0, 1.0);

            // 最終出力のアルファは1.0 (不透明)
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
};
const finalPass = new ShaderPass(finalCompositeShader);
// finalPass.renderToScreen = true; // このパスが最後ならtrue (EffectComposerのデフォルトは最後のパスがtrue)
composer.addPass(finalPass);

// 環境光（少しだけ追加）
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

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
  
  // マーカーの有無に関わらず花火を打ち上げる
  if (Date.now() - lastLaunchTime > launchInterval / 3) {
    // launchFirework(scene, markerRoot);
    launchPeonyFirework(scene, markerRoot); // 牡丹花火を打ち上げ
    console.log('Firework launched!');
    lastLaunchTime = Date.now();
  }
  
  updateFireworks(scene); // 花火のアニメーション更新
  
  renderer.clear(); // 画面をクリア
  
  // renderer.render(scene, camera);
  composer.render(); // ポストプロセッシングを適用してレンダリング
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