import { createImage } from '@/utils/cropImage';

export interface BackgroundRemovalOptions {
  /** 白とみなす知覚輝度のしきい値（0〜255） */
  whiteThreshold?: number;
  /** 白判定用の相対彩度（HSVのS）しきい値（0〜1） */
  whiteSaturationRatio?: number;
  /** これ未満の絶対彩度を無彩色ノイズとして除外する */
  saturationThreshold?: number;
}

const DEFAULT_OPTIONS: Required<BackgroundRemovalOptions> = {
  whiteThreshold: 200,
  whiteSaturationRatio: 0.2,
  saturationThreshold: 30,
};

/**
 * 花火のパーティクル変換と同じ基準で、背景として除外する画素かを判定する。
 * 明るく低彩度な白背景に加え、影などの無彩色ノイズも除外対象にする。
 */
export function isBackgroundPixel(
  r: number,
  g: number,
  b: number,
  options: Required<BackgroundRemovalOptions> = DEFAULT_OPTIONS
): boolean {
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const saturation = maxC - minC;
  const relativeSaturation = maxC === 0 ? 0 : saturation / maxC;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  const isWhite =
    luminance > options.whiteThreshold &&
    relativeSaturation < options.whiteSaturationRatio;

  return isWhite || saturation < options.saturationThreshold;
}

/**
 * 白判定から漏れた照明の色かぶりや影は、通常は用紙の外周へつながっている。
 * 一次判定後も画像端へつながっている不透明領域を背景として透明化する。
 */
function removeEdgeConnectedBackground(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): void {
  const queue = new Int32Array(width * height);
  let readIndex = 0;
  let writeIndex = 0;

  const enqueueOpaquePixel = (pixelIndex: number) => {
    const alphaIndex = pixelIndex * 4 + 3;
    if (pixels[alphaIndex] === 0) return;

    // enqueueと同時に透明化し、同じ画素を再登録しないためのvisitedとしても使う。
    pixels[alphaIndex] = 0;
    queue[writeIndex] = pixelIndex;
    writeIndex += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueueOpaquePixel(x);
    enqueueOpaquePixel((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueueOpaquePixel(y * width);
    enqueueOpaquePixel(y * width + width - 1);
  }

  while (readIndex < writeIndex) {
    const pixelIndex = queue[readIndex];
    readIndex += 1;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    if (x > 0) enqueueOpaquePixel(pixelIndex - 1);
    if (x + 1 < width) enqueueOpaquePixel(pixelIndex + 1);
    if (y > 0) enqueueOpaquePixel(pixelIndex - width);
    if (y + 1 < height) enqueueOpaquePixel(pixelIndex + width);
  }
}

/**
 * 画像の白背景と無彩色ノイズを透明化し、PNG data URLとして返す。
 * 色付きの花火画素と元画像の既存alphaは保持する。
 */
export async function removeWhiteBackground(
  imageSource: string,
  options: BackgroundRemovalOptions = {}
): Promise<string> {
  const resolvedOptions: Required<BackgroundRemovalOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  const image = await createImage(imageSource);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Failed to get 2D canvas context for background removal');
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    if (isBackgroundPixel(
      pixels[index],
      pixels[index + 1],
      pixels[index + 2],
      resolvedOptions
    )) {
      pixels[index + 3] = 0;
    }
  }

  removeEdgeConnectedBackground(pixels, canvas.width, canvas.height);

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
