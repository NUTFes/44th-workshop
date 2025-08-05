import { useState } from 'react'
import { 
  useSearchParams
} from 'react-router-dom'
import { 
  useEffect,
} from 'react'
import type { IllustrationFireworksType } from '../types/illustrationFireworksType';
import { 
  loadIllustrationFireworksFromLocalStorage,
  saveIllustrationFireworksToLocalStorage
} from '../lib/localstorage';
import { useGetFireworkById } from '../apiClient/fireworks/myARProjectAPI';
import ScanModal from '../components/common/ScanModal';

import HomeCanvas from "../canvas/HomeCanvas";

// ===== Homeのページ =====
// ページではデータフェッチやローカルストレージの読み書きを行う
export default function Home() {
  // イラスト花火のデータを管理する状態
  const [illustrationFireworks, setIllustrationFireworks] = useState<IllustrationFireworksType | null>(null)
  // モーダルの開閉状態を管理する状態
  const [isOpen, setIsOpen] = useState(false)
  // クエリパラメータを管理する状態
  const [searchParams, setSearchParams] = useSearchParams()
  
  // URLパラメータからIDを取得
  const currentId = searchParams.get('id') || '0'
  const validId = !isNaN(Number(currentId)) ? currentId : '0'
  console.log('ID from URL:', validId)
  
  // APIから花火データを取得（条件付きで有効化）
  const { data, isLoading, error } = useGetFireworkById(Number(validId), {
    query: {
      enabled: Boolean(validId) && !isNaN(Number(validId)) && Number(validId) > 0,
      staleTime: 5 * 60 * 1000, // 5分間キャッシュ
      gcTime: 10 * 60 * 1000, // 10分間メモリに保持
      retry: (failureCount, error) => {
        // AbortErrorの場合はリトライしない
        if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  })
  
  
  // QRコードスキャン時のコールバック関数
  const onScan = (result: string) => {
    let id = result.match(/id=(\d+)/)?.[1] ?? null; // 正規表現でIDを抽出
    if (id) {
      console.log('QR Code ID:', id);
      // URLのクエリパラメータを更新
      searchParams.set('id', id);
      setSearchParams(searchParams);
      setIsOpen(false); // モーダルを閉じる
    }
  }
  
  
  // ローカルストレージのチェック（IDが変更された時のみ）
  useEffect(() => {
    if (!validId) return  // 有効なIDがない場合は何もしない
    console.log('Checking localStorage for ID:', validId)
    
    // ローカルストレージからデータを取得
    const storedData = loadIllustrationFireworksFromLocalStorage(validId)
    if (storedData) {
      // データが存在する場合は状態にセット
      setIllustrationFireworks(storedData)
      console.log('✅ Loaded from localStorage:', storedData)
    } else {
      // ローカルストレージにデータがない場合、illustrationFireworksをnullにしてAPIデータの取得を待つ
      console.log('⚠️ No data in localStorage for ID:', validId)
      setIllustrationFireworks(null)
    }
  }, [validId]) // validIdが変更された時のみ実行
  
  // APIデータの処理
  useEffect(() => {
    if (!data) return // 既にデータがある場合はスキップ
    
    // 既にローカルストレージにデータがある場合はスキップ
    if (illustrationFireworks && illustrationFireworks.id === data.id) {
      console.log('⏭️ Skip API data processing - already have data')
      return
    }
    
    console.log('Fireworks Data:', data)
    
    try {
      const width = Math.sqrt(data.pixelData.length)  // ピクセルデータの幅を計算
      // pixelData(boolean[])をboolean[][]に変換
      const fetchedPixelData = data.pixelData.reduce((acc: boolean[][], val: boolean, index: number) => {
        const rowIndex = Math.floor(index / width)  // 行のインデックスを計算
        if (!acc[rowIndex]) {
          acc[rowIndex] = []  // 行がまだ存在しない場合は初期化
        }
        acc[rowIndex].push(val)
        return acc
      }, [])
      
      // 変換したデータを状態にセット
      setIllustrationFireworks({
        ...data,
        pixelData: fetchedPixelData
      })
      
      // ローカルストレージに保存
      saveIllustrationFireworksToLocalStorage({
        ...data,
        pixelData: fetchedPixelData
      })
    } catch (error) {
      console.error('Error processing pixelData:', error)
      setIllustrationFireworks(null) // エラー時はnullに設定
    }
  }, [data])
  
  // エラーハンドリング
  useEffect(() => {
    if (isLoading) {
      console.log('Loading fireworks data...')
    } else if (error) {
      console.error('Error fetching fireworks data:', error)
    }
  }, [isLoading, error])
  
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* イラスト花火のデータが読み込まれた場合はHomeCanvasを表示 */}
      <HomeCanvas
        illustrationFireworks={illustrationFireworks} // イラスト花火のデータを渡す
      />
      <button
        onClick={() => setIsOpen(true)} // モーダルを開く
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          marginTop: '20px',
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          // zIndex: 500,
        }}
      >
        QRコードをスキャン
      </button>
      <ScanModal
        isOpen={isOpen} // モーダルの開閉状態を渡す
        onScan={onScan} // QRコードスキャン時のコールバック関数を渡す
        closeModal={() => setIsOpen(false)} // モーダルを閉じる関数を渡す
      />
    </div>
  );
}