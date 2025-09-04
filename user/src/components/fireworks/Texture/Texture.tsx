import { 
  // useRef, 
  useState,
  memo,
  useEffect,
} from 'react'
// import { 
//   useFrame, 
// } from '@react-three/fiber'
import * as THREE from 'three'
import Launching from '../Launching.tsx' // 打ち上げ時のトレイルを描画するコンポーネント
import IllustrationExploding from './Exploding.tsx'

interface FireworkProps {
  color?: THREE.ColorRepresentation; // 花火の色
  from?: THREE.Vector3 // 花火の打ち上げの始点
  to?: THREE.Vector3 // 花火の打ち上げの終点
  size?: number; // 花火のサイズ
  // illustration: boolean[][] // 花火のイラストデータ(booleanの2次元配列)
  onComplete?: () => void;  // 花火が終了したときのコールバック
}

// 1層のイラスト花火
const IllustrationFireworks =  memo(function IllustrationFireworks({ 
  color = 'white', 
  from = new THREE.Vector3(0, 0, 0),
  to = new THREE.Vector3(0, 1, 0), // 上方向に打ち上げ
  size = 1,
  // illustration,
  onComplete = () => {}
}: FireworkProps) {
  // const initTime = useRef<number | null>(null) // シーンが配置されてからの時間を保持する変数
  
  const [isLaunching, setIsLaunching] = useState(true) // 打ち上げ中かどうかのフラグ
  const [isExploding, setIsExploding] = useState(false) // 爆発中かどうかのフラグ
  const [isCompleted, setIsCompleted] = useState(false) // 花火の完了状態を管理

  // マウント時の処理とアンマウント時の処理
  // useEffect(() => {
  //   // ====== マウント時の処理 ======
    
  //   // ====== アンマウント時の処理 ======
  // }, [])
  
  // 花火が完了したときの処理
  useEffect(() => {
    if (isCompleted) {
      onComplete()
    }
  }, [isCompleted, onComplete])

  // フレームごとの更新
  // useFrame(({clock}) => {
  //   if (initTime.current === null) initTime.current = clock.getElapsedTime();  // グローバル時間を記録
    
  //   // コンポーネント配置からの経過時間を計算
  //   const elapsed = clock.getElapsedTime() - initTime.current;
  // })

  return (
    <>
      {isLaunching && (
        <Launching
          from={from}
          to={to}
          duration={2} // 打ち上げの時間
          color={color}
          onComplete={() => {
            setIsLaunching(false); // 打ち上げ完了
            setIsExploding(true); // 爆発フェーズに移行
            console.log('Firework launching completed!')
          }}
        />
      )}
      {isExploding && (
        <IllustrationExploding
        />
      )}
    </>
  )
})

export default IllustrationFireworks

// お絵描き花火のバイナリデータを読み込む関数(後でキャッシュから読み込むものに置き換える)
async function getBinaryFireworksDataArray(): Promise<number[][][]> {
  const result: number[][][] = []; // レスポンスを格納する配列(3次元配列)
  
  // CSVファイルのパスを指定(後々キャッシュを読み込むものに置き換える)
  const csvFilePathes = [
    "demo_csv/44thlogo.csv",
    "demo_csv/44thlogo_small.csv",
  ];
  
  // CSVファイルを読み込む
  // for (const csvFilePath of csvFilePathes) { // 順番に読み込む
  await Promise.all(csvFilePathes.map(async (csvFilePath) => { // 並列に読み込む
    const csv = await getCSVText(csvFilePath);  // CSVファイルを読み込む
    
    result.push(csv.split("\n")         // レスポンスを改行で分割
      .map((row) => row.split(",")      // 各行をカンマで分割
      .map((num) => parseFloat(num)))); // 各要素を数値に変換して格納
  }));
  console.log(result);
  return result; // 読み込んだCSVデータを返す
}

// CSVファイルを読み込む関数
async function getCSVText(path: string): Promise<string> {
  console.log('Start loading CSV file: ' + path);
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open("get", path, true);  // CSVファイルのパスを指定
    req.send(null); // HTTPリクエストの発行
    req.onload = () => {
      if (req.status === 200) {
        console.log('CSV file loaded successfully: ' + path);
        resolve(req.responseText); // レスポンスを解決
      }
      else {
        reject(new Error(`Error loading CSV file: ${req.status}`));
      }
    };
    req.onerror = () => {
      reject(new Error('Error loading CSV file'));
    };
  });
}
