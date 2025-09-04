import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// コンポーザーの初期化
// コンポーザーはポストプロセッシング(シーンの描画処理)の管理を行う
export function  initializeComposer(
	scene: THREE.Scene,
	camera: THREE.Camera,
	renderer: THREE.WebGLRenderer,
	videoTexture: THREE.VideoTexture
): EffectComposer {
	// 1. EffectComposerを作成: ポストプロセッシングを行う
	const composer = new EffectComposer(renderer);
	
	// 2. RenderPass: シーンをレンダリングする
	const renderPass = new RenderPass(scene, camera);
	composer.addPass(renderPass);
	
	// 3. UnrealBloomPass: ブルーム効果を追加する
	const bloomPass = new UnrealBloomPass(
		new THREE.Vector2(window.innerWidth, window.innerHeight),
		0.8, // strength: ブルームの強さ (調整)
		0.5, // radius: ブルームの広がり (調整)
		0.1  // threshold: ブルームがかかる明るさの閾値 (調整: 低いほど光る)
	);
	composer.addPass(bloomPass);
	
	// 4. OutputPass: 最終出力を画面に (トーンマッピングなどを適用)
	const outputPass = new OutputPass();
	composer.addPass(outputPass);
	
	// 5. ShaderPass: ブルーム結果とARカメラ映像を加算合成する(UnrealBloomを適用するとsceneの背景が黒になりカメラ映像が見えなくなるため)
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
  console.log('Composer initialized with passes:', composer.passes);
	
	return composer;
}