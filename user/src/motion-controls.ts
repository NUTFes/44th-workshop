// motion-controls.ts
import * as THREE from 'three';

// デバイスの回転に合わせてカメラを回転させるクラス
export class DeviceMotionCameraControls {
  private camera: THREE.Camera;                       // カメラオブジェクト
  private lastTimestamp: number | null = null;        // 最後のタイムスタンプ
  private currentCameraQuaternion: THREE.Quaternion;  // カメラのクォータニオン
  private rotationSpeedSensitivity: number;           // カメラ回転の感度
  private permissionButton: HTMLButtonElement | null = null;  // パーミッションリクエスト用ボタン
  
  constructor(camera: THREE.Camera, sensitivity: number = 0.5) {
    this.camera = camera;
    this.currentCameraQuaternion = new THREE.Quaternion().copy(camera.quaternion);
    this.rotationSpeedSensitivity = sensitivity;
    this.handleDeviceMotion = this.handleDeviceMotion.bind(this); // thisを束縛
  }
  
  // DeviceMotionイベントを処理するメソッド
  private handleDeviceMotion(event: DeviceMotionEvent) {
    if (!event.rotationRate || this.lastTimestamp === null) {
      this.lastTimestamp = performance.now();
      return;
    }

    const now = performance.now();
    const dt = (now - this.lastTimestamp) / 1000.0; // 経過時間 (秒)
    this.lastTimestamp = now;

    // rotationRate は deg/s なのでラジアン/sに変換し、感度を乗算
    const alphaRate = (event.rotationRate.alpha || 0) * THREE.MathUtils.DEG2RAD * this.rotationSpeedSensitivity; // Z軸周り (デバイスの)
    const betaRate = (event.rotationRate.beta || 0) * THREE.MathUtils.DEG2RAD * this.rotationSpeedSensitivity;   // X軸周り (デバイスの)
    const gammaRate = (event.rotationRate.gamma || 0) * THREE.MathUtils.DEG2RAD * this.rotationSpeedSensitivity; // Y軸周り (デバイスの)

    // 変化量を表す小さな回転クォータニオンを作成
    const deltaQuaternion = new THREE.Quaternion();
    const eulerDelta = new THREE.Euler(
      alphaRate * dt, // x軸周りの回転量(なぜかalphaだとうまくいく)
      betaRate * dt,  // Y軸周りの回転量(なぜかbetaだとうまくいく)
      gammaRate * dt, // Z軸周りの回転量(なぜかgammaだとうまくいく)
      'XYZ'           // オイラーオーダー
    );
    deltaQuaternion.setFromEuler(eulerDelta);

    // 現在のカメラの向きに、このフレームの回転量を乗算 (ローカル回転を適用)
    this.currentCameraQuaternion.multiplyQuaternions(this.currentCameraQuaternion, deltaQuaternion);
    // またはワールド軸基準で回転させたい場合は preMultiply
    // currentCameraQuaternion.premultiply(deltaQuaternion);

    // カメラのクォータニオンを更新
    this.camera.quaternion.copy(this.currentCameraQuaternion);

    // (オプション) ロールを強制的に0にする (水平を保つ)
    // これを行う場合、上記でZ軸回転を 0 にするか、適用後に補正する
    // const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    // euler.z = 0; // ロールを0に
    // camera.quaternion.setFromEuler(euler);
  }
  
  // DeviceMotionのパーミッションをリクエストし、イベントリスナーを登録するメソッド
  public async requestPermissionAndStart() {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      // iOS 13+ の場合、パーミッションをリクエストする
      // DeviceMotionEventのパーミッションリクエストにはbuttonのクリック等のユーザーアクションが必要なので、buttonを作成)
      this.permissionButton = document.createElement('button');
      this.permissionButton.id = 'motionPermissionButton';
      this.permissionButton.innerText = 'Enable Device Motion';
      // z-indexを指定しないとARのsceneに隠れて見えなくなるので注意
      this.permissionButton.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:1000; padding:20px; font-size:18px;';
      document.body.appendChild(this.permissionButton);
      
      this.permissionButton.onclick = async () => {
        try {
          const permissionState = await (DeviceMotionEvent as any).requestPermission();
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', this.handleDeviceMotion, true);
            this.lastTimestamp = performance.now();
            this.permissionButton?.remove();
          } else {
            alert('Device Motion permission not granted.');
          }
        } catch (error) {
          console.error('Error requesting permission:', error);
          this.permissionButton?.remove(); // エラー時もボタンを消す
        }
      };
    } else {
      window.addEventListener('devicemotion', this.handleDeviceMotion, true);
      this.lastTimestamp = performance.now();
    }
  }
  
  public dispose() {
    window.removeEventListener('devicemotion', this.handleDeviceMotion, true);
    this.permissionButton?.remove();
  }
  
  // public update() { /* スムージングなどが必要ならここに */ }
}