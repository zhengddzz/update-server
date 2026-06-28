#!/usr/bin/env node
/**
 * 多软件发布脚本（单文件版）
 * 用法: node scripts/publish.js
 *
 * 所有数据统一维护在 api/data.json 中。
 * platforms.<os> 为数组，支持同一平台多个安装包变体（exe/msi/dmg/deb/rpm 等）。
 *
 * 主菜单：
 *   [1] 新建软件        — 创建一款新软件
 *   [2] 为已有软件发布新版本
 *
 * 录入安装包时支持两种方式：
 *   - 本地文件路径：自动计算 size/sha256，可选复制到 releases/<appid>/<平台>/
 *   - 完整 URL（http/https 开头）：size/sha256 留空，format 从文件名推断
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'api', 'data.json');
const API_DIR = path.join(ROOT, 'api');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

// 平台列表与默认最低系统要求
const PLATFORMS = [
  { key: 'windows', label: 'Windows', minOS: 'Windows 10' },
  { key: 'macos', label: 'macOS', minOS: 'macOS 11' },
  { key: 'linux', label: 'Linux', minOS: '' },
];

// 从文件名/URL 推断安装包格式
function detectFormat(name) {
  const f = (name || '').toLowerCase().split('?')[0].split('#')[0];
  if (f.endsWith('.app.tar.gz') || f.endsWith('.tar.gz')) return 'app.tar.gz';
  if (f.endsWith('.appimage')) return 'AppImage';
  const m = f.match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function cmpVersion(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function readData() { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8'); }
// 单软件 API 文件路径：api/<appid>.json
function appFile(appId) { return path.join(API_DIR, `${appId}.json`); }
// 写入单软件完整数据
function writeApp(app) { fs.writeFileSync(appFile(app.id), JSON.stringify(app, null, 2) + '\n', 'utf8'); }
// 同步 data.json 索引（轻量字段）
function syncIndex(data) {
  data.apps = (data.apps || []).map(a => {
    const full = readApp(a.id);
    return {
      id: a.id, name: a.name, version: a.version,
      releaseDate: a.releaseDate, releaseNotes: a.releaseNotes, mandatory: !!a.mandatory
    };
  });
  writeData(data);
}
// 读取单软件完整数据（若不存在返回 null）
function readApp(appId) {
  const f = appFile(appId);
  if (!fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

// 为单个平台录入多个安装包，返回数组
async function collectPlatformPackages(baseUrl, appId, version, p) {
  const arr = [];
  console.log(`\n--- ${p.label} ---`);
  while (true) {
    const ans = (await ask(`  添加 ${p.label} 安装包? (y/N): `)).trim().toLowerCase();
    if (ans !== 'y') break;
    const input = (await ask('  本地路径 或 完整URL (空结束): ')).trim().replace(/^["']|["']$/g, '');
    if (!input) break;
    let pkg;
    if (/^https?:\/\//.test(input)) {
      // 直接填 URL：size/sha256 留空
      pkg = { version, url: input, size: 0, sha256: '', format: detectFormat(input), minOS: p.minOS };
    } else if (fs.existsSync(input)) {
      // 本地文件：计算 size/sha256，可选复制到仓库
      const basename = path.basename(input);
      const finalUrl = `${baseUrl}/releases/${appId}/${p.key}/${basename}`;
      const relDir = path.join(ROOT, 'releases', appId, p.key);
      fs.mkdirSync(relDir, { recursive: true });
      const dest = path.join(relDir, basename);
      const doCopy = (await ask(`  复制到 ${path.relative(ROOT, dest)}? (Y/n): `)).trim().toLowerCase();
      if (doCopy !== 'n') { fs.copyFileSync(input, dest); console.log('  已复制。'); }
      pkg = { version, url: finalUrl, size: fs.statSync(input).size, sha256: sha256(input), format: detectFormat(basename), minOS: p.minOS };
    } else {
      console.log('  路径无效，跳过。');
      continue;
    }
    arr.push(pkg);
    console.log(`  ✓ ${pkg.format} -> ${pkg.url}`);
  }
  return arr;
}

// 采集所有平台安装包，返回 platforms 对象（值为数组）
async function collectPlatforms(baseUrl, appId, version) {
  const platforms = {};
  for (const p of PLATFORMS) {
    const arr = await collectPlatformPackages(baseUrl, appId, version, p);
    if (arr.length) platforms[p.key] = arr;
  }
  return platforms;
}

async function createApp(data, baseUrl) {
  const appId = (await ask('软件 ID (英文，如 node-selector): ')).trim();
  if (!appId || !/^[a-z0-9-]+$/.test(appId)) { console.log('ID 无效，只能含小写字母、数字、连字符。'); return; }
  if ((data.apps || []).some((a) => a.id === appId)) { console.log(`软件 ${appId} 已存在。`); return; }
  const name = (await ask('软件名称 (如 节点推荐器): ')).trim() || appId;
  const version = (await ask('首个版本号 (如 1.0.0): ')).trim() || '1.0.0';
  const notes = (await ask('更新说明: ')).trim();
  const mandatory = (await ask('是否强制更新? (y/N): ')).trim().toLowerCase() === 'y';
  const releaseDate = new Date().toISOString().slice(0, 10);

  const platforms = await collectPlatforms(baseUrl, appId, version);

  // 完整软件数据写入 api/<id>.json
  const app = {
    id: appId, name, version, releaseDate,
    releaseNotes: notes, mandatory,
    platforms,
    changelog: [{ version, releaseDate, releaseNotes: notes, mandatory }],
  };
  writeApp(app);

  // data.json 仅保留轻量索引
  data.apps = data.apps || [];
  data.apps.push({
    id: appId, name, version, releaseDate,
    releaseNotes: notes, mandatory,
  });
  writeData(data);

  console.log(`\n✓ 已创建软件「${name}」(${appId}) v${version}`);
  console.log(`  软件API: ${baseUrl}/api/${appId}.json`);
  console.log(`  索引:    ${baseUrl}/api/data.json`);
}

async function releaseVersion(data, baseUrl) {
  const apps = data.apps || [];
  if (!apps.length) { console.log('暂无软件，请先新建。'); return; }
  console.log('\n选择软件:');
  apps.forEach((a, i) => console.log(`  [${i + 1}] ${a.name} (${a.id}) v${a.version}`));
  const idx = parseInt((await ask('\n序号: ')).trim(), 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= apps.length) { console.log('无效选择。'); return; }
  const idxEntry = apps[idx];
  // 从单软件文件读取完整数据
  const app = readApp(idxEntry.id);
  if (!app) { console.log(`错误: api/${idxEntry.id}.json 不存在，请先新建。`); return; }

  console.log(`\n当前版本: ${app.version}`);
  const version = (await ask('新版本号 (如 1.1.0): ')).trim();
  if (!version) { console.log('已取消。'); return; }
  if (cmpVersion(version, app.version) <= 0) {
    if ((await ask(`警告: ${version} 不高于 ${app.version}，仍继续? (y/N): `)).trim().toLowerCase() !== 'y') return;
  }
  const notes = (await ask('更新说明: ')).trim();
  const mandatory = (await ask('是否强制更新? (y/N): ')).trim().toLowerCase() === 'y';
  const releaseDate = new Date().toISOString().slice(0, 10);

  app.platforms = app.platforms || {};
  for (const p of PLATFORMS) {
    console.log(`\n--- ${p.label} ---`);
    const cur = app.platforms[p.key];
    if (Array.isArray(cur) && cur.length) {
      console.log(`  当前 ${cur.length} 个安装包:`);
      cur.forEach((c) => console.log(`    - ${c.format}: ${c.url}`));
    }
    const ans = (await ask(`  重新设置 ${p.label} 安装包吗? (y/N): `)).trim().toLowerCase();
    if (ans !== 'y') {
      if (Array.isArray(cur)) cur.forEach((c) => { c.version = version; });
      continue;
    }
    const arr = await collectPlatformPackages(baseUrl, app.id, version, p);
    if (arr.length) app.platforms[p.key] = arr;
    else delete app.platforms[p.key];
  }

  app.version = version;
  app.releaseDate = releaseDate;
  app.releaseNotes = notes;
  app.mandatory = mandatory;

  // 更新 changelog（去重后追加）
  app.changelog = (app.changelog || []).filter((c) => c.version !== version);
  app.changelog.unshift({ version, releaseDate, releaseNotes: notes, mandatory });
  app.changelog.sort((a, b) => cmpVersion(b.version, a.version));

  // 写入单软件文件
  writeApp(app);
  // 同步 data.json 索引
  idxEntry.name = app.name;
  idxEntry.version = app.version;
  idxEntry.releaseDate = app.releaseDate;
  idxEntry.releaseNotes = app.releaseNotes;
  idxEntry.mandatory = app.mandatory;
  writeData(data);

  console.log(`\n✓ 已发布 ${app.name} v${version}`);
  console.log(`  软件API: ${baseUrl}/api/${app.id}.json`);
  console.log('\n下一步: git add . && git commit -m "release: ' + app.id + ' v' + version + '" && git push');
}

async function main() {
  const data = readData();
  const baseUrl = (data.baseUrl || '').replace(/\/$/, '');
  if (!baseUrl) { console.log('请在 api/data.json 设置 baseUrl'); rl.close(); return; }
  console.log(`更新服务 · baseUrl = ${baseUrl}`);
  console.log(`数据文件: api/data.json`);
  console.log(`软件数量: ${(data.apps || []).length}\n`);
  console.log('选择操作:');
  console.log('  [1] 新建软件');
  console.log('  [2] 为已有软件发布新版本');
  const op = (await ask('\n操作 (1/2): ')).trim();
  if (op === '1') await createApp(data, baseUrl);
  else if (op === '2') await releaseVersion(data, baseUrl);
  else console.log('无效操作。');
  rl.close();
}

main().catch((e) => { console.error('出错:', e); process.exit(1); });
