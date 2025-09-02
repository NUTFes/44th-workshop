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
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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

    // PDFで最大サイズ印刷用のレイアウトを生成
    const handleGeneratePDF = useCallback(async () => {
        setIsGeneratingPDF(true);

        try {
            // jsPDFを動的にインポート
            const { jsPDF } = await import('jspdf');

            let originalImageDataUrl = '';
            if (originalImageFile) {
                try {
                    originalImageDataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const result = reader.result;
                            if (typeof result === 'string') {
                                resolve(result);
                            } else {
                                reject('Failed to read image file as string');
                            }
                        };
                        reader.onerror = () => reject('Failed to read image file');
                        reader.readAsDataURL(originalImageFile);
                    });
                } catch (fileError) {
                    console.warn('Failed to read original image file:', fileError);
                }
            }

            // QRコードの画像を取得
            const qrResponse = await fetch(qrImageUrl);
            if (!qrResponse.ok) {
                if (onError) {
                    onError('Failed to fetch QR code');
                }
                return;
            }
            const qrBlob = await qrResponse.blob();
            const qrDataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result;
                    if (typeof result === 'string') {
                        resolve(result);
                    } else {
                        reject('Failed to read QR code blob as string');
                    }
                };
                reader.onerror = () => reject('Failed to read QR code blob');
                reader.readAsDataURL(qrBlob);
            });

            // PDFを作成 (A4横向き)
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
            const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
            const margin = 10; // 余白
            const cardWidth = (pageWidth - margin * 3) / 2; // カード幅: 約140mm
            const cardHeight = pageHeight - margin * 2; // カード高: 約190mm

            // 切り取り線のスタイル設定
            pdf.setDrawColor(150, 150, 150);
            pdf.setLineDashPattern([2, 2], 0);
            pdf.setLineWidth(0.3);

            // 左側カード（QRコード）
            const leftCardX = margin;
            const leftCardY = margin;

            // QRコード用の切り取り枠
            pdf.rect(leftCardX, leftCardY, cardWidth, cardHeight);

            // QRコードを最大サイズで配置
            const qrMaxSize = Math.min(cardWidth * 0.8, cardHeight * 0.65); // さらに大きく
            const qrX = leftCardX + (cardWidth - qrMaxSize) / 2;
            const qrY = leftCardY + cardHeight * 0.25; // 上から25%の位置
            pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrMaxSize, qrMaxSize);

            // QRコードのタイトル
            pdf.setLineDashPattern([], 0);
            pdf.setDrawColor(0, 0, 0);
            pdf.setFontSize(14);
            pdf.text('Firework QR Code', leftCardX + cardWidth/2, leftCardY + 20, { align: 'center' });
            pdf.setFontSize(10);
            pdf.text(`ID: ${fireworkId}`, leftCardX + cardWidth/2, leftCardY + 30, { align: 'center' });

            // QRコード下部の説明
            pdf.setFontSize(9);
            const qrBottomY = qrY + qrMaxSize + 10;
            pdf.text('Scan to view firework', leftCardX + cardWidth/2, qrBottomY, { align: 'center' });

            // 右側カード（オリジナル画像）- 文字なし
            const rightCardX = margin * 2 + cardWidth;
            const rightCardY = margin;

            // 画像用の切り取り枠
            pdf.setDrawColor(150, 150, 150);
            pdf.setLineDashPattern([2, 2], 0);
            pdf.setLineWidth(0.3);
            pdf.rect(rightCardX, rightCardY, cardWidth, cardHeight);

            // 画像タイトルは削除（文字なし）

            if (originalImageDataUrl) {
                try {
                    // 画像のアスペクト比を計算して最適なサイズで配置
                    const img = document.createElement('img') as HTMLImageElement;
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = () => reject('Failed to load image');
                        img.src = originalImageDataUrl;
                    });

                    // 90度回転後の縦横比でサイズを計算
                    const rotatedAspectRatio = img.height / img.width;
                    const maxWidth = cardWidth * 0.95;
                    const maxHeight = cardHeight * 0.95;

                    let imgWidth, imgHeight;
                    // 回転後の縦横比に基づいて、枠の最大サイズに収まるように計算
                    if (rotatedAspectRatio > 1) {
                        // 縦長画像
                        imgHeight = Math.min(maxHeight, maxWidth * rotatedAspectRatio);
                        imgWidth = imgHeight / rotatedAspectRatio;
                    } else {
                        // 横長画像または正方形
                        imgWidth = Math.min(maxWidth, maxHeight / rotatedAspectRatio);
                        imgHeight = imgWidth * rotatedAspectRatio;
                    }

                    const imgX = rightCardX + (cardWidth - imgWidth) / 2;
                    const imgY = rightCardY + (cardHeight - imgHeight) / 2;

                    // 画像の形式を自動検出
                    const imageFormat = originalImageDataUrl.includes('data:image/png') ? 'PNG' :
                        originalImageDataUrl.includes('data:image/jpeg') ? 'JPEG' :
                            originalImageDataUrl.includes('data:image/jpg') ? 'JPEG' :
                                originalImageDataUrl.includes('data:image/gif') ? 'GIF' :
                                    originalImageDataUrl.includes('data:image/webp') ? 'WEBP' : 'JPEG';

                    // jsPDFで画像を回転させて追加
                    pdf.addImage(originalImageDataUrl, imageFormat, imgX, imgY, imgWidth, imgHeight, undefined, undefined, 90);

                } catch (imgError) {
                    console.warn('Failed to add image to PDF:', imgError);
                    // 画像が追加できない場合はプレースホルダーを描画
                    const maxWidth = cardWidth * 0.9;
                    const maxHeight = cardHeight * 0.9;
                    const imgX = rightCardX + (cardWidth - maxWidth) / 2;
                    const imgY = rightCardY + (cardHeight - maxHeight) / 2;

                    pdf.setDrawColor(200, 200, 200);
                    pdf.rect(imgX, imgY, maxWidth, maxHeight);
                    pdf.setFontSize(12);
                    pdf.setDrawColor(0, 0, 0);
                    pdf.text('Original Image', imgX + maxWidth/2, imgY + maxHeight/2, { align: 'center' });
                }
            } else {
                // プレースホルダー
                const maxWidth = cardWidth * 0.95;
                const maxHeight = cardHeight * 0.95;
                const imgX = rightCardX + (cardWidth - maxWidth) / 2;
                const imgY = rightCardY + (cardHeight - maxHeight) / 2;

                pdf.setDrawColor(200, 200, 200);
                pdf.rect(imgX, imgY, maxWidth, maxHeight);
                pdf.setFontSize(12);
                pdf.setDrawColor(0, 0, 0);
                pdf.text('Firework Design', imgX + maxWidth/2, imgY + maxHeight/2, { align: 'center' });
            }

            // 切り取り線の説明
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text('Cut along dotted lines', pageWidth/2, pageHeight - 3, { align: 'center' });

            // PDFをダウンロード
            pdf.save(`firework-cards-${fireworkId}.pdf`);

        } catch (error) {
            console.error('PDF generation error:', error);
            if (onError) {
                onError('Failed to generate PDF');
            }
        } finally {
            setIsGeneratingPDF(false);
        }
    }, [qrImageUrl, fireworkId, originalImageFile, onError]);

    // 印刷用のHTMLページを生成（最大サイズ＋切り取り線）
    const handleGeneratePrintPage = useCallback(async () => {
        setIsGeneratingPrint(true);

        try {
            let originalImageDataUrl = '';
            if (originalImageFile) {
                try {
                    originalImageDataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const result = reader.result;
                            if (typeof result === 'string') {
                                resolve(result);
                            } else {
                                reject('Failed to read image file as string');
                            }
                        };
                        reader.onerror = () => reject('Failed to read image file');
                        reader.readAsDataURL(originalImageFile);
                    });
                } catch (fileError) {
                    console.warn('Failed to read original image file:', fileError);
                }
            }

            // 印刷用のHTMLを生成（最大サイズレイアウト）
            const printHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Firework Cards - ID ${fireworkId}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 10mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: white;
        }
        
        .cards-container {
            display: flex;
            gap: 10mm;
            width: 100%;
            height: 100%;
            justify-content: center;
            align-items: center;
        }
        
        .card {
            width: 140mm;
            height: 190mm;
            border: 2px dashed #999;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: white;
        }
        
        .card::before {
            content: "✂";
            position: absolute;
            top: -8px;
            left: -8px;
            font-size: 12px;
            color: #999;
            background: white;
            padding: 2px;
        }
        
        .card-title {
            font-size: 18px;
            font-weight: bold;
            margin: 15mm 0 5mm 0;
            text-align: center;
        }
        
        .card-subtitle {
            font-size: 12px;
            margin-bottom: 20mm;
            color: #666;
            text-align: center;
        }
        
        .qr-code-large {
            width: 120mm;
            height: 120mm;
            max-width: 120mm;
            max-height: 120mm;
            object-fit: contain;
            border: 1px solid #ddd;
        }

        .image-container {
            width: 140mm;
            height: 190mm;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        
        .original-image-large {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            transform: rotate(90deg);
        }
        
        .placeholder-large {
            width: 125mm;
            height: 140mm;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f9f9f9;
            color: #999;
            font-size: 18px;
            text-align: center;
        }
        
        .card-description {
            margin-top: 10mm;
            font-size: 11px;
            color: #666;
            text-align: center;
            line-height: 1.4;
            max-width: 120mm;
        }
        
        .url-text {
            font-size: 9px;
            margin-top: 5mm;
            color: #999;
            word-break: break-all;
            font-family: monospace;
            text-align: center;
            max-width: 120mm;
        }
        
        .cut-instructions {
            position: absolute;
            bottom: 5mm;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            color: #999;
            text-align: center;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .cards-container {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="cards-container">
        <div class="card">
            <div class="card-title">Firework QR Code</div>
            <div class="card-subtitle">ID: ${fireworkId}</div>
            
            <img src="${qrImageUrl}" alt="QR Code" class="qr-code-large" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div class="placeholder-large" style="display: none; width: 120mm; height: 120mm;">QR Code</div>
            
            <div class="card-description">
                Scan this QR code with your smartphone to enjoy the firework display
                <div class="url-text">${url}</div>
            </div>
        </div>
        
        <div class="card" style="justify-content: center;">
            <div class="image-container">
                ${originalImageDataUrl ?
                `<img src="${originalImageDataUrl}" alt="Original Design" class="original-image-large" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                     <div class="placeholder-large" style="display: none;">Firework Design</div>` :
                `<div class="placeholder-large">Firework Design</div>`
            }
            </div>
        </div>
    </div>
    
    <div class="cut-instructions">
        Cut along the dotted lines to create individual cards
    </div>
    
    <script>
        // ページが読み込まれたら自動的に印刷ダイアログを表示
        window.onload = function() {
            setTimeout(function() {
                try {
                    window.print();
                } catch (e) {
                    console.error('Print failed:', e);
                    alert('印刷に失敗しました。手動でCtrl+P（またはCmd+P）を押して印刷してください。');
                }
            }, 1000);
        };
        
        // 印刷後にウィンドウを閉じる
        window.onafterprint = function() {
            setTimeout(function() {
                window.close();
            }, 500);
        };
    </script>
</body>
</html>`;

            // Blob URLを使用して印刷用ページを開く
            try {
                const blob = new Blob([printHTML], { type: 'text/html' });
                const blobUrl = URL.createObjectURL(blob);

                const printWindow = window.open(blobUrl, '_blank');

                if (printWindow) {
                    printWindow.addEventListener('beforeunload', () => {
                        URL.revokeObjectURL(blobUrl);
                    });
                } else {
                    URL.revokeObjectURL(blobUrl);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `firework-print-${fireworkId}.html`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

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
                    {isGeneratingPrint ? 'Generating...' : 'Print Combined Image'}
                </button>

                <button
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPDF}
                    style={{
                        backgroundColor: isGeneratingPDF ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isGeneratingPDF ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        opacity: isGeneratingPDF ? 0.7 : 1
                    }}
                >
                    {isGeneratingPDF ? 'Generating...' : 'Download PDF Cards'}
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
                Clean layout with QR code and image side-by-side for printing
            </div>
        </div>
    );
};

export default QRCodeComponent;