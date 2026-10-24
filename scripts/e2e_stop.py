import datetime as d
from playwright.sync_api import sync_playwright, expect
tz=d.timezone(d.timedelta(hours=5,minutes=30))
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    pg=c.new_page(); pg.clock.install(time=d.datetime(2026,10,24,10,0,tzinfo=tz))
    pg.goto('http://localhost:5173/',wait_until='networkidle')
    pg.get_by_label('Your name').fill('A'); pg.get_by_role('button',name='Start Ascent').click()
    def run(min_):
        pg.get_by_role('button',name='Start focus session').first.click()
        pg.get_by_role('button',name='Start 50 minutes').click()
        pg.clock.fast_forward(f'{min_:02d}:00'); pg.wait_for_timeout(300)
        pg.get_by_role('button',name='Stop',exact=True).click()
    run(3)
    expect(pg.get_by_text('Under 5 minutes')).to_be_visible()
    assert pg.get_by_role('button',name='Discard session').is_visible()
    pg.get_by_role('button',name='Keep going').click(); pg.get_by_role('button',name='Stop',exact=True).click()
    pg.get_by_role('button',name='Discard session').click()
    run(20)
    print(pg.locator('.stop-card').inner_text())
    pg.get_by_role('button',name='Log 20 min').click()
    expect(pg.get_by_text('Session logged')).to_be_visible()
    print('STOP OK')
