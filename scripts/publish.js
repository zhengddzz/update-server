#!/usr/bin/env node
/**
 * 多软件发布脚本（单文件版）
 * 用法: node scripts/publish.js
 *
 * 所有数据统一维护在 api/data.json 中。
 *
 * 主菜单：
 *   [1] 新建软件        — 创建一款新软件
 *   [2] 为已有软件发布新版本
 *
 * 发布时：
 *   - 输入版本号 / 更新说明 / 是否强制更新
 *   - 为每个平台指定本地安装包，自动计算 size 与 sha256
 *   - 可选把安装包复制到 releases/<appid>/<平台>/ 目录
 *   - 下载链接用 data.json 的 baseUrl 拼成完整地址
 *   - 全部写回 api/data.json（唯一数据源）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'api', 'data.json');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

const PLATFORMS = [
  { key: 'windows', format: 'exe', label: 'Windows' },
  { key: 'macos', format: 'dmg', label: 'macOS' },
  { key: 'linux', format: 'AppImage', label: 'Linux' },
];

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

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function collectPlatforms(baseUrl, appId, version) {
  const platforms = {};
  for (const p of PLATFORMS) {
    console.log(`\n--- ${p.label} ---`);
    const ans = (await ask(`  为 ${p.label} 设置安装包吗? (y/N): `)).trim().toLowerCase();
    if (ans !== 'y') continue;
    const file = (await ask('  安装包本地路径: '))
      .trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (!file || !fs.existsSync(file)) {
      console.log('  路径无效，跳过。');
      continue;
    }
    const basename = path.basename(file);
    const finalUrl = `${baseUrl}/releases/${appId}/${p.key}/${basename}`;
    const relDir = path.join(ROOT, 'releases', appId, p.key);
    fs.mkdirSync(relDir, { recursive: true });
    const dest = path.join(relDir, basename);
    const doCopy = (await ask(`  复制到 ${path.relative(ROOT, dest)}? (Y/n): `)).trim().toLowerCase();
    if (doCopy !== 'n') {
      fs.copyFileSync(file, dest);
      console.log('  已复制。');
    }
    platforms[p.key] = {
      version,
      url: finalUrl,
      size: fs.statSync(file).size,
      sha256: sha256(file),
      format: p.format,
      minOS: '',
    };
    console.log(`  下载链接: ${finalUrl}`);
  }
  return platforms;
}

async function createApp(data, baseUrl) {
  const appId = (await ask('软件 ID (英文，如 node-selector): ')).trim();
  if (!appId || !/^[a-z0-9-]+$/.test(appId)) {
    console.log('ID 无效，只能含小写字母、数字、连字符。');
    return;
  }
  if ((data.apps || []).some((a) => a.id === appId)) {
    console.log(`软件 ${appId} 已存在。`);
    return;
  }
  const name = (await ask('软件名称 (如 节点推荐器): ')).trim() || appId;
  const version = (await ask('首个版本号 (如 1.0.0): ')).trim() || '1.0.0';
  const notes = (await ask('更新说明: ')).trim();
  const mandatory = (await ask('是否强制更新? (y/N): ')).trim().toLowerCase() === 'y';
  const releaseDate = new Date().toISOString().slice(0, 10);

  const platforms = await collectPlatforms(baseUrl, appId, version);

  data.apps = data.apps || [];
  data.apps.push({
    id: appId, name, version, releaseDate,
    releaseNotes: notes, mandatory,
    platforms,
    changelog: [{ version, releaseDate, releaseNotes: notes, mandatory }],
  });
  writeData(data);

  console.log(`\n✓ 已创建软件「${name}」(${appId}) v${version}`);
  console.log(`  接口: ${baseUrl}/api/data.json`);
  console.log(`  数据文件: api/data.json`);
}

async function releaseVersion(data, baseUrl) {
  const apps = data.apps || [];
  if (!apps.length) { console.log('暂无软件，请先新建。'); return; }

  console.log('\n选择软件:');
  apps.forEach((a, i) => console.log(`  [${i + 1}] ${a.name} (${a.id}) v${a.version}`));
  const idx = parseInt((await ask('\n序号: ')).trim(), 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= apps.length) { console.log('无效选择。'); return; }
  const app = apps[idx];

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
    if (cur) console.log(`  当前: ${cur.url}`);
    const ans = (await ask(`  为 ${p.label} 设置新安装包吗? (y/N): `)).trim().toLowerCase();
    if (ans !== 'y') {
      if (cur) cur.version = version;
      continue;
    }
    const file = (await ask('  安装包本地路径: '))
      .trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (!file || !fs.existsSync(file)) { console.log('  路径无效，跳过。'); continue; }
    const basename = path.basename(file);
    const finalUrl = `${baseUrl}/releases/${app.id}/${p.key}/${basename}`;
    const relDir = path.join(ROOT, 'releases', app.id, p.key);
    fs.mkdirSync(relDir, { recursive: true });
    const dest = path.join(relDir, basename);
    const doCopy = (await ask(`  复制到 ${path.relative(ROOT, dest)}? (Y/n): `)).trim().toLowerCase();
    if (doCopy !== 'n') { fs.copyFileSync(file, dest); console.log('  已复制。'); }
    const old = app.platforms[p.key] || {};
    app.platforms[p.key] = {
      version,
      url: finalUrl,
      size: fs.statSync(file).size,
      sha256: sha256(file),
      format: p.format,
      minOS: old.minOS || '',
    };
    console.log(`  下载链接: ${finalUrl}`);
  }

  app.version = version;
  app.releaseDate = releaseDate;
  app.releaseNotes = notes;
  app.mandatory = mandatory;

  // 更新 changelog（去重后追加）
  app.changelog = (app.changelog || []).filter((c) => c.version !== version);
  app.changelog.unshift({ version, releaseDate, releaseNotes: notes, mandatory });
  app.changelog.sort((a, b) => cmpVersion(b.version, a.version));

  writeData(data);
  console.log(`\n✓ 已发布 ${app.name} v${version}`);
  console.log(`  数据文件: api/data.json`);
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
