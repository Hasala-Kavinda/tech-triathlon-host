const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8445');
  await page.waitForTimeout(1000);
  await page.locator('select').filter({ hasText: 'Waypoint Style' }).selectOption({ label: 'Waypoint Style' });
  await page.waitForTimeout(1000);
  
  const text = await page.evaluate(() => {
    const clone = document.body.cloneNode(true);
    const selects = clone.querySelectorAll('select');
    selects.forEach(s => s.remove());
    return clone.innerText;
  });
  
  if (text.includes("Dry groceries") || text.includes("Waypoint Fresh")) {
    console.log("[Style Test] FAILED: Still contains Fresh content");
  } else {
    console.log("[Style Test] PASSED");
  }
  
  await browser.close();
})();
