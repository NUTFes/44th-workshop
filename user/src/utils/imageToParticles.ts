import type { ColorParticle, ColorParticleData } from '../types/illustrationFireworksType';

export interface ImageToParticlesOptions {
    /** リサイズ後の一辺のピクセル数（デフォルト: 64） */
    resolution?: number;
    /** 白とみなす知覚輝度のしきい値 0〜255（デフォルト: 200） */
    whiteThreshold?: number;
    /** 彩度しきい値 max-min（デフォルト: 30）これ未満はノイズとして除外 */
    saturationThreshold?: number;
    /**
     * 黒インクとみなす知覚輝度のしきい値 0〜255（デフォルト: 60）。
     * 絶対彩度が低い画素はここで無彩色ノイズ扱いになるが、黒インクも絶対彩度が
     * ほぼ0のため同じ判定に埋もれてしまう。この値以下の暗い画素は、彩度が低くても
     * 意図して描かれた黒インクとして常に残す（影・照明カブリングは輝度140以上、
     * 黒インクは輝度0〜数十程度と大きく差があるため、輝度で区別できる）。
     */
    blackLuminanceThreshold?: number;
    /**
     * 白判定用の相対彩度（HSVのS = (max-min)/max）しきい値 0〜1（デフォルト: 0.2）。
     * 値を上げるほど、写真撮影した白紙の照明カブリング（暖色/寒色寄りの白）を
     * 白として除外しやすくなる代わり、淡いパステルカラーのインクも白として
     * 消えやすくなるトレードオフがある。実際の描画で調整する前提のパラメータ。
     */
    whiteSaturationRatio?: number;
    /** 白ピクセルも半透明粒子として含める（デフォルト: false） */
    includeWhite?: boolean;
}

/**
 * 画像URLをn×nグリッドにリサイズし、色ピクセルをColorParticle[]に変換する。
 * Unityの ImageToParticles.cs と同等のロジック。
 *
 * NOTE: Canvas APIを使うため、ブラウザ環境でのみ動作する。
 * CORS制約により imageUrl は同一オリジンか CORSヘッダ付きである必要がある。
 */
export async function imageUrlToParticles(
    imageUrl: string,
    options: ImageToParticlesOptions = {}
): Promise<ColorParticleData> {
    const {
        resolution = 64,
        whiteThreshold = 200,
        saturationThreshold = 30,
        blackLuminanceThreshold = 60,
        whiteSaturationRatio = 0.2,
        includeWhite = false,
    } = options;

    const pixels = await fetchResizedPixels(imageUrl, resolution);
    const particles = extractParticles(pixels, resolution, {
        whiteThreshold,
        saturationThreshold,
        blackLuminanceThreshold,
        whiteSaturationRatio,
        includeWhite,
    });

    console.log(
        `[imageToParticles] ${resolution}×${resolution} → ${particles.length} particles`
    );

    return { particles, resolution };
}

// ────────────────────────────────────────────────────────────────────────────
// 内部実装
// ────────────────────────────────────────────────────────────────────────────

/** 画像をn×nにリサイズしてRGBAピクセル配列を返す */
async function fetchResizedPixels(
    url: string,
    n: number
): Promise<Uint8ClampedArray> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = n;
            canvas.height = n;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get 2D canvas context'));
                return;
            }
            // 管理画面のPDF・印刷ページは object-fit: contain 相当（縦横比を保ったまま
            // 枠内に収め、余白を残す）で画像を配置している。ここも同じ contain 方式にすることで、
            // アップロード時にクロップした正方形の領域と、印刷される領域・花火になる領域を
            // 一致させる（非正方形の画像が来ても引き伸ばさず、余白として除外されるだけにする）。
            const scale = Math.min(n / img.naturalWidth, n / img.naturalHeight);
            const drawWidth = img.naturalWidth * scale;
            const drawHeight = img.naturalHeight * scale;
            const offsetX = (n - drawWidth) / 2;
            const offsetY = (n - drawHeight) / 2;
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            const imageData = ctx.getImageData(0, 0, n, n);
            resolve(imageData.data);
        };

        img.onerror = () => {
            reject(new Error(`Failed to load image: ${url}`));
        };

        img.src = url;
    });
}

interface FilterOptions {
    whiteThreshold: number;
    saturationThreshold: number;
    blackLuminanceThreshold: number;
    whiteSaturationRatio: number;
    includeWhite: boolean;
}

/** RGBAピクセル配列からColorParticle[]を抽出する */
function extractParticles(
    data: Uint8ClampedArray,
    n: number,
    opts: FilterOptions
): ColorParticle[] {
    const { whiteThreshold, saturationThreshold, blackLuminanceThreshold, whiteSaturationRatio, includeWhite } = opts;
    const particles: ColorParticle[] = [];

    for (let py = 0; py < n; py++) {
        for (let px = 0; px < n; px++) {
            // Canvasのピクセルは左上原点・行優先
            const idx = (py * n + px) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            // alpha は使用しない（背景が透明な場合も色として扱う）

            // 知覚輝度: 「明るさ」の指標。R/G/Bを個別にしきい値判定すると、
            // 撮影時の色カブリングでどれか1チャンネルだけ下回った際に白判定から漏れるため、
            // 加重平均した明るさ1つで判定する
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            // 相対彩度（HSVのS）: 明るさに対する色ズレの「比率」。白判定専用。
            // 絶対彩度（sat, 下記）と違い、明るいピクセルほど色ズレが目立つ、という
            // 人間の感覚に近い形で「色カブリングの白」と「意図した薄い色」を区別できる
            const relativeSaturation = maxC === 0 ? 0 : (maxC - minC) / maxC;

            const isWhite =
                luminance > whiteThreshold && relativeSaturation < whiteSaturationRatio;

            // 絶対彩度: 白でないピクセルを「色として残すか、ノイズとして捨てるか」の判定用。
            const sat = maxC - minC;

            if (isWhite) {
                if (includeWhite) {
                    particles.push({
                        // y は上が 0 → Three.js では上が正なので反転
                        x: px / (n - 1),
                        y: 1 - py / (n - 1),
                        r: 255,
                        g: 255,
                        b: 255,
                    });
                }
            } else {
                // 絶対彩度が低くても、暗い（黒に近い）画素は意図して描かれた黒インクとして
                // 残す。黒インクは白インクと同様に彩度がほぼ0になるため、彩度だけで
                // 判定すると影・照明カブリングと区別できず消えてしまう。
                const isBlackInk = luminance <= blackLuminanceThreshold;
                if (sat >= saturationThreshold || isBlackInk) {
                    particles.push({
                        x: px / (n - 1),
                        y: 1 - py / (n - 1),
                        r,
                        g,
                        b,
                    });
                }
            }
        }
    }

    return particles;
}