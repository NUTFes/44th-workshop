import type { ColorParticle, ColorParticleData } from '../types/illustrationFireworksType';

export interface ImageToParticlesOptions {
    /** リサイズ後の一辺のピクセル数（デフォルト: 64） */
    resolution?: number;
    /** 白とみなす知覚輝度のしきい値 0〜255（デフォルト: 200） */
    whiteThreshold?: number;
    /** 彩度しきい値 max-min（デフォルト: 30）これ未満はノイズとして除外 */
    saturationThreshold?: number;
    /**
     * 黒インクとみなす知覚輝度のしきい値 0〜255（デフォルト: 120）。
     * 絶対彩度が低い画素はここで無彩色ノイズ扱いになるが、黒インクも絶対彩度が
     * ほぼ0のため同じ判定に埋もれてしまう。この値以下の暗い画素は、彩度が低くても
     * 意図して描かれた黒インクとして常に残す。
     *
     * 小さい/細い黒インクは、実際の撮影で生じるピンボケ・手ブレ・JPEG圧縮により、
     * 縮小前の時点で既に薄い（明るい）グレーへ滲んでいることがある。テスト用画像
     * white-background-removal-color-cast.jpg で実測した影・照明カブリングの
     * 輝度は最低でも約130（ほぼ全域が140以上）のため、120まで引き上げても
     * 影を誤って拾うことはなく、より薄まった小さな黒インクまで拾えるようにしている。
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

// 画素の分類に使う解像度の上限。元画像がこれより大きい場合は縮小してから分類する
// （ブラウザ上での分類コストを抑えるため）。マッキー・サインペンの線は紙の長辺に対して
// 概ね1%前後の太さがあり、2048程度まで解像度を保てば分類前に線が薄まることはない。
const MAX_SCAN_SIZE = 2048;

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
        blackLuminanceThreshold = 120,
        whiteSaturationRatio = 0.2,
        includeWhite = false,
    } = options;

    const filterOptions: FilterOptions = {
        whiteThreshold,
        saturationThreshold,
        blackLuminanceThreshold,
        whiteSaturationRatio,
        includeWhite,
    };

    const particles = await sampleParticles(imageUrl, resolution, filterOptions);

    console.log(
        `[imageToParticles] ${resolution}×${resolution} → ${particles.length} particles`
    );

    return { particles, resolution };
}

// ────────────────────────────────────────────────────────────────────────────
// 内部実装
// ────────────────────────────────────────────────────────────────────────────

interface FilterOptions {
    whiteThreshold: number;
    saturationThreshold: number;
    blackLuminanceThreshold: number;
    whiteSaturationRatio: number;
    includeWhite: boolean;
}

type PixelClass = 'white' | 'ink' | 'noise';

/**
 * 1画素の色を「白 / インク / ノイズ」に分類する。
 *
 * 知覚輝度: 「明るさ」の指標。R/G/Bを個別にしきい値判定すると、撮影時の色カブリングで
 * どれか1チャンネルだけ下回った際に白判定から漏れるため、加重平均した明るさ1つで判定する。
 *
 * 相対彩度（HSVのS）: 明るさに対する色ズレの「比率」。白判定専用。絶対彩度と違い、
 * 明るいピクセルほど色ズレが目立つ、という人間の感覚に近い形で「色カブリングの白」と
 * 「意図した薄い色」を区別できる。
 *
 * 絶対彩度: 白でないピクセルを「色として残すか、ノイズとして捨てるか」の判定用。
 * ただし絶対彩度が低くても、暗い（黒に近い）画素は意図して描かれた黒インクとして残す。
 * 黒インクは白インクと同様に彩度がほぼ0になるため、彩度だけで判定すると影・照明カブリング
 * と区別できず消えてしまう。
 */
function classifyPixel(
    r: number,
    g: number,
    b: number,
    opts: FilterOptions
): PixelClass {
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const relativeSaturation = maxC === 0 ? 0 : (maxC - minC) / maxC;

    const isWhite =
        luminance > opts.whiteThreshold && relativeSaturation < opts.whiteSaturationRatio;
    if (isWhite) return 'white';

    const sat = maxC - minC;
    const isBlackInk = luminance <= opts.blackLuminanceThreshold;
    if (sat >= opts.saturationThreshold || isBlackInk) return 'ink';

    return 'noise';
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
}

/**
 * 画像URLを ColorParticle[] に変換する。
 *
 * 単純に画像を n×n へ直接縮小してから画素ごとに白/インク/ノイズを判定すると、
 * 縮小時の平均化（1縮小先ピクセル ＝ 元画像の広い範囲の平均色）によって、マッキーや
 * サインペンで描いた細い線が周囲の白紙と混ざり、薄いグレーに薄まって消えてしまう。
 * これを避けるため、元画像に近い解像度（scanSize）でまず1画素ずつ分類し、
 * インクと判定された画素だけを n×n のセルへ集約（平均）する。これにより、
 * セル内にインク画素が1つでも存在すれば、周囲の白に薄められることなく必ず拾われる。
 */
async function sampleParticles(
    url: string,
    n: number,
    opts: FilterOptions
): Promise<ColorParticle[]> {
    const img = await loadImage(url);

    const nativeMax = Math.max(img.naturalWidth, img.naturalHeight);
    const scanSize = Math.max(n, Math.min(nativeMax, MAX_SCAN_SIZE));

    const canvas = document.createElement('canvas');
    canvas.width = scanSize;
    canvas.height = scanSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get 2D canvas context');
    }

    // 管理画面のPDF・印刷ページは object-fit: contain 相当（縦横比を保ったまま枠内に収め、
    // 余白を残す）で画像を配置している。ここも同じ contain 方式にすることで、アップロード時に
    // クロップした正方形の領域と、印刷される領域・花火になる領域を一致させる
    // （非正方形の画像が来ても引き伸ばさず、余白として除外されるだけにする）。
    const scale = Math.min(scanSize / img.naturalWidth, scanSize / img.naturalHeight);
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    const offsetX = (scanSize - drawWidth) / 2;
    const offsetY = (scanSize - drawHeight) / 2;
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    const data = ctx.getImageData(0, 0, scanSize, scanSize).data;

    // セルごとに「インク」画素の合計値と件数、「白」画素の件数を集計する
    const cellCount = n * n;
    const sumR = new Float64Array(cellCount);
    const sumG = new Float64Array(cellCount);
    const sumB = new Float64Array(cellCount);
    const inkCount = new Int32Array(cellCount);
    const whiteCount = new Int32Array(cellCount);

    for (let sy = 0; sy < scanSize; sy++) {
        // scanSize座標系 → n座標系へのマッピング
        const py = Math.min(n - 1, Math.floor((sy * n) / scanSize));
        for (let sx = 0; sx < scanSize; sx++) {
            const px = Math.min(n - 1, Math.floor((sx * n) / scanSize));
            const idx = (sy * scanSize + sx) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            // alpha は使用しない（背景が透明な場合も色として扱う）

            const cls = classifyPixel(r, g, b, opts);
            const cellIdx = py * n + px;

            if (cls === 'ink') {
                sumR[cellIdx] += r;
                sumG[cellIdx] += g;
                sumB[cellIdx] += b;
                inkCount[cellIdx] += 1;
            } else if (cls === 'white') {
                whiteCount[cellIdx] += 1;
            }
        }
    }

    const particles: ColorParticle[] = [];
    for (let py = 0; py < n; py++) {
        for (let px = 0; px < n; px++) {
            const cellIdx = py * n + px;
            // y は上が 0 → Three.js では上が正なので反転
            const x = px / (n - 1);
            const y = 1 - py / (n - 1);

            if (inkCount[cellIdx] > 0) {
                // 周囲の白画素は平均に混ぜないため、細い線でも薄まらない
                particles.push({
                    x,
                    y,
                    r: Math.round(sumR[cellIdx] / inkCount[cellIdx]),
                    g: Math.round(sumG[cellIdx] / inkCount[cellIdx]),
                    b: Math.round(sumB[cellIdx] / inkCount[cellIdx]),
                });
            } else if (opts.includeWhite && whiteCount[cellIdx] > 0) {
                particles.push({ x, y, r: 255, g: 255, b: 255 });
            }
        }
    }

    return particles;
}
