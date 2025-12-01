const grid = document.getElementById('speaker-grid');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const companyFilter = document.getElementById('company-filter');
const sortSelect = document.getElementById('sort-select');
const statTotal = document.getElementById('stat-total');
const statVisible = document.getElementById('stat-visible');
const statOrgs = document.getElementById('stat-orgs');
const toggleButtons = document.querySelectorAll('.toggle-btn');
const datasetButtons = document.querySelectorAll('.dataset-btn');
const modal = document.getElementById('speaker-modal');
const modalBody = modal.querySelector('.modal__body');
const modalDismissers = modal.querySelectorAll('[data-dismiss="modal"]');

const datasetState = {
  speakers: [],
  sponsors: [],
};

const datasetMaps = {
  speakers: new Map(),
  sponsors: new Map(),
};

const currentEvent = document.body.dataset.event;
document.querySelectorAll('.event-switch__btn').forEach((btn) => {
  if (btn.dataset.eventLink === currentEvent) {
    btn.classList.add('active');
  }
});

const speakersCsv =
  document.body.dataset.speakersCsv || 'interviews.csv';
const sponsorsCsv =
  document.body.dataset.sponsorsCsv || 'sponsors.csv';

let activeDataset = 'speakers';
let activeSpeaker = null;

const getImageSrc = (speaker) =>
  speaker.localImage || speaker.imageUrl || 'assets/default-avatar.svg';

const parseCsv = (text) => {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char === '\r') {
        continue;
      } else {
        field += char;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

const normalizeLine = (zh, en) => ({
  zh: (zh || '').trim(),
  en: (en || '').trim(),
});

const registerCollection = (type, items) => {
  datasetState[type] = items;
  datasetMaps[type] = new Map(items.map((item) => [item.sequence, item]));
};

const getActiveItems = () => datasetState[activeDataset] || [];

const getCompanyLabel = (speaker) =>
  speaker.company.zh ||
  speaker.company.en ||
  speaker.name.zh ||
  speaker.name.en ||
  '';

const fetchCollection = async (path, { optional = false } = {}) => {
  const response = await fetch(path);
  if (!response.ok) {
    if (optional) {
      return [];
    }
    throw new Error(`无法获取 ${path}`);
  }
  const csvText = await response.text();
  const rows = parseCsv(csvText).filter((r) => r.length > 1);
  const [header, ...dataRows] = rows;
  const idx = (name) => header.indexOf(name);

  // 动态查找所有采访提纲列（Interview1_ZH, Interview1_EN, Interview2_ZH, ...）
  const interviewColumns = header
    .map((col, i) => ({ name: col, index: i }))
    .filter(({ name }) => /^Interview\d+_(ZH|EN)$/i.test(name))
    .sort((a, b) => {
      // 按数字排序：Interview1, Interview2, Interview3...
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
      if (numA !== numB) return numA - numB;
      // 同一数字的，ZH 在前，EN 在后
      return a.name.endsWith('_ZH') ? -1 : 1;
    });

  // 按数字分组：{ 1: { zh: '...', en: '...' }, 2: { zh: '...', en: '...' }, ... }
  const getInterviewItems = (cols) => {
    const grouped = {};
    interviewColumns.forEach(({ name, index }) => {
      const match = name.match(/^Interview(\d+)_(ZH|EN)$/i);
      if (match) {
        const num = parseInt(match[1]);
        const lang = match[2].toLowerCase();
        if (!grouped[num]) grouped[num] = {};
        grouped[num][lang] = cols[index] || '';
      }
    });
    // 转换为数组，按数字顺序
    return Object.keys(grouped)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((num) => normalizeLine(grouped[num].zh, grouped[num].en));
  };

  return dataRows.map((cols, index) => ({
    sequence: index,
    name: normalizeLine(cols[idx('Name_ZH')], cols[idx('Name_EN')]),
    title: normalizeLine(cols[idx('Title_ZH')], cols[idx('Title_EN')]),
    company: normalizeLine(cols[idx('Company_ZH')], cols[idx('Company_EN')]),
    biography: normalizeLine(
      cols[idx('Biography_ZH')],
      cols[idx('Biography_EN')]
    ),
    interview: getInterviewItems(cols),
    imageUrl: cols[idx('ImageURL')],
    localImage: cols[idx('LocalImage')],
  }));
};

const renderDualText = (value) => {
  const zh = value.zh;
  const en = value.en;
  const showZh = zh.length > 0;
  const showEn = en.length > 0 && en !== zh;

  if (!showZh && !showEn) return '<span>—</span>';

  return `
    <span class="dual-line">
      ${showZh ? `<span>${zh}</span>` : ''}
      ${showEn ? `<span class="text-en">${en}</span>` : ''}
    </span>
  `;
};

const renderCard = (speaker) => `
  <article class="speaker-card" data-sequence="${speaker.sequence}" tabindex="0">
    <img src="${getImageSrc(speaker)}" alt="${speaker.name.zh || speaker.name.en} 的头像" loading="lazy" />
    <div class="speaker-content">
      <h3>${renderDualText(speaker.name)}</h3>
      <div class="speaker-meta">
        <span>${renderDualText(speaker.title)}</span>
        ${
          speaker.company.zh || speaker.company.en
            ? `<span class="company-tag">${renderDualText(speaker.company)}</span>`
            : ''
        }
      </div>
    </div>
  </article>
`;

const populateCompanyOptions = (items) => {
  companyFilter.innerHTML = '';
  const baseOption = document.createElement('option');
  baseOption.value = '';
  baseOption.textContent = '全部机构';
  companyFilter.appendChild(baseOption);

  const companies = Array.from(
    new Set(
      items
        .map((s) => getCompanyLabel(s))
        .filter((item) => item.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, 'zh'));

  companies.forEach((company) => {
    const option = document.createElement('option');
    option.value = company;
    option.textContent = company;
    companyFilter.appendChild(option);
  });

  statOrgs.textContent = companies.length;
};

const searchableFields = (speaker) => [
  speaker.name.zh,
  speaker.name.en,
  speaker.title.zh,
  speaker.title.en,
  speaker.company.zh,
  speaker.company.en,
  speaker.biography.zh,
  speaker.biography.en,
  ...speaker.interview.flatMap((item) => [item.zh, item.en]),
];

const applyFilters = () => {
  const term = searchInput.value.trim().toLowerCase();
  const companyValue = companyFilter.value;
  const sortValue = sortSelect.value;

  const baseItems = getActiveItems();

  let result = baseItems.filter((speaker) => {
    const matchesTerm =
      !term ||
      searchableFields(speaker)
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(term));

    const matchesCompany =
      !companyValue || getCompanyLabel(speaker) === companyValue;

    return matchesTerm && matchesCompany;
  });

  result = result.sort((a, b) => {
    const localeOptions = { sensitivity: 'base' };
    const safe = (value) => (value || '').toString();
    const compareValues = (valueA, valueB, direction = 1) =>
      safe(valueA).localeCompare(safe(valueB), 'zh', localeOptions) * direction;

    switch (sortValue) {
      case 'sequence':
        return (a.sequence ?? 0) - (b.sequence ?? 0);
      case 'name-desc':
        return compareValues(a.name.zh || a.name.en, b.name.zh || b.name.en, -1);
      case 'company-asc':
        return compareValues(
          a.company.zh || a.company.en || a.name.zh || a.name.en,
          b.company.zh || b.company.en || b.name.zh || b.name.en,
          1
        );
      case 'name-asc':
      default:
        return compareValues(a.name.zh || a.name.en, b.name.zh || b.name.en);
    }
  });

  statVisible.textContent = result.length;
  grid.innerHTML = result.map((speaker) => renderCard(speaker)).join('');
  emptyState.hidden = result.length > 0;
  emptyState.textContent =
    result.length > 0
      ? ''
      : activeDataset === 'speakers'
        ? '没有匹配的嘉宾，试试调整搜索或筛选条件。'
        : '没有匹配的参展商 / 赞助商，清空筛选或稍后再试。';
  attachCardHandlers();
};

const handleViewToggle = (view) => {
  const isList = view === 'list';
  grid.classList.toggle('list-view', isList);
  toggleButtons.forEach((btn) => {
    const active = btn.dataset.view === view;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active);
  });
};

const renderModalContent = (speaker) => {
  const biographyZh =
    speaker.biography.zh || '暂无中文介绍，欢迎在 CSV 中补充。';
  const biographyEn =
    speaker.biography.en || 'Biography not yet available.';

  const interviews = speaker.interview
    .filter((item) => item.zh || item.en)
    .map(
      (item, idx) => `
        <li class="interview-item">
          <strong>Q${idx + 1}</strong>
          ${item.zh ? `<p lang="zh-CN">${item.zh}</p>` : ''}
          ${item.en ? `<p lang="en">${item.en}</p>` : ''}
        </li>
      `
    )
    .join('');

  return `
    <div class="modal__header">
      <div class="modal__avatar">
        <img src="${getImageSrc(
          speaker
        )}" alt="${speaker.name.zh || speaker.name.en} 的头像" />
      </div>
      <div class="modal__info">
        <div>${renderDualText(speaker.name)}</div>
        <div>${renderDualText(speaker.title)}</div>
        <div>${renderDualText(speaker.company)}</div>
      </div>
    </div>
    <div class="modal__section">
      <h4>个人介绍 / BIOGRAPHY</h4>
      <p lang="zh-CN">${biographyZh}</p>
      <p lang="en">${biographyEn}</p>
    </div>
    <div class="modal__section">
      <h4>采访提纲 / TALKING POINTS</h4>
      <ul class="interview-list">
        ${interviews || '<li class="interview-item"><p>暂无提纲</p></li>'}
      </ul>
    </div>
  `;
};

const openModal = (speaker) => {
  activeSpeaker = speaker;
  modalBody.innerHTML = renderModalContent(speaker);
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};

const closeModal = () => {
  activeSpeaker = null;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};

const attachCardHandlers = () => {
  const cards = grid.querySelectorAll('.speaker-card');
  const map = datasetMaps[activeDataset] || new Map();
  cards.forEach((card) => {
    const sequence = Number(card.dataset.sequence);
    const speaker = map.get(sequence);

    card.addEventListener('click', () => openModal(speaker));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(speaker);
      }
    });
  });
};

modalDismissers.forEach((el) =>
  el.addEventListener('click', () => closeModal())
);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal.classList.contains('show')) {
    closeModal();
  }
});

const updateStatSummary = () => {
  const items = getActiveItems();
  statTotal.textContent = items.length;
  const companies = new Set(
    items.map((item) => getCompanyLabel(item)).filter(Boolean)
  );
  statOrgs.textContent = companies.size;
};

const setActiveDataset = (dataset) => {
  if (!datasetState[dataset]) return;
  activeDataset = dataset;
  grid.classList.toggle('sponsor-mode', dataset === 'sponsors');
  datasetButtons.forEach((btn) => {
    const isActive = btn.dataset.dataset === dataset;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
  searchInput.value = '';
  companyFilter.value = '';
  sortSelect.value = 'sequence';
  populateCompanyOptions(getActiveItems());
  updateStatSummary();
  applyFilters();
};

const init = async () => {
  try {
    const [speakerList, sponsorList] = await Promise.all([
      fetchCollection(speakersCsv),
      fetchCollection(sponsorsCsv, { optional: true }),
    ]);

    registerCollection('speakers', speakerList);
    registerCollection('sponsors', sponsorList);

    datasetButtons.forEach((btn) => {
      const dataset = btn.dataset.dataset;
      if (dataset === 'sponsors' && sponsorList.length === 0) {
        btn.disabled = true;
        btn.title = '暂未提供参展商 / 赞助商数据';
      }
      btn.addEventListener('click', () => {
        if (btn.dataset.dataset !== activeDataset && !btn.disabled) {
          setActiveDataset(btn.dataset.dataset);
        }
      });
    });

    setActiveDataset('speakers');
  } catch (error) {
    console.error(error);
    emptyState.hidden = false;
    emptyState.textContent = '数据加载失败，请刷新页面重试。';
  }
};

searchInput.addEventListener('input', () => applyFilters());
companyFilter.addEventListener('change', () => applyFilters());
sortSelect.addEventListener('change', () => applyFilters());

toggleButtons.forEach((btn) =>
  btn.addEventListener('click', () => handleViewToggle(btn.dataset.view))
);

init();

