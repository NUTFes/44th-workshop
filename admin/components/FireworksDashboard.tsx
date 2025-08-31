import React, { useState, useEffect, useCallback } from 'react';

// Types
interface Firework {
  id: number;
  isShareable: boolean;
  pixelData: boolean[];
  createdAt?: string;
  updatedAt?: string;
}

export default function FireworksDashboard() {
  // State
  const [fireworks, setFireworks] = useState<Firework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFirework, setSelectedFirework] = useState<Firework | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isShareable, setIsShareable] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // API URL - should be configurable in a real application
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  // Fetch all fireworks
  const fetchFireworks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/fireworks`);
      if (!response.ok) {
        const errorMessage = `HTTP error ${response.status}`;
        console.error('Fetch failed:', errorMessage);
        setError(`Failed to fetch fireworks: ${errorMessage}`);
        setFireworks([]);
        return;
      }
      const data = await response.json();
      setFireworks(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch fireworks: ${errorMessage}`);
      console.error('Error fetching fireworks:', err);
      setFireworks([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // Fetch a single firework by ID
  const fetchFirework = useCallback(async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/fireworks/${id}`);
      if (!response.ok) {
        const errorMessage = `HTTP error ${response.status}`;
        console.error('Fetch firework failed:', errorMessage);
        setError(`Failed to fetch firework: ${errorMessage}`);
        return;
      }
      const data = await response.json();
      setSelectedFirework(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch firework: ${errorMessage}`);
      console.error('Error fetching firework:', err);
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

      // Success - refresh the list
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

  // Update a firework's shareable status
  const updateFirework = useCallback(async (id: number, newIsShareable: boolean) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`${API_URL}/fireworks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isShareable: newIsShareable }),
      });

      if (!response.ok) {
        const errorMessage = `HTTP error ${response.status}`;
        console.error('Update failed:', errorMessage);
        setError(`Failed to update firework: ${errorMessage}`);
        return;
      }

      // Update local state
      await fetchFireworks();
      if (selectedFirework?.id === id) {
        setSelectedFirework({
          ...selectedFirework,
          isShareable: newIsShareable,
        });
      }
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to update firework: ${errorMessage}`);
      console.error('Error updating firework:', err);
    } finally {
      setIsUpdating(false);
    }
  }, [API_URL, fetchFireworks, selectedFirework]);

  // Delete a firework
  const deleteFirework = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this firework?')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/fireworks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorMessage = `HTTP error ${response.status}`;
        console.error('Delete failed:', errorMessage);
        setError(`Failed to delete firework: ${errorMessage}`);
        return;
      }

      // Update local state
      await fetchFireworks();
      if (selectedFirework?.id === id) {
        setSelectedFirework(null);
      }
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to delete firework: ${errorMessage}`);
      console.error('Error deleting firework:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [API_URL, fetchFireworks, selectedFirework]);

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  }, []);

  // Load fireworks on component mount
  useEffect(() => {
    fetchFireworks();
  }, [fetchFireworks]);

  // Render the firework preview
  const renderFireworkPreview = useCallback((pixelData: boolean[], size: number = 100) => {
    if (!pixelData || pixelData.length === 0) return null;

    // Assuming the pixelData is a 1D array of booleans representing a square grid
    const dimension = Math.sqrt(pixelData.length);
    if (dimension !== Math.floor(dimension)) {
      console.error('Pixel data is not a perfect square');
      return null;
    }

    const pixelSize = size / dimension;

    return (
        <div
            className="bg-black border border-gray-300"
            style={{ width: `${size}px`, height: `${size}px`, position: 'relative' }}
        >
          {pixelData.map((isActive, index) => {
            const x = index % dimension;
            const y = Math.floor(index / dimension);
            return (
                <div
                    key={index}
                    style={{
                      position: 'absolute',
                      left: `${x * pixelSize}px`,
                      top: `${y * pixelSize}px`,
                      width: `${pixelSize}px`,
                      height: `${pixelSize}px`,
                      backgroundColor: isActive ? 'white' : 'transparent',
                    }}
                />
            );
          })}
        </div>
    );
  }, []);

  return (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white">
        <header className="bg-indigo-600 dark:bg-indigo-800 text-white p-4 shadow-md">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold">Fireworks Admin Dashboard</h1>
          </div>
        </header>

        <main className="container mx-auto p-4">
          {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 dark:bg-red-900 dark:text-red-100">
                <p>{error}</p>
                <button
                    className="underline text-sm mt-1"
                    onClick={() => setError(null)}
                >
                  Dismiss
                </button>
              </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Fireworks List */}
            <div className="md:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Fireworks</h2>

              {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                  </div>
              ) : fireworks.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No fireworks found</p>
              ) : (
                  <div className="overflow-y-auto max-h-[500px]">
                    <table className="min-w-full">
                      <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="py-2 text-left">ID</th>
                        <th className="py-2 text-left">Shareable</th>
                        <th className="py-2 text-left">Created</th>
                        <th className="py-2 text-left">Actions</th>
                      </tr>
                      </thead>
                      <tbody>
                      {fireworks.map((firework) => (
                          <tr
                              key={firework.id}
                              className={`border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                                  selectedFirework?.id === firework.id ? 'bg-blue-50 dark:bg-blue-900' : ''
                              }`}
                              onClick={() => fetchFirework(firework.id)}
                          >
                            <td className="py-2">{firework.id}</td>
                            <td className="py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                              firework.isShareable
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {firework.isShareable ? 'Yes' : 'No'}
                          </span>
                            </td>
                            <td className="py-2">
                              {firework.createdAt
                                  ? new Date(firework.createdAt).toLocaleDateString()
                                  : 'N/A'}
                            </td>
                            <td className="py-2 flex space-x-2">
                              <button
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateFirework(firework.id, !firework.isShareable);
                                  }}
                                  disabled={isUpdating}
                              >
                                {isUpdating ? '...' : 'Toggle'}
                              </button>
                              <button
                                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteFirework(firework.id);
                                  }}
                                  disabled={isDeleting}
                              >
                                {isDeleting ? '...' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
              )}

              {/* Create New Firework */}
              <div className="mt-6 border-t dark:border-gray-700 pt-4">
                <h3 className="font-medium mb-2">Add New Firework</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Image
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full border dark:border-gray-600 rounded p-2 dark:bg-gray-700"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Select a square image (will be processed to 100x100)
                    </p>
                  </div>

                  <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="is-shareable"
                        checked={isShareable}
                        onChange={(e) => setIsShareable(e.target.checked)}
                        className="mr-2"
                    />
                    <label htmlFor="is-shareable">Shareable</label>
                  </div>

                  <button
                      onClick={createFirework}
                      disabled={!selectedFile || isCreating}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Firework'}
                  </button>
                </div>
              </div>
            </div>

            {/* Firework Details */}
            <div className="md:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Firework Details</h2>

              {selectedFirework ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="mb-4">
                        <h3 className="text-lg font-medium mb-2">Preview</h3>
                        <div className="flex justify-center">
                          {renderFireworkPreview(selectedFirework.pixelData, 300)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-2">Info</h3>
                      <table className="w-full">
                        <tbody>
                        <tr>
                          <td className="py-2 font-semibold">ID:</td>
                          <td>{selectedFirework.id}</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-semibold">Shareable:</td>
                          <td>
                          <span className={`px-2 py-1 rounded-full ${
                              selectedFirework.isShareable
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {selectedFirework.isShareable ? 'Yes' : 'No'}
                          </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 font-semibold">Created:</td>
                          <td>
                            {selectedFirework.createdAt
                                ? new Date(selectedFirework.createdAt).toLocaleString()
                                : 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 font-semibold">Updated:</td>
                          <td>
                            {selectedFirework.updatedAt
                                ? new Date(selectedFirework.updatedAt).toLocaleString()
                                : 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 font-semibold">Pixel Count:</td>
                          <td>{selectedFirework.pixelData?.length || 0}</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-semibold">Active Pixels:</td>
                          <td>
                            {selectedFirework.pixelData?.filter(Boolean).length || 0}
                            ({selectedFirework.pixelData?.length ? Math.round((selectedFirework.pixelData.filter(Boolean).length / selectedFirework.pixelData.length) * 100) : 0}%)
                          </td>
                        </tr>
                        </tbody>
                      </table>

                      <div className="mt-6 space-y-3">
                        <button
                            onClick={() => updateFirework(selectedFirework.id, !selectedFirework.isShareable)}
                            disabled={isUpdating}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
                        >
                          {isUpdating
                              ? 'Updating...'
                              : `Make ${selectedFirework.isShareable ? 'Private' : 'Shareable'}`}
                        </button>

                        <button
                            onClick={() => deleteFirework(selectedFirework.id)}
                            disabled={isDeleting}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete Firework'}
                        </button>
                      </div>
                    </div>
                  </div>
              ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p>Select a firework from the list to view details</p>
                  </div>
              )}
            </div>
          </div>
        </main>

        <footer className="bg-gray-100 dark:bg-gray-800 p-4 mt-8 text-center text-gray-600 dark:text-gray-400">
          <p>Fireworks Admin Dashboard &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
  );
}