import datetime as d
from playwright.sync_api import sync_playwright, expect
tz = d.timezone(d.timedelta(hours=5, minutes=30))
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, timezone_id='Asia/Calcutta')
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    page.clock.install(time=d.datetime(2026, 10, 23, 10, 0, tzinfo=tz))
    page.goto('http://127.0.0.1:5173/', wait_until='networkidle')
    # setup
    page.get_by_label('Your name').fill('Aju')
    page.get_by_role('button', name='Start Ascent').click()
    expect(page.get_by_text('Plan today')).to_be_visible()
    # add a daily goal linked to DI sets
    page.get_by_role('button', name='Add today’s goals').click()
    page.get_by_role('button', name='DI sets', exact=True).click()
    page.get_by_role('button', name='Add goal').click()
    expect(page.get_by_text('Up next')).to_be_visible()
    # +1 progress -> XP toast
    page.get_by_role('button', name='Done', exact=True).click()
    expect(page.locator('.toast')).to_contain_text('+70 XP')
    # focus session via fast-forward clock
    page.get_by_role('button', name='Start focus session').first.click()
    page.get_by_role('button', name='Start 50 minutes').click()
    page.clock.fast_forward('51:00')
    page.wait_for_timeout(600)
    expect(page.get_by_text('Session logged')).to_be_visible()
    page.get_by_role('button', name='Back to today').click()
    expect(page.get_by_text('Streak secured')).to_be_visible()
    # manual mock
    page.get_by_role('button', name='Mocks', exact=True).click()
    page.get_by_role('button', name='Log a mock').click()
    page.get_by_role('button', name='Enter manually').click()
    page.get_by_label('Overall percentile').fill('78.07')
    page.get_by_label('VARC percentile').fill('95.3')
    page.get_by_role('button', name='Save mock · +100 XP').click()
    expect(page.get_by_text('1 mock logged')).to_be_visible()
    # persistence across reload
    page.reload(wait_until='networkidle')
    page.get_by_role('button', name='Plan', exact=True).click()
    expect(page.get_by_text('37 days').first).to_be_visible()
    print('E2E OK; errors:', errs)
    b.close()
