const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3
  });

  await page.goto('http://localhost:8445');
  await page.waitForSelector('.main-content');
  
  async function report(label) {
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const main = document.querySelector('.main-content');
      const nav = document.querySelector('.bottom-nav').getBoundingClientRect();
      const body = document.body;
      const html = document.documentElement;
      const s = getComputedStyle(main);
      return {
        htmlScrollHeight: html.scrollHeight,
        bodyScrollHeight: body.scrollHeight,
        mainClientHeight: main.clientHeight,
        mainScrollHeight: main.scrollHeight,
        windowScrollY: window.scrollY,
        mainScrollY: main.scrollTop,
        mainOverflowY: s.overflowY,
        navY: nav.y,
        navHeight: nav.height
      };
    });
    console.log('--- ' + label + ' ---');
    console.log(m);
  }

  await report('Home');

  await page.click('.bottom-nav-item:has-text("Orders")');
  await report('Orders');

  await page.click('.bottom-nav-item:has-text("Deliveries")');
  await report('Deliveries');

  await browser.close();
})();
