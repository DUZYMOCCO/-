import os
import math
from PIL import Image, ImageDraw, ImageFont

os.makedirs("assets/icons", exist_ok=True)

def create_app_icon(size):
    img = Image.new("RGBA", (size, size), (15, 17, 26, 255))
    draw = ImageDraw.Draw(img)

    # 背景グラデーション風の円形グロー
    center = size / 2
    for r in range(int(size * 0.7), 0, -8):
        alpha = int(40 * (1 - r / (size * 0.7)))
        draw.ellipse(
            [center - r, center - r, center + r, center + r],
            fill=(120, 50, 255, alpha)
        )

    # ネオンのコントローラーアイコン（ゲームパッド形状）
    pad_w = size * 0.62
    pad_h = size * 0.38
    pad_x = (size - pad_w) / 2
    pad_y = (size - pad_h) / 2 + size * 0.02
    radius = pad_h * 0.45

    # 外枠グロー
    for glow in range(8, 0, -2):
        draw.rounded_rectangle(
            [pad_x - glow, pad_y - glow, pad_x + pad_w + glow, pad_y + pad_h + glow],
            radius=radius + glow,
            outline=(0, 240, 255, 30)
        )

    # パッド本体
    draw.rounded_rectangle(
        [pad_x, pad_y, pad_x + pad_w, pad_y + pad_h],
        radius=radius,
        fill=(25, 28, 44, 255),
        outline=(0, 240, 255, 240),
        width=max(2, int(size * 0.025))
    )

    # D-pad (十字キー)
    dpad_cx = pad_x + pad_w * 0.28
    dpad_cy = pad_y + pad_h * 0.5
    d_size = pad_h * 0.35
    d_thick = d_size * 0.38
    # 横
    draw.rectangle(
        [dpad_cx - d_size, dpad_cy - d_thick, dpad_cx + d_size, dpad_cy + d_thick],
        fill=(0, 240, 255, 230)
    )
    # 縦
    draw.rectangle(
        [dpad_cx - d_thick, dpad_cy - d_size, dpad_cx + d_thick, dpad_cy + d_size],
        fill=(0, 240, 255, 230)
    )

    # ボタン (4つのアクションボタン)
    btn_cx = pad_x + pad_w * 0.72
    btn_cy = pad_y + pad_h * 0.5
    b_rad = pad_h * 0.12
    offset = pad_h * 0.22

    # 上 (ピンク)
    draw.ellipse([btn_cx - b_rad, (btn_cy - offset) - b_rad, btn_cx + b_rad, (btn_cy - offset) + b_rad], fill=(255, 0, 128, 240))
    # 下 (ネオンイエロー)
    draw.ellipse([btn_cx - b_rad, (btn_cy + offset) - b_rad, btn_cx + b_rad, (btn_cy + offset) + b_rad], fill=(255, 230, 0, 240))
    # 左 (ブルー)
    draw.ellipse([(btn_cx - offset) - b_rad, btn_cy - b_rad, (btn_cx - offset) + b_rad, btn_cy + b_rad], fill=(0, 200, 255, 240))
    # 右 (グリーン)
    draw.ellipse([(btn_cx + offset) - b_rad, btn_cy - b_rad, (btn_cx + offset) + b_rad, btn_cy + b_rad], fill=(0, 255, 150, 240))

    # 工房のスパーク（キラキラ光る星）
    def draw_star(sx, sy, s_rad, color):
        points = []
        for i in range(8):
            ang = i * math.pi / 4
            r = s_rad if i % 2 == 0 else s_rad * 0.3
            points.append((sx + r * math.cos(ang), sy + r * math.sin(ang)))
        draw.polygon(points, fill=color)

    draw_star(size * 0.75, size * 0.22, size * 0.08, (255, 235, 50, 240))
    draw_star(size * 0.22, size * 0.78, size * 0.06, (0, 240, 255, 220))

    return img

for sz in [180, 192, 512]:
    icon = create_app_icon(sz)
    icon.save(f"assets/icons/icon-{sz}.png")
    print(f"Generated assets/icons/icon-{sz}.png")

# Apple Touch Icon用 (180x180)
icon_180 = create_app_icon(180)
icon_180.save("assets/icons/apple-touch-icon.png")
print("Generated assets/icons/apple-touch-icon.png")
