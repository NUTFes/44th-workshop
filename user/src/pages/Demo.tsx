import { useEffect, useRef, useState } from 'react';
import { imageUrlToParticles } from '../utils/imageToParticles';
import type { ColorParticleData } from '../types/illustrationFireworksType';
import HomeCanvas from '../canvas/HomeCanvas';
import type { HomeCanvasHandle } from '../canvas/HomeCanvas';
import {
  overlayContainerStyle,
  panelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  statusPillStyle,
  errorPillStyle,
} from './homeStyles';
import {
  guideContainerStyle,
  guideCardStyle,
  guideTitleStyle,
  guideTextStyle,
} from './demoStyles';

// デモで打ち上げる固定画像（public/ 配下のパス）。差し替えるときはここだけ変更する
const DEMO_IMAGE_URL = '/demo/45th_logo.png';

// AR花火の場所へ誘導する固定文言。文言変更はここだけ
const DEMO_GUIDE_TITLE = '🎆 AR花火誘導文';
const DEMO_GUIDE_TEXT = 'AR花火の宣伝とか\nどこでやってるか書くスペース';

// 画質（Home の「中」相当。デモでは固定）
const DEMO_RESOLUTION = 64;

// ===== Demoのページ =====
// API・QRコードを使わず、同梱の固定画像を花火として打ち上げるデモ用画面。
// user画面（Home）と同じ打ち上げ体験に加え、AR花火の場所へ誘導するテキストを表示する。
export default function Demo() {
  const [particleData, setParticleData] = useState<ColorParticleData | null>(null);
  const [isConverting, setIsConverting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const homeCanvasRef = useRef<HomeCanvasHandle>(null);

  // マウント時に固定画像をパーティクルへ変換する
  useEffect(() => {
    setIsConverting(true);
    imageUrlToParticles(DEMO_IMAGE_URL, {
      resolution: DEMO_RESOLUTION,
      whiteThreshold: 200,
      saturationThreshold: 30,
      includeWhite: false,
    })
      .then((pd) => {
        setParticleData(pd);
        console.log(`パーティクル変換完了: ${pd.particles.length} 粒子`);
      })
      .catch((err) => {
        console.error('パーティクル変換失敗:', err);
        setError('花火が読み込めませんでした');
      })
      .finally(() => {
        setIsConverting(false);
      });
  }, []);

  const handleLaunch = () => {
    homeCanvasRef.current?.handleLaunch();
    resetCameraRotation();
  };

  const resetCameraRotation = () => {
    homeCanvasRef.current?.resetCameraRotation();
  };

  const isReady = !!particleData && !isConverting;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <HomeCanvas
        illustrationFireworks={null}
        particleData={particleData}
        ref={homeCanvasRef}
      />

      {/* AR花火の場所へ誘導するテキスト（Demo画面のみの要素） */}
      <div style={guideContainerStyle}>
        <div style={guideCardStyle}>
          <div style={guideTitleStyle}>{DEMO_GUIDE_TITLE}</div>
          <div style={guideTextStyle}>{DEMO_GUIDE_TEXT}</div>
        </div>
      </div>

      <div style={overlayContainerStyle}>
        <div style={panelStyle}>
          {isConverting ? (
            <div style={statusPillStyle}>画像を変換中...</div>
          ) : isReady ? (
            <>
              <button onClick={handleLaunch} style={primaryButtonStyle}>
                🎆 花火を打ち上げる
              </button>
              <button onClick={resetCameraRotation} style={secondaryButtonStyle}>
                カメラのリセット
              </button>
            </>
          ) : (
            <div style={errorPillStyle}>{error ?? '花火が読み込めませんでした'}</div>
          )}
        </div>
      </div>
    </div>
  );
}
