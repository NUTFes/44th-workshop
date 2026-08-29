'use client';

import { useEffect } from 'react';
import QRCode from '@/components/QRCode';
import { secondaryButtonStyle, statusBadgeStyle } from '@/styles/adminStyles';
import type { Firework } from '@/hooks/useFireworks';

interface QRCodePanelProps {
  firework: Firework;
  qrUrl: string;
  originalImageFile: File | undefined;
  isTogglingShareable: boolean;
  onDownload: (canvas: HTMLCanvasElement) => void;
  onError: (error: string) => void;
  onToggleShareable: (id: number, next: boolean) => void;
  onClose: () => void;
}

export default function QRCodePanel({
  firework,
  qrUrl,
  originalImageFile,
  isTogglingShareable,
  onDownload,
  onError,
  onToggleShareable,
  onClose,
}: QRCodePanelProps) {
  // Escapeキーでも閉じられるようにする（マウント中のみリスナーを張り、確実に解除する）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        // ダイアログ内で始めたドラッグ（例: 会場URLの選択）が背景で終わると
        // click の target がオーバーレイ自身になるため、target/currentTarget が
        // 一致する場合のみ閉じる（背景そのものをクリックした場合のみ閉じる）
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h2 id="qr-modal-title" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2d3748' }}>
          📱 花火のQRコード #{firework.id}
        </h2>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '1.5rem', color: '#718096' }}>
            📸 このQRコードを印刷
          </p>

          <QRCode
            url={qrUrl}
            size={200}
            fireworkId={firework.id}
            imageUrl={firework.imageUrl}
            originalImageFile={originalImageFile}
            onDownload={onDownload}
            onError={onError}
          />

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#edf2f7',
            borderRadius: '8px',
            fontSize: '0.875rem',
            wordBreak: 'break-all',
            border: '1px solid #e2e8f0',
          }}>
            <strong style={{ color: '#2d3748' }}>🔗 花火打ち上げ会場URL:</strong>
            <br />
            <span style={{ color: '#667eea', fontFamily: 'monospace' }}>
              {qrUrl}
            </span>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <div style={{
              fontSize: '0.875rem',
              color: '#718096',
              marginBottom: '0.75rem',
              fontWeight: '500',
            }}>
              📊 花火の詳細:
            </div>
            <div style={{
              textAlign: 'left',
              backgroundColor: '#f7fafc',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#2d3748' }}>🆔 ID:</strong> {firework.id}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#2d3748' }}>🌐 公開設定:</strong>
                <span style={statusBadgeStyle(firework.isShareable)}>
                  {firework.isShareable ? 'Yes' : 'No'}
                </span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#2d3748' }}>📅 作成日:</strong>{' '}
                {firework.createdAt ? new Date(firework.createdAt).toLocaleString() : 'N/A'}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#2d3748' }}>🔄 更新済み:</strong>{' '}
                {firework.updatedAt ? new Date(firework.updatedAt).toLocaleString() : 'N/A'}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#2d3748' }}>🎨 画素データ:</strong>{' '}
                {firework.pixelData?.length || 0} pixels
              </div>
              <div>
                <strong style={{ color: '#2d3748' }}>🖼️ 画像の印刷:</strong>{' '}
                {originalImageFile
                  ? '✅ Available (saved in localStorage)'
                  : '❌ Not available'}
              </div>
            </div>
          </div>

          <button
            onClick={() => onToggleShareable(firework.id, !firework.isShareable)}
            disabled={isTogglingShareable}
            style={{
              ...secondaryButtonStyle,
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              opacity: isTogglingShareable ? 0.6 : 1,
              cursor: isTogglingShareable ? 'not-allowed' : 'pointer',
            }}
          >
            {isTogglingShareable
              ? '⏳ 更新中...'
              : firework.isShareable
                ? '🔒 非公開にする'
                : '🌐 公開にする'}
          </button>

          <button
            onClick={onClose}
            style={{
              ...secondaryButtonStyle,
              marginTop: '0.75rem',
              padding: '0.75rem 1.5rem',
            }}
          >
            ✖️ 閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
