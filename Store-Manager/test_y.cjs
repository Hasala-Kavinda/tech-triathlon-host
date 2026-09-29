const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3
  });

  async function setupPage() {
    await page.goto('http://localhost:8445');
    await page.waitForSelector('.bottom-nav');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.yRecords = [];
      window.recordFrames = false;
      window.startT = 0;
      
      window.startRecording = () => {
        window.yRecords = [];
        window.recordFrames = true;
        window.startT = performance.now();
      };
      
      window.stopRecording = () => {
        window.recordFrames = false;
      };
      
      function logFrame() {
        if (window.recordFrames) {
          const nav = document.querySelector('.bottom-nav');
          if (nav) {
            const rect = nav.getBoundingClientRect();
            window.yRecords.push({
              t: performance.now() - window.startT,
              y: rect.y,
              bottom: rect.bottom,
              innerHeight: window.innerHeight,
              transform: getComputedStyle(nav).transform
            });
          }
        }
        requestAnimationFrame(logFrame);
      }
      requestAnimationFrame(logFrame);
    });
  }

  // Tap Orders
  await setupPage();
  await page.evaluate(() => window.startRecording());
  await page.click('.bottom-nav-item:has-text("Orders")');
  await page.waitForTimeout(400);
  await page.evaluate(() => window.stopRecording());
  const ordersY = await page.evaluate(() => window.yRecords);

  // Tap Deliveries
  await setupPage();
  await page.evaluate(() => window.startRecording());
  await page.click('.bottom-nav-item:has-text("Deliveries")');
  await page.waitForTimeout(400);
  await page.evaluate(() => window.stopRecording());
  const deliveriesY = await page.evaluate(() => window.yRecords);

  function printFrames(title, records) {
    console.log('--- ' + title + ' ---');
    if (records.length === 0) return;
    let moved = false;
    let initialY = records[0].y;
    for (const r of records) {
      if (Math.abs(r.y - initialY) > 0.5) moved = true;
      console.log(r.t.toFixed(0) + 'ms: y=' + r.y.toFixed(2) + ' bottom=' + r.bottom.toFixed(2) + ' iH=' + r.innerHeight);
    }
    if (moved) console.log("=> IT MOVED!");
    else console.log("=> NO MOVEMENT");
  }

  printFrames('Home -> Orders', ordersY);
  printFrames('Home -> Deliveries', deliveriesY);

  await browser.close();
})();
