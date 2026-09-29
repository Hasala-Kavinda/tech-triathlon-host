const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3
  });

  await page.goto('http://localhost:8445');
  await page.waitForSelector('.home-page');
  
  // CASE A: At top of Home
  console.log('--- CASE A: At top of Home -> Orders ---');
  await page.evaluate(() => {
    window.logFrames = [];
    let start = performance.now();
    function tick() {
      const now = performance.now();
      const rect = document.querySelector('.bottom-nav').getBoundingClientRect();
      window.logFrames.push({
        time: Math.round(now - start),
        scrollY: window.scrollY,
        docScrollHeight: document.documentElement.scrollHeight,
        bodyScrollHeight: document.body.scrollHeight,
        innerHeight: window.innerHeight,
        navY: rect.y,
        navBottom: rect.bottom
      });
      if (now - start < 300) {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  });
  
  await page.click('.bottom-nav-item:has-text("Orders")');
  await page.waitForTimeout(400);
  let framesA = await page.evaluate(() => window.logFrames);
  console.log(framesA.slice(0, 15));

  // CASE B: Scrolled down Home
  console.log('--- CASE B: Scrolled down Home -> Orders ---');
  await page.goto('http://localhost:8445');
  await page.waitForSelector('.home-page');
  await page.evaluate(() => window.scrollTo(0, 1000));
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    window.logFrames = [];
    let start = performance.now();
    function tick() {
      const now = performance.now();
      const rect = document.querySelector('.bottom-nav').getBoundingClientRect();
      window.logFrames.push({
        time: Math.round(now - start),
        scrollY: window.scrollY,
        docScrollHeight: document.documentElement.scrollHeight,
        bodyScrollHeight: document.body.scrollHeight,
        innerHeight: window.innerHeight,
        navY: rect.y,
        navBottom: rect.bottom
      });
      if (now - start < 300) {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  });

  await page.click('.bottom-nav-item:has-text("Orders")');
  await page.waitForTimeout(400);
  let framesB = await page.evaluate(() => window.logFrames);
  console.log(framesB.slice(0, 15));

  await browser.close();
})();
