import { API_BASE_URL } from "../config/apiConfig";

export const customFetch = async <TData>(
  url: string,
  options: RequestInit = {}
): Promise<TData> => {
  const baseUrl = API_BASE_URL || "http://localhost:8080"; // デフォルトのベースURLを設定
  // const baseUrl = import.meta.env.VITE_API_BASE_URL;  // /環境変数から取得(開発時しか有効ではない)
  // const baseUrl = process.env.VITE_API;
  // const baseUrl = "http://localhost:8080"; // 環境変数などから取得するのが望ましい
  // const baseUrl = "https://yr-tactics-widespread-codes.trycloudflare.com";
  console.log("Base URL:", baseUrl);
  const requestUrl = new URL(url, baseUrl);

  const headers = {
    "Content-Type": "application/json", // デフォルトのヘッダー
    ...options.headers,
    // 必要に応じて認証トークンなどを追加
    // Authorization: `Bearer YOUR_TOKEN`,
  };

  try {
    const response = await fetch(requestUrl, {
      ...options,
      headers,
    });

    // エラー時: 今回はシンプルにステータスのみを含むエラーを throw
    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    // 成功時: レスポンスを JSON としてパース
    const data: TData = await response.json();
    return data;
  } catch (error) {
    console.error("customFetch Error:", error);
    throw error;
  }
};