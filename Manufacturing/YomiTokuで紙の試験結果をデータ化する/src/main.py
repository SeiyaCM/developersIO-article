from typing import Final

import cv2
from yomitoku import DocumentAnalyzer
from yomitoku.data.functions import load_pdf

IMAGE_PATH:Final[str] = "./検査結果サンプル.pdf"

if __name__ == "__main__":
    analyzer = DocumentAnalyzer(visualize=True, device="cpu")
    imgs = load_pdf(IMAGE_PATH)
    for i, img in enumerate(imgs):
        results, ocr_vis, layout_vis = analyzer(img)
        # HTML形式で解析結果をエクスポート
        results.to_html(f"output_{i}.html", img=img)
        # 可視化画像を保存
        cv2.imwrite(f"output_ocr_{i}.jpg", ocr_vis)
        cv2.imwrite(f"output_layout_{i}.jpg", layout_vis)