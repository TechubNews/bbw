const fs = require('fs');
const path = require('path');
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args));

const MANIFEST_PATH = path.join(__dirname, 'mena_sponsor_logos.json');

const downloadLogo = async (entry) => {
  const response = await fetch(entry.logo);
  if (!response.ok) {
    throw new Error(`下载失败 ${entry.logo} ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const targetPath = path.join(__dirname, entry.localPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, buffer);
  console.log(`已保存 MENA sponsor logo: ${entry.name} -> ${entry.localPath}`);
};

const main = async () => {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(
      'mena_sponsor_logos.json 不存在，请先运行 generateMenaSponsorsCsv.js'
    );
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  for (const entry of manifest) {
    try {
      await downloadLogo(entry);
    } catch (error) {
      console.error(`下载 ${entry.name} 失败:`, error.message);
    }
  }
};

main();


