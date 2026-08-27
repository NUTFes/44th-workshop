# NotoSansJP-subset.ttf

`admin/components/QRCode.tsx` の `handleGeneratePDF`（🔑 キーホルダー印刷の「PDFの生成」）が
jsPDF に埋め込むための日本語フォント。jsPDFの標準フォント（Helvetica等）は日本語グリフを
持たないため、埋め込みフォントが無いとPDF内の日本語ラベルが文字化けする。

[Noto Sans JP](https://github.com/google/fonts/tree/main/ofl/notosansjp)（OFLライセンス、
`OFL.txt` 参照）を、PDF内で実際に使われている文字だけに `fonttools` でサブセット化したもの
（9.5MB → 約87KB）。

## 再生成方法

`QRCode.tsx` の `pdf.text()` に新しいラベル文字列を追加した場合、その文字が
`NotoSansJP-subset.ttf` に含まれていないと文字化けする。以下の手順で作り直す。

```bash
pip3 install fonttools

# 1. 可変フォントを取得
curl -sL -o NotoSansJP.ttf \
  "https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf"

# 2. Regular(400)ウェイトを固定した静的フォントに変換
fonttools varLib.instancer -o NotoSansJP-Regular-static.ttf NotoSansJP.ttf wght=400

# 3. QRCode.tsx の pdf.text() で使われている全文字列を subset_text.txt に書き出してから、
#    ASCII全域 + その文字だけにサブセット化
pyftsubset NotoSansJP-Regular-static.ttf \
  --output-file=NotoSansJP-subset.ttf \
  --unicodes="U+0020-007E" \
  --text-file=subset_text.txt \
  --layout-features='*' --glyph-names --symbol-cmap --legacy-cmap \
  --notdef-glyph --notdef-outline --recommended-glyphs \
  --name-IDs='*' --name-legacy --name-languages='*'
```

絵文字（🔑等）は本サブセットにもNoto Sans JP自体にも含まれない（色付き絵文字は簡易TTF埋め込みでは
描画できない）ため、PDF内の `pdf.text()` では使用しないこと。
