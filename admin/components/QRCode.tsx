"use client";

import { FC, useRef, useCallback, useState } from "react";
import Image from "next/image";
import QRCodeButtons from "./QRCodeButtons";
import ImagePreview from "./admin/ImagePreview";
import { createImage } from "@/utils/cropImage";

interface QRCodeProps {
    url: string;
    size?: number;
    fireworkId: number;
    originalImageFile?: File;
    imageUrl: string | null;
    onDownload?: (canvas: HTMLCanvasElement) => void;
    onError?: (error: string) => void;
}

// Blob/File を dataURL 文字列に変換する共通ヘルパー
function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                resolve(result);
            } else {
                reject(new Error('Blobを文字列として読み込むことに失敗しました。'));
            }
        };
        reader.onerror = () => reject(new Error('Blobの読み込みに失敗しました。'));
        reader.readAsDataURL(blob);
    });
}

// jsPDFの標準フォント（Helvetica等）は日本語グリフを持たないため、PDF内の日本語ラベルが
// 文字化けする。/public/fonts に置いた日本語対応フォント（このPDFで実際に使う文字だけに
// サブセット化済み、詳細は public/fonts/README.md）を読み込んでBase64化し、jsPDFへ埋め込む。
async function loadFontAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load font: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

// PDF生成のたびに約87KBのフォントを再取得・再エンコードしないよう、初回取得分を
// モジュールスコープにキャッシュして使い回す（失敗時は次回呼び出しで再取得できるようにする）。
let fontBase64Promise: Promise<string> | null = null;
function getFontBase64(): Promise<string> {
    if (!fontBase64Promise) {
        fontBase64Promise = loadFontAsBase64('/fonts/NotoSansJP-subset.ttf').catch((err) => {
            fontBase64Promise = null;
            throw err;
        });
    }
    return fontBase64Promise;
}

// dataURL画像の実寸（px）を取得する
async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    const img = await createImage(dataUrl);
    return { width: img.naturalWidth, height: img.naturalHeight };
}

// CSSの object-fit: contain と同じロジック。box内に元の縦横比を保ったまま収まる
// 最大サイズと、box内で中央寄せするためのオフセットを返す。
function fitContain(boxWidth: number, boxHeight: number, imageWidth: number, imageHeight: number) {
    const boxAspect = boxWidth / boxHeight;
    const imageAspect = imageWidth / imageHeight;
    const width = imageAspect > boxAspect ? boxWidth : boxHeight * imageAspect;
    const height = imageAspect > boxAspect ? boxWidth / imageAspect : boxHeight;
    return {
        x: (boxWidth - width) / 2,
        y: (boxHeight - height) / 2,
        width,
        height,
    };
}

const QRCodeComponent: FC<QRCodeProps> = ({
                                              url,
                                              size = 250,
                                              fireworkId,
                                              imageUrl,
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
                if (onError) onError('Failed to fetch QR code image.');
                return;
            }

            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);
            const img = new window.Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, size, size);
                    onDownload(canvas);
                }
                URL.revokeObjectURL(imageUrl);
            };

            img.src = imageUrl;
        } catch (err) {
            console.error('Error in QR code download process:', err);
            if (onError) onError('An error occurred during QR code generation.');
        }
    }, [qrImageUrl, size, onDownload, onError]);

    const handleImageLoad = useCallback(() => {
        setImageError(false);
    }, []);

    const handleImageError = useCallback(() => {
        setImageError(true);
        if (onError) {
            onError('QRコード画像の読み込みに失敗しました。URLを確認してください。');
        }
    }, [onError]);

    // PDFで最大サイズ印刷用のレイアウトを生成（アクリルキーホルダー用）
    const handleGeneratePDF = useCallback(async () => {
        setIsGeneratingPDF(true);

        try {
            // jsPDFを動的にインポート
            const { jsPDF } = await import('jspdf');

            // QRコードの取得は他の画像・フォント読み込みと独立しているため、
            // ここで先に開始しておき（fetch呼び出し自体で通信が始まる）、
            // 実際に必要になるタイミングでまとめて await することで並行実行する
            const qrFetchPromise = fetch(qrImageUrl);

            let originalImageDataUrl = '';
            if (originalImageFile) {
                try {
                    originalImageDataUrl = await blobToDataUrl(originalImageFile);
                } catch (fileError) {
                    console.warn('元の画像ファイルの読み込みに失敗しました:', fileError);
                }
            }

            // originalImageFile（ブラウザのlocalStorageキャッシュ）が無い場合は、
            // サーバー上の画像URLを取得してdataURL化する（ダメでも下の addImage の
            // catch でプレースホルダーに落ちるだけなので、ここは失敗しても無視してよい）
            if (!originalImageDataUrl && imageUrl) {
                try {
                    const imageResponse = await fetch(imageUrl);
                    if (imageResponse.ok) {
                        originalImageDataUrl = await blobToDataUrl(await imageResponse.blob());
                    }
                } catch (fetchError) {
                    console.warn('サーバー上の画像の取得に失敗しました:', fetchError);
                }
            }

            // QRコードの画像を取得
            const qrResponse = await qrFetchPromise;
            if (!qrResponse.ok) {
                if (onError) {
                    onError('QRコードの取得に失敗しました');
                }
                return;
            }
            const qrDataUrl = await blobToDataUrl(await qrResponse.blob());

            // PDFを作成 (A4縦向き)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // 日本語フォントを埋め込み、以降のすべての pdf.text() で使用する
            // （標準フォントのままだと日本語が文字化けするため）
            const fontBase64 = await getFontBase64();
            pdf.addFileToVFS('NotoSansJP-subset.ttf', fontBase64);
            pdf.addFont('NotoSansJP-subset.ttf', 'NotoSansJP', 'normal');
            pdf.setFont('NotoSansJP');

            const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
            // const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

            // アクリルキーホルダーのサイズ（45×32mm）
            const keychainWidth = 45;
            const keychainHeight = 32;
            const margin = 10;

            // QRコード（左上）
            const qrX = margin;
            const qrY = margin;

            // 画像（QRコードの右隣）
            const imageX = margin + keychainWidth + 10;
            const imageY = margin;

            // 枠線を描画
            pdf.setDrawColor(150, 150, 150);
            pdf.setLineDashPattern([1, 1], 0);
            pdf.setLineWidth(0.3);

            // QRコード用の枠
            pdf.rect(qrX, qrY, keychainWidth, keychainHeight);

            // 画像用の枠
            pdf.rect(imageX, imageY, keychainWidth, keychainHeight);

            // QRコードを配置（少し余白を持たせる）。縦横比を保ったまま余白付きの枠内に
            // 収まるサイズへ縮小し、中央寄せする（object-fit: contain と同じ考え方）
            const qrPadding = 2;
            const qrBoxWidth = keychainWidth - (qrPadding * 2);
            const qrBoxHeight = keychainHeight - (qrPadding * 2);
            // サイズ測定に失敗しても致命的ではないため、その場合は歪みには目をつぶり
            // 枠いっぱいに配置する（PDF全体の生成を失敗させない）
            let qrFit = { x: 0, y: 0, width: qrBoxWidth, height: qrBoxHeight };
            try {
                const qrDims = await getImageDimensions(qrDataUrl);
                qrFit = fitContain(qrBoxWidth, qrBoxHeight, qrDims.width, qrDims.height);
            } catch (qrDimError) {
                console.warn('QRコードのサイズ測定に失敗しました。枠いっぱいに配置します:', qrDimError);
            }
            pdf.addImage(qrDataUrl, 'PNG',
                qrX + qrPadding + qrFit.x,
                qrY + qrPadding + qrFit.y,
                qrFit.width,
                qrFit.height
            );

            // 画像を配置
            if (originalImageDataUrl) {
                try {
                    // 画像の形式を自動検出
                    const imageFormat = originalImageDataUrl.includes('data:image/png') ? 'PNG' :
                        originalImageDataUrl.includes('data:image/jpeg') ? 'JPEG' :
                            originalImageDataUrl.includes('data:image/jpg') ? 'JPEG' :
                                originalImageDataUrl.includes('data:image/gif') ? 'GIF' :
                                    originalImageDataUrl.includes('data:image/webp') ? 'WEBP' : 'JPEG';

                    // 元画像の縦横比を保ったまま枠内に収まるサイズへ縮小し、中央寄せする
                    const imgDims = await getImageDimensions(originalImageDataUrl);
                    const imgFit = fitContain(keychainWidth, keychainHeight, imgDims.width, imgDims.height);
                    pdf.addImage(originalImageDataUrl, imageFormat,
                        imageX + imgFit.x,
                        imageY + imgFit.y,
                        imgFit.width,
                        imgFit.height
                    );

                } catch (imgError) {
                    console.warn('PDFへの画像の追加に失敗しました：', imgError);
                    // 画像が追加できない場合はプレースホルダーを描画
                    pdf.setDrawColor(200, 200, 200);
                    pdf.rect(imageX + 5, imageY + 5, keychainWidth - 10, keychainHeight - 10);
                    pdf.setFontSize(8);
                    pdf.setDrawColor(0, 0, 0);
                    pdf.text('花火のアイコン', imageX + keychainWidth/2, imageY + keychainHeight/2, { align: 'center' });
                }
            } else {
                // プレースホルダー
                pdf.setDrawColor(200, 200, 200);
                pdf.rect(imageX + 5, imageY + 5, keychainWidth - 10, keychainHeight - 10);
                pdf.setFontSize(8);
                pdf.setDrawColor(0, 0, 0);
                pdf.text('花火のアイコン', imageX + keychainWidth/2, imageY + keychainHeight/2, { align: 'center' });
            }

            // ラベルを追加
            pdf.setLineDashPattern([], 0);
            pdf.setDrawColor(0, 0, 0);
            pdf.setFontSize(8);
            pdf.text('QRコード (裏面)', qrX, qrY + keychainHeight + 5);
            pdf.text('アイコン (表面)', imageX, imageY + keychainHeight + 5);

            // 情報セクション
            const infoY = qrY + keychainHeight + 20;
            pdf.setFontSize(10);
            // 絵文字は埋め込みフォントのグリフに含まれない（色付き絵文字は簡易TTF埋め込みでは
            // 描画できない）ため、PDF内のテキストからは除外する
            pdf.text('アクリルキーホルダー情報', margin, infoY);

            pdf.setFontSize(8);
            pdf.text(`花火ID: ${fireworkId}`, margin, infoY + 8);
            pdf.text('挿入サイズ: 45mm × 32mm（各1枚）', margin, infoY + 14);
            pdf.text('使い方: QRコードを裏面、アイコンを表面に配置してください', margin, infoY + 20);
            pdf.text('印刷サイズ: A4（210mm × 297mm）', margin, infoY + 26);

            pdf.setFontSize(7);
            pdf.text('QRコードURL:', margin, infoY + 38);

            // URLを複数行に分割
            const urlLines = pdf.splitTextToSize(url, pageWidth - (margin * 2));
            pdf.text(urlLines, margin, infoY + 44);

            // 切り取りガイド
            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            pdf.text('枠線に沿って切り取って、アクリルキーホルダーに入れてください', margin, qrY + keychainHeight + 12);

            // PDFをダウンロード
            pdf.save(`acrylic-keychain-${fireworkId}.pdf`);

        } catch (error) {
            console.error('PDF生成エラー:', error);
            if (onError) {
                onError('PDFの生成に失敗しました');
            }
        } finally {
            setIsGeneratingPDF(false);
        }
    }, [qrImageUrl, fireworkId, originalImageFile, imageUrl, onError, url]);

    // 印刷用のHTMLページを生成（アクリルキーホルダー用：45×32mm）
    const handleGeneratePrintPage = useCallback(async () => {
        setIsGeneratingPrint(true);

        try {
            let originalImageDataUrl = '';
            if (originalImageFile) {
                try {
                    originalImageDataUrl = await blobToDataUrl(originalImageFile);
                } catch (fileError) {
                    console.warn('元の画像ファイルの読み込みに失敗しました:', fileError);
                }
            }

            // originalImageFile はブラウザのlocalStorageにキャッシュされた画像で、
            // 別のブラウザ・別のセッションで作成された花火や、30日経過してクリーンアップ
            // された花火では取得できない。その場合はサーバー上の画像URL（常に利用可能）を
            // そのまま <img src> に使う。表示のみで pixel を読み取るわけではないため、
            // CORS の制約を受けない。
            const printImageSrc = originalImageDataUrl || imageUrl || '';

            // 印刷用のHTMLを生成（アクリルキーホルダー用レイアウト）
            const printHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Print Acrylic Keychain - Firework #${fireworkId}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }
        
        body {
            margin: 0;
            padding: 0;
            width: 210mm;
            height: 297mm;
            position: relative;
        }
        
        .keychain-item {
            width: 45mm;
            height: 32mm;
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px dashed black;
        }
        
        .qr-item {
            top: 10mm;
            left: 10mm;
        }
        
        .image-item {
            top: 10mm;
            left: 65mm;
        }
        
        .image-keychain {
            width: 100%;
            height: 100%;
            object-fit: contain;
            box-sizing: border-box;
        }

        .qr-code-keychain {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 2mm;
            box-sizing: border-box;
        }
        
        .placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            font-size: 8px;
            color: #666;
            text-align: center;
        }

        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="keychain-item qr-item">
        <img src="${qrImageUrl}" alt="QR Code" class="qr-code-keychain" />
    </div>
    
    <div class="keychain-item image-item">
        ${printImageSrc ?
                `<img src="${printImageSrc}" alt="Firework Design" class="image-keychain" />` :
                `<div class="placeholder">Firework Design</div>`
            }
    </div>
    
    <script>
        // ページが読み込まれたら自動的に印刷ダイアログを表示
        window.onload = function() {
            setTimeout(function() {
                try {
                    window.print();
                } catch (e) {
                    console.error('Print failed:', e);
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
                    if (onError) {
                        onError('ポップアップがブロックされました。ブラウザの設定を確認し、もう一度お試しください。');
                    }
                }
            } catch (windowError) {
                console.error('印刷ウィンドウを開けませんでした:', windowError);
                if (onError) {
                    onError('印刷ウィンドウを開けませんでした。ブラウザの設定を確認してください。');
                }
            }

        } catch (error) {
            console.error('印刷生成エラー:', error);
            if (onError) {
                onError('印刷用ページの生成に失敗しました。');
            }
        } finally {
            setIsGeneratingPrint(false);
        }
    }, [qrImageUrl, fireworkId, originalImageFile, imageUrl, onError]);

    return (
        <div style={{ textAlign: 'center' }}>
            <div className="saa" style={{ display: 'flex', justifyContent: 'center'}}>
                <ImagePreview 
                    imageUrl={imageUrl}
                    />
                <div
                    style={{
                        display: 'inline-block',
                        padding: '1.5rem',
                        backgroundColor: 'white',
                        border: '2px solid #e2e8f0',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
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
                                backgroundColor: '#fed7d7',
                                color: '#c53030',
                                border: '2px solid #feb2b2',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: '600'
                            }}
                        >
                            ❌ QR Code failed to load
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
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0'
                            }}
                            onError={handleImageError}
                            onLoad={handleImageLoad}
                            unoptimized={true}
                        />
                    )}
                </div>
            </div>

            <QRCodeButtons
                onDownload={onDownload ? handleDownload : undefined}
                onGeneratePrint={handleGeneratePrintPage}
                onGeneratePDF={handleGeneratePDF}
                isGeneratingPrint={isGeneratingPrint}
                isGeneratingPDF={isGeneratingPDF}
            />

            <div style={{
                fontSize: '0.75rem',
                color: '#718096',
                marginTop: '1rem',
                fontStyle: 'italic'
            }}>
                📡 QR Code generated by QR Server API
            </div>

            <div style={{
                fontSize: '0.75rem',
                color: '#718096',
                marginTop: '0.5rem',
                fontStyle: 'italic'
            }}>
                🔑 45×32mm inserts for acrylic keychains (QR back, design front)
            </div>
        </div>
    );
};

export default QRCodeComponent;