const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  // Simulate mobile viewport
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();
  
  await page.goto('http://localhost:8445');
  await page.waitForTimeout(500);
  
  const color = await page.evaluate(() => {
    const el = document.querySelector('.compact-mobile-outlet');
    if (!el) return 'Element not found';
    return window.getComputedStyle(el).color;
  });
  
  console.log('Mobile Outlet Computed Color:', color);
  await browser.close();
})();
