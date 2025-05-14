// src/fireworks.ts
import * as THREE from 'three';

export function launchPeonyFirework(scene: THREE.Scene, parentObject: THREE.Object3D) {
	// より多くのパーティクルを生成
	const radius = 5; // 花火の半径
	const segments = 20; // 花火のセグメント数
	const particleCount = segments * segments; // パーティクルの数
	const particlesGeometry = new THREE.BufferGeometry();
	const positions = new Float32Array(particleCount * 3);
	
	// 花火の色をランダムに生成
	const colors = new Float32Array(particleCount * 3);
	const colorOptions = [
		new THREE.Color(0xff0000), // 赤
		new THREE.Color(0x00ff00), // 緑
		new THREE.Color(0x0000ff), // 青
		new THREE.Color(0xffff00), // 黄
		new THREE.Color(0xff00ff), // マゼンタ
		new THREE.Color(0x00ffff)  // シアン
	];
	const selectedColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
	
	// パーティクルのサイズを大きくして、より見やすく
	const particleMaterial = new THREE.PointsMaterial({
		size: 0.2, // サイズを大きく
		blending: THREE.AdditiveBlending,
		transparent: true,	// 透明度を有効にする
		depthWrite: false,	// 深度書き込みを無効にする
		vertexColors: true, // 頂点カラーを使用
		// map: textureLoader.load('utd.png'), // カスタムのテクスチャを読み込む
		// alphaTest: 0.5, // 透明部分を考慮して描画
	});
	
	const particles = new THREE.Points(particlesGeometry, particleMaterial);
	particles.userData.velocities = [];
	particles.userData.lifespans = [];
	
	// 花火の中心点
	const center = new THREE.Vector3(0, 1, -30); // 少し上方向に配置
	let i = 0;
	
	for (let theta = 0; theta < 2 * Math.PI; theta += 2 * Math.PI / segments) {
		for (let phi = 0; phi < 2 * Math.PI; phi += 2 * Math.PI / segments) {
			// 位置を設定
			positions[i * 3 + 0] = center.x + radius * Math.sin(theta) * Math.cos(phi) + Math.random() * 0.1;
			positions[i * 3 + 1] = center.y + radius * Math.cos(theta) + Math.random() * 0.1;
			positions[i * 3 + 2] = center.z + radius * Math.sin(theta) * Math.sin(phi) + Math.random() * 0.1;
			
			// 基本色に微妙なばらつきを加える
			const colorVariation = Math.random() * 0.2 + 0.8; // 0.8～1.0の範囲
			colors[i * 3 + 0] = selectedColor.r * colorVariation;
			colors[i * 3 + 1] = selectedColor.g * colorVariation;
			colors[i * 3 + 2] = selectedColor.b * colorVariation;
			
			// 速度を設定
			const velocity = new THREE.Vector3(
				Math.sin(theta) * Math.cos(phi) * 0.01,
				Math.sin(theta) * Math.sin(phi) * 0.01,
				Math.cos(theta) * 0.01
			);
			particles.userData.velocities.push(velocity);
			// 寿命を設定
			particles.userData.lifespans.push(Math.random() * 100 + 100); // 100～200フレームの寿命
			i++;
		}
	}
	
	particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
	
	// パーティクルシステムを親オブジェクトに追加
	// parentObject.add(particles);
	scene.add(particles);
	
	// 花火の打ち上げ効果音（実装する場合）
	// const sound = new Audio('path/to/firework-sound.mp3');
	// sound.play();
}

export function updateFireworks(scene: THREE.Scene) {
	scene.traverse((object) => {
		if (object instanceof THREE.Points && object.userData.velocities) {
			const points = object as THREE.Points;
			const positions = points.geometry.attributes.position as THREE.BufferAttribute;
			const velocities = points.userData.velocities as THREE.Vector3[];
			const lifespans = points.userData.lifespans as number[];
			let activeParticles = 0;
			
			for (let i = 0; i < positions.count; i++) {
				if (lifespans[i] > 0) {
					// パーティクルの位置を更新
					positions.setXYZ(
						i,
						positions.getX(i) + velocities[i].x,
						positions.getY(i) + velocities[i].y,
						positions.getZ(i) + velocities[i].z
					);
					
					// 重力の影響を加える（下方向への加速）
					velocities[i].y -= 0.001;
					
					// 寿命を減らす
					lifespans[i]--;
					activeParticles++;
					
					// 寿命が尽きかけたらフェードアウト効果（透明度を下げる）
					if (lifespans[i] < 30) {
						// PointsMaterialでは個別の点の透明度を設定できないため、
						// 位置を少しずつ遠ざけることで擬似的なフェードアウト効果を作る
						const fadeOutFactor = lifespans[i] / 30;
						velocities[i].multiplyScalar(1.01); // 少し加速させて遠ざける
					}
				} else {
					// 寿命が尽きたパーティクルは見えなくする
					positions.setXYZ(i, Infinity, Infinity, Infinity);
				}
			}
			
			positions.needsUpdate = true;
			
			if (activeParticles === 0) {
				// 全てのパーティクルが消えたらオブジェクトを削除
				points.geometry.dispose();
				(points.material as THREE.Material).dispose();
				if (points.parent) {
					points.parent.remove(points);
				}
			}
		}
	});
}

// // 花火の引数
// interface FireWorksrops {
// 	offsetX: number;
// 	offsetY: number;
// 	offsetZ: number;
// 	radius: number;
// 	color: number;
// 	particlesSize: number;
// 	segments: number;
// }

// export function launchFirework(scene: THREE.Scene, parentObject: THREE.Object3D) {
// 	// より多くのパーティクルを生成
// 	const particleCount = 300;
// 	const particlesGeometry = new THREE.BufferGeometry();
// 	const positions = new Float32Array(particleCount * 3);
	
// 	// 花火の色をランダムに生成
// 	const colors = new Float32Array(particleCount * 3);
// 	const colorOptions = [
// 		new THREE.Color(0xff0000), // 赤
// 		new THREE.Color(0x00ff00), // 緑
// 		new THREE.Color(0x0000ff), // 青
// 		new THREE.Color(0xffff00), // 黄
// 		new THREE.Color(0xff00ff), // マゼンタ
// 		new THREE.Color(0x00ffff)  // シアン
// 	];
// 	const selectedColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
	
// 	// パーティクルのサイズを大きくして、より見やすく
// 	const particleMaterial = new THREE.PointsMaterial({
// 		size: 0.2, // サイズを大きく
// 		blending: THREE.AdditiveBlending,
// 		transparent: true,
// 		depthWrite: false,
// 		vertexColors: true // 頂点カラーを使用
// 	});
	
// 	const particles = new THREE.Points(particlesGeometry, particleMaterial);
// 	particles.userData.velocities = [];
// 	particles.userData.lifespans = [];
	
// 	// 花火の中心点
// 	const center = new THREE.Vector3(0, 1, 0); // 少し上方向に配置
	
// 	for (let i = 0; i < particleCount; i++) {
// 		// すべてのパーティクルを同じ発射点から開始
// 		positions[i * 3 + 0] = center.x;
// 		positions[i * 3 + 1] = center.y;
// 		positions[i * 3 + 2] = center.z;
		
// 		// 基本色に微妙なばらつきを加える
// 		const colorVariation = Math.random() * 0.2 + 0.8; // 0.8～1.0の範囲
// 		colors[i * 3 + 0] = selectedColor.r * colorVariation;
// 		colors[i * 3 + 1] = selectedColor.g * colorVariation;
// 		colors[i * 3 + 2] = selectedColor.b * colorVariation;
		
// 		// 球状に広がるように速度ベクトルを設定
// 		const phi = Math.random() * Math.PI * 2; // 水平方向の角度
// 		const theta = Math.random() * Math.PI; // 垂直方向の角度
// 		const speed = Math.random() * 0.05 + 0.05; // 速度のばらつき
		
// 		const velocity = new THREE.Vector3(
// 			Math.sin(theta) * Math.cos(phi) * speed,
// 			Math.sin(theta) * Math.sin(phi) * speed,
// 			Math.cos(theta) * speed
// 		);
		
// 		particles.userData.velocities.push(velocity);
// 		// より長い寿命を設定
// 		particles.userData.lifespans.push(Math.random() * 100 + 100); // 100～200フレームの寿命
// 	}
	
// 	particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
// 	particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
	
// 	// パーティクルシステムを親オブジェクトに追加
// 	parentObject.add(particles);
	
// 	// 花火の打ち上げ効果音（実装する場合）
// 	// const sound = new Audio('path/to/firework-sound.mp3');
// 	// sound.play();
// }