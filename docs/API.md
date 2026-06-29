# 自动更新 API 文档

本服务为多款客户端软件提供「版本检测」与「安装包下载」能力，基于 EdgeOne Pages 静态托管，**无需服务器**。

## 数据结构

- `api/data.json` — 全局索引（站点配置 + 所有软件的轻量列表，首页用）
- `api/<appid>.json` — 单软件完整 API（含版本、平台安装包数组、changelog），客户端检测更新用此接口

## 基础地址

```
https://u.zdzz.top
```

## 接口 1：全局索引

```
GET {BASE}/api/data.json
```

返回站点配置和所有软件的轻量索引（不含 platforms/changelog，仅展示列表用）。

**响应示例：**

```json
{
  "baseUrl": "https://u.zdzz.top",
  "siteName": "ddzz软件更新服务",
  "description": "提供相关软件自动更新检测API与下载服务",
  "apps": [
    {
      "id": "node-selector",
      "name": "ChmlFrp 社区工具箱",
      "version": "1.3.3",
      "releaseDate": "2026-06-29",
      "releaseNotes": "### 节点测试\n- 统一测试按钮...",
      "mandatory": false
    }
  ]
}
```

## 接口 2：单软件完整 API（客户端用）

```
GET {BASE}/api/<appid>.json
```

返回指定软件的完整数据，包含 platforms（安装包数组）和 changelog（版本历史）。客户端检测更新只需请求此接口。

**响应示例（`api/node-selector.json` 节选）：**

```json
{
  "id": "node-selector",
  "name": "ChmlFrp 社区工具箱",
  "version": "1.3.3",
  "releaseDate": "2026-06-29",
  "releaseNotes": "### 节点测试\n- 统一测试按钮...",
  "mandatory": false,
  "platforms": {
    "windows": [
      {
        "version": "1.3.3",
        "url": "https://u.zdzz.top/releases/node-selector/windows/ChmlFrp._1.3.3_x64-setup.exe",
        "size": 3709238,
        "sha256": "af37de00867c...",
        "format": "exe",
        "minOS": "Windows 10"
      },
      {
        "version": "1.3.3",
        "url": "https://u.zdzz.top/releases/node-selector/windows/ChmlFrp._1.3.3_x64_zh-CN.msi",
        "size": 5378048,
        "sha256": "1bc099e71c08...",
        "format": "msi",
        "minOS": "Windows 10"
      }
    ],
    "macos": [
      {
        "version": "1.3.3",
        "url": "https://u.zdzz.top/releases/node-selector/macos/ChmlFrp._1.3.3_aarch64.dmg",
        "size": 5647326,
        "sha256": "844465306968...",
        "format": "dmg",
        "minOS": "macOS 11"
      },
      {
        "version": "1.3.3",
        "url": "https://u.zdzz.top/releases/node-selector/macos/ChmlFrp._aarch64.app.tar.gz",
        "size": 4934924,
        "sha256": "8cc770a422e4...",
        "format": "app.tar.gz",
        "minOS": "macOS 11"
      }
    ],
    "linux": [
      {
        "version": "1.3.3",
        "url": "https://u.zdzz.top/releases/node-selector/linux/ChmlFrp._1.3.3_amd64.deb",
        "size": 5466816,
        "sha256": "652f9588bc93...",
        "format": "deb",
        "minOS": ""
      },
      {
        "version": "1.3.3",
        "url": "https://u.zdzz.top/releases/node-selector/linux/ChmlFrp.-1.3.3-1.x86_64.rpm",
        "size": 5468013,
        "sha256": "147ce0a27286...",
        "format": "rpm",
        "minOS": ""
      },
      {
        "version": "1.3.3",
        "url": "https://github.com/zhengddzz/ChmlFrp-NodeSpeedTest/releases/download/v1.3.3/ChmlFrp._1.3.3_amd64.AppImage",
        "size": 81869304,
        "sha256": "",
        "format": "AppImage",
        "minOS": "",
        "note": "体积超 25MB，走 GitHub 直链"
      }
    ]
  },
  "changelog": [
    {
      "version": "1.3.3",
      "releaseDate": "2026-06-29",
      "releaseNotes": "更新内容：1.修复背景图/视频添加不生效...",
      "mandatory": false
    }
  ]
}
```

> `changelog` 从新到旧排列。`url` 为完整下载地址，可直接使用。`sha256` 为空时跳过校验。

## 字段说明

### data.json 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `baseUrl` | string | 站点基础地址 |
| `siteName` | string | 站点名称 |
| `description` | string | 站点描述 |
| `apps` | array | 所有软件的轻量索引（仅列表展示用） |

### data.json apps[] 索引字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 软件 ID（用于拼接 `api/<id>.json`） |
| `name` | string | 软件显示名称 |
| `version` | string | 最新版本号 |
| `releaseDate` | string | 发布日期 `YYYY-MM-DD` |
| `releaseNotes` | string | 更新说明 |
| `mandatory` | bool | 是否强制更新 |

### `<appid>.json` 单软件字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 软件 ID |
| `name` | string | 软件显示名称 |
| `version` | string | 最新版本号（语义化 `major.minor.patch`） |
| `releaseDate` | string | 发布日期 `YYYY-MM-DD` |
| `releaseNotes` | string | 更新说明 |
| `mandatory` | bool | 是否强制更新 |
| `platforms.<os>` | array | 该平台所有安装包变体列表（数组，每个元素含 version/url/size/sha256/format/minOS） |
| `changelog` | array | 版本历史（从新到旧） |

### platforms.<os>[] 数组元素字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | string | 该平台版本号 |
| `url` | string | **完整下载地址**，直接可用（当前指向 GitHub Releases） |
| `size` | number | 安装包字节数 |
| `sha256` | string | SHA-256 校验值（空表示未提供，跳过校验） |
| `format` | string | 格式：`exe`/`dmg`/`AppImage` 等 |
| `minOS` | string | 最低系统版本要求 |

## 客户端集成

### 检测更新流程

1. 客户端请求 `GET {BASE}/api/<appid>.json`（直接获取该软件完整数据）
2. 根据自身平台取 `platforms.<os>` 数组
3. 选择需要的安装包格式（如 `exe` 或 `msi`），取其 `url`/`version`/`sha256`
4. 比较本地版本与服务端 `version`
5. 若服务端更新：下载 `url`，用 `sha256` 校验（非空时），启动安装

### 平台标识映射

| 客户端检测到的系统 | 取 JSON 中的键 |
|---|---|
| Windows | `platforms.windows` |
| macOS | `platforms.macos` |
| Linux | `platforms.linux` |

### 示例代码

**JavaScript / Electron：**

```js
const BASE = 'https://u.zdzz.top';
const APP_ID = 'node-selector';
const APP_CURRENT_VERSION = '1.3.0';

// 直接请求该软件的独立 API
const app = await (await fetch(`${BASE}/api/${APP_ID}.json`)).json();
if (!app || !app.id) throw new Error('软件不存在');

const platform = process.platform === 'win32' ? 'windows'
               : process.platform === 'darwin' ? 'macos' : 'linux';
const list = app.platforms[platform] || [];
if (!list.length) throw new Error('当前平台无可用更新');
const p = list[0]; // 取该平台首个安装包，或按 format 筛选

if (isNewer(p.version, APP_CURRENT_VERSION)) {
  if (app.mandatory) { /* 强制更新 */ }
  const file = await downloadFile(p.url); // url 已是完整地址
  if (p.sha256 && sha256(file) !== p.sha256) {
    throw new Error('校验失败');
  }
  // 启动安装
}

function isNewer(remote, local) {
  const a = remote.split('.').map(Number);
  const b = local.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i]||0) > (b[i]||0)) return true;
    if ((a[i]||0) < (b[i]||0)) return false;
  }
  return false;
}
```

**C# / .NET：**

```csharp
const string BASE = "https://u.zdzz.top";
const string APP_ID = "node-selector";

var http = new HttpClient();
// 直接请求该软件的独立 API
var json = await http.GetStringAsync($"{BASE}/api/{APP_ID}.json");
var app = JsonDocument.Parse(json).RootElement;
var win = app.GetProperty("platforms").GetProperty("windows")[0];
var url = win.GetProperty("url").GetString(); // 完整地址

if (new Version(win.GetProperty("version").GetString()) > new Version(CurrentVersion))
{
    // 下载 url，校验 SHA256（非空时），启动安装
}
```

## 缓存说明

EdgeOne Pages 带 CDN 缓存。发布新版本后可追加时间戳避免缓存：
`api/data.json?t=20260425`
