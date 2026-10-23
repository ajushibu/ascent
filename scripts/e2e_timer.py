"""Timer must log itself: (1) app open on another tab, (2) app closed / phone locked, (3) abandoned paused timer."""
import datetime as d
from playwright.sync_api import sync_playwright, expect
tz = d.timezone(d.timedelta(hours=5, minutes=30))
T0 = d.datetime(2026, 10, 23, 10, 0, tzinfo=tz)

def boot(p):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, timezone_id='Asia/Calcutta')
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    page.clock.install(time=T0)
    page.goto('http://127.0.0.1:5173/', wait_until='networkidle')
    page.get_by_label('Your name').fill('Aju')
    page.get_by_role('button', name='Start Ascent').click()
    expect(page.get_by_text('Plan today')).to_be_visible()
    return b, page, errs

def start_and_leave(page):
    page.get_by_role('button', name='Start focus session').first.click()
    page.get_by_role('button', name='Start 50 minutes').click()
    page.get_by_label('Close').click()          # leave the timer screen: only the pill remains
    expect(page.locator('.timer-pill')).to_be_visible()

def focus_minutes(page):
    return page.evaluate("JSON.parse(localStorage.getItem('ascent:state:v1:local')).sessions.filter(s=>!s.deleted).map(s=>s.minutes)")

with sync_playwright() as p:
    # 1. timer screen closed, app stays open, 50 minutes pass
    b, page, errs = boot(p)
    start_and_leave(page)
    page.clock.fast_forward('51:00'); page.wait_for_timeout(500)
    assert focus_minutes(page) == [50], focus_minutes(page)
    expect(page.locator('.timer-pill')).to_have_count(0)
    assert not errs, errs
    b.close()

    # 2. phone locked: the page's timers never fire, the clock just jumps; the session logs when the app wakes up
    b, page, errs = boot(p)
    start_and_leave(page)
    page.clock.set_system_time(T0 + d.timedelta(minutes=55))
    page.reload(wait_until='networkidle'); page.wait_for_timeout(600)
    assert focus_minutes(page) == [50], focus_minutes(page)       # full 50, not 55
    expect(page.locator('.timer-pill')).to_have_count(0)
    assert not errs, errs
    b.close()

    # 3. paused and forgotten for 4 hours: ends and logs only what was actually done
    b, page, errs = boot(p)
    start_and_leave(page)
    page.clock.fast_forward('12:00')                 # 12 minutes of focus
    page.locator('.timer-pill').click(); page.get_by_role('button', name='Pause').click(); page.get_by_label('Close').click()
    page.clock.set_system_time(T0 + d.timedelta(hours=4))
    page.reload(wait_until='networkidle'); page.wait_for_timeout(600)
    assert focus_minutes(page) == [12], focus_minutes(page)
    assert not errs, errs
    b.close()
print('TIMER E2E OK')
