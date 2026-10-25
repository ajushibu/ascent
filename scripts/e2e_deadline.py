import datetime as d
from playwright.sync_api import sync_playwright, expect
tz = d.timezone(d.timedelta(hours=5, minutes=30))
with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    pg = c.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.install(time=d.datetime(2026, 10, 26, 10, 0, tzinfo=tz))
    pg.goto('http://localhost:5173/', wait_until='networkidle')
    pg.get_by_label('Your name').fill('A')
    pg.get_by_role('button', name='Start Ascent').click()
    pg.get_by_role('button', name='Plan', exact=True).click()
    pg.get_by_role('button', name='Edit DI sets').click()
    for _ in range(7): pg.get_by_label('increase').first.click() if False else None
    # Finish-by stepper is the second stepper (after Total)
    pg.locator('.stepper').nth(1).get_by_label('increase').click(click_count=7) if False else None
    for _ in range(7): pg.locator('.stepper').nth(1).get_by_label('increase').click()
    expect(pg.get_by_text('7 days before the exam')).to_be_visible()
    pg.get_by_role('button', name='Save changes').click()
    expect(pg.get_by_text('Finish by 22 Nov')).to_be_visible()
    pg.get_by_role('tab', name='Weekly').click()
    pg.get_by_role('button', name=lambda n: False) if False else None
    pg.get_by_text('Suggest this week’s goals').click()
    expect(pg.get_by_text('DI sets').first).to_be_visible()
    print('DEADLINE OK', errs)
