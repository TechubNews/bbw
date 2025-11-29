const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  try {
  await page.goto('https://www.binanceblockchainweek.com/event/f9827cbe-16f8-478a-bc06-f4e8b783ae54/speakers', {
    waitUntil: 'networkidle2',
    timeout: 180000,
  });
  await page.waitForSelector('[data-cvent-id="speakers-speakerCard"]', { timeout: 60000 });
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let previousHeight = 0;

    for (let i = 0; i < 20; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      await delay(1000);
      const currentHeight = document.body.scrollHeight;
      if (currentHeight === previousHeight) {
        break;
      }
      previousHeight = currentHeight;
    }
    window.scrollTo(0, 0);
  });
    const html = await page.content();
    fs.writeFileSync('speakers_final.html', html);
  } catch (error) {
    console.error('Failed to scrape speakers page', error);
  } finally {
    await browser.close();
  }
})();

