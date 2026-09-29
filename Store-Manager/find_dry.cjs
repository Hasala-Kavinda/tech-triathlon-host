const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8445');
  await page.waitForTimeout(1000);
  await page.selectOption('select', { label: 'Waypoint Style' }).catch(() => {});
  await page.waitForTimeout(1000);
  
  const innerHTML = await page.evaluate(() => document.body.innerHTML);
  if (innerHTML.includes("Dry groceries")) {
    console.log("Found 'Dry groceries' in DOM");
    // Find the surrounding 100 chars
    const index = innerHTML.indexOf("Dry groceries");
    console.log(innerHTML.substring(index - 50, index + 50));
  }
  
  await browser.close();
})();
