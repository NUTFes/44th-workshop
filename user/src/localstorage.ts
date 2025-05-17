import { type IllustrationFirework } from "./type/common";

// イラスト花火のデータをローカルストレージに保存する関数
export function saveIllustrationFireworksToLocalStorage(key: string, firework: IllustrationFirework): void {
  try {
    const jsonString = JSON.stringify(firework);
    localStorage.setItem(key, jsonString);
    console.log(`Array saved to localStorage with key: ${key}`);
  } catch (error) {
    console.error('Error saving array to localStorage:', error);
    // ここでエラー処理を行う (例: 容量オーバーなど)
  }
}

// ローカルストレージから指定したkeyのイラスト花火のデータを読み込む関数
export function loadIllustrationFireworkFromLocalStorage(key: string): IllustrationFirework | null {
  try {
    const jsonString = localStorage.getItem(key);
    if (jsonString === null) {
      console.log(`No data found in localStorage for key: ${key}`);
      return null; // データが存在しない場合はnullを返す
    }
    const parsedArray: IllustrationFirework = JSON.parse(jsonString);
    
    // 簡単な型チェック (より厳密なチェックも可能)
    if (
      typeof parsedArray === 'object' &&
      parsedArray !== null &&
      'id' in parsedArray &&
      'is_shareable' in parsedArray &&
      'pixel_data' in parsedArray &&
      Array.isArray(parsedArray.pixel_data) &&
      parsedArray.pixel_data.every((row: number[]) => Array.isArray(row) && row.every(item => typeof item === 'number')))
    {
      console.log(`IllustrationFirework loaded from localStorage with key: ${key}`);
      return parsedArray as IllustrationFirework;
    } else {
      console.warn(`Data found for key "${key}" is not a valid IllustrationFirework object. Returning null.`);
      localStorage.removeItem(key); // 不正なデータなら削除するのも手
      return null;
    }
  } catch (error) {
    console.error('Error loading IllustationFirework from localStorage:', error);
    return null; // エラー時もnullを返す
  }
}

// ローカルストレージから特定のキーのデータを削除する関数
export function removeArrayFromLocalStorage(key: string): void {
  localStorage.removeItem(key);
  console.log(`Data removed from localStorage for key: ${key}`);
}