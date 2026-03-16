from PIL import Image, ImageDraw, ImageFont
import os

# Carregar QR codes gerados
qr_web = Image.open("/home/ubuntu/segtec/expo-qr-code.png").convert("RGB")
qr_expogo = Image.open("/home/ubuntu/segtec/expo-qr-expogo.png").convert("RGB")

# Dimensões do canvas final
CANVAS_W = 1200
CANVAS_H = 800
PADDING = 40
QR_SIZE = 340

canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), (15, 25, 50))
draw = ImageDraw.Draw(canvas)

# Fundo gradiente
for y in range(CANVAS_H):
    t = y / CANVAS_H
    r = int(15 + (25 - 15) * t)
    g = int(25 + (40 - 25) * t)
    b = int(50 + (75 - 50) * t)
    draw.line([(0, y), (CANVAS_W, y)], fill=(r, g, b))

draw = ImageDraw.Draw(canvas)

# ── Logo / título ──────────────────────────────────────────────────────────
# Carregar ícone do app
icon = Image.open("/home/ubuntu/segtec/assets/images/icon.png").convert("RGBA")
icon = icon.resize((80, 80), Image.LANCZOS)
canvas.paste(icon, (CANVAS_W//2 - 40, 30), mask=icon.split()[3])

# Tentar usar fonte, fallback para default
try:
    font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 42)
    font_sub   = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
    font_label = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
    font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
except:
    font_title = ImageFont.load_default()
    font_sub   = font_title
    font_label = font_title
    font_small = font_title

# Título
title = "ProntoTEC+"
bbox = draw.textbbox((0, 0), title, font=font_title)
tw = bbox[2] - bbox[0]
draw.text(((CANVAS_W - tw) // 2, 120), title, fill=(255, 165, 0), font=font_title)

# Subtítulo
sub = "Escaneie o QR Code para testar o aplicativo"
bbox = draw.textbbox((0, 0), sub, font=font_sub)
sw = bbox[2] - bbox[0]
draw.text(((CANVAS_W - sw) // 2, 175), sub, fill=(200, 210, 230), font=font_sub)

# ── QR Code 1: Navegador Web ───────────────────────────────────────────────
qr1_x = PADDING + 100
qr1_y = 230
qr_web_resized = qr_web.resize((QR_SIZE, QR_SIZE), Image.LANCZOS)

# Card branco para o QR
draw.rounded_rectangle(
    [qr1_x - 20, qr1_y - 20, qr1_x + QR_SIZE + 20, qr1_y + QR_SIZE + 80],
    radius=20, fill=(255, 255, 255)
)
canvas.paste(qr_web_resized, (qr1_x, qr1_y))

# Label
label1 = "Navegador Web"
bbox = draw.textbbox((0, 0), label1, font=font_label)
lw = bbox[2] - bbox[0]
lx = qr1_x + (QR_SIZE - lw) // 2
draw.text((lx, qr1_y + QR_SIZE + 10), label1, fill=(15, 25, 50), font=font_label)

# Instrução
inst1 = "Abra no celular"
bbox = draw.textbbox((0, 0), inst1, font=font_small)
iw = bbox[2] - bbox[0]
ix = qr1_x + (QR_SIZE - iw) // 2
draw.text((ix, qr1_y + QR_SIZE + 42), inst1, fill=(100, 120, 150), font=font_small)

# ── QR Code 2: Expo Go ────────────────────────────────────────────────────
qr2_x = CANVAS_W - PADDING - 100 - QR_SIZE
qr2_y = 230
qr_expogo_resized = qr_expogo.resize((QR_SIZE, QR_SIZE), Image.LANCZOS)

# Card branco para o QR
draw.rounded_rectangle(
    [qr2_x - 20, qr2_y - 20, qr2_x + QR_SIZE + 20, qr2_y + QR_SIZE + 80],
    radius=20, fill=(255, 255, 255)
)
canvas.paste(qr_expogo_resized, (qr2_x, qr2_y))

# Label
label2 = "Expo Go"
bbox = draw.textbbox((0, 0), label2, font=font_label)
lw = bbox[2] - bbox[0]
lx = qr2_x + (QR_SIZE - lw) // 2
draw.text((lx, qr2_y + QR_SIZE + 10), label2, fill=(15, 25, 50), font=font_label)

# Instrução
inst2 = "App Expo Go no celular"
bbox = draw.textbbox((0, 0), inst2, font=font_small)
iw = bbox[2] - bbox[0]
ix = qr2_x + (QR_SIZE - iw) // 2
draw.text((ix, qr2_y + QR_SIZE + 42), inst2, fill=(100, 120, 150), font=font_small)

# ── Divisor central ───────────────────────────────────────────────────────
mid_x = CANVAS_W // 2
draw.line([(mid_x, 250), (mid_x, 650)], fill=(50, 70, 100), width=2)
or_text = "OU"
bbox = draw.textbbox((0, 0), or_text, font=font_label)
ow = bbox[2] - bbox[0]
oh = bbox[3] - bbox[1]
draw.rounded_rectangle(
    [mid_x - 30, 440, mid_x + 30, 490],
    radius=10, fill=(30, 45, 75)
)
draw.text((mid_x - ow//2, 445), or_text, fill=(150, 170, 200), font=font_label)

# ── Rodapé ────────────────────────────────────────────────────────────────
footer = "ProntoTEC+ v1.0 · Técnicos de Segurança Eletrônica"
bbox = draw.textbbox((0, 0), footer, font=font_small)
fw = bbox[2] - bbox[0]
draw.text(((CANVAS_W - fw) // 2, CANVAS_H - 35), footer, fill=(80, 100, 130), font=font_small)

# Salvar
out_path = "/home/ubuntu/segtec/qrcode_prontotecplus.png"
canvas.save(out_path, "PNG", optimize=True)
size_kb = os.path.getsize(out_path) // 1024
print(f"QR Code visual salvo: {out_path} ({size_kb} KB)")
