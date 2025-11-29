const fs = require('fs');
const path = require('path');
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args));

const SPEAKERS_PATH = path.join(__dirname, 'speakers.json');
const AVATAR_DIR = path.join(__dirname, 'avatars');
const DEFAULT_AVATAR = 'assets/default-avatar.svg';

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const sanitizeFileName = (text, fallback) => {
  if (!text) return fallback;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback;
};

const getExtension = (url) => {
  try {
    const { pathname } = new URL(url);
    const match = pathname.match(/\.([a-z0-9]+)(?:$|\?)/i);
    if (match) {
      return match[1].toLowerCase();
    }
  } catch (err) {
    return 'png';
  }
  return 'png';
};

const downloadImage = async (url, destination) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(destination, buffer);
};

const main = async () => {
  ensureDir(AVATAR_DIR);
  const speakers = JSON.parse(fs.readFileSync(SPEAKERS_PATH, 'utf8'));

  for (let i = 0; i < speakers.length; i++) {
    const speaker = speakers[i];
    const slug = sanitizeFileName(speaker.name, `speaker-${i + 1}`);

    if (speaker.imageUrl) {
      const ext = getExtension(speaker.imageUrl);
      const filename = `${slug}.${ext}`;
      const filepath = path.join(AVATAR_DIR, filename);

      if (!fs.existsSync(filepath)) {
        try {
          console.log(`下载头像: ${speaker.name}`);
          await downloadImage(speaker.imageUrl, filepath);
        } catch (error) {
          console.warn(`头像下载失败（${speaker.name}）: ${error.message}`);
        }
      }

      if (fs.existsSync(filepath)) {
        speaker.localImage = path.join('avatars', filename).replace(/\\/g, '/');
      } else {
        speaker.localImage = DEFAULT_AVATAR;
      }
    } else {
      speaker.localImage = DEFAULT_AVATAR;
    }
  }

  fs.writeFileSync(SPEAKERS_PATH, JSON.stringify(speakers, null, 2), 'utf8');
  console.log('头像缓存完成，speakers.json 已更新。');
};

main().catch((error) => {
  console.error('头像缓存脚本失败', error);
  process.exitCode = 1;
});

