import Modal from 'react-modal'
import QrScanner from './QrScanner';
import { COLORS, RADIUS, ghostButtonStyle } from '../../pages/homeStyles';

// アプリ要素の設定（コンポーネント外で一度だけ実行）
if (typeof window !== 'undefined' && document.getElementById('root')) {
  Modal.setAppElement('#root')
}

interface CommonModalProps {
	isOpen: boolean
  onScan: (result: string) => void; // QRコードスキャン時のコールバック関数
	closeModal: () => void
}

export default function ScanModal ({ isOpen, onScan, closeModal }: CommonModalProps) {
	return (
		<Modal
      isOpen={isOpen}
      onRequestClose={closeModal}
      style={{
        content: {
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          transform: 'translate(-50%, -50%)', // モーダルを中央に配置
          // alignContent: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '80vw', // ビューポートの幅の80%を最大幅に設定
          maxHeight: '50vh', // ビューポートの高さの50%を最大高さに設定
          overflow: 'hidden', // オーバーフローを隠す
          padding: '16px',
          borderRadius: RADIUS.lg,
          backgroundColor: COLORS.surface,
          backdropFilter: 'blur(12px) saturate(140%)',
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          zIndex: 1000, // モーダルのz-indexを設定
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.6)', // 半透明の背景色
          backdropFilter: 'blur(4px)',
        },
      }}
    >
      <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>
        QRコードをかざしてください
      </span>
      {/* QRコードスキャナーを表示 */}
      <QrScanner
        onScan={onScan} // QRコードスキャン時のコールバックを設定
      />
			<button
				onClick={closeModal}
				type="button"
				style={ghostButtonStyle}
				className="hb-pressable"
			>
				閉じる
			</button>
		</Modal>
	)
}