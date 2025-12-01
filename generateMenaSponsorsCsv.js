const fs = require('fs');
const path = require('path');

const RAW_PATH = path.join(__dirname, 'mena_sponsors_raw.json');
const CSV_PATH = path.join(__dirname, 'sponsors_mena.csv');
const MANIFEST_PATH = path.join(__dirname, 'mena_sponsor_logos.json');

const escapeCsv = (value = '') => {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const slugify = (input) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const tierOrder = ['TITLE', 'MOON', '3BLOCK', '2BLOCK', '1BLOCK'];

const tierLabels = {
  TITLE: { zh: 'Title Block', en: 'Title Block' },
  MOON: { zh: 'Moon Block', en: 'Moon Block' },
  '3BLOCK': { zh: '3 Block', en: '3 Block' },
  '2BLOCK': { zh: '2 Block', en: '2 Block' },
  '1BLOCK': { zh: '1 Block', en: '1 Block' },
};

const getTierKey = (raw) => {
  const normalized = (raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (normalized.includes('TITLE')) return 'TITLE';
  if (normalized.includes('MOON')) return 'MOON';
  if (normalized.includes('3BLOCK') || normalized.includes('III')) return '3BLOCK';
  if (normalized.includes('2BLOCK') || normalized.includes('IIBLOCK')) return '2BLOCK';
  if (normalized.includes('1BLOCK') || normalized.includes('IBLOCK')) return '1BLOCK';
  return null;
};

const buildQuestions = (companyEn, tierZh, tierEn) => {
  const companyZh = companyEn;
  const q1 = {
    zh: `作为 ${tierZh} 的 ${companyZh}，你们今年在 Bitcoin MENA 上最希望让行业记住的一项产品或合作是什么？`,
    en: `As a ${tierEn} at Bitcoin MENA, which product or partnership does ${companyEn} most want the industry to remember this year?`,
  };

  const q2 = {
    zh: `${companyZh} 目前在中东和北非市场服务的核心客户是谁？你们看到他们在比特币或链上基础设施需求上出现了哪些新的变化？`,
    en: `Who are ${companyEn}'s core clients in the Middle East and North Africa today, and what new needs are you seeing from them around bitcoin or on-chain infrastructure?`,
  };

  const q3 = {
    zh: `展望未来三年，${companyZh} 希望在 Bitcoin MENA 社区中扮演怎样的角色？`,
    en: `Over the next three years, what role does ${companyEn} hope to play within the Bitcoin MENA community?`,
  };

  return [q1, q2, q3];
};

const main = () => {
  if (!fs.existsSync(RAW_PATH)) {
    throw new Error('mena_sponsors_raw.json 不存在，请先运行 scrapeMenaSponsors.js');
  }

  const sections = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'));

  const header = [
    'Name_ZH',
    'Name_EN',
    'Title_ZH',
    'Title_EN',
    'Company_ZH',
    'Company_EN',
    'Biography_ZH',
    'Biography_EN',
    'Interview1_ZH',
    'Interview1_EN',
    'Interview2_ZH',
    'Interview2_EN',
    'Interview3_ZH',
    'Interview3_EN',
    'ImageURL',
    'LocalImage',
  ];

  const rows = [header];
  const manifest = [];
  const entries = [];

  sections.forEach((section) => {
    const tierKey = section.tierKey || getTierKey(section.heading || section.tier);
    if (!tierKey || !tierOrder.includes(tierKey)) {
      return;
    }
    const meta = tierLabels[tierKey] || { zh: tierKey, en: tierKey };
    section.items.forEach((item, index) => {
      const nameEn = item.name || `${meta.en} #${index + 1}`;
      const companyEn = nameEn;
      const biographyEn =
        item.description?.trim() || 'Description coming soon.';
      const biographyZh =
        item.description?.trim() || '暂无中文介绍（可在 sponsors_mena.csv 中补充）';

      const [q1, q2, q3] = buildQuestions(companyEn, meta.zh, meta.en);

      const url = new URL(item.logo);
      const ext = path.extname(url.pathname) || '.png';
      const slug = slugify(companyEn) || `mena-sponsor-${rows.length}`;
      const localPath = path
        .join('avatars', 'mena-sponsors', `${slug}${ext}`)
        .replace(/\\/g, '/');

      manifest.push({
        name: companyEn,
        logo: item.logo,
        localPath,
      });

      entries.push({
        tierKey,
        data: [
          `${meta.en} - ${nameEn}`,
          nameEn,
          meta.zh,
          meta.en,
          nameEn,
          nameEn,
          biographyZh,
          biographyEn,
          q1.zh,
          q1.en,
          q2.zh,
          q2.en,
          q3.zh,
          q3.en,
          item.logo,
          localPath,
        ],
      });
    });
  });

  entries
    .sort(
      (a, b) =>
        tierOrder.indexOf(a.tierKey) - tierOrder.indexOf(b.tierKey)
    )
    .forEach((entry) => {
      rows.push(entry.data.map(escapeCsv));
    });

  const csvContent = rows.map((cols) => cols.join(',')).join('\n');
  fs.writeFileSync(CSV_PATH, csvContent, 'utf8');
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(
    `已生成 ${CSV_PATH}（${rows.length - 1} 家赞助商 / 参展商），并输出 ${MANIFEST_PATH}`
  );
};

main();


