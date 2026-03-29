from playwright.async_api import async_playwright, Page, Browser

_playwright = None
_browser: Browser = None

# CDP endpoint that a real Chrome exposes when launched with --remote-debugging-port
CDP_URL = "http://localhost:9222"


async def start_browser():
    """
    Connect to a real Chrome instance running with --remote-debugging-port=9222.

    Before running main.py, launch Chrome once with:
      /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222

    Leave that Chrome window open, then run main.py.
    """
    global _playwright, _browser
    _playwright = await async_playwright().start()
    _browser = await _playwright.chromium.connect_over_cdp(CDP_URL)
    print("  [browser] Connected to real Chrome via CDP")


async def stop_browser():
    """Disconnect from Chrome. Does NOT close the Chrome window."""
    global _playwright, _browser
    if _browser:
        await _browser.close()
    if _playwright:
        await _playwright.stop()


async def fetch_page(url: str) -> tuple[Page, str]:
    """
    Open a new tab in the connected Chrome, navigate to url,
    scroll to load lazy content, and return (page, html_content).
    The caller is responsible for closing the page when done.
    """
    context = _browser.contexts[0] if _browser.contexts else await _browser.new_context()
    page = await context.new_page()

    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    await page.wait_for_timeout(3000)  # let JS render after DOM loads

    # Scroll to bottom repeatedly to trigger lazy-loaded product batches
    for _ in range(15):
        await page.evaluate("window.scrollBy(0, window.innerHeight)")
        await page.wait_for_timeout(800)

    # Scroll back to top so any remaining lazy elements resolve
    await page.evaluate("window.scrollTo(0, 0)")
    await page.wait_for_timeout(1000)

    html = await page.content()
    return page, html
