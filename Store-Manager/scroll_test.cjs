const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3
  });

  await page.goto('http://localhost:8445');
  await page.waitForSelector('.main-content');
  
  // Scroll down 500px inside main-content
  await page.evaluate(() => {
    document.querySelector('.main-content').scrollTop = 500;
  });
  
  await page.waitForTimeout(200);
  
  const m1 = await page.evaluate(() => document.querySelector('.main-content').scrollTop);
  console.log('Home scrollTop before click:', m1);

  await page.click('.bottom-nav-item:has-text("Orders")');
  await page.waitForTimeout(500);

  const m2 = await page.evaluate(() => document.querySelector('.main-content').scrollTop);
  console.log('Orders scrollTop after click:', m2);

  const fab = await page.evaluate(() => {
    const f = document.querySelector('.floating-new-order');
    if (!f) return null;
    return f.getBoundingClientRect().bottom;
  });
  console.log('FAB bottom on Orders (should be null):', fab);

  await page.click('.bottom-nav-item:has-text("Home")');
  await page.waitForTimeout(500);
  
  const fabHome = await page.evaluate(() => {
    const f = document.querySelector('.floating-new-order');
    if (!f) return null;
    return f.getBoundingClientRect().bottom;
  });
  console.log('FAB bottom on Home:', fabHome);

  await browser.close();
})();
