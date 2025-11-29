const fs = require('fs');
const path = require('path');

const SPEAKERS_PATH = path.join(__dirname, 'speakers.json');
const CSV_PATH = path.join(__dirname, 'interviews.csv');

const escapeCsv = (value = '') => {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const zhFallback = (value, placeholder) =>
  (value && value.trim()) || placeholder;

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
    'ImageURL',
    'LocalImage',
  ];
  const rows = [
    header,
    ...speakers.map((speaker) => {
      const interview = speaker.interview || [];
      const [first = {}, second = {}] = interview;
      const fallbackBioZh = '暂无中文介绍（可在 CSV 中补充）';
      const fallbackQuestionZh = '暂无中文问题内容（可在 CSV 中补充）';

      return [
        speaker.name || '',
        speaker.name || '',
        speaker.title || '',
        speaker.title || '',
        speaker.company || '',
        speaker.company || '',
        zhFallback('', fallbackBioZh),
        speaker.biography || '',
        zhFallback(first.zh || '', fallbackQuestionZh),
        first.en || '',
        zhFallback(second.zh || '', fallbackQuestionZh),
        second.en || '',
        speaker.imageUrl || '',
        speaker.localImage || '',
      ].map(escapeCsv);
    }),
  ];
  const csvContent = rows.map((cols) => cols.join(',')).join('\n');
  fs.writeFileSync(CSV_PATH, csvContent, 'utf8');
  console.log(`已生成 ${CSV_PATH}`);
};

main();