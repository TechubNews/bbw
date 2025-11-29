# 部署与本地查看指南

## 1. 环境准备
1. 安装 [Node.js 18+](https://nodejs.org/)（推荐 LTS）。
2. 在项目根目录执行：
   ```bash
   npm install
   ```

## 2. 获取官方数据 & 头像 & CSV
一次性同步所有资料（推荐）：
```bash
npm run prepare:data
```
该脚本依次执行：
- `npm run data:refresh`：使用 Puppeteer 抓取官网 164 位嘉宾的姓名、职位、机构、官方简介与头像链接，并生成 `speakers.json`。
- `npm run avatars`：批量下载头像到 `avatars/` 目录（自动回退到 `assets/default-avatar.svg`），并在 `speakers.json` 中写入 `localImage`。
- `npm run csv`：根据最新的 `speakers.json` 输出 `interviews.csv`。前端渲染会直接读取该 CSV，因此后续若在 CSV 中补充/修改中文信息，无需再次转译即可生效。

> 若只需更新某一部分，可单独运行对应脚本。

## 3. 本地预览
1. 运行任意静态服务器，例如：
   ```bash
   npx serve .
   ```
   或在 VS Code/Cursor 中使用 Live Server、`python -m http.server` 等。
2. 浏览器打开服务器输出的地址（若直接双击 `index.html` 可能会因浏览器跨域策略看不到本地头像，建议使用静态服务器）。
3. 页面加载后默认按照 CSV 顺序展示嘉宾，可切换排序、搜索。点击卡片会弹出模态框查看中英文简介与采访提纲，点击空白处或 ✕ 按钮即可关闭。

## 4. 部署建议
1. 将 `index.html`、`styles.css`、`app.js`、`interviews.csv`、`avatars/`、`assets/` 及需要的脚本文件一并上传到任意静态托管（如 Vercel、Netlify、GitHub Pages）。前端会优先读取 CSV，因此只要替换 CSV 即可热更新内容。
2. 首次部署或需要更新嘉宾信息时，先在本地运行 `npm run prepare:data`，确认产物正确再同步到服务器。
3. 若部署平台支持构建脚本，可在构建阶段执行：
   ```bash
   npm install
   npm run prepare:data
   ```
   然后将生成文件复制到最终的 `dist`/发布目录。

## 5. 目录结构（关键部分）
```
├─ index.html
├─ styles.css
├─ app.js
├─ speakers.json            # 原始抓取数据（生成 CSV 的原料）
├─ interviews.csv           # 页面直读的数据源（可手工维护）
├─ avatars/                 # 缓存的嘉宾头像
├─ assets/
│  └─ default-avatar.svg
├─ scrapeSpeakersDetailed.js
├─ cacheAvatars.js
├─ generateInterviewCsv.js
└─ package.json
```

> 编辑 CSV 小贴士：文件包含中英文姓名/职位/公司、双语简介、两条提纲以及头像路径。只要保持表头不变，新增/修改内容后重新部署即可立即生效。

完成以上步骤即可在本地或生产环境稳定展示最终效果。祝活动顺利！

