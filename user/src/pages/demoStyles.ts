import type { CSSProperties } from 'react';
import { ACCENT_COLOR } from './homeStyles';

// ===== Demo ページの見た目に関する定数・スタイル定義 =====
// homeStyles.ts と同様に、インラインstyleオブジェクトをここへ集約する。
// コントロールパネル系のスタイルは homeStyles.ts のものを再利用し、
// Demo画面固有の「AR花火への誘導テキスト」部分のみここで定義する。

/** 画面上部中央に浮かぶ誘導テキストの位置（ノッチ等のセーフエリアを避ける） */
export const guideContainerStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'min(340px, 92vw)',
  zIndex: 1000,
  // Canvas側のタッチ操作（カメラ操作等）を妨げないようにする
  pointerEvents: 'none',
};

/** 誘導テキストの背景カード（コントロールパネルと同じ質感に揃える） */
export const guideCardStyle: CSSProperties = {
  boxSizing: 'border-box',
  padding: '14px 16px',
  borderRadius: '16px',
  backgroundColor: 'rgba(20, 20, 24, 0.6)',
  backdropFilter: 'blur(6px)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
  textAlign: 'center',
};

/** 誘導テキストのタイトル */
export const guideTitleStyle: CSSProperties = {
  color: ACCENT_COLOR,
  fontSize: '16px',
  fontWeight: 700,
  marginBottom: '6px',
};

/** 誘導テキストの本文（定数内の \n で改行させるため pre-line） */
export const guideTextStyle: CSSProperties = {
  color: '#fff',
  fontSize: '14px',
  lineHeight: 1.6,
  whiteSpace: 'pre-line',
};
