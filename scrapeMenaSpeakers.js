const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const EVENT_URL = 'https://mena.b.tc/speakers';
const OUTPUT_PATH = path.join(__dirname, 'mena_speakers.json');

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const autoScroll = async (page) => {
  await page.evaluate(
    async () =>
      new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 800;
        const timer = setInterval(() => {
          const { scrollHeight } = document.documentElement;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 300);
      })
  );
};

const extractSpeakers = () =>
  Array.from(
    document.querySelectorAll('.b24-hk-speakers_collection-item.w-dyn-item')
  ).map((item) => {
    const card = item.querySelector('.b24-hk-speakers_item');
    const modal = item.querySelector('.speaker-modal_component');
    const link = item.querySelector('[speaker-slug], a[speaker-slug]');

    const img = card?.querySelector('.b24-hk-speakers_speaker-image');
    const nameEl = card?.querySelector('.b25-hk-speakers-name_text');
    const titleEl = card?.querySelector(
      '.b25-hk-speakers-title_text.text-style-2lines'
    );
    const companyEl = card?.querySelector(
      '.b25-hk-speakers-company_text.text-style-1lines'
    );

    const bioEl =
      modal?.querySelector('.text-rich-text-speaker-bio') ||
      modal?.querySelector('.speaker-modal_bottom-content');

    const bioText = bioEl ? bioEl.textContent.replace(/\s+/g, ' ').trim() : '';

    return {
      slug:
        link?.getAttribute('speaker-slug') ||
        link?.getAttribute('href')?.split('/').pop() ||
        '',
      name: nameEl ? nameEl.textContent.trim() : '',
      title: titleEl ? titleEl.textContent.trim() : '',
      company: companyEl ? companyEl.textContent.trim() : '',
      imageUrl: img ? img.src : '',
      biography: bioText,
    };
  });

const main = async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const allSpeakers = [];
  const slugSet = new Set();

  try {
    for (let pageIndex = 1; pageIndex <= 10; pageIndex++) {
      const url =
        pageIndex === 1
          ? EVENT_URL
          : `${EVENT_URL}?f4e3b22f_page=${pageIndex}`;

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 180000,
      });

      await autoScroll(page);
      await pause(800);

      const pageSpeakers = await page.evaluate(extractSpeakers);
      const newItems = pageSpeakers.filter(
        (speaker) => speaker.name && !slugSet.has(speaker.slug || speaker.name)
      );

      newItems.forEach((speaker) => {
        slugSet.add(speaker.slug || speaker.name);
        allSpeakers.push(speaker);
      });

      console.log(`第 ${pageIndex} 页抓取到 ${newItems.length} 位嘉宾`);

      if (pageSpeakers.length === 0 || newItems.length === 0) {
        break;
      }
    }

    const normalized = allSpeakers.map((speaker, index) => ({
      sequence: index,
      ...speaker,
    }));

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(normalized, null, 2), 'utf8');
    console.log(`已写入 ${OUTPUT_PATH}，共 ${normalized.length} 位嘉宾`);
  } catch (error) {
    console.error('抓取 Bitcoin MENA speakers 失败', error);
  } finally {
    await browser.close();
  }
};

main();


