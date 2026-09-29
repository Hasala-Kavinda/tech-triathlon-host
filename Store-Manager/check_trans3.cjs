const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8445');
  await page.waitForTimeout(1000);
  
  await page.click('text=Orders');
  await page.waitForTimeout(100);
  
  const transforms = await page.evaluate(() => {
    const children = document.querySelectorAll('.main-content > div');
    return Array.from(children).map(c => c.style.transform);
  });
  console.log(transforms);
  await browser.close();
})();
