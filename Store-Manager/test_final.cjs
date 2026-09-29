const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let errors = 0;
  
  page.on('pageerror', error => { console.log('[PAGE ERROR]', error.message); errors++; });
  page.on('console', msg => {
    if (msg.type() === 'error') { console.log('[CONSOLE ERROR]', msg.text()); errors++; }
  });
  
  await page.goto('http://localhost:8445');
  await page.waitForTimeout(2000);
  console.log('[Home] DOM length:', await page.evaluate(() => document.body.innerHTML.length));
  
  await page.click('text=Orders');
  await page.waitForTimeout(1000);
  console.log('[Orders] DOM length:', await page.evaluate(() => document.body.innerHTML.length));
  
  await page.click('text=Deliveries');
  await page.waitForTimeout(1000);
  console.log('[Deliveries] DOM length:', await page.evaluate(() => document.body.innerHTML.length));
  
  await page.click('text=Home');
  await page.waitForTimeout(1000);
  await page.selectOption('select', { label: 'Waypoint Style' }).catch(() => {});
  await page.waitForTimeout(1000);
  
  const text = await page.evaluate(() => document.body.innerText);
  if (text.includes("Dry groceries") || text.includes("Waypoint Fresh")) {
    console.log("[Style Test] FAILED: Still contains Fresh content");
  } else {
    console.log("[Style Test] PASSED");
  }
  
  console.log('[Errors] Total:', errors);
  await browser.close();
})();
