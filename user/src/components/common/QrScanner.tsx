import { useState } from "react";
import { useZxing } from "react-zxing";
interface Props {
  onScan?: (result: string) => void; // オプションのコールバック関数
}

export default function QrScanner ({ onScan }: Props) {
  const [result, setResult] = useState(""); // QRコードの結果を管理する状態
  const { ref } = useZxing({
    onDecodeResult(result) {
      setResult(result.getText());
      onScan?.(result.getText()); // コールバック関数を呼び出す
    }
  });

  return (
    <>
      <video ref={ref as React.RefObject<HTMLVideoElement>} />
      <p>
        <span>Last result:</span>
        <span>{result}</span>
      </p>
    </>
  );
};
