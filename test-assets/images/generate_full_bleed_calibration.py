#!/usr/bin/env python3
"""
issue #51（キーホルダー/PDF生成で画像が点線の切り取り枠からはみ出る）検証用の
キャリブレーション画像を生成するスクリプト。

生成される画像:
  - square-full-bleed-calibration.png   : 1024x1024。最外周1pxまで色が乗った正方形
  - landscape-full-bleed-calibration.jpg: 1600x1200 (4:3, JPEG品質78)。スマホ写真相当

デザイン（両方共通）:
  - 4辺を別々の色にした枠線（上=赤 / 右=緑 / 下=青 / 左=橙）を最外周に配置し、
    どの辺がはみ出た／欠けたかを判別できるようにする
  - 四隅にマゼンタのLマーカーを置き、上下反転・回転を判別しやすくする
  - 内側に5%刻みの目盛り（10%ごとに長い目盛り＋数値ラベル）を入れ、
    はみ出し量／欠け量を定量的に読み取れるようにする
  - 中央に三角形＋円のモチーフを置き、上下反転・回転を一目で検出できるようにする

色はすべて user/src/utils/imageToParticles.ts のフィルタ
（whiteThreshold=200 / saturationThreshold=30）を通過するように選んでいる
（彩度 max-min >= 60、かつ全チャンネル <= 200）。目盛り線・文字は人間が読むためだけの
ものなので、この制約からは除外している（無彩色グレーを使用）。

実行方法:
    python3 generate_full_bleed_calibration.py
"""

from PIL import Image, ImageDraw, ImageFont

# ── 色パレット（彩度 max-min >= 60、全チャンネル <= 200） ─────────────────────
RED = (200, 30, 30)  # 上辺
GREEN = (30, 160, 60)  # 右辺
BLUE = (40, 70, 200)  # 下辺
ORANGE = (200, 120, 20)  # 左辺
MAGENTA = (180, 30, 150)  # 四隅マーカー
CYAN = (20, 150, 190)  # 中央モチーフ

TICK_COLOR = (90, 90, 90)  # 目盛り・文字（人間が読むためだけなので無彩色でよい）
WHITE = (255, 255, 255)


def _load_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        # 古いPillowは load_default() が size 引数を受け付けない
        return ImageFont.load_default()


def draw_calibration(img: Image.Image, band: int, tick_len: int, font: ImageFont.ImageFont) -> None:
    """imgいっぱいにキャリブレーション模様を描く（最外周1pxまで色を乗せる）"""
    draw = ImageDraw.Draw(img)
    w, h = img.size

    # ── 4辺の枠線（最外周ぴったりまで） ──
    draw.rectangle([0, 0, w - 1, band - 1], fill=RED)  # 上
    draw.rectangle([w - band, 0, w - 1, h - 1], fill=GREEN)  # 右
    draw.rectangle([0, h - band, w - 1, h - 1], fill=BLUE)  # 下
    draw.rectangle([0, 0, band - 1, h - 1], fill=ORANGE)  # 左

    # ── 四隅のLマーカー（枠線の上から重ね書きしてクリアな形にする） ──
    leg = band * 3
    # 左上
    draw.rectangle([0, 0, leg, band - 1], fill=MAGENTA)
    draw.rectangle([0, 0, band - 1, leg], fill=MAGENTA)
    # 右上
    draw.rectangle([w - 1 - leg, 0, w - 1, band - 1], fill=MAGENTA)
    draw.rectangle([w - band, 0, w - 1, leg], fill=MAGENTA)
    # 左下
    draw.rectangle([0, h - band, leg, h - 1], fill=MAGENTA)
    draw.rectangle([0, h - 1 - leg, band - 1, h - 1], fill=MAGENTA)
    # 右下
    draw.rectangle([w - 1 - leg, h - band, w - 1, h - 1], fill=MAGENTA)
    draw.rectangle([w - band, h - 1 - leg, w - 1, h - 1], fill=MAGENTA)

    # ── 5%刻みの目盛り（10%ごとに長い目盛り＋数値） ──
    for pct in range(5, 100, 5):
        is_major = pct % 10 == 0
        length = tick_len * (2 if is_major else 1)

        # 上辺の内側（縦線）
        x = round(w * pct / 100)
        draw.line([(x, band), (x, band + length)], fill=TICK_COLOR, width=2)
        # 下辺の内側
        draw.line([(x, h - band), (x, h - band - length)], fill=TICK_COLOR, width=2)
        # 左辺の内側（横線）
        y = round(h * pct / 100)
        draw.line([(band, y), (band + length, y)], fill=TICK_COLOR, width=2)
        # 右辺の内側
        draw.line([(w - band, y), (w - band - length, y)], fill=TICK_COLOR, width=2)

        if is_major:
            label = str(pct)
            draw.text((x + 3, band + length + 2), label, fill=TICK_COLOR, font=font)
            draw.text((band + length + 3, y - 8), label, fill=TICK_COLOR, font=font)

    # ── 中央モチーフ（三角形＋円。上下反転・回転を一目で検出するため） ──
    cx, cy = w / 2, h / 2
    motif_scale = min(w, h)
    tri_half = motif_scale * 0.08
    tri_height = motif_scale * 0.14
    triangle = [
        (cx, cy - tri_height),  # 頂点は常に上
        (cx - tri_half, cy),
        (cx + tri_half, cy),
    ]
    draw.polygon(triangle, fill=CYAN)

    dot_r = motif_scale * 0.03
    dot_cy = cy + tri_height * 0.6
    draw.ellipse(
        [cx - dot_r, dot_cy - dot_r, cx + dot_r, dot_cy + dot_r],
        fill=MAGENTA,
    )


def build_square(path: str, size: int = 1024) -> None:
    img = Image.new("RGB", (size, size), WHITE)
    band = max(28, round(size * 0.035))
    tick_len = max(10, round(size * 0.015))
    font = _load_font(max(14, round(size * 0.018)))
    draw_calibration(img, band, tick_len, font)
    img.save(path, format="PNG")
    print(f"wrote {path} ({size}x{size})")


def build_landscape(path: str, width: int = 1600, height: int = 1200, quality: int = 78) -> None:
    img = Image.new("RGB", (width, height), WHITE)
    band = max(28, round(min(width, height) * 0.035))
    tick_len = max(10, round(min(width, height) * 0.015))
    font = _load_font(max(14, round(min(width, height) * 0.018)))
    draw_calibration(img, band, tick_len, font)
    img.save(path, format="JPEG", quality=quality)
    print(f"wrote {path} ({width}x{height}, JPEG q{quality})")


if __name__ == "__main__":
    import os

    out_dir = os.path.dirname(os.path.abspath(__file__))
    build_square(os.path.join(out_dir, "square-full-bleed-calibration.png"))
    build_landscape(os.path.join(out_dir, "landscape-full-bleed-calibration.jpg"))
