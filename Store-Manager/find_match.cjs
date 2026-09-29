const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8445');
  await page.waitForTimeout(1000);
  await page.locator('select').filter({ hasText: 'Waypoint Style' }).selectOption({ label: 'Waypoint Style' });
  await page.waitForTimeout(1000);
  
  const text = await page.evaluate(() => document.body.innerText);
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('Fresh') || line.includes('Dry groceries') || line.includes('Chilled')) {
      console.log('Match:', line);
    }
  });
  await browser.close();
})();
