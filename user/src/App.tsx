import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Detector from './pages/Detector';

// ===== Appコンポーネント =====
// - **ルーティング（`react-router-dom`）の設定**
// - グローバルに共通なレイアウトやUI（例：ナビバー、ヘッダーなど）もここでラップしてOK
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />             {/* ホーム画面 */}
        <Route path="/detector" element={<Detector />} /> {/* ジャンプ検出画面 */}
      </Routes>
    </Router>
  )
}
