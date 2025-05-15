// src/main.ts
import * as THREE from 'three';
import { initializeAR } from './ar-setup';
import { launchPeonyFirework, updateFireworks } from './fireworks/fireworks';
import { initializeComposer } from './composer-setup';
import { JumpDetector } from './pose-detector';

// 1. Three.jsシーンの初期化
const scene = new THREE.Scene();
const camera = new THREE.Camera(); // AR.jsがカメラを制御
scene.add(camera);

// お絵描き花火のバイナリデータ(2次元配列)を格納する3次元配列
const binaryFireworksDataArray = await getBinaryFireworksDataArray(); // CSVファイルを読み込む
// console.log(binaryFireworksDataArray);

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
const { arToolkitSource, arToolkitContext, markerRoot, videoElement, videoTexture } = initializeAR(scene, camera, renderer);

// 3. コンポーザーの初期化(ポストプロセッシングの適用)
const composer = initializeComposer(scene, camera, renderer, videoTexture);

// 4. 花火打ち上げロジック
let lastLaunchTime = 0;
const launchInterval = 5000; // 5秒ごとに花火 (ミリ秒)
// const textureLoader = new THREE.TextureLoader();

// -- お絵描き花火 --
const vertices: number[] = [];  // 頂点座標を格納する配列
// 各行ごとにカンマで区切った文字列を要素とした二次元配列を生成
for (let i = 0; i < binaryFireworksDataArray[0].length; i++) {
  // console.log(result[i]);
  binaryFireworksDataArray[0][i].forEach((row, j) => {
    if (row === 1) {
      // console.log("row: " + i + ", col: " + j + ", value: " + row);
      vertices.push(
        -8 + 0.05 * j,
        8 -0.05 * i,
        -30);
    }
  });
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
const material = new THREE.PointsMaterial({
  color: 0xEAC011,
  size: 0.2,
});
const fireWorksBinary = new THREE.Points(geometry, material);
scene.add(fireWorksBinary);

//-- ジャンプ検出の初期化(ユーザ画面に含めるかは今後の検討事項) --
if (videoElement) {
    const jumpDetector = new JumpDetector(videoElement);
    jumpDetector.onJump(() => {
        console.log('Jump event received in main.ts, launching firework!');
        // ジャンプ検出時に花火を打ち上げる
        launchPeonyFirework(scene, markerRoot); // 牡丹花火に変更
        lastLaunchTime = Date.now(); // 連続打ち上げを防ぐために更新
    });
} else {
    console.error('Video element not found, could not initialize JumpDetector.');
}


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
  
  
  // -- お絵描き花火のアニメーション -- 
  const g = 9.8; // 重力加速度
  const t = (Date.now() - lastLaunchTime) / 1000; // 時間を秒単位で取得
  const newVertices: number[] = [];  // 頂点座標を格納する配列
  // 各行ごとにカンマで区切った文字列を要素とした二次元配列を生成
  for (let i = 0; i < binaryFireworksDataArray[0].length; i++) {
    binaryFireworksDataArray[0][i].map((row, j) => {
      if (row === 1) {
        // console.log("row: " + i + ", col: " + j);
        newVertices.push(
          -8 * t + 0.05 * j * t,
          (18 - g * t) * t - 0.05 * i * t,
          -30);
      }
    });
  }
  fireWorksBinary.geometry.setAttribute('position', new THREE.Float32BufferAttribute(newVertices, 3));
  
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

// お絵描き花火のバイナリデータを読み込む関数(後でキャッシュから読み込むものに置き換える)
async function getBinaryFireworksDataArray(): Promise<number[][][]> {
  const result: number[][][] = []; // レスポンスを格納する配列(3次元配列)
  
  // CSVファイルのパスを指定(後々キャッシュを読み込むものに置き換える)
  const csvFilePathes = [
    "demo_csv/44thlogo.csv",
    "demo_csv/44thlogo_small.csv",
  ];
  
  // CSVファイルを読み込む
  // for (const csvFilePath of csvFilePathes) { // 順番に読み込む
  await Promise.all(csvFilePathes.map(async (csvFilePath) => { // 並列に読み込む
    const csv = await getCSVText(csvFilePath);  // CSVファイルを読み込む
    
    result.push(csv.split("\n")         // レスポンスを改行で分割
      .map((row) => row.split(",")      // 各行をカンマで分割
      .map((num) => parseFloat(num)))); // 各要素を数値に変換して格納
  }));
  console.log(result);
  return result; // 読み込んだCSVデータを返す
}

// CSVファイルを読み込む関数
async function getCSVText(path: string): Promise<string> {
  console.log('Start loading CSV file: ' + path);
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open("get", path, true);  // CSVファイルのパスを指定
    req.send(null); // HTTPリクエストの発行
    req.onload = () => {
      if (req.status === 200) {
        console.log('CSV file loaded successfully: ' + path);
        resolve(req.responseText); // レスポンスを解決
      }
      else {
        reject(new Error(`Error loading CSV file: ${req.status}`));
      }
    };
    req.onerror = () => {
      reject(new Error('Error loading CSV file'));
    };
  });
}
