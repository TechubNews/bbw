const fs = require('fs');
const puppeteer = require('puppeteer');

const EVENT_URL =
  'https://www.binanceblockchainweek.com/event/f9827cbe-16f8-478a-bc06-f4e8b783ae54/speakers';

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const autoScroll = async (page) => {
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let previousHeight = 0;
    for (let i = 0; i < 30; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      await delay(800);
      const currentHeight = document.body.scrollHeight;
      if (currentHeight === previousHeight) {
        break;
      }
      previousHeight = currentHeight;
    }
    window.scrollTo(0, 0);
  });
};

const buildInterview = (name, title, company) => {
  const safeName = name || '您';
  const safeCompanyZh = company || '贵团队';
  const safeCompanyEn = company || 'your team';
  const zhRole = title ? `担任${title}` : '深耕行业';
  const enRole = title ? `the ${title}` : 'a leader';

  return [
    {
      zh: `${safeName}，您在${safeCompanyZh}${zhRole}期间，哪一个项目或战略最能体现您当前的关注点？能与我们分享背后的关键洞察吗？`,
      en: `As ${enRole} at ${safeCompanyEn}, which recent project or strategy best captures your current focus, and what insights can you share from it?`,
    },
    {
      zh: `面向Binance Blockchain Week Dubai的全球观众，您认为2025年Web3/区块链生态中最大的突破机会会出现在何处？`,
      en: `For the Binance Blockchain Week Dubai audience, where do you see the biggest breakthrough opportunities in the Web3/blockchain ecosystem for 2025?`,
    },
  ];
};

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(EVENT_URL, {
      waitUntil: 'networkidle2',
      timeout: 180000,
    });
    await page.waitForSelector('[data-cvent-id="speakers-speakerCard"]', {
      timeout: 60000,
    });

    await autoScroll(page);

    const cardHandles = await page.$$('[data-cvent-id="speakers-speakerCard"]');
    console.log(`检测到 ${cardHandles.length} 位嘉宾`);

    const results = [];

    for (let i = 0; i < cardHandles.length; i++) {
      const card = cardHandles[i];

      const base = await card.evaluate((el) => {
        const imageUrl = el.querySelector('img')?.src || '';
        const name = el.querySelector('h3')?.innerText.trim() || '';
        const infoSection = el.querySelector('[class*="speakerInfo"]');
        const infoSpans = infoSection
          ? Array.from(infoSection.querySelectorAll('div.css-87ndg2 span'))
              .map((span) => span.innerText.trim())
              .filter(Boolean)
          : [];

        return {
          name,
          title: infoSpans[0] || '',
          company: infoSpans[1] || '',
          imageUrl,
        };
      });

      await card.evaluate((el) =>
        el.scrollIntoView({ behavior: 'instant', block: 'center' })
      );

      const button = await card.$('button');
      let biography = '';
      if (button) {
        await button.click();
        try {
          await page.waitForSelector('[class*="speakerModalWrapper"]', {
            visible: true,
            timeout: 20000,
          });
          biography = await page.evaluate(
            () =>
              document
                .querySelector('[class*="speakerModalBiography"]')
                ?.innerText.trim() || ''
          );
        } catch (error) {
          console.warn(`未能获取 ${base.name} 的个人介绍: ${error.message}`);
        } finally {
          await page.evaluate(() => {
            document
              .querySelector('[class*="speakerModalExitIcon"]')
              ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          });
          await page
            .waitForSelector('[class*="speakerModalWrapper"]', {
              hidden: true,
              timeout: 10000,
            })
            .catch(() => {});
          await pause(200);
        }
      }

      const interview = buildInterview(base.name, base.title, base.company);
      results.push({ ...base, biography, interview });
      console.log(`完成 ${i + 1}/${cardHandles.length}: ${base.name}`);
    }

    fs.writeFileSync(
      'speakers.json',
      JSON.stringify(results, null, 2),
      'utf8'
    );
    console.log('已写入 speakers.json');
  } catch (error) {
    console.error('抓取失败', error);
  } finally {
    await browser.close();
  }
})();

