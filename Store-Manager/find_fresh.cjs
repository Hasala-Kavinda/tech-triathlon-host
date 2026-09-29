const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8445');
  await page.waitForTimeout(1000);
  await page.selectOption('select', { label: 'Waypoint Style' }).catch(() => {});
  await page.waitForTimeout(1000);
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log(text.split('\n').filter(line => line.includes("Fresh") || line.includes("Dry groceries") || line.includes("Chilled")).join('\n'));
  
  await browser.close();
})();
