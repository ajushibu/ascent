import sys, datetime, pathlib
from playwright.sync_api import sync_playwright
rnd = sys.argv[1] if len(sys.argv) > 1 else 'r1'
themes = sys.argv[2].split(',') if len(sys.argv) > 2 else ['light']
out = pathlib.Path('/tmp/claude-0/shots') / rnd
out.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:5173/?demo=1'
import datetime as _d
when = datetime.datetime(2026, 10, 23, 16, 58, 0, tzinfo=_d.timezone(_d.timedelta(hours=5, minutes=30)))

def goto_tab(page, name):
    page.get_by_role('button', name=name, exact=True).first.click()
    page.wait_for_timeout(500)

with sync_playwright() as p:
    b = p.chromium.launch()
    for theme in themes:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, timezone_id='Asia/Calcutta', color_scheme=theme, locale='en-IN')
        page = ctx.new_page()
        page.clock.install(time=when)
        errs = []
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto(BASE + ('&dark' if theme == 'dark' else ''), wait_until='networkidle')
        page.wait_for_timeout(900)
        page.screenshot(path=str(out / f'{theme}-today-fold.png'))
        page.screenshot(path=str(out / f'{theme}-today-full.png'), full_page=True)
        for tab in ['Plan', 'Mocks', 'Insights']:
            goto_tab(page, tab)
            page.evaluate('window.scrollTo(0,0)')
            page.screenshot(path=str(out / f'{theme}-{tab.lower()}-full.png'), full_page=True)
        goto_tab(page, 'Plan')
        for seg in ['Weekly', 'Daily']:
            page.get_by_role('tab', name=seg).click(); page.wait_for_timeout(400)
            page.screenshot(path=str(out / f'{theme}-plan-{seg.lower()}.png'), full_page=True)
        page.get_by_role('button', name='Start focus session').click(); page.wait_for_timeout(600)
        page.screenshot(path=str(out / f'{theme}-focus.png'))
        print(theme, 'errors:', errs[:5])
        ctx.close()
    b.close()
print('done ->', out)
