// 通用发布脚本：从 _release.tmp.json (单个 release 对象) 生成 platforms 数据并更新 JSON
// 用法: node scripts/publish.js <version>
// 例如: node scripts/publish.js 1.3.2

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const VERSION = process.argv[2];
if (!VERSION) {
  console.error('用法: node scripts/publish.js <version>  (如 1.3.2)');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const RELEASE_JSON = path.join(ROOT, '_release.tmp.json');
const RELEASES_DIR = path.join(ROOT, 'releases', 'node-selector');
const APP_JSON = path.join(ROOT, 'api', 'node-selector.json');
const DATA_JSON = path.join(ROOT, 'api', 'data.json');
const TAG = `v${VERSION}`;
const U_BASE = 'https://u.zdzz.top';
const PROXY = 'http://127.0.0.1:7890';
const SIZE_LIMIT = 25 * 1024 * 1024;

// 文件名 → 平台 / format 映射
function classify(name) {
  const l = name.toLowerCase();
  if (l.endsWith('.exe') || l.endsWith('.msi')) return 'windows';
  if (l.endsWith('.dmg') || l.endsWith('.app.tar.gz')) return 'macos';
  if (l.endsWith('.deb') || l.endsWith('.rpm') || l.endsWith('.appimage')) return 'linux';
  return null;
}
function formatOf(name) {
  const l = name.toLowerCase();
  if (l.endsWith('.exe')) return 'exe';
  if (l.endsWith('.msi')) return 'msi';
  if (l.endsWith('.dmg')) return 'dmg';
  if (l.endsWith('.app.tar.gz')) return 'app.tar.gz';
  if (l.endsWith('.deb')) return 'deb';
  if (l.endsWith('.rpm')) return 'rpm';
  if (l.endsWith('.appimage')) return 'AppImage';
  return 'unknown';
}

// 用 curl + 代理下载
function download(url, dest) {
  execFileSync('curl', [
    '-L', '--proxy', PROXY, '--fail', '-S',
    '--connect-timeout', '30', '--max-time', '300',
    '-o', dest, url
  ], { stdio: 'inherit' });
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

(async () => {
  console.log(`发布 ${TAG} ...`);
  const rel = JSON.parse(fs.readFileSync(RELEASE_JSON, 'utf8'));
  if (rel.tag_name !== TAG) {
    console.error(`_release.tmp.json 的 tag_name=${rel.tag_name} 与目标 ${TAG} 不符`);
    process.exit(1);
  }
  console.log(`release: ${rel.name}`);
  console.log(`published: ${rel.published_at}`);
  console.log(`assets: ${rel.assets.length}`);

  const platforms = { windows: [], macos: [], linux: [] };
  const releaseDate = rel.published_at.slice(0, 10);

  for (const asset of rel.assets) {
    const name = asset.name;
    const platform = classify(name);
    const format = formatOf(name);
    if (!platform) {
      console.log(`跳过 ${name}（无法识别平台）`);
      continue;
    }
    const size = asset.size;
    const isLarge = size > SIZE_LIMIT;
    let url, sha256;

    if (isLarge) {
      url = asset.browser_download_url;
      sha256 = '';
      console.log(`[GitHub 链接] ${name} (${(size/1048576).toFixed(2)} MB) → ${url}`);
    } else {
      const destDir = path.join(RELEASES_DIR, platform);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      const localPath = path.join(destDir, name);
      if (fs.existsSync(localPath) && fs.statSync(localPath).size === size) {
        console.log(`[已存在] ${name} (${(size/1048576).toFixed(2)} MB)`);
      } else {
        console.log(`[下载中] ${name} (${(size/1048576).toFixed(2)} MB)...`);
        download(asset.browser_download_url, localPath);
        console.log(`[已完成] ${name}`);
      }
      sha256 = sha256File(localPath);
      url = `${U_BASE}/releases/node-selector/${platform}/${name}`;
      console.log(`  sha256: ${sha256}`);
    }

    const entry = {
      version: VERSION,
      url,
      size,
      sha256,
      format,
      minOS: platform === 'windows' ? 'Windows 10' : platform === 'macos' ? 'macOS 11' : ''
    };
    if (isLarge) entry.note = '体积超 25MB，走 GitHub 直链';
    platforms[platform].push(entry);
  }

  // 排序：exe/msi, dmg/app.tar.gz, deb/rpm/AppImage
  const order = { exe: 0, msi: 1, dmg: 0, 'app.tar.gz': 1, deb: 0, rpm: 1, AppImage: 2 };
  for (const os of Object.keys(platforms)) {
    platforms[os].sort((a, b) => (order[a.format] ?? 99) - (order[b.format] ?? 99));
  }

  // 更新 node-selector.json
  const appData = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  const releaseNotes = (rel.body || '').replace(/\r\n/g, '\n').trim();
  appData.version = VERSION;
  appData.releaseDate = releaseDate;
  appData.releaseNotes = releaseNotes;
  appData.platforms = platforms;

  const idx = appData.changelog.findIndex((c) => c.version === VERSION);
  const entry = { version: VERSION, releaseDate, releaseNotes, mandatory: false };
  if (idx >= 0) appData.changelog[idx] = entry;
  else appData.changelog.unshift(entry);

  fs.writeFileSync(APP_JSON, JSON.stringify(appData, null, 2) + '\n', 'utf8');
  console.log(`已更新 ${path.relative(ROOT, APP_JSON)}`);

  // 更新 data.json 索引
  const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
  const ai = data.apps.findIndex((a) => a.id === 'node-selector');
  if (ai >= 0) {
    data.apps[ai].version = VERSION;
    data.apps[ai].releaseDate = releaseDate;
    data.apps[ai].releaseNotes = releaseNotes;
  }
  fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`已更新 ${path.relative(ROOT, DATA_JSON)}`);
  console.log('\n完成！');
})().catch((e) => { console.error('错误:', e); process.exit(1); });
