const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8445');
  await page.waitForTimeout(1000);
  await page.locator('select').filter({ hasText: 'Waypoint Style' }).selectOption({ label: 'Waypoint Style' });
  await page.waitForTimeout(1000);
  
  const innerHTML = await page.evaluate(() => document.body.innerHTML);
  const index = innerHTML.indexOf("Dry groceries");
  if (index !== -1) {
    console.log(innerHTML.substring(index - 200, index + 200));
  }
  
  const index2 = innerHTML.indexOf("Waypoint Fresh");
  if (index2 !== -1) {
    console.log(innerHTML.substring(index2 - 200, index2 + 200));
  }

  await browser.close();
})();
