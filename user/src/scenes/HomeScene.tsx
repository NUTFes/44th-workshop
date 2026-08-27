import {
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import * as THREE from 'three';
import IllustrationFireworks from '../components/fireworks/Illustration/IllustrationFireworks';
import type { IllustrationFireworksType, ColorParticleData } from '../types/illustrationFireworksType';

interface HomeSceneProps {
  illustrationFireworks: IllustrationFireworksType | null;
  /** 画像から変換したカラーパーティクルデータ */
  particleData: ColorParticleData | null;
}

export type HomeSceneHandle = {
  handleLaunch: () => void;
};

// 打ち上げの開始Y座標。画面下部のコントロールパネルの裏から立ち上がってくる見え方になる
const LAUNCH_START_Y = -10;
// 爆発中心のY座標。カメラは (0,0,30) から回転無しで -Z 方向を見ているため、
// y=0 が画面中央に一致する。値を大きくすると上、小さくすると下で爆発する
const EXPLODING_CENTER_Y = 0;
// 打ち上げ（トレイル）の所要時間（秒）。爆発位置を引き上げた分、飛距離が伸びても
// 従来と近い速度感になるよう既定値（IllustrationFireworks側は2秒）より長めにする
const LAUNCH_DURATION = 3;

const HomeScene = forwardRef<HomeSceneHandle, HomeSceneProps>((props, ref) => {
  const { particleData } = props;

  const [fireworks, setFireworks] = useState<{ id: string; position: THREE.Vector3; color?: THREE.Color }[]>([]);

  useImperativeHandle(ref, () => ({ handleLaunch }));

  const handleLaunch = () => {
    if (!particleData) return;
    const id = crypto.randomUUID();
    const color = new THREE.Color(`hsl(${Math.random() * 360}, 100%, 50%)`);
    const position = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        LAUNCH_START_Y,
        (Math.random() - 0.5) * 10
    );
    setFireworks((prev) => [...prev, { id, position, color }]);
  };

  const onFinished = (id: string) => {
    setFireworks((prev) => prev.filter((fw) => fw.id !== id));
  };

  if (!particleData) return null;

  return (
      <>
        {fireworks.map((fw) => (
            <IllustrationFireworks
                key={fw.id}
                from={fw.position}
                to={new THREE.Vector3(fw.position.x, EXPLODING_CENTER_Y, fw.position.z)}
                launchDuration={LAUNCH_DURATION}
                color={fw.color}
                size={6}
                starSize={0.15}
                particleData={particleData}
                onComplete={() => onFinished(fw.id)}
            />
        ))}
      </>
  );
});

export default HomeScene;