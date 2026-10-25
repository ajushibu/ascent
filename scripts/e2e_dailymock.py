import datetime as d
from playwright.sync_api import sync_playwright, expect
tz = d.timezone(d.timedelta(hours=5, minutes=30))
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True).new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.install(time=d.datetime(2026, 10, 25, 10, 0, tzinfo=tz))
    pg.goto('http://localhost:5173/', wait_until='networkidle')
    pg.get_by_label('Your name').fill('A')
    pg.get_by_role('button', name='Start Ascent').click()
    pg.get_by_role('button', name='Add today’s goals').click()
    pg.get_by_role('button', name='Full mock', exact=True).click()
    expect(pg.get_by_text('Ticks itself when you log a mock')).to_be_visible()
    pg.get_by_role('button', name='Add goal').click()
    row = pg.locator('.task-row, li, [class*=task]').filter(has_text='Full mock').first
    expect(pg.get_by_text('Full mock').first).to_be_visible()
    assert pg.get_by_role('button', name='Done', exact=True).count() == 0  # can't be ticked by hand
    pg.get_by_role('button', name='Mocks', exact=True).click()
    pg.get_by_role('button', name='Log a mock').click()
    pg.get_by_role('button', name='Enter manually').click()
    pg.get_by_label('Overall percentile').fill('80')
    pg.get_by_role('button', name='Save').click()
    pg.get_by_role('button', name='Today', exact=True).click()
    pg.wait_for_timeout(500)
    expect(pg.get_by_text('All done')).to_be_visible()
    print('DAILY MOCK OK')
    print('ERRS', errs)
