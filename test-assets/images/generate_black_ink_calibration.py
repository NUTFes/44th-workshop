#!/usr/bin/env python3
"""
「黒で描いた部分が除去される」バグの検証用画像を生成するスクリプト。

生成される画像: black-ink-preservation-calibration.png (800x800, 白背景)

user/src/utils/imageToParticles.ts と admin/utils/removeWhiteBackground.ts は
どちらも「絶対彩度が低い画素を無彩色ノイズとして除外する」ロジックを持つが、
黒インクも絶対彩度がほぼ0のため、影・照明カブリングと同じ扱いで消えてしまっていた。
この画像は、黒インク（暗い無彩色）と影・照明カブリング相当のノイズ（明るい無彩色）を
明確に分けて配置し、修正後は前者だけが残ることを確認できるようにする。

配置（4象限）:
  左上: 純黒（RGB 0,0,0）の四角形と、細い黒の線（ペン書きのストローク相当）
  右上: やや青みがかった黒（RGB 15,15,25、実際のペン・鉛筆の黒に近い）の星形
  左下: 影・照明カブリング相当のグレー（輝度181・彩度7程度）の四角形
        → 修正後もこれは除去され続けることを確認するための回帰チェック用
  右下: 通常の彩度の高い赤（RGB 200,30,30）の四角形
        → 彩度による従来の判定が壊れていないことを確認するための回帰チェック用

実行方法:
    python3 generate_black_ink_calibration.py
"""

from PIL import Image, ImageDraw

WHITE = (255, 255, 255)
PURE_BLACK = (0, 0, 0)
INK_BLACK = (15, 15, 25)  # 実際のペン・鉛筆に近い、わずかに青みがかった黒
SHADOW_GRAY = (185, 180, 178)  # 輝度181・彩度7程度。影・照明カブリング相当
RED = (200, 30, 30)  # 彩度170。通常の色付きインクの回帰チェック用


def build(path: str, size: int = 800) -> None:
    img = Image.new("RGB", (size, size), WHITE)
    draw = ImageDraw.Draw(img)

    quad = size // 2
    margin = size // 10

    # ── 左上: 純黒の四角形 + 細い黒の線（ペン書きストローク相当） ──
    draw.rectangle(
        [margin, margin, quad - margin, quad - margin],
        fill=PURE_BLACK,
    )
    # 四角形の下に、細い線を数本引いて「ペンの筆致」を模す
    line_y = quad - margin + 30
    for i in range(5):
        x0 = margin + i * 15
        draw.line(
            [(x0, line_y), (x0 + 8, line_y + 40)],
            fill=PURE_BLACK,
            width=3,
        )

    # ── 右上: 青みがかった黒の星形（花火の絵柄を模す） ──
    cx, cy = quad + quad // 2, quad // 2
    r_outer = quad // 2 - margin
    r_inner = r_outer // 2
    import math
    points = []
    for i in range(10):
        angle = math.pi / 2 + i * math.pi / 5
        r = r_outer if i % 2 == 0 else r_inner
        points.append((cx + r * math.cos(angle), cy - r * math.sin(angle)))
    draw.polygon(points, fill=INK_BLACK)

    # ── 左下: 影・照明カブリング相当のグレー四角形（回帰チェック用） ──
    draw.rectangle(
        [margin, quad + margin, quad - margin, size - margin],
        fill=SHADOW_GRAY,
    )

    # ── 右下: 通常の赤い四角形（回帰チェック用） ──
    draw.rectangle(
        [quad + margin, quad + margin, size - margin, size - margin],
        fill=RED,
    )

    img.save(path, format="PNG")
    print(f"wrote {path} ({size}x{size})")


if __name__ == "__main__":
    import os

    out_dir = os.path.dirname(os.path.abspath(__file__))
    build(os.path.join(out_dir, "black-ink-preservation-calibration.png"))
