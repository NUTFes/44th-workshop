import { useEffect, useRef, useState } from 'react';
import {
  Pose,
  POSE_LANDMARKS,
  POSE_CONNECTIONS,
  type Results as PoseResults,
} from '@mediapipe/pose';
import {
  drawConnectors,
  drawLandmarks,
} from '@mediapipe/drawing_utils';

type UseJumpDetectorOptions = {
  videoElement: HTMLVideoElement | null;
  canvasElement: HTMLCanvasElement | null;
  onJump?: (jumpPosition: number | null) => void; // ジャンプ検出時のコールバック
};

// Mediapipeを使用してジャンプを検出するフック
export const useJumpDetector = ({
  videoElement,
  canvasElement,
  onJump,
}: UseJumpDetectorOptions) => {
  const [isJumping, setIsJumping] = useState(false);

  const poseRef = useRef<Pose | null>(null);
  const lastHipYRef = useRef<number | null>(null);
  const lastJumpTimeRef = useRef<number>(0);

  const jumpThreshold = 0.05; // ジャンプ検出のしきい値
  const jumpCooldown = 500;   // ジャンプ検出のクールダウン時間（ミリ秒）

  useEffect(() => {
    if (!videoElement || !canvasElement) {
      console.error('Video or canvas element is not available');
      return;
    }

    const canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) {
      console.error('Failed to get canvas context');
      return; // Canvasのコンテキストが取得できない場合は終了
    }

    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,           // モデルの複雑さ
      smoothLandmarks: true,        // ランドマークの平滑化
      enableSegmentation: false,    // セグメンテーションを無効化
      minDetectionConfidence: 0.5,  // 検出の信頼度
      minTrackingConfidence: 0.5,   // トラッキングの信頼度
    });

    pose.onResults((results: PoseResults) => {
      // === Canvas描画処理 ===
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height); // 画面をクリア
      // canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);  // ビデオフレームをCanvasに描画

      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
      }
      canvasCtx.restore();

      // === ジャンプ検出処理 ===
      if (results.poseLandmarks) {
        // 両腰の平均を使用してより安定した検出
        const leftHip = results.poseLandmarks[POSE_LANDMARKS.LEFT_HIP]; // 左腰
        const rightHip = results.poseLandmarks[POSE_LANDMARKS.RIGHT_HIP]; // 右腰

        // 腰のランドマークが存在する場合にジャンプ検出を行う
        if (leftHip?.visibility && rightHip?.visibility && 
            leftHip.visibility > 0.5 && rightHip.visibility > 0.5) {
            const currentHipY = (leftHip.y + rightHip.y) / 2; // 両腰のY座標の平均
            const currentHipX = (leftHip.x + rightHip.x) / 2; // 両腰のX座標の平均

          // 前回の腰のY座標が存在する場合、ジャンプ検出を行う
          if (lastHipYRef.current !== null) {
            const deltaY = lastHipYRef.current - currentHipY;

            if (
              deltaY > jumpThreshold &&
              !isJumping &&
              Date.now() - lastJumpTimeRef.current > jumpCooldown
            ) {
              // ジャンプを検出した場合の処理
              setIsJumping(true);
              lastJumpTimeRef.current = Date.now();
              onJump?.(currentHipX); // ジャンプ位置をコールバックで通知
            } else if (deltaY < -jumpThreshold / 2) {
              // ジャンプが終わったと判断する条件
              setIsJumping(false);
            }
          }

          lastHipYRef.current = currentHipY;
        } else {
          lastHipYRef.current = null;
        }
      }
    });

    poseRef.current = pose;

    let animationFrameId: number;

    // MediaPipeのポーズ検出を開始するループ
    const detectLoop = async () => {
      if (
        // ビデオ要素が準備できていて、十分なデータがある場合
        videoElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
        videoElement.videoWidth > 0
      ) {
        // ポーズ検出を実行
        await pose.send({ image: videoElement });
      }
      animationFrameId = requestAnimationFrame(detectLoop);
    };

    detectLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      pose.close();
    };
  }, [videoElement, canvasElement]);

  return { isJumping };
};
