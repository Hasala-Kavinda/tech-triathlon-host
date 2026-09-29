const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  let errors = 0;
  page.on('pageerror', err => { console.error('Page error: ' + err); errors++; });
  page.on('console', msg => { if (msg.type() === 'error') { console.error('Console error: ' + msg.text()); errors++; } });
  
  await page.goto('http://localhost:8445');
  await page.waitForTimeout(500);
  
  // Navigate to an order
  await page.click('text=View all');
  await page.waitForTimeout(500);
  await page.click('text=ORD-1065');
  await page.waitForTimeout(500);
  
  // Test prototype selector
  await page.selectOption('.prototype-state-control select', { value: 'deferred' }).catch(()=>console.log('could not select deferred'));
  await page.waitForTimeout(500);
  
  await page.selectOption('.prototype-state-control select', { value: 'scheduled' }).catch(()=>console.log('could not select scheduled'));
  await page.waitForTimeout(500);
  
  console.log('Errors:', errors);
  await browser.close();
})();
