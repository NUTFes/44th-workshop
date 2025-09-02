import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// デバイスの回転を検出してカメラの向きを更新するフック
export function useDeviceMotionCamera(
  sensitivity: number = 0.5,
  initialDirection: { alpha?: number; beta?: number; gamma?: number } = {}
) {
  const { camera } = useThree();
  const lastTimestamp = useRef<number | null>(null);
  const isInitialized = useRef<boolean>(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function handleOrientation(event: DeviceOrientationEvent) {
      if (!isInitialized.current && event.alpha !== null && event.beta !== null && event.gamma !== null) {
        // 初期方向を設定（指定された方向または現在の方向）
        const targetAlpha = initialDirection.alpha ?? event.alpha;
        const targetBeta = initialDirection.beta ?? event.beta;
        const targetGamma = initialDirection.gamma ?? event.gamma;

        // デバイスの絶対方位をカメラの回転に適用
        const euler = new THREE.Euler(
          THREE.MathUtils.degToRad(targetBeta),
          THREE.MathUtils.degToRad(targetAlpha),
          THREE.MathUtils.degToRad(targetGamma),
          'YXZ' // デバイスの回転順序
        );

        camera.quaternion.setFromEuler(euler);
        isInitialized.current = true;

        console.log(`Camera initialized with orientation: alpha=${targetAlpha}, beta=${targetBeta}, gamma=${targetGamma}`);
      }
    }

    function handleMotion(event: DeviceMotionEvent) {
      if (!isInitialized.current || !event.rotationRate || lastTimestamp.current === null) {
        lastTimestamp.current = performance.now();
        return;
      }

      const now = performance.now();
      const dt = (now - lastTimestamp.current) / 1000;
      lastTimestamp.current = now;

      // 回転速度を取得（ジャイロスコープ）
      const alpha = (event.rotationRate.alpha || 0) * THREE.MathUtils.DEG2RAD * sensitivity;
      const beta = (event.rotationRate.beta || 0) * THREE.MathUtils.DEG2RAD * sensitivity;
      const gamma = (event.rotationRate.gamma || 0) * THREE.MathUtils.DEG2RAD * sensitivity;

      // 回転の差分を計算
      const deltaQ = new THREE.Quaternion();
      deltaQ.setFromEuler(new THREE.Euler(beta * dt, alpha * dt, gamma * dt, 'YXZ'));

      // 現在のカメラの回転に差分を適用
      camera.quaternion.multiplyQuaternions(camera.quaternion, deltaQ);
    }

    async function requestPermissionAndStart() {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        buttonRef.current = document.createElement('button');
        buttonRef.current.innerText = 'Enable Device Orientation';
        buttonRef.current.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;padding:1rem;font-size:1rem;background:white;border:2px solid black;border-radius:8px;';
        document.body.appendChild(buttonRef.current);

        buttonRef.current.onclick = async () => {
          try {
            // DeviceOrientationEventとDeviceMotionEventの両方の許可を取得
            const orientationState = await (DeviceOrientationEvent as any).requestPermission();
            const motionState = await (DeviceMotionEvent as any).requestPermission();
            
            if (orientationState === 'granted' && motionState === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation, true);
              window.addEventListener('devicemotion', handleMotion, true);
              lastTimestamp.current = performance.now();
              buttonRef.current?.remove();
            } else {
              console.error('Permission denied for device sensors');
              buttonRef.current?.remove();
            }
          } catch (err) {
            console.error('Permission error:', err);
            buttonRef.current?.remove();
          }
        };
      } else {
        // Androidなどpermission不要な場合
        window.addEventListener('deviceorientation', handleOrientation, true);
        window.addEventListener('devicemotion', handleMotion, true);
        lastTimestamp.current = performance.now();
      }
    }

    requestPermissionAndStart();

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      window.removeEventListener('devicemotion', handleMotion, true);
      buttonRef.current?.remove();
      isInitialized.current = false;
    };
  }, [camera, sensitivity, initialDirection]);

  // カメラの方向をリセットする関数を返す
  const resetOrientation = () => {
    isInitialized.current = false;
  };

  return { resetOrientation };
}