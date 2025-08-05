import DetectorCanvas from "../canvas/DetectorCanvas";

// ===== Detectorのページ =====
// ジャンプを検出して花火を打ち上げる
// ページではデータフェッチやローカルストレージの読み書きを行う
export default function Detector() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <DetectorCanvas/>
    </div>
  );
}