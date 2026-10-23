from playwright.sync_api import sync_playwright
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent / 'public'
def svg(maskable=False):
    inset = 0.14 if maskable else 0
    scale = 1 - 2*inset
    r = 0 if maskable else 116
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6A55FF"/><stop offset="1" stop-color="#3B25D6"/></linearGradient></defs>
<rect width="512" height="512" rx="{r}" fill="url(#g)"/>
<g transform="translate({512*inset} {512*inset}) scale({scale})"><path d="M124 372 256 162 388 372" fill="none" stroke="#fff" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/><circle cx="256" cy="104" r="28" fill="#FFC53D"/></g></svg>'''
jobs = [('icon-192.png',192,False),('icon-512.png',512,False),('icon-512-maskable.png',512,True),('apple-touch-icon.png',180,True)]
with sync_playwright() as p:
    b = p.chromium.launch()
    for name,size,mask in jobs:
        pg = b.new_page(viewport={'width':size,'height':size})
        pg.set_content(f'<body style="margin:0">{svg(mask).replace("<svg ", f"<svg width=\"{size}\" height=\"{size}\" ")}</body>')
        pg.screenshot(path=str(root/name), omit_background=False)
        pg.close()
    b.close()
print('icons ok')
