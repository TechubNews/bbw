const fs = require('fs');
const puppeteer = require('puppeteer');

const URL = 'https://mena.b.tc/speakers';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 180000 });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const html = await page.content();
    fs.writeFileSync('mena_speakers_dom.html', html, 'utf8');
    console.log('写入 mena_speakers_dom.html 完成');
  } catch (error) {
    console.error('抓取失败', error);
  } finally {
    await browser.close();
  }
})();


