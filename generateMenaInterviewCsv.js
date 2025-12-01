const fs = require('fs');
const path = require('path');

const SPEAKERS_PATH = path.join(__dirname, 'mena_speakers.json');
const CSV_PATH = path.join(__dirname, 'interviews_mena.csv');

const escapeCsv = (value = '') => {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const zhFallback = (value, fallback) =>
  (value && value.trim()) || fallback;

// 针对部分头部嘉宾的更具新闻性的提纲
const presetQuestions = {
  'Michael  Saylor': [
    {
      zh: '从 MicroStrategy 到个人资产配置，你如何向 MENA 的机构解释“把比特币作为企业金库主资产”的风险与回报平衡？',
      en: 'From MicroStrategy to personal allocation, how do you explain to MENA institutions the risk–reward balance of using bitcoin as a primary treasury asset?',
    },
    {
      zh: '你如何看待中东主权资金、家族办公室在未来 3–5 年内配置比特币的节奏和路径？',
      en: 'How do you see Middle Eastern sovereign funds and family offices pacing their bitcoin allocation over the next 3–5 years?',
    },
  ],
  CZ: [
    {
      zh: '离开 Binance 的日常运营后，你今天更关注比特币生态中的哪一类基础设施或应用？',
      en: 'After stepping away from Binance’s daily operations, which layer of bitcoin infrastructure or applications are you personally most focused on today?',
    },
    {
      zh: '回顾过去几年监管与市场的博弈，你认为哪一个决策是比特币行业“躲过的最大风险”？',
      en: 'Looking back at recent regulatory and market battles, what do you think was the biggest existential risk for bitcoin that the industry successfully avoided?',
    },
  ],
  'Michael Novogratz': [
    {
      zh: '在 Galaxy 的视角下，比特币已经从“宏观对冲工具”走向“主流资产配置”，你现在最关注的风险变量是什么？',
      en: 'From Galaxy’s vantage point as bitcoin moves from macro hedge to mainstream allocation, which risk variable are you watching most closely now?',
    },
    {
      zh: '面对比特币 ETF 的快速发展，你认为 MENA 的机构会以怎样的顺序从现货 ETF 走向更复杂的比特币相关产品？',
      en: 'With bitcoin ETFs maturing rapidly, in what sequence do you expect MENA institutions to move from spot ETFs into more complex bitcoin-linked products?',
    },
  ],
  'H.E. Dr. Mohamed Al Kuwaiti': [
    {
      zh: '从国家网络安全的角度看，大规模采用比特币和公链基础设施会给 UAE 带来哪些全新的攻防挑战？',
      en: 'From a national cybersecurity perspective, what new offensive and defensive challenges does large-scale adoption of bitcoin and public chains pose for the UAE?',
    },
    {
      zh: '在你参与的国际合作中，关于比特币与加密犯罪的叙事有哪些被严重夸大，哪些又被严重低估？',
      en: 'Across your international work, which narratives around bitcoin and crypto crime are most exaggerated, and which real risks are still underestimated?',
    },
  ],
  'Ahmed Bin Sulayem': [
    {
      zh: '你如何看待比特币和代币化资产在迪拜商品、黄金与钻石贸易中的实际落地节奏？',
      en: 'How do you see bitcoin and tokenized assets realistically integrating into Dubai’s commodities, gold, and diamond trade over the coming years?',
    },
    {
      zh: 'DMCC 在吸引加密公司和比特币基础设施企业方面，过去一年中做出的哪项政策或服务创新最有效？',
      en: 'Which specific policy or service innovation at DMCC has proven most effective over the last year in attracting bitcoin infrastructure and crypto firms?',
    },
  ],
  'Simon Dixon': [
    {
      zh: '你很早就从“货币改革”的视角拥抱比特币，目前在哪些国家或地区看到了这套逻辑真正开始落地？',
      en: 'Coming from a monetary reform background, in which countries or regions do you now see bitcoin genuinely beginning to fulfill that reform thesis?',
    },
    {
      zh: '从你在 BnkToTheFuture 的投资实践看，比特币相关公司最容易在哪个阶段犯下“传统金融式”的错误？',
      en: 'From your BnkToTheFuture investing experience, at which stage do bitcoin companies most often repeat the classic mistakes of traditional finance?',
    },
  ],
};

const buildQuestions = (nameEn, titleEn, companyEn) => {
  const preset = presetQuestions[nameEn];

  if (preset) {
    const [q1, q2] = preset;
    const q3 = {
      zh: `面向 Bitcoin MENA 2025 的观众，您认为未来三年比特币在中东地区最具突破性的应用会出现在何处？`,
      en: `For the Bitcoin MENA 2025 audience, where do you see the most transformative applications of bitcoin emerging across the Middle East over the next three years?`,
    };
    return [q1, q2, q3];
  }

  // 通用问题模板，按角色类型偏金融 / 基础设施 / 公共政策做轻量引导
  const baseQ1 = {
    zh: `本次 Bitcoin MENA 之行，您最希望向中东和全球比特币参与者传递的一个核心观点是什么？`,
    en: `At Bitcoin MENA, what is the single core message you most want to share with bitcoin builders and investors across the region and globally?`,
  };

  const baseQ2 = {
    zh: `结合您在 ${companyEn || '当前机构'} 的一线经验，过去一年中哪一个具体事件最改变您对比特币或数字资产未来的判断？`,
    en: `Based on your frontline work at ${companyEn || 'your current organization'}, which concrete event in the last year most changed your outlook on the future of bitcoin or digital assets?`,
  };

  const baseQ3 = {
    zh: `面向 Bitcoin MENA 2025 的观众，您认为未来三年比特币在中东地区最具突破性的应用会出现在何处？`,
    en: `For the Bitcoin MENA 2025 audience, where do you see the most transformative applications of bitcoin emerging across the Middle East over the next three years?`,
  };

  return [baseQ1, baseQ2, baseQ3];
};

const main = () => {
  const speakers = JSON.parse(fs.readFileSync(SPEAKERS_PATH, 'utf8'));

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

  const rows = [
    header,
    ...speakers.map((speaker) => {
      const nameEn = speaker.name || '';
      const titleEn = speaker.title || '';
      const companyEn = speaker.company || '';

      const bioEn = speaker.biography || '';
      const bioZh = zhFallback(
        '',
        '暂无中文介绍（可在 interviews_mena.csv 中补充）'
      );

      const [q1, q2, q3] = buildQuestions(nameEn, titleEn, companyEn);

      return [
        nameEn, // Name_ZH 先用英文占位，后续可人工翻译
        nameEn,
        titleEn,
        titleEn,
        companyEn,
        companyEn,
        bioZh,
        bioEn,
        q1.zh,
        q1.en,
        q2.zh,
        q2.en,
        q3.zh,
        q3.en,
        speaker.imageUrl || '',
        speaker.localImage || '',
      ].map(escapeCsv);
    }),
  ];

  const csvContent = rows.map((cols) => cols.join(',')).join('\n');
  fs.writeFileSync(CSV_PATH, csvContent, 'utf8');
  console.log(`已生成 ${CSV_PATH}（${rows.length - 1} 位嘉宾）`);
};

main();


