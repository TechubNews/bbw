const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const EVENT_URL = 'https://mena.b.tc/sponsor';
const OUTPUT_PATH = path.join(__dirname, 'mena_sponsors_raw.json');

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

const tierKeyFromHeading = (heading = '') => {
  const normalized = heading.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (normalized.includes('TITLE')) return 'TITLE';
  if (normalized.includes('MOON')) return 'MOON';
  if (normalized.includes('3BLOCK') || normalized.includes('III')) return '3BLOCK';
  if (normalized.includes('2BLOCK') || normalized.includes('IIBLOCK')) return '2BLOCK';
  if (normalized.includes('1BLOCK') || normalized.includes('IBLOCK')) return '1BLOCK';
  return null;
};

const main = async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto(EVENT_URL, {
      waitUntil: 'networkidle2',
      timeout: 180000,
    });

    await autoScroll(page);
    await pause(1200);

    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-sponsor-collection] [data-sponsor-item]'
        ).length > 0,
      { timeout: 60000 }
    );

    const sections = await page.evaluate((tierKeyScript) => {
      const getTierKey = eval(`(${tierKeyScript})`);

      const normalizeLink = (url) => {
        if (!url) return '';
        try {
          const parsed = new URL(url, window.location.origin);
          const host = parsed.hostname.replace(/^www\./, '');
          const path = parsed.pathname.replace(/\/$/, '');
          return `${host}${path}`.toLowerCase();
        } catch (error) {
          return url.trim().toLowerCase();
        }
      };

      const pickHeading = (el) => {
        let cursor = el.previousElementSibling;
        while (cursor) {
          const heading = cursor.querySelector('h1, h2, h3, h4');
          if (heading) {
            return heading.textContent.replace(/\s+/g, ' ').trim();
          }
          cursor = cursor.previousElementSibling;
        }
        return '';
      };

      const readBgImage = (style = '') => {
        const match = style.match(/url\((?:\"|')?([^\"')]+)(?:\"|')?\)/i);
        return match ? match[1] : '';
      };

      const descriptionMap = new Map();
      document
        .querySelectorAll('.sponsors-2025-descriptions_collection-item')
        .forEach((item) => {
          const name =
            item.querySelector('h3')?.textContent?.trim() || '';
          const description = item
            .querySelector('.text-rich-text')
            ?.textContent?.replace(/\s+/g, ' ')
            .trim();
          const logo =
            item.querySelector('.sponsors-2025-description_image-div img')
              ?.src || '';
          const website =
            item.querySelector(
              '.sponsors-2025-description_links-div a[href]'
            )?.href || '';
          const key = normalizeLink(website);
          if (name && key && !descriptionMap.has(key)) {
            descriptionMap.set(key, {
              name,
              description: description || '',
              logo,
              website,
            });
          }
        });

      const seenLinks = new Set();
      const result = [];

      document
        .querySelectorAll('[data-sponsor-collection]')
        .forEach((collection) => {
          const heading =
            pickHeading(collection) ||
            collection.getAttribute('data-sponsor-collection') ||
            '';
          const tierKey = getTierKey(heading);
          if (!tierKey) return;

          const items = Array.from(
            collection.querySelectorAll('[data-sponsor-item]')
          )
            .map((item, index) => {
              const link =
                item.querySelector('[data-sponsor-link]')?.href || '';
              const normalized = normalizeLink(link);
              if (!normalized || seenLinks.has(normalized)) {
                return null;
              }
              seenLinks.add(normalized);

              const meta = descriptionMap.get(normalized);
              const cardLogo =
                item.querySelector('.sponsors-collection_div')?.getAttribute(
                  'style'
                ) || '';

              const resolvedLogo = readBgImage(cardLogo) || meta?.logo || '';

              let fallbackName = meta?.name || '';
              if (!fallbackName) {
                try {
                  const parsed = new URL(link, window.location.origin);
                  fallbackName = parsed.hostname.replace(/^www\./, '');
                } catch (error) {
                  fallbackName = `Sponsor ${index + 1}`;
                }
              }

              return {
                name: fallbackName,
                website: meta?.website || link,
                description: meta?.description || '',
                logo: resolvedLogo,
              };
            })
            .filter(Boolean);

          if (items.length) {
            result.push({
              tierKey,
              heading,
              items,
            });
          }
        });

      return result;
    }, tierKeyFromHeading.toString());

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sections, null, 2), 'utf8');
    console.log(`已写入 ${OUTPUT_PATH}，共 ${sections.length} 个有效分组`);
  } catch (error) {
    console.error('抓取 Bitcoin MENA sponsors 失败', error);
  } finally {
    await browser.close();
  }
};

main();


