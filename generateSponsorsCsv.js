const fs = require('fs');
const path = require('path');

const RAW_PATH = path.join(__dirname, 'sponsors_raw.json');
const CSV_PATH = path.join(__dirname, 'sponsors.csv');
const MANIFEST_PATH = path.join(__dirname, 'sponsor_logos.json');

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

const tierMeta = {
  'TITLE SPONSOR': { zh: '冠名赞助商', en: 'Title Sponsor' },
  'PLATINUM+ SPONSORS': { zh: '白金+赞助商', en: 'Platinum+ Sponsor' },
  'PLATINUM SPONSORS': { zh: '白金赞助商', en: 'Platinum Sponsor' },
  'GOLD+ SPONSORS': { zh: '黄金+赞助商', en: 'Gold+ Sponsor' },
  'GOLD SPONSORS': { zh: '黄金赞助商', en: 'Gold Sponsor' },
  'SILVER+ SPONSORS': { zh: '白银+赞助商', en: 'Silver+ Sponsor' },
  'SILVER SPONSORS': { zh: '白银赞助商', en: 'Silver Sponsor' },
  'BRONZE SPONSORS': { zh: '青铜赞助商', en: 'Bronze Sponsor' },
  'BINANCE WALLET ECOSYSTEM': {
    zh: 'Binance Wallet 生态伙伴',
    en: 'Binance Wallet Ecosystem Partner',
  },
  'ECOSYSTEM PARTNERS': { zh: '生态合作伙伴', en: 'Ecosystem Partner' },
  'BNB CHAIN ECOSYSTEM PARTNERS': {
    zh: 'BNB Chain 生态合作伙伴',
    en: 'BNB Chain Ecosystem Partner',
  },
};

const biographyZhMap = {
  Celo: 'Celo 是面向现实世界打造的区块链，专注普惠金融和移动优先体验。',
  SOLAYER:
    'Solayer 借助硬件加速的高性能 SVM 区块链，推动垂直整合的现代金融基础设施。',
  Aster:
    'Aster 是新一代去中心化交易所，提供永续与现货的一站式链上交易体验。',
  Circle:
    'Circle 依托 USDC 与 EURC 打造互联网原生的稳定币支付系统，让全球资金流动更顺畅。',
  Lumia: 'Lumia 是覆盖资产全生命周期的 RWA 公链，聚焦现实世界资产上链。',
  Solana: 'Solana 以高性能网络驱动互联网资本市场、支付与多样加密应用。',
  'First Digital Trust':
    'First Digital Trust 是 FDUSD 发行方与香港持牌托管机构的母公司，提供合规托管与信托服务。',
};

// 针对不同参展商 / 赞助商的更具新闻性的采访提纲（前两问）
const questionPresets = {
  Celo: [
    {
      zh: '今年 Celo 把重心从“移动优先支付”进一步扩展到现实世界资产和公共产品资助上，哪一个最新落地的案例最能说明这一转向？',
      en: 'This year Celo is expanding from “mobile-first payments” toward real-world assets and public goods funding. Which recent live deployment best illustrates this shift?',
    },
    {
      zh: '在以太坊 L2 与多条稳定币公链竞争的环境下，Celo 如何用技术路线或生态激励，继续吸引开发者构建长期项目？',
      en: 'With Ethereum L2s and stablecoin-focused chains competing for attention, how is Celo using its technical roadmap or ecosystem incentives to keep builders committed long term?',
    },
  ],
  NEXPACE: [
    {
      zh: 'NEXPACE 今年在交易基础设施或做市工具上推出了哪些关键功能，能显著改变机构参与深度和效率？',
      en: 'Which trading infrastructure or market-making features has NEXPACE launched this year that materially change institutional participation and efficiency?',
    },
    {
      zh: '面对合规交易所和 DeFi 的双重竞争，你们目前在哪个市场或产品线上看到了最出乎意料的增长数据？',
      en: 'Amid competition from both regulated exchanges and DeFi, in which market or product line have you seen the most surprising recent growth at NEXPACE?',
    },
  ],
  SOLAYER: [
    {
      zh: 'Solayer 主打硬件加速的高性能 SVM，你能分享一个最近实测数据，证明它在真实场景下优于传统公链或汇聚层吗？',
      en: 'Solayer focuses on hardware-accelerated high-performance SVM. Can you share a recent benchmark that shows a real-world edge over traditional L1s or rollups?',
    },
    {
      zh: '在“链上订单簿”和“统一结算层”这两个赛道中，Solayer 目前最期待打透的第一个细分场景是什么？',
      en: 'Between on-chain order books and unified settlement layers, which specific use case is Solayer most intent on cracking first?',
    },
  ],
  ACE: [
    {
      zh: 'ACE 在流动性和产品设计上今年做了哪些调整，让专业交易者更愿意迁移或增加使用时长？',
      en: 'What concrete changes in liquidity and product design has ACE made this year to convince pro traders to move over or increase their activity?',
    },
    {
      zh: '在合规压力和链上透明度不断上升的背景下，ACE 如何用真实的数据来证明自身的风控能力？',
      en: 'With regulatory scrutiny and on-chain transparency rising, how is ACE using hard data to demonstrate its risk controls in practice?',
    },
  ],
  Aster: [
    {
      zh: 'Aster 把永续和现货整合在一个去中心化平台，你们最近一次大的系统升级解决了什么关键性能或安全瓶颈？',
      en: 'As a DEX unifying perpetual and spot markets, what key performance or security bottleneck did Aster’s latest major upgrade resolve?',
    },
    {
      zh: '就用户结构来看，Aster 当前的核心用户更多来自 CEX 迁移还是原生 DeFi 玩家？你们观察到哪一个行为变化最明显？',
      en: 'Looking at your user mix, are Aster’s core traders primarily CEX migrants or native DeFi users, and what behavioral shift stands out most between these groups?',
    },
  ],
  Circle: [
    {
      zh: 'USDC 和 EURC 今年在不同司法辖区陆续获得新类型的牌照或监管框架支持，你认为哪一条最具标志性意义？',
      en: 'USDC and EURC have entered new licensing or regulatory frameworks across jurisdictions this year. Which development do you see as the most defining so far?',
    },
    {
      zh: '在稳定币逐渐进入支付和国境间清算的过程中，Circle 近期与传统金融机构达成的哪个合作最能体现这种“新旧结合”？',
      en: 'As stablecoins move deeper into payments and cross-border settlement, which recent partnership with a traditional financial institution best showcases that convergence for Circle?',
    },
  ],
  Lumia: [
    {
      zh: 'Lumia 把自己定位为“全生命周期 RWA 公链”，目前在真实资产接入或二级流动性上，哪一个品类的进展最快？',
      en: 'As “the full-cycle RWA chain,” in which asset category has Lumia seen the fastest real-world onboarding or secondary-market traction so far?',
    },
    {
      zh: '在合规要求日益严格的环境中，你们是如何设计发行与清算流程，让机构敢于把更复杂的资产结构搬到 Lumia 上？',
      en: 'Under tightening regulations, how are you structuring issuance and settlement so institutions are comfortable bringing more complex products onto Lumia?',
    },
  ],
  Solana: [
    {
      zh: 'Solana 在过去一年中经历了从 DeFi 复苏到 meme 与 RWA 等多轮叙事，你认为哪一个最新赛道最有希望沉淀为“长期基本面”？',
      en: 'Over the last year Solana has cycled through DeFi resurgence, memes, RWAs, and more. Which recent narrative do you think has real potential to become a long-term fundamental pillar?',
    },
    {
      zh: '就今年的生态观察，Solana 在开发者体验或成本结构上做了哪一项具体优化，让新团队更容易选择你们作为第一主链？',
      en: 'From this year’s ecosystem perspective, what concrete change in developer experience or cost structure has made Solana a more obvious first choice for new teams?',
    },
  ],
  AWS: [
    {
      zh: '过去一年，AWS 在 Web3 与区块链客户的云上架构中，看到了哪些明显不同于传统互联网客户的新模式？',
      en: 'In the last year, what architectural patterns in Web3 and blockchain workloads on AWS have looked materially different from traditional internet clients?',
    },
    {
      zh: '在“去中心化”与“合规云基础设施”之间，AWS 如何帮助公链或交易平台找到一个既现实又可扩展的平衡点？',
      en: 'Between decentralization and compliant cloud infrastructure, how is AWS helping chains or exchanges strike a balance that’s both realistic and scalable?',
    },
  ],
  Babylon: [
    {
      zh: 'Babylon 今年在“比特币安全”与 PoS 生态之间搭桥，你能分享一个已经上线或即将落地的合作示例吗？',
      en: 'Babylon is building bridges between Bitcoin security and PoS ecosystems. Can you share a concrete collaboration that has shipped or is about to go live?',
    },
    {
      zh: '在当前的 RWA 和收益率竞争中，Babylon 希望先抢占的是哪一个细分用户群体：协议、机构还是高净值个人？',
      en: 'In today’s competitive RWA and yield landscape, which specific user segment—protocols, institutions, or high-net-worth individuals—is Babylon prioritizing first?',
    },
  ],
  BMW: [
    {
      zh: '作为传统汽车品牌，BMW 在 Web3 方面最近有哪些面向用户的具体落地，比如积分、数字藏品或车主社区？',
      en: 'As a global automotive brand, what concrete Web3 initiatives has BMW recently rolled out for users—for example around loyalty, collectibles, or owner communities?',
    },
    {
      zh: '在内部决策层面，BMW 如何评估一项链上试点是否值得从“营销尝试”升级为“长期产品能力”？',
      en: 'Internally, how does BMW decide when an on-chain pilot should graduate from a marketing experiment into a long-term product capability?',
    },
  ],
  'First Digital Trust': [
    {
      zh: 'First Digital Trust 作为 FDUSD 背后的信托机构之一，近期在哪些司法辖区或合作模式上取得了新的突破？',
      en: 'As the trust company behind FDUSD, in which jurisdictions or partnership structures has First Digital Trust recently made the most meaningful progress?',
    },
    {
      zh: '在机构托管需求快速扩大的背景下，你们观察到的一个“真实的风险偏好变化”是什么？客户更关心哪些细节？',
      en: 'With institutional custody demand accelerating, what real shift in risk appetite are you seeing, and which specific details are clients scrutinizing more closely?',
    },
  ],
  'Google Cloud': [
    {
      zh: 'Google Cloud 今年在 Web3 方向发布的产品与合作中，哪一个最能体现“数据+AI”对链上应用的实际加速效果？',
      en: 'Among this year’s Web3 launches and partnerships, which Google Cloud initiative best demonstrates how “data + AI” is tangibly accelerating on-chain applications?',
    },
    {
      zh: '相较一两年前，你们在与公链或交易平台对话时，客户对“合规与审计”的关注点发生了哪些具体变化？',
      en: 'Compared with one or two years ago, how have conversations with chains and exchanges changed around auditability and compliance on Google Cloud?',
    },
  ],
  HUMA: [
    {
      zh: 'Huma 专注收入与应收类 RWA，你们最近上线的哪一个产品设计，最能说明“现金流上链”的现实可行性？',
      en: 'Focused on income and receivables RWAs, which recently launched Huma product best proves that “cash flows on-chain” can work in practice?',
    },
    {
      zh: '在与传统金融机构合作时，你们通常如何说服对方，用链上数据来替代或增强现有的风控指标体系？',
      en: 'When working with TradFi partners, how do you persuade them to use on-chain signals to replace or augment their existing risk models?',
    },
  ],
  MASTERCARD: [
    {
      zh: 'Mastercard 近两年不断推出与加密和 Web3 相关的试点项目，哪一个你认为已经接近可以“大规模复制”？',
      en: 'Mastercard has launched multiple crypto and Web3 pilots in recent years. Which one do you believe is closest to being ready for large-scale rollout?',
    },
    {
      zh: '从全球支付网络的视角看，你们现在更关注的是哪一种场景：链上结算、稳定币收单，还是数字身份？',
      en: 'From a global payments-network perspective, which scenario is currently top-of-mind for Mastercard: on-chain settlement, stablecoin acquiring, or digital identity?',
    },
  ],
};

const buildQuestions = ({ companyZh, companyEn, tierZh, tierEn }) => {
  const preset = questionPresets[companyEn] || questionPresets[companyZh];
  const base = [
    {
      zh: `本次展区中，${companyZh} 重点展示的产品或解决方案想帮助哪些客户解决什么痛点？`,
      en: `Which customer pain points are you aiming to solve with the solutions ${companyEn} is showcasing onsite this week?`,
    },
    {
      zh: `今年以来，${companyZh} 在业务或产品上做出的哪一个关键决策，对你们的长期战略影响最大？`,
      en: `Since the start of this year, which key business or product decision has had the biggest impact on ${companyEn}'s long-term strategy?`,
    },
  ];

  const [q1, q2] = preset || base;

  const q3 = {
    zh: `展望 2025 年，${companyZh} 计划如何与 Binance 生态或更广泛的 Web3 市场展开新的合作？`,
    en: `Looking ahead to 2025, how will ${companyEn} collaborate with the Binance ecosystem or the broader Web3 market in new ways?`,
  };

  return [q1, q2, q3];
};

const main = () => {
  if (!fs.existsSync(RAW_PATH)) {
    throw new Error('sponsors_raw.json 不存在，请先运行 scrapeSponsors.js');
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

  sections.forEach((section) => {
    const meta =
      tierMeta[section.tier] || { zh: section.tier, en: section.tier };
    section.items.forEach((item, index) => {
      const companyEn = item.name || `${meta.en} #${index + 1}`;
      const companyZh = companyEn;
      const biographyEn =
        item.description?.trim() || 'Description coming soon.';
      const biographyZh =
        biographyZhMap[item.name] ||
        (item.description
          ? item.description
          : '官方简介待补充，欢迎完善。');

      const questions = buildQuestions({
        companyZh,
        companyEn,
        tierZh: meta.zh,
        tierEn: meta.en,
      });

      const url = new URL(item.logo);
      const ext = path.extname(url.pathname) || '.png';
      const slug = slugify(companyEn) || `sponsor-${rows.length}`;
      const localPath = path
        .join('avatars', 'sponsors', `${slug}${ext}`)
        .replace(/\\/g, '/');

      manifest.push({
        name: companyEn,
        logo: item.logo,
        localPath,
      });

      rows.push(
        [
          companyZh,
          companyEn,
          meta.zh,
          meta.en,
          companyZh,
          companyEn,
          biographyZh,
          biographyEn,
          questions[0].zh,
          questions[0].en,
          questions[1].zh,
          questions[1].en,
          questions[2].zh,
          questions[2].en,
          item.logo,
          localPath,
        ].map(escapeCsv)
      );
    });
  });

  const csvContent = rows.map((cols) => cols.join(',')).join('\n');
  fs.writeFileSync(CSV_PATH, csvContent, 'utf8');
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(
    `已生成 ${CSV_PATH}（${rows.length - 1} 条）并输出 ${MANIFEST_PATH}`
  );
};

main();

