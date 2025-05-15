// src/pose-detector.ts
import { 
  Pose, 
  type Results as PoseResults,
  // LandmarkConnectionArray
} from '@mediapipe/pose';

declare global {
  interface Window {
    Pose: typeof Pose;
  }
}

// ジャンプを検出するクラス
export class JumpDetector {
  private pose: Pose;
  private videoElement: HTMLVideoElement;
  private lastHipY: number | null = null;
  private isJumping: boolean = false;
  private jumpThreshold: number = 0.05; // Y座標の変化の閾値（ビューポートの高さに対する割合）
  private jumpCooldown: number = 1000; // ジャンプ検出後のクールダウン時間（ミリ秒）
  private lastJumpTime: number = 0;
  private onJumpCallback: (() => void) | null = null;
  
  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    this.pose = new window.Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });
    
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    
    this.pose.onResults(this.onPoseResults.bind(this));
    this.start();
  }
  
  private async start() {
    // MediaPipe Poseのカメラ設定
    // AR.jsがカメラを制御しているため、ここではvideoElementを直接渡す
    // ただし、AR.jsのカメラソースと競合しないように注意が必要
    // AR.jsのarToolkitSource.domElement (video) を使う
    if (this.videoElement && this.videoElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      await this.pose.send({ image: this.videoElement });
    }
    // requestAnimationFrameで継続的にフレームを送信
    requestAnimationFrame(this.sendFrame.bind(this));
  }
  
  private async sendFrame() {
    if (this.videoElement && this.videoElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && this.videoElement.videoWidth > 0) {
      try {
        await this.pose.send({ image: this.videoElement });
      } catch (error) {
        console.error('Error sending frame to MediaPipe Pose:', error);
      }
    }
    requestAnimationFrame(this.sendFrame.bind(this));
  }
  
  
  private onPoseResults(results: PoseResults): void {
    if (results.poseLandmarks) {
      const hip = results.poseLandmarks[23]; // 左腰のランドマーク (24でも可)
      
      if (hip && hip.visibility && hip.visibility > 0.5) {
        const currentHipY = hip.y;
        
        if (this.lastHipY !== null) {
          const deltaY = this.lastHipY - currentHipY; // Y座標は上が小さい
          
          // ジャンプ検出ロジック
          if (deltaY > this.jumpThreshold && !this.isJumping && (Date.now() - this.lastJumpTime > this.jumpCooldown)) {
            this.isJumping = true;
            this.lastJumpTime = Date.now();
            console.log("Jump detected!");
            if (this.onJumpCallback) {
              this.onJumpCallback();
            }
          } else if (deltaY < -this.jumpThreshold / 2) { // 着地を検出（閾値はジャンプより小さく）
            this.isJumping = false;
          }
        }
        this.lastHipY = currentHipY;
      } else {
        this.lastHipY = null; // ランドマークが見えない場合はリセット
      }
    }
  }
  
  public onJump(callback: () => void): void {
    this.onJumpCallback = callback;
  }
  
  public getPose(): Pose {
    return this.pose;
  }
}
