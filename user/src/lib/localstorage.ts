import type {
	IllustrationFireworksType
} from "../types/illustrationFireworksType";

// イラスト花火のデータをローカルストレージに保存する関数
export function saveIllustrationFireworksToLocalStorage(firework: IllustrationFireworksType): void {
  try {
    const key = firework.id.toString(); // IllustrationFireworksTypeのIDをキーとして使用
    const jsonString = JSON.stringify(firework);  // IllustrationFireworksTypeオブジェクトをJSON文字列に変換
    // ローカルストレージに保存
    localStorage.setItem(key, jsonString);
    console.log(`Array saved to localStorage with key: ${key}`);
  } catch (error) {
    // エラー処理
    console.error('Error saving array to localStorage:', error);
  }
}

// ローカルストレージから指定したkeyのイラスト花火のデータを読み込む関数
export function loadIllustrationFireworksFromLocalStorage(key: string): IllustrationFireworksType | null {
  try {
    // ローカルストレージからデータを取得
    const jsonString = localStorage.getItem(key);
    if (jsonString === null) {
      console.log(`No data found in localStorage for key: ${key}`);
      return null; // データが存在しない場合はnullを返す
    }
    // JSON文字列をIllustrationFireworksTypeオブジェクトに変換
    const parsedArray: IllustrationFireworksType = JSON.parse(jsonString);

    // 簡単な型チェック (より厳密なチェックも可能)
    if (
      typeof parsedArray === 'object' &&
      parsedArray !== null &&
      'id' in parsedArray &&
      'isShareable' in parsedArray &&
      'pixelData' in parsedArray &&
      Array.isArray(parsedArray.pixelData) &&
      parsedArray.pixelData.every((row: boolean[]) => Array.isArray(row) && row.every(item => typeof item === 'boolean')))
    {
      // データが正しい形式であれば返す
      console.log(`IllustrationFireworksType loaded from localStorage with key: ${key}`);
      return parsedArray as IllustrationFireworksType;
    } else {
      // データが不正な形式の場合はnullを返す
      console.warn(`Data found for key "${key}" is not a valid IllustrationFireworksType object. Returning null.`);
      // localStorage.removeItem(key); // 不正なデータなら削除するのも手
      return null;
    }
  } catch (error) {
    console.error('Error loading IllustrationFireworksType from localStorage:', error);
    return null; // エラー時もnullを返す
  }
}

// ローカルストレージから特定のキーのデータを削除する関数
export function removeArrayFromLocalStorage(key: string): void {
  localStorage.removeItem(key);
  console.log(`Data removed from localStorage for key: ${key}`);
}