#!/usr/bin/env python3
"""
「マッキー・サインペン程度の太さの線が花火変換時に消える」バグの検証用画像を生成するスクリプト。

生成される画像: thin-marker-line-calibration.png (3000x3000, 白背景)

user/src/utils/imageToParticles.ts は、アップロードされた画像を n×n（32/64/128）の
小さいグリッドへ直接縮小してから画素ごとに色を判定していた。この縮小はCanvas 2Dの
drawImageによる平均化であり、元画像の中では数十pxしかない線（マッキーやサインペンで
描いた線）は、周囲の白紙と平均されて薄いグレーに薄まり、消えてしまっていた。

この画像は、実際にスマホで紙いっぱいの絵を撮影したときの解像度感（3000px程度）を
再現し、紙の長辺に対して概ね1%弱（約28px）の太さの線を含む。太い/塗りつぶし領域は
修正前後で変化しないはずの回帰チェック用として別途配置する。

配置（4象限）:
  左上: 黒の円の輪郭線（線幅 約28px、マッキー相当）
  右上: 黒のジグザグ線（同じ線幅）
  左下: 黒の塗りつぶし四角形（太い/大きい領域の回帰チェック用）
  右下: 青の塗りつぶし四角形（色付きインクの回帰チェック用）

実行方法:
    python3 generate_thin_marker_line_calibration.py
"""

from PIL import Image, ImageDraw

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
BLUE = (30, 60, 200)  # 彩度170程度


def build(path: str, size: int = 3000, line_width: int = 28) -> None:
    img = Image.new("RGB", (size, size), WHITE)
    draw = ImageDraw.Draw(img)

    quad = size // 2
    margin = size // 10

    # ── 左上: 黒の円の輪郭線（マッキー相当の太さ） ──
    circle_box = [
        margin + line_width, margin + line_width,
        quad - margin - line_width, quad - margin - line_width,
    ]
    draw.ellipse(circle_box, outline=BLACK, width=line_width)

    # ── 右上: 黒のジグザグ線 ──
    zigzag_x0 = quad + margin
    zigzag_x1 = size - margin
    zigzag_y0 = margin + line_width
    zigzag_y1 = quad - margin - line_width
    step = (zigzag_x1 - zigzag_x0) // 6
    points = []
    for i in range(7):
        x = zigzag_x0 + i * step
        y = zigzag_y0 if i % 2 == 0 else zigzag_y1
        points.append((x, y))
    draw.line(points, fill=BLACK, width=line_width, joint="curve")

    # ── 左下: 黒の塗りつぶし四角形（回帰チェック用） ──
    draw.rectangle(
        [margin, quad + margin, quad - margin, size - margin],
        fill=BLACK,
    )

    # ── 右下: 青の塗りつぶし四角形（回帰チェック用） ──
    draw.rectangle(
        [quad + margin, quad + margin, size - margin, size - margin],
        fill=BLUE,
    )

    img.save(path, format="PNG")
    print(f"wrote {path} ({size}x{size}, line_width={line_width}px)")


if __name__ == "__main__":
    import os

    out_dir = os.path.dirname(os.path.abspath(__file__))
    build(os.path.join(out_dir, "thin-marker-line-calibration.png"))
