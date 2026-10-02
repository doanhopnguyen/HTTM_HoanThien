"""Generate the application's simple wave mark at native icon resolutions."""
from pathlib import Path
from math import sin, pi
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
desktop = root / 'desktop/assets'
mobile = root / 'mobile/assets'
desktop.mkdir(parents=True, exist_ok=True)
mobile.mkdir(parents=True, exist_ok=True)
size = 1024
image = Image.new('RGBA', (size, size), '#2563eb')
draw = ImageDraw.Draw(image)
for row in range(3):
    points = [(x, int(355 + row * 155 + 55 * sin((x - 190) / 640 * pi * 4))) for x in range(190, 835)]
    draw.line(points, fill='white', width=50, joint='curve')
image.save(mobile / 'icon.png')
image.save(desktop / 'icon.png')
image.save(desktop / 'icon.ico', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
(desktop / 'icon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#2563eb"/><g fill="none" stroke="white" stroke-width="5" stroke-linecap="round"><path d="M20 34q8 8 16 0t16 0t16 0t16 0"/><path d="M20 49q8 8 16 0t16 0t16 0t16 0"/><path d="M20 64q8 8 16 0t16 0t16 0t16 0"/></g></svg>''')
