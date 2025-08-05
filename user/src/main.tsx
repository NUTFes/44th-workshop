import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// React Queryのクライアントインスタンスを作成
const queryClient = new QueryClient();

// ===== main =====
// - **アプリケーションの「エントリポイント」**
// - 最小限にとどめ、**アプリ全体に影響を与えるグローバルな設定やProviderのラップ**だけを置く
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
