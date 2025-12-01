const fs = require('fs');
const puppeteer = require('puppeteer');

const URL =
  'https://www.binanceblockchainweek.com/event/f9827cbe-16f8-478a-bc06-f4e8b783ae54/sponsors-media';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 180000 });
    await new Promise((resolve) => setTimeout(resolve, 6000));
    const html = await page.content();
    fs.writeFileSync('sponsors_dom.html', html, 'utf8');
    console.log('写入 sponsors_dom.html 完成');
  } catch (error) {
    console.error('抓取失败', error);
  } finally {
    await browser.close();
  }
})();

