// src/ar-setup.ts
import * as THREE from 'three';

// THREEx AR.js型定義
declare global {
	interface Window {
		THREEx: {
			ArToolkitSource: any;
			ArToolkitContext: any;
			ArMarkerControls: any;
		};
	}
}

// ARToolkit型を定義
interface ARToolkitSource {
	domElement: HTMLElement;
	ready: boolean;
	init(onReady?: () => void): void;
	onResizeElement(): void;
	copyElementSizeTo(element: HTMLElement): void;
}

export function initializeAR(
	scene: THREE.Scene,
	camera: THREE.Camera,
	renderer: THREE.WebGLRenderer
): { arToolkitSource: ARToolkitSource; arToolkitContext: any; markerRoot: THREE.Group; videoTexture: THREE.VideoTexture } {
	// コンソールでTHREExオブジェクトの内容を確認（デバッグ用）
	console.log('THREEx available:', window.THREEx);
	
	// ARToolkitSource (カメラ映像の取得)
	const arToolkitSource = new window.THREEx.ArToolkitSource({
		sourceType: 'webcam',
	});
	
	arToolkitSource.init(() => {
		// 遅延させないと初期リサイズがうまくいかないことがある
		setTimeout(() => {
			arToolkitSource.onResizeElement();
			arToolkitSource.copyElementSizeTo(renderer.domElement);
			if (arToolkitContext.arController !== null) {
				arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
			}
		}, 500);
	});
	
	// ARToolkitContext (マーカー検出など)
	const arToolkitContext = new window.THREEx.ArToolkitContext({
		cameraParametersUrl: 'https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/data/camera_para.dat',
		detectionMode: 'mono',
	});
	
	arToolkitContext.init(() => {
		camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
	});
	
	// マーカー検出を使わず、単純に画面上に固定表示するためのルートオブジェクト
	const markerRoot = new THREE.Group();
	scene.add(markerRoot);
	
	// カメラの前方3メートルに配置
	markerRoot.position.set(0, 0, -30);
	
	// マーカー検出は使わないため、マーカーコントロールは作成しない
	// 代わりにダミーのイベントを発火させるための実装
	const dummyEventTarget = new EventTarget();
	(markerRoot as any).addEventListener = (eventName: string, callback: () => void) => {
		dummyEventTarget.addEventListener(eventName, callback as EventListener);
	};
	
	// // シーンを常に表示
	// scene.visible = true;
	
	// ARカメラ映像のテクスチャ化
	const videoElement = arToolkitSource.domElement as HTMLVideoElement;
	const videoTexture = new THREE.VideoTexture(videoElement);
	videoTexture.minFilter = THREE.LinearFilter;
	videoTexture.magFilter = THREE.LinearFilter;
	videoTexture.format = THREE.RGBAFormat; // または RGBFormat
	
	return { arToolkitSource, arToolkitContext, markerRoot, videoTexture };
}