const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3
  });

  await page.goto('http://localhost:8445');
  await page.waitForSelector('.main-content');
  
  await page.evaluate(() => {
    window.logFrames = [];
    let start = performance.now();
    function tick() {
      const now = performance.now();
      const el = document.querySelector('.bottom-nav-active-indicator');
      if (el) {
        window.logFrames.push({
          time: Math.round(now - start),
          left: el.style.left,
          width: el.style.width,
        });
      }
      if (now - start < 400) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
  
  await page.click('.bottom-nav-item:has-text("Orders")');
  await page.waitForTimeout(500);
  
  const frames = await page.evaluate(() => window.logFrames);
  console.log('--- Home -> Orders ---');
  // Log a subset of frames to see progression
  console.log(frames.filter(f => [0, 10, 50, 100, 150, 200, 300].some(t => Math.abs(f.time - t) <= 10)));
  
  await browser.close();
})();
