import { useState } from 'react'
import {
  useSearchParams
} from 'react-router-dom'
import {
  useEffect,
  useRef,
} from 'react'
import type { IllustrationFireworksType } from '../types/illustrationFireworksType';
import type { ColorParticleData } from '../types/illustrationFireworksType';
import { imageUrlToParticles } from '../utils/imageToParticles';
import { toSameOriginUrl } from '../config/apiConfig';
import { useGetFireworkById } from '../apiClient/fireworks/myARProjectAPI';
import ScanModal from '../components/common/ScanModal';
import type { HomeCanvasHandle } from '../canvas/HomeCanvas';

import HomeCanvas from "../canvas/HomeCanvas";
import {
  overlayContainerStyle,
  panelStyle,
  launchButtonStyle,
  ghostButtonStyle,
  spinnerStyle,
  errorPillStyle,
  settingsToggleButtonStyle,
  settingsSectionStyle,
  qualityRowContainerStyle,
  qualityLabelStyle,
  segmentedContainerStyle,
  segmentedIndicatorStyle,
  segmentedButtonStyle,
} from './homeStyles';

// 画質レベル: 値が大きいほど画像を細かいグリッドに分解し、粒子数が増えて精細になる（その分重くなる）
const QUALITY_LEVELS = [
  { label: '低', resolution: 32 },
  { label: '中', resolution: 64 },
  { label: '高', resolution: 128 },
] as const;

// ===== Homeのページ =====
// ページではデータフェッチやローカルストレージの読み書きを行う
export default function Home() {
  // イラスト花火のメタデータ
  const [illustrationFireworks, setIllustrationFireworks] = useState<IllustrationFireworksType | null>(null);
  // 画像から変換したカラーパーティクルデータ
  const [particleData, setParticleData] = useState<ColorParticleData | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // 画質設定（画像を何×何のグリッドに分解するか）。既定は「中」
  const [resolution, setResolution] = useState(64);

  const [isOpen, setIsOpen] = useState(false);

  // 詳細設定（画質・カメラのリセット・QRコードをスキャン）の開閉。花火の表示領域を広く取るため既定は閉じる
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const homeCanvasRef = useRef<HomeCanvasHandle>(null);

  const currentId = searchParams.get('id') || '1';
  const validId = !isNaN(Number(currentId)) ? currentId : '1';

  const { data, isLoading, error } = useGetFireworkById(Number(validId), {
    query: {
      enabled: Boolean(validId) && !isNaN(Number(validId)) && Number(validId) > 0,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  });

  const onScan = (result: string) => {
    const id = result.match(/id=(\d+)/)?.[1] ?? null;
    if (id) {
      searchParams.set('id', id);
      setSearchParams(searchParams);
      setIsOpen(false);
    }
  };

  // IDが変わったらパーティクルデータをリセット
  useEffect(() => {
    setParticleData(null);
    setIllustrationFireworks(null);
  }, [validId]);

  // APIデータ取得後の処理（resolution 変更時も再変換）
  useEffect(() => {
    if (!data) return;

    const meta: IllustrationFireworksType = {
      id: data.id,
      isShareable: data.isShareable,
      imageUrl: data.imageUrl ?? null,
      createdAt: data.createdAt?.toString(),
      updatedAt: data.updatedAt?.toString(),
    };
    setIllustrationFireworks(meta);

    if (!data.imageUrl) {
      console.warn('imageUrl が null です（旧レコード）');
      return;
    }

    // 画像 → カラーパーティクル変換
    setIsConverting(true);
    imageUrlToParticles(toSameOriginUrl(data.imageUrl), {
      resolution, // 画質設定（低32 / 中64 / 高128）
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
        })
        .finally(() => {
          setIsConverting(false);
        });
  }, [data, resolution]);

  useEffect(() => {
    if (isLoading) console.log('Loading fireworks data...');
    else if (error) console.error('Error fetching fireworks data:', error);
  }, [isLoading, error]);

  const handleLaunch = () => {
    homeCanvasRef.current?.handleLaunch();
    resetCameraRotation();
    // 打ち上げた瞬間にパネルを縮め、花火の視界を確保する
    setIsSettingsOpen(false);
  };

  const resetCameraRotation = () => {
    homeCanvasRef.current?.resetCameraRotation();
  };

  const isReady = !!particleData && !isConverting;
  const currentQualityIndex = QUALITY_LEVELS.findIndex((level) => level.resolution === resolution);
  // 読み込み中・変換中も打ち上げボタンを表示したまま disabled にし、パネルの高さが変わらないようにする
  const showLaunchButton = isLoading || isConverting || isReady;
  const hasLoadFailed = !showLaunchButton;

  // 読み込みに失敗したときは、QRコードをスキャンをすぐ押せるようパネルを自動で開く
  useEffect(() => {
    if (hasLoadFailed) setIsSettingsOpen(true);
  }, [hasLoadFailed]);

  return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <HomeCanvas
            illustrationFireworks={illustrationFireworks}
            particleData={particleData}
            ref={homeCanvasRef}
        />

        <div style={overlayContainerStyle}>
          <div style={panelStyle}>
            {/* 詳細設定（画質・カメラのリセット・QRコードをスキャン）は既定で閉じておき、花火と重なる面積を減らす */}
            <button
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                style={settingsToggleButtonStyle}
                className="hb-pressable"
                aria-expanded={isSettingsOpen}
                aria-controls="home-settings"
            >
              <span>⚙ 設定</span>
              <span className={`hb-chevron${isSettingsOpen ? ' hb-chevron--open' : ''}`}>⌄</span>
            </button>

            {isSettingsOpen && (
                <div id="home-settings" style={settingsSectionStyle} className="hb-reveal">
                  {/* 画質セレクタ（低32 / 中64 / 高128） */}
                  <div style={qualityRowContainerStyle}>
                    <span style={qualityLabelStyle}>解像度</span>
                    <div style={segmentedContainerStyle}>
                      <div style={segmentedIndicatorStyle(Math.max(currentQualityIndex, 0), QUALITY_LEVELS.length)} />
                      {QUALITY_LEVELS.map((level) => (
                          <button
                              key={level.resolution}
                              onClick={() => setResolution(level.resolution)}
                              disabled={isConverting}
                              style={segmentedButtonStyle(resolution === level.resolution)}
                          >
                            {level.label}
                          </button>
                      ))}
                    </div>
                  </div>

                  {isReady && (
                      <button onClick={resetCameraRotation} style={ghostButtonStyle} className="hb-pressable">
                        カメラのリセット
                      </button>
                  )}

                  {/* QRコードのスキャンは折りたたみ内に置き、閉じている間は花火の視界を確保する */}
                  <button onClick={() => setIsOpen(true)} style={ghostButtonStyle} className="hb-pressable">
                    QRコードをスキャン
                  </button>
                </div>
            )}
          </div>

          {/* 打ち上げボタンはローディング／変換中も disabled のまま表示し、パネルの高さを揺らさない */}
          {showLaunchButton ? (
              <button
                  onClick={handleLaunch}
                  disabled={!isReady}
                  style={launchButtonStyle(!isReady)}
                  className="hb-pressable hb-launch"
              >
                {!isReady && <span className="hb-spin" style={spinnerStyle} />}
                {isLoading ? '読み込み中...' : isConverting ? '画像を変換中...' : '花火を打ち上げる'}
              </button>
          ) : (
              <div style={errorPillStyle}>
                花火が読み込めませんでした<br />
                別のQRコードをスキャンしてください
              </div>
          )}
        </div>

        <ScanModal
            isOpen={isOpen}
            onScan={onScan}
            closeModal={() => setIsOpen(false)}
        />
      </div>
  );
}