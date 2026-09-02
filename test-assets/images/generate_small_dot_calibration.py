#!/usr/bin/env python3
"""
「小さい黒（点）が花火変換時に検知できない」問題の検証用画像を生成するスクリプト。

生成される画像: small-dot-calibration.png (3000x3000)

user/src/utils/imageToParticles.ts と admin/utils/removeWhiteBackground.ts は、
絶対彩度が低い画素を「黒インク」として救済する輝度しきい値 blackLuminanceThreshold を
持つが、実際の撮影ではピンボケ・手ブレ・JPEG圧縮によって、小さい黒インクは画素の時点で
既に薄い（明るい）グレーへ滲んでいる。このため、しきい値が低すぎると、小さい点や
スパーク（花火の絵でよく描かれる小さな点）が「明るい無彩色ノイズ」と誤判定されて消えてしまう。

この画像は、実際のスマホ写真で生じる劣化（ガウシアンブラー＋JPEG圧縮）を模した上で、
直径4px〜60px（紙の長辺3000pxに対する比率）の黒い点を並べ、どのサイズまで検知できるかを
確認できるようにする。あわせて、影・照明カブリング相当のグレー領域を配置し、
しきい値を上げすぎて誤検知が起きていないかの回帰チェックにも使う。

配置:
  上部: 直径 4, 6, 8, 10, 12, 15, 18, 22, 26, 30, 36, 42, 50, 60px の黒い点を横一列に並べる
  下部: 影・照明カブリング相当のグレー四角形（輝度180程度・彩度10程度、回帰チェック用）

実行方法:
    python3 generate_small_dot_calibration.py
"""

import io
from PIL import Image, ImageDraw, ImageFilter

SIZE = 3000
DIAMETERS = [4, 6, 8, 10, 12, 15, 18, 22, 26, 30, 36, 42, 50, 60]
OFF_WHITE = (250, 248, 245)
INK = (10, 10, 12)  # 完全な純黒ではなく、実際のインクに近い値
SHADOW_GRAY = (185, 180, 178)  # 輝度181・彩度7程度。影・照明カブリング相当


def build(path: str, blur_radius: float = 2.5, jpeg_quality: int = 75) -> None:
    img = Image.new("RGB", (SIZE, SIZE), OFF_WHITE)
    draw = ImageDraw.Draw(img)

    margin = 150
    spacing = (SIZE - margin * 2) / (len(DIAMETERS) - 1)
    dots_cy = SIZE * 0.35
    for i, d in enumerate(DIAMETERS):
        cx = margin + i * spacing
        r = d / 2
        draw.ellipse([cx - r, dots_cy - r, cx + r, dots_cy + r], fill=INK)

    # 影・照明カブリング相当のグレー領域（回帰チェック用）
    draw.rectangle(
        [margin, SIZE * 0.6, SIZE - margin, SIZE - margin],
        fill=SHADOW_GRAY,
    )

    # 実際のスマホ撮影で生じるピンボケ・手ブレを模したガウシアンブラー
    img = img.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    # JPEG圧縮ノイズを模す（一度JPEGとして保存し、再読込して劣化を反映する）
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=jpeg_quality)
    buf.seek(0)
    degraded = Image.open(buf).convert("RGB")
    degraded.save(path, format="PNG")
    print(f"wrote {path} ({SIZE}x{SIZE}, blur={blur_radius}, jpeg_quality={jpeg_quality})")


if __name__ == "__main__":
    import os

    out_dir = os.path.dirname(os.path.abspath(__file__))
    build(os.path.join(out_dir, "small-dot-calibration.png"))
