'use client';

import React, { useState, useEffect, useCallback } from 'react';
import QRCode from '@/components/QRCode';

// Types
interface Firework {
  id: number;
  isShareable: boolean;
  pixelData: boolean[];
  createdAt?: string;
  updatedAt?: string;
}

export default function Home() {
  // State
  const [fireworks, setFireworks] = useState<Firework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFirework, setSelectedFirework] = useState<Firework | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isShareable, setIsShareable] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [originalImageFiles, setOriginalImageFiles] = useState<Map<number, File>>(new Map());

  // API URL - ブラウザからは必ず localhost を使用
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  // Fetch all fireworks
  const fetchFireworks = useCallback(async () => {
    setLoading(true);
    console.log('Fetching fireworks from:', API_URL);
    try {
      const response = await fetch(`${API_URL}/fireworks`);
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorMessage = `HTTP error ${response.status}`;
        console.error('Fetch failed:', errorMessage);
        setError(`Failed to fetch fireworks: ${errorMessage}`);
        setFireworks([]);
        return;
      }

      const data = await response.json();
      console.log('Fetched data:', data);

      // データがnullまたはundefinedの場合は空配列を設定
      setFireworks(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch fireworks: ${errorMessage}`);
      // エラー時も空配列を設定
      setFireworks([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // 花火を選択したときの処理
  const selectFirework = useCallback((firework: Firework) => {
    setSelectedFirework(firework);
  }, []);

  // QRコードのダウンロード機能
  const handleQRDownload = useCallback((canvas: HTMLCanvasElement) => {
    if (selectedFirework) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `hanabi-qr-${selectedFirework.id}.png`;
      link.href = url;
      link.click();
    }
  }, [selectedFirework]);

  // QRコード用のURL生成
  const generateQRUrl = useCallback((firework: Firework) => {
    // 花火表示用のURLを生成
    return `https://hanabi-stg.nutfes.net/?id=${firework.id}`;
  }, []);

  // Create a new firework
  const createFirework = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('is_shareable', isShareable.toString());

      const response = await fetch(`${API_URL}/fireworks`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `HTTP error ${response.status}: ${errorText}`;
        console.error('Create failed:', errorMessage);
        setError(`Failed to create firework: ${errorMessage}`);
        return;
      }

      const result = await response.json();

      // 作成された花火のIDに対してオリジナルファイルを保存
      if (result && result.id) {
        setOriginalImageFiles(prev => new Map(prev).set(result.id, selectedFile));
      }

      await fetchFireworks();
      setSelectedFile(null);
      setIsShareable(false);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to create firework: ${errorMessage}`);
      console.error('Error creating firework:', err);
    } finally {
      setIsCreating(false);
    }
  }, [selectedFile, isShareable, API_URL, fetchFireworks]);

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  }, []);

  // Delete firework
  const deleteFirework = useCallback(async (fireworkId: number) => {
    if (!confirm('Are you sure you want to delete this firework?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/fireworks/${fireworkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorMessage = `HTTP error ${response.status}`;
        console.error('Delete failed:', errorMessage);
        setError(`Failed to delete firework: ${errorMessage}`);
        return;
      }

      await fetchFireworks();
      // 削除された花火が選択されていた場合はクリア
      if (selectedFirework?.id === fireworkId) {
        setSelectedFirework(null);
      }
      // オリジナルファイルも削除
      setOriginalImageFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(fireworkId);
        return newMap;
      });
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to delete firework: ${errorMessage}`);
      console.error('Error deleting firework:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [API_URL, fetchFireworks, selectedFirework]);

  // Load fireworks on component mount
  useEffect(() => {
    console.log('Component mounted, fetching fireworks...');
    fetchFireworks();
  }, [fetchFireworks]);

  // デバッグ用：fireworksの状態をログ出力
  useEffect(() => {
    console.log('Fireworks state changed:', fireworks);
  }, [fireworks]);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '1.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  };

  const mainStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
    marginBottom: '1.5rem',
    border: '1px solid #e2e8f0',
  };

  const primaryButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    margin: '0.25rem',
    fontWeight: '600',
    fontSize: '0.875rem',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #38b2ac 0%, #319795 100%)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    margin: '0.25rem',
    fontWeight: '600',
    fontSize: '0.875rem',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(56, 178, 172, 0.3)',
  };

  const dangerButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    margin: '0.25rem',
    fontWeight: '600',
    fontSize: '0.875rem',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(245, 101, 101, 0.3)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
    transition: 'border-color 0.2s ease',
    outline: 'none',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
  };

  const fireworkItemStyle = (isSelected: boolean): React.CSSProperties => ({
    border: isSelected ? '2px solid #667eea' : '2px solid #e2e8f0',
    padding: '1.25rem',
    marginBottom: '0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: isSelected ? '#f7fafc' : 'transparent',
    transition: 'all 0.2s ease',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  });

  const statusBadgeStyle = (isShareable: boolean): React.CSSProperties => ({
    backgroundColor: isShareable ? '#48bb78' : '#ed8936',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
  });

  return (
      <div style={containerStyle}>
        <header style={headerStyle}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0 }}>
            🎆 Fireworks Admin Dashboard
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
            Manage and generate QR codes for firework displays
          </p>
        </header>

        <main style={mainStyle}>
          {error && (
              <div style={{
                backgroundColor: '#fed7d7',
                borderLeft: '4px solid #e53e3e',
                color: '#c53030',
                padding: '1rem',
                marginBottom: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(245, 101, 101, 0.1)',
              }}>
                <p style={{ fontWeight: '600' }}>⚠️ Error: {error}</p>
                <button
                    onClick={() => setError(null)}
                    style={{
                      ...dangerButtonStyle,
                      marginTop: '0.5rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.75rem',
                    }}
                >
                  Dismiss
                </button>
              </div>
          )}

          <div style={gridStyle}>
            {/* Fireworks List */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2d3748' }}>
                📋 Fireworks List
              </h2>
              {loading ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{
                      display: 'inline-block',
                      width: '40px',
                      height: '40px',
                      border: '4px solid #e2e8f0',
                      borderTop: '4px solid #667eea',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '1rem'
                    }}></div>
                    <p style={{ color: '#718096' }}>Loading fireworks...</p>
                  </div>
              ) : !fireworks || fireworks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#718096' }}>
                    <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>🎭 No fireworks found</p>
                    <p>Create your first firework below!</p>
                  </div>
              ) : (
                  <div>
                    <p style={{ marginBottom: '1rem', color: '#718096', fontSize: '0.875rem' }}>
                      💡 Click on a firework to view its QR code
                    </p>
                    {fireworks.map((firework) => (
                        <div key={firework.id}
                             style={fireworkItemStyle(selectedFirework?.id === firework.id)}
                             onClick={() => selectFirework(firework)}
                        >
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#2d3748' }}>
                              🎆 Firework #{firework.id}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={statusBadgeStyle(firework.isShareable)}>
                                {firework.isShareable ? '🌐 Shareable' : '🔒 Private'}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                                📅 {firework.createdAt ? new Date(firework.createdAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                          <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFirework(firework.id);
                              }}
                              disabled={isDeleting}
                              style={{
                                ...dangerButtonStyle,
                                padding: '0.5rem 1rem',
                                fontSize: '0.75rem',
                                opacity: isDeleting ? 0.6 : 1,
                              }}
                              title="Delete firework"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                    ))}
                  </div>
              )}

              <div style={{
                marginTop: '2rem',
                borderTop: '2px solid #e2e8f0',
                paddingTop: '2rem'
              }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '1rem', color: '#2d3748' }}>
                  ✨ Add New Firework
                </h3>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#4a5568'
                  }}>
                    📁 Image File:
                  </label>
                  <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{
                        ...inputStyle,
                        borderColor: selectedFile ? '#48bb78' : '#e2e8f0'
                      }}
                  />
                  {selectedFile && (
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#48bb78',
                        marginBottom: '1rem',
                        fontWeight: '500'
                      }}>
                        ✅ Selected: {selectedFile.name}
                      </p>
                  )}

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    backgroundColor: '#f7fafc',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0'
                  }}>
                    <input
                        type="checkbox"
                        checked={isShareable}
                        onChange={(e) => setIsShareable(e.target.checked)}
                        style={{
                          marginRight: '0.75rem',
                          width: '1rem',
                          height: '1rem',
                          accentColor: '#667eea'
                        }}
                    />
                    <span style={{ fontWeight: '500', color: '#2d3748' }}>
                      🌐 Make this firework shareable
                    </span>
                  </label>

                  <button
                      onClick={createFirework}
                      disabled={!selectedFile || isCreating}
                      style={{
                        ...primaryButtonStyle,
                        width: '100%',
                        padding: '1rem',
                        fontSize: '0.875rem',
                        opacity: (!selectedFile || isCreating) ? 0.6 : 1,
                        cursor: (!selectedFile || isCreating) ? 'not-allowed' : 'pointer',
                      }}
                  >
                    {isCreating ? '⏳ Creating...' : '🚀 Create Firework'}
                  </button>
                </div>
              </div>
            </div>

            {/* QR Code Display */}
            {selectedFirework && (
                <div style={cardStyle}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2d3748' }}>
                    📱 QR Code for Firework #{selectedFirework.id}
                  </h2>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ marginBottom: '1.5rem', color: '#718096' }}>
                      📸 Scan this QR code to view the firework
                    </p>

                    <QRCode
                        url={generateQRUrl(selectedFirework)}
                        size={200}
                        fireworkId={selectedFirework.id}
                        originalImageFile={originalImageFiles.get(selectedFirework.id)}
                        onDownload={handleQRDownload}
                        onError={(error) => setError(error)}
                    />

                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      backgroundColor: '#edf2f7',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      wordBreak: 'break-all',
                      border: '1px solid #e2e8f0'
                    }}>
                      <strong style={{ color: '#2d3748' }}>🔗 URL:</strong>
                      <br />
                      <span style={{ color: '#667eea', fontFamily: 'monospace' }}>
                        {generateQRUrl(selectedFirework)}
                      </span>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#718096',
                        marginBottom: '0.75rem',
                        fontWeight: '500'
                      }}>
                        📊 Firework Details:
                      </div>
                      <div style={{
                        textAlign: 'left',
                        backgroundColor: '#f7fafc',
                        padding: '1rem',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong style={{ color: '#2d3748' }}>🆔 ID:</strong> {selectedFirework.id}
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong style={{ color: '#2d3748' }}>🌐 Shareable:</strong>
                          <span style={statusBadgeStyle(selectedFirework.isShareable)}>
                            {selectedFirework.isShareable ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong style={{ color: '#2d3748' }}>📅 Created:</strong> {selectedFirework.createdAt ? new Date(selectedFirework.createdAt).toLocaleString() : 'N/A'}
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong style={{ color: '#2d3748' }}>🔄 Updated:</strong> {selectedFirework.updatedAt ? new Date(selectedFirework.updatedAt).toLocaleString() : 'N/A'}
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong style={{ color: '#2d3748' }}>🎨 Pixel Data:</strong> {selectedFirework.pixelData?.length || 0} pixels
                        </div>
                        <div>
                          <strong style={{ color: '#2d3748' }}>🖼️ Original Image:</strong> {originalImageFiles.has(selectedFirework.id) ? '✅ Available' : '❌ Not available'}
                        </div>
                      </div>
                    </div>

                    <button
                        onClick={() => setSelectedFirework(null)}
                        style={{
                          ...secondaryButtonStyle,
                          marginTop: '1.5rem',
                          padding: '0.75rem 1.5rem',
                        }}
                    >
                      ✖️ Close
                    </button>
                  </div>
                </div>
            )}
          </div>

          {/* Refresh Button */}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
                onClick={fetchFireworks}
                disabled={loading}
                style={{
                  ...primaryButtonStyle,
                  padding: '1rem 2rem',
                  fontSize: '0.875rem',
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
            >
              {loading ? '⏳ Loading...' : '🔄 Refresh Fireworks'}
            </button>
          </div>
        </main>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }
          
          input[type="file"]:focus,
          input[type="file"]:hover {
            border-color: #667eea;
          }
        `}</style>
      </div>
  );
}