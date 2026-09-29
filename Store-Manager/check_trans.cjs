const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8445');
  await page.waitForTimeout(1000);
  
  // Click Orders and immediately check transform
  await page.click('text=Orders');
  await page.waitForTimeout(20);
  
  const transforms = await page.evaluate(() => {
    const orders = Array.from(document.querySelectorAll('div')).find(el => el.innerText.includes('New order'));
    return {
       orders: document.querySelector('.main-content > div:nth-child(1)')?.style.transform
    }
  });
  console.log(transforms);
  await browser.close();
})();
