const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const EVENT_URL =
  'https://www.binanceblockchainweek.com/event/f9827cbe-16f8-478a-bc06-f4e8b783ae54/sponsors-media';
const OUTPUT_PATH = path.join(__dirname, 'sponsors_raw.json');

const autoScroll = async (page, { step = 800, delay = 250 } = {}) => {
  await page.evaluate(
    async ({ stepSize, delayMs }) =>
      new Promise((resolve) => {
        let totalHeight = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, stepSize);
          totalHeight += stepSize;
          if (
            document.documentElement.scrollTop + window.innerHeight >=
            document.body.scrollHeight - 10
          ) {
            clearInterval(timer);
            resolve();
          }
        }, delayMs);
      }),
    { stepSize: step, delayMs: delay }
  );
};

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto(EVENT_URL, {
      waitUntil: 'networkidle2',
      timeout: 180000,
    });
    await autoScroll(page);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const sections = await page.evaluate(() => {
      const isRelevantHeading = (text) =>
        /sponsor/i.test(text) || /ecosystem/i.test(text) || /partner/i.test(text);
      const isMediaHeading = (text) => /media partner/i.test(text);

      const result = [];
      let pendingTier = null;
      const widgets = Array.from(
        document.querySelectorAll(
          '[data-cvent-id="widget-content-NucleusText"], [data-cvent-id="widget-content-Code"]'
        )
      );

      widgets.forEach((widget) => {
        const type = widget.getAttribute('data-cvent-id');
        if (type === 'widget-content-NucleusText') {
          const text = widget.innerText.replace(/\s+/g, ' ').trim();
          if (!text) {
            pendingTier = null;
            return;
          }
          if (isMediaHeading(text)) {
            pendingTier = null;
            return;
          }
          if (isRelevantHeading(text)) {
            pendingTier = text;
          } else {
            pendingTier = null;
          }
          return;
        }

        if (type === 'widget-content-Code' && pendingTier) {
          const iframe = widget.querySelector('iframe');
          const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
          if (!doc) {
            pendingTier = null;
            return;
          }
          const items = Array.from(doc.querySelectorAll('li')).map((li) => {
            const logoImg = li.querySelector('img');
            const title = li.querySelector('h3');
            const desc = li.querySelector('p');
            const socials = Array.from(li.querySelectorAll('.social a')).map((a) => ({
              label: a.className || a.textContent || '',
              href: a.href,
            }));
            return {
              name:
                title?.innerText.trim() ||
                logoImg?.getAttribute('alt')?.trim() ||
                '',
              description: (desc?.innerText || '').trim(),
              logo: logoImg?.src || '',
              alt: logoImg?.getAttribute('alt') || '',
              socials,
            };
          });

          if (items.length) {
            result.push({ tier: pendingTier, items });
          }
          pendingTier = null;
        }
      });

      return result;
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sections, null, 2), 'utf8');
    console.log(`已写入 ${OUTPUT_PATH}，共 ${sections.length} 组`);
  } catch (error) {
    console.error('抓取赞助商失败', error);
  } finally {
    await browser.close();
  }
})();

