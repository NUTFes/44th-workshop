'use client';

import React, { useState, useEffect, useCallback } from 'react';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isShareable, setIsShareable] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    marginBottom: '1rem',
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
              }}>
                <p>{error}</p>
                <button
                    onClick={() => setError(null)}
                    style={{ ...buttonStyle, backgroundColor: '#dc2626' }}
                >
                  Dismiss
                </button>
              </div>
          )}

          <div style={cardStyle}>
            <h2>Fireworks List</h2>
            {loading ? (
                <p>Loading...</p>
            ) : !fireworks || fireworks.length === 0 ? (
                <p>No fireworks found</p>
            ) : (
                <div>
                  {fireworks.map((firework) => (
                      <div key={firework.id} style={{
                        border: '1px solid #e5e7eb',
                        padding: '0.5rem',
                        marginBottom: '0.5rem',
                        borderRadius: '4px',
                      }}>
                        <strong>ID: {firework.id}</strong> -
                        Shareable: {firework.isShareable ? 'Yes' : 'No'} -
                        Created: {firework.createdAt ? new Date(firework.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                  ))}
                </div>
            )}

            <h3>Add New Firework</h3>
            <div>
              <label>
                Image:
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={inputStyle}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                    type="checkbox"
                    checked={isShareable}
                    onChange={(e) => setIsShareable(e.target.checked)}
                    style={{ marginRight: '0.5rem' }}
                />
                Shareable
              </label>

              <button
                  onClick={createFirework}
                  disabled={!selectedFile || isCreating}
                  style={{
                    ...buttonStyle,
                    opacity: (!selectedFile || isCreating) ? 0.5 : 1,
                  }}
              >
                {isCreating ? 'Creating...' : 'Create Firework'}
              </button>
            </div>
          </div>
        </main>
      </div>
  );
}