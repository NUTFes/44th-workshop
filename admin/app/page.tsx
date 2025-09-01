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
    backgroundColor: '#f9fafb',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '1rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const mainStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '1rem',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    margin: '0.25rem',
  };

  const deleteButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#dc2626',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    marginBottom: '1rem',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1rem',
  };

  return (
      <div style={containerStyle}>
        <header style={headerStyle}>
          <h1>Fireworks Admin Dashboard</h1>
        </header>

        <main style={mainStyle}>
          {error && (
              <div style={{
                backgroundColor: '#fee2e2',
                borderLeft: '4px solid #ef4444',
                color: '#dc2626',
                padding: '1rem',
                marginBottom: '1rem',
                borderRadius: '4px',
              }}>
                <p><strong>Error:</strong> {error}</p>
                <button
                    onClick={() => setError(null)}
                    style={{ ...buttonStyle, backgroundColor: '#dc2626', marginTop: '0.5rem' }}
                >
                  Dismiss
                </button>
              </div>
          )}

          <div style={gridStyle}>
            {/* Fireworks List */}
            <div style={cardStyle}>
              <h2>Fireworks List</h2>
              {loading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>Loading fireworks...</p>
                  </div>
              ) : !fireworks || fireworks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    <p>No fireworks found</p>
                    <p>Create your first firework below!</p>
                  </div>
              ) : (
                  <div>
                    <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                      Click on a firework to view its QR code
                    </p>
                    {fireworks.map((firework) => (
                        <div key={firework.id} style={{
                          border: '1px solid #e5e7eb',
                          padding: '1rem',
                          marginBottom: '0.5rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: selectedFirework?.id === firework.id ? '#e0f2fe' : 'transparent',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                             onClick={() => selectFirework(firework)}
                        >
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                              Firework #{firework.id}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        <span style={{ marginRight: '1rem' }}>
                          {firework.isShareable ? 'Shareable' : 'Private'}
                        </span>
                              <span>
                          {firework.createdAt ? new Date(firework.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                            </div>
                          </div>
                          <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFirework(firework.id);
                              }}
                              disabled={isDeleting}
                              style={deleteButtonStyle}
                              title="Delete firework"
                          >
                            Delete
                          </button>
                        </div>
                    ))}
                  </div>
              )}

              <div style={{ marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                <h3>Add New Firework</h3>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Image File:
                  </label>
                  <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={inputStyle}
                  />
                  {selectedFile && (
                      <p style={{ fontSize: '0.875rem', color: '#059669', marginBottom: '1rem' }}>
                        Selected: {selectedFile.name}
                      </p>
                  )}

                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={isShareable}
                        onChange={(e) => setIsShareable(e.target.checked)}
                        style={{ marginRight: '0.5rem' }}
                    />
                    Make this firework shareable
                  </label>

                  <button
                      onClick={createFirework}
                      disabled={!selectedFile || isCreating}
                      style={{
                        ...buttonStyle,
                        opacity: (!selectedFile || isCreating) ? 0.5 : 1,
                        width: '100%',
                      }}
                  >
                    {isCreating ? 'Creating...' : 'Create Firework'}
                  </button>
                </div>
              </div>
            </div>

            {/* QR Code Display */}
            {selectedFirework && (
                <div style={cardStyle}>
                  <h2>QR Code for Firework #{selectedFirework.id}</h2>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                      Scan this QR code to view the firework
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
                      marginTop: '1rem',
                      padding: '0.75rem',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      wordBreak: 'break-all'
                    }}>
                      <strong>URL:</strong> {generateQRUrl(selectedFirework)}
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Firework Details:
                      </div>
                      <div style={{
                        textAlign: 'left',
                        backgroundColor: '#f9fafb',
                        padding: '1rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        <div><strong>ID:</strong> {selectedFirework.id}</div>
                        <div><strong>Shareable:</strong> {selectedFirework.isShareable ? 'Yes' : 'No'}</div>
                        <div><strong>Created:</strong> {selectedFirework.createdAt ? new Date(selectedFirework.createdAt).toLocaleString() : 'N/A'}</div>
                        <div><strong>Updated:</strong> {selectedFirework.updatedAt ? new Date(selectedFirework.updatedAt).toLocaleString() : 'N/A'}</div>
                        <div><strong>Pixel Data:</strong> {selectedFirework.pixelData?.length || 0} pixels</div>
                        <div><strong>Original Image:</strong> {originalImageFiles.has(selectedFirework.id) ? 'Available' : 'Not available'}</div>
                      </div>
                    </div>

                    <button
                        onClick={() => setSelectedFirework(null)}
                        style={{
                          ...buttonStyle,
                          backgroundColor: '#6b7280',
                          marginTop: '1rem',
                        }}
                    >
                      Close
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
                  ...buttonStyle,
                  opacity: loading ? 0.5 : 1,
                }}
            >
              {loading ? 'Loading...' : 'Refresh Fireworks'}
            </button>
          </div>
        </main>
      </div>
  );
}