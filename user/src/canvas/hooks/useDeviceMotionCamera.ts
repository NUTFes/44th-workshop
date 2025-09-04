import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// デバイスの回転を検出してカメラの向きを更新するフック
export function useDeviceMotionCamera(
  sensitivity: number = 0.5,
  initialRotation?: THREE.Euler
) {
  const { camera } = useThree();
  const lastTimestamp = useRef<number | null>(null);
  const currentQuaternion = useRef<THREE.Quaternion>(new THREE.Quaternion().copy(camera.quaternion));
  const initialQuaternion = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // 初期回転を設定
  useEffect(() => {
    if (initialRotation) {
      initialQuaternion.current.setFromEuler(initialRotation);
    } else {
      initialQuaternion.current.copy(camera.quaternion);
    }
    currentQuaternion.current.copy(initialQuaternion.current);
    camera.quaternion.copy(initialQuaternion.current);
  }, [camera, initialRotation]);

  useEffect(() => {
    function handleMotion(event: DeviceMotionEvent) {
      if (!event.rotationRate || lastTimestamp.current === null) {
        lastTimestamp.current = performance.now();
        return;
      }

      const now = performance.now();
      const dt = (now - lastTimestamp.current) / 1000;
      lastTimestamp.current = now;

      const alpha = (event.rotationRate.alpha || 0) * THREE.MathUtils.DEG2RAD * sensitivity;
      const beta = (event.rotationRate.beta || 0) * THREE.MathUtils.DEG2RAD * sensitivity;
      const gamma = (event.rotationRate.gamma || 0) * THREE.MathUtils.DEG2RAD * sensitivity;

      const deltaQ = new THREE.Quaternion();
      deltaQ.setFromEuler(new THREE.Euler(alpha * dt, beta * dt, gamma * dt, 'XYZ'));

      currentQuaternion.current.multiplyQuaternions(currentQuaternion.current, deltaQ);
      camera.quaternion.copy(currentQuaternion.current);
    }

    async function requestPermissionAndStart() {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        buttonRef.current = document.createElement('button');
        buttonRef.current.innerText = 'Enable Motion';
        buttonRef.current.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;padding:1rem;font-size:1rem;';
        document.body.appendChild(buttonRef.current);

        buttonRef.current.onclick = async () => {
          try {
            const state = await (DeviceMotionEvent as any).requestPermission();
            if (state === 'granted') {
              window.addEventListener('devicemotion', handleMotion, true);
              lastTimestamp.current = performance.now();
              buttonRef.current?.remove();
            }
          } catch (err) {
            console.error('Permission error:', err);
            buttonRef.current?.remove();
          }
        };
      } else {
        // Androidなどpermission不要な場合
        window.addEventListener('devicemotion', handleMotion, true);
        lastTimestamp.current = performance.now();
      }
    }

    requestPermissionAndStart();

    return () => {
      window.removeEventListener('devicemotion', handleMotion, true);
      buttonRef.current?.remove();
    };
  }, [camera, sensitivity]);

  // カメラの回転をリセットする関数
  const resetCameraRotation = () => {
    currentQuaternion.current.copy(initialQuaternion.current);
    camera.quaternion.copy(initialQuaternion.current);
    console.log('Camera rotation reset to initial position');
  };

  // 現在の回転を新しい初期回転として設定する関数
  const setCurrentAsInitial = () => {
    initialQuaternion.current.copy(camera.quaternion);
    currentQuaternion.current.copy(camera.quaternion);
    console.log('Current camera rotation set as new initial position');
  };

  // 特定の回転に設定する関数
  const setCameraRotation = (euler: THREE.Euler) => {
    const newQuaternion = new THREE.Quaternion().setFromEuler(euler);
    initialQuaternion.current.copy(newQuaternion);
    currentQuaternion.current.copy(newQuaternion);
    camera.quaternion.copy(newQuaternion);
    console.log('Camera rotation set to:', euler);
  };

  return {
    resetCameraRotation,
    setCurrentAsInitial,
    setCameraRotation,
  };
}