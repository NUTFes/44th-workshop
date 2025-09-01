"use client";

import { FC, useRef, useCallback, useState } from "react";
import Image from "next/image";

interface QRCodeProps {
    url: string;
    size?: number;
    fireworkId: number;
    originalImageFile?: File;
    onDownload?: (canvas: HTMLCanvasElement) => void;
    onError?: (error: string) => void;
}

const QRCodeComponent: FC<QRCodeProps> = ({
                                              url,
                                              size = 250,
                                              fireworkId,
                                              originalImageFile,
                                              onDownload,
                                              onError
                                          }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const [imageError, setImageError] = useState(false);
    const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);

    // QR Server API を使用してQRコードを生成
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png&margin=10`;

    const handleDownload = useCallback(async () => {
        if (!onDownload) return;

        try {
            const response = await fetch(qrImageUrl);
            if (!response.ok) {
                console.error('Failed to fetch QR code image:', response.status);
                return;
            }

            const blob = await response.blob();
            const img = document.createElement('img');

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    canvas.width = size;
                    canvas.height = size;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, size, size);
                    ctx.drawImage(img, 0, 0, size, size);
                    onDownload(canvas);
                }
                URL.revokeObjectURL(img.src);
            };

            img.onerror = () => {
                console.error('Failed to load QR code image');
                URL.revokeObjectURL(img.src);
            };

            img.src = URL.createObjectURL(blob);
        } catch (error) {
            console.error('Download failed:', error);
            if (onError) {
                onError('Failed to download QR code');
            }
        }
    }, [qrImageUrl, size, onDownload, onError]);

    // 印刷用のHTMLページを生成して新しいウィンドウで開く
    const handleGeneratePrintPage = useCallback(async () => {
        setIsGeneratingPrint(true);

        try {
            let originalImageDataUrl = '';
            if (originalImageFile) {
                try {
                    originalImageDataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = () => reject(new Error('Failed to read image file'));
                        reader.readAsDataURL(originalImageFile);
                    });
                } catch (fileError) {
                    console.warn('Failed to read original image file:', fileError);
                    // 画像読み込みに失敗してもプレースホルダーで続行
                }
            }

            // 印刷用のHTMLを生成
            const printHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Firework Print - ID ${fireworkId}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
        }
        
        .page {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
            box-sizing: border-box;
            padding: 20mm;
        }
        
        .page:last-child {
            page-break-after: avoid;
        }
        
        .page-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        
        .page-subtitle {
            font-size: 16px;
            margin-bottom: 30px;
            color: #666;
        }
        
        .qr-container {
            margin: 20px 0;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .qr-image {
            width: 120mm;
            height: 120mm;
            border: 2px solid #ddd;
            background: white;
            object-fit: contain;
        }
        
        .image-container {
            margin: 20px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            max-width: 120mm;
            max-height: 120mm;
        }
        
        .original-image {
            max-width: 120mm;
            max-height: 120mm;
            border: 2px solid #ddd;
            background: white;
            object-fit: contain;
        }
        
        .placeholder {
            width: 120mm;
            height: 120mm;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f9f9f9;
            color: #999;
            font-size: 18px;
        }
        
        .instructions {
            margin-top: 20px;
            font-size: 14px;
            color: #666;
            max-width: 400px;
            line-height: 1.4;
        }
        
        .url-text {
            font-size: 11px;
            margin-top: 10px;
            color: #999;
            word-break: break-all;
            font-family: monospace;
        }
        
        .print-guide {
            position: absolute;
            bottom: 10mm;
            left: 50%;
            transform: translateX(-50%);
            font-size: 12px;
            color: #999;
            font-style: italic;
        }
        
        @media print {
            .page {
                width: 100%;
                height: 100vh;
                margin: 0;
                padding: 20mm;
            }
            
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <!-- QRコードページ（表面） -->
    <div class="page">
        <div class="page-title">Firework QR Code</div>
        <div class="page-subtitle">ID: ${fireworkId}</div>
        
        <div class="qr-container">
            <img src="${qrImageUrl}" alt="QR Code" class="qr-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div class="placeholder" style="display: none;">QR Code</div>
        </div>
        
        <div class="instructions">
            <p>Scan this QR code with your smartphone to enjoy the firework display</p>
            <div class="url-text">${url}</div>
        </div>
        
        <div class="print-guide">
            ★ Print this page as the front side
        </div>
    </div>
    
    <!-- 画像ページ（裏面） -->
    <div class="page">
        <div class="page-title">Original Design</div>
        <div class="page-subtitle">Firework ID: ${fireworkId}</div>
        
        <div class="image-container">
            ${originalImageDataUrl ?
                `<img src="${originalImageDataUrl}" alt="Original Design" class="original-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                 <div class="placeholder" style="display: none;">Firework Design</div>` :
                `<div class="placeholder">Firework Design</div>`
            }
        </div>
        
        <div class="instructions">
            <p>This is the original design that was used to create the firework display</p>
        </div>
        
        <div class="print-guide">
            ★ Print this page as the back side
        </div>
    </div>
    
    <script>
        // ページが読み込まれたら自動的に印刷ダイアログを表示
        window.onload = function() {
            // 少し遅延を入れて画像の読み込みを待つ
            setTimeout(function() {
                try {
                    window.print();
                } catch (e) {
                    console.error('Print failed:', e);
                    alert('印刷に失敗しました。手動でCtrl+P（またはCmd+P）を押して印刷してください。');
                }
            }, 2000);
        };
        
        // 印刷後にウィンドウを閉じる（ユーザーが印刷をキャンセルした場合も含む）
        window.onafterprint = function() {
            setTimeout(function() {
                window.close();
            }, 500);
        };
        
        // エラーハンドリング
        window.onerror = function(msg, url, line, col, error) {
            console.error('Window error:', msg, error);
            return false;
        };
    </script>
</body>
</html>`;

            // Blob URLを使用したより安全な方法で印刷用ページを開く
            try {
                // HTMLをBlobとして作成
                const blob = new Blob([printHTML], { type: 'text/html' });
                const blobUrl = URL.createObjectURL(blob);

                // 新しいウィンドウでBlobを開く
                const printWindow = window.open(blobUrl, '_blank');

                if (printWindow) {
                    // ウィンドウが閉じられた時にBlobURLをクリーンアップ
                    printWindow.addEventListener('beforeunload', () => {
                        URL.revokeObjectURL(blobUrl);
                    });
                } else {
                    // ポップアップがブロックされた場合は直接HTMLファイルをダウンロード
                    URL.revokeObjectURL(blobUrl);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `firework-print-${fireworkId}.html`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // 短時間後にBlobURLをクリーンアップ
                    setTimeout(() => {
                        URL.revokeObjectURL(blobUrl);
                    }, 1000);

                    if (onError) {
                        onError('Pop-up blocked. HTML file downloaded instead. Open it and print manually.');
                    }
                }
            } catch (windowError) {
                console.error('Failed to open print window:', windowError);
                if (onError) {
                    onError('Failed to open print window. Please check your browser settings.');
                }
            }

        } catch (error) {
            console.error('Print generation error:', error);
            if (onError) {
                onError('Failed to generate print page');
            }
        } finally {
            setIsGeneratingPrint(false);
        }
    }, [qrImageUrl, fireworkId, originalImageFile, onError, url]);

    const handleImageError = useCallback(() => {
        console.error('QR Code image failed to load');
        setImageError(true);
    }, []);

    const handleImageLoad = useCallback(() => {
        setImageError(false);
    }, []);

    return (
        <div style={{ textAlign: 'center' }}>
            <div
                style={{
                    display: 'inline-block',
                    padding: '1rem',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                }}
            >
                {imageError ? (
                    <div
                        style={{
                            width: size,
                            height: size,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '0.875rem'
                        }}
                    >
                        QR Code failed to load
                    </div>
                ) : (
                    <Image
                        ref={imgRef}
                        src={qrImageUrl}
                        alt="QR Code"
                        width={size}
                        height={size}
                        style={{
                            display: 'block',
                            borderRadius: '4px'
                        }}
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                        unoptimized={true}
                    />
                )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {onDownload && (
                    <button
                        onClick={handleDownload}
                        style={{
                            backgroundColor: '#059669',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        Download QR Code
                    </button>
                )}

                <button
                    onClick={handleGeneratePrintPage}
                    disabled={isGeneratingPrint}
                    style={{
                        backgroundColor: isGeneratingPrint ? '#9ca3af' : '#dc2626',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isGeneratingPrint ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        opacity: isGeneratingPrint ? 0.7 : 1
                    }}
                >
                    {isGeneratingPrint ? 'Generating...' : 'Print Double-Sided'}
                </button>
            </div>

            <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.5rem'
            }}>
                QR Code generated by QR Server API
            </div>

            <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem',
                fontStyle: 'italic'
            }}>
                Print button opens optimized page for double-sided printing
            </div>
        </div>
    );
};

export default QRCodeComponent;