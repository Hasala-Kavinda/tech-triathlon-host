const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3
  });

  await page.goto('http://localhost:8445');
  await page.waitForSelector('.main-content');
  
  // Expose function to log
  await page.exposeFunction('logEvent', (msg) => console.log(msg));

  await page.evaluate(() => {
    window.lastLabel = '';
    const nav = document.querySelector('.bottom-nav');
    const observer = new MutationObserver(() => {
      const active = document.querySelector('.bottom-nav-item--selected');
      if (active && active.textContent !== window.lastLabel) {
        window.lastLabel = active.textContent;
        window.logEvent('Active tab changed to: ' + active.textContent);
      }
    });
    observer.observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });

  const nav = await page..bottom-nav;
  const box = await nav.boundingBox();
  
  const startX = box.x + 30; // Home position
  const startY = box.y + 30;
  
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  console.log('Mouse down on Home');
  
  // Move 20px right and release (small drag)
  await page.mouse.move(startX + 20, startY, { steps: 5 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  console.log('Mouse up after 20px (should remain Home)');
  
  await page.waitForTimeout(500);

  // Long continuous drag
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  console.log('Mouse down on Home, starting continuous drag');
  
  // Drag past first threshold
  await page.mouse.move(startX + 80, startY, { steps: 10 });
  await page.waitForTimeout(200); // let it snap and log
  
  // Drag past second threshold
  await page.mouse.move(startX + 180, startY, { steps: 10 });
  await page.waitForTimeout(200);
  
  await page.mouse.up();
  console.log('Mouse up on Deliveries');

  await browser.close();
})();
