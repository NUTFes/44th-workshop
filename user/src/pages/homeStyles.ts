import type { CSSProperties } from 'react';

// ===== Home ページの見た目に関する定数・スタイル定義 =====
// admin/styles/adminStyles.ts と同様に、インラインstyleオブジェクトをここへ集約する。

export const ACCENT_COLOR = '#f0b810';

/** 画面下部中央に浮かぶコントロールパネル全体の位置。
 *  iPhoneのホームインジケータ等と重ならないようセーフエリア分を加算する */
export const overlayContainerStyle: CSSProperties = {
  position: 'absolute',
  bottom: 'calc(24px + env(safe-area-inset-bottom))',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '10px',
  width: 'min(340px, 92vw)',
};

/** コントロールパネルの背景カード */
const basePanelStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: '10px',
  padding: '14px 16px',
  borderRadius: '16px',
  backgroundColor: 'rgba(20, 20, 24, 0.6)',
  backdropFilter: 'blur(6px)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
};

/** コントロールパネルの背景カード（花火の打ち上げ中も含めて常に不透明のまま） */
export const panelStyle: CSSProperties = basePanelStyle;

const baseButtonStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  padding: '12px 16px',
  fontSize: '15px',
  fontWeight: 600,
  borderRadius: '12px',
  border: 'none',
  cursor: 'pointer',
};

/** 主要アクション（花火を打ち上げる） */
export const primaryButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  backgroundColor: ACCENT_COLOR,
  color: '#1a1a1a',
};

/** 副次アクション（カメラのリセット・QRスキャン） */
export const secondaryButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.25)',
};

/** 読み込み中・変換中の状態表示 */
export const statusPillStyle: CSSProperties = {
  padding: '10px 16px',
  borderRadius: '12px',
  backgroundColor: 'rgba(20, 20, 24, 0.6)',
  color: '#fff',
  fontSize: '14px',
  textAlign: 'center',
};

/** エラー表示（花火が読み込めなかった場合） */
export const errorPillStyle: CSSProperties = {
  ...statusPillStyle,
  backgroundColor: 'rgba(120, 20, 20, 0.6)',
  lineHeight: 1.6,
};

/** 詳細設定の開閉トグルボタン（パネル上部に小さく右寄せで置く） */
export const settingsToggleButtonStyle: CSSProperties = {
  alignSelf: 'flex-end',
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: 600,
  borderRadius: '8px',
  border: 'none',
  backgroundColor: 'transparent',
  color: 'rgba(255, 255, 255, 0.75)',
  cursor: 'pointer',
};

/** 折りたたみ内の設定群（画質セレクタ・カメラのリセット） */
export const settingsSectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

/** 画質セレクタの行 */
export const qualityRowContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

export const qualityLabelStyle: CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255, 255, 255, 0.75)',
};

export const qualityRowStyle: CSSProperties = {
  display: 'flex',
  gap: '6px',
};

/** 画質セレクタの各ボタン（選択状態でアクセントカラーに切り替え） */
export function qualityButtonStyle(isActive: boolean): CSSProperties {
  return {
    flex: 1,
    padding: '8px 0',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '8px',
    border: isActive ? `1px solid ${ACCENT_COLOR}` : '1px solid rgba(255, 255, 255, 0.25)',
    backgroundColor: isActive ? ACCENT_COLOR : 'rgba(255, 255, 255, 0.08)',
    color: isActive ? '#1a1a1a' : '#fff',
    cursor: 'pointer',
  };
}
