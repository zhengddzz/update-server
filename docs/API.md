# 自动更新 API 文档

本服务为多款客户端软件提供「版本检测」与「安装包下载」能力，基于 EdgeOne Pages 静态托管，**无需服务器**。所有数据统一维护在一个文件 `api/data.json` 中。

## 基础地址

```
https://u.zdzz.top
```

## 唯一数据接口

```
GET {BASE}/api/data.json
```

返回完整数据，包含全局配置和所有软件的最新版本信息及历史版本。

**响应示例：**

```json
{
  "baseUrl": "https://u.zdzz.top",
  "siteName": "软件更新服务",
  "description": "...",
  "apps": [
    {
      "id": "node-selector",
      "name": "节点推荐器",
      "version": "1.0.0",
      "releaseDate": "2026-06-28",
      "releaseNotes": "首个发布版本。",
      "mandatory": false,
      "platforms": {
        "windows": {
          "version": "1.0.0",
          "url": "https://u.zdzz.top/releases/node-selector/windows/NodeSelector-Setup-1.0.0.exe",
          "size": 12345678,
          "sha256": "e3b0c44f...",
          "format": "exe",
          "minOS": "Windows 10"
        },
        "macos": {
          "version": "1.0.0",
          "url": "https://u.zdzz.top/releases/node-selector/macos/NodeSelector-1.0.0.dmg",
          "size": 9876543,
          "sha256": "...",
          "format": "dmg",
          "minOS": "macOS 11"
        },
        "linux": {
          "version": "1.0.0",
          "url": "https://u.zdzz.top/releases/node-selector/linux/NodeSelector-1.0.0.AppImage",
          "size": 8765432,
          "sha256": "...",
          "format": "AppImage",
          "minOS": ""
        }
      },
      "changelog": [
        {
          "version": "1.0.0",
          "releaseDate": "2026-06-28",
          "releaseNotes": "首个发布版本。",
          "mandatory": false
        }
      ]
    }
  ]
}
```

## 字段说明

### 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `baseUrl` | string | 站点基础地址 |
| `siteName` | string | 站点名称 |
| `description` | string | 站点描述 |
| `apps` | array | 所有软件列表 |

### apps[] 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 软件 ID（URL 路径用） |
| `name` | string | 软件显示名称 |
| `version` | string | 最新版本号（语义化 `major.minor.patch`） |
| `releaseDate` | string | 发布日期 `YYYY-MM-DD` |
| `releaseNotes` | string | 更新说明 |
| `mandatory` | bool | 是否强制更新 |
| `platforms.<os>` | object | 各平台安装包信息 |
| `changelog` | array | 版本历史（从新到旧） |

### platforms.<os> 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | string | 该平台版本号 |
| `url` | string | **完整下载地址**，直接可用 |
| `size` | number | 安装包字节数 |
| `sha256` | string | SHA-256 校验值 |
| `format` | string | 格式：`exe`/`dmg`/`AppImage` 等 |
| `minOS` | string | 最低系统版本要求 |

## 客户端集成

### 检测更新流程

1. 客户端请求 `GET {BASE}/api/data.json`
2. 从 `apps` 数组中找到 `id` 等于自己软件 ID 的对象
3. 根据自身平台取 `platforms.<os>` 字段
4. 比较本地版本与服务端 `version`
5. 若服务端更新：下载 `url`，用 `sha256` 校验，启动安装

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
const APP_CURRENT_VERSION = '1.0.0';

const data = await (await fetch(`${BASE}/api/data.json`)).json();
const app = data.apps.find(a => a.id === APP_ID);
if (!app) throw new Error('软件不存在');

const platform = process.platform === 'win32' ? 'windows'
               : process.platform === 'darwin' ? 'macos' : 'linux';
const p = app.platforms[platform];
if (!p) throw new Error('当前平台无可用更新');

if (isNewer(p.version, APP_CURRENT_VERSION)) {
  if (app.mandatory) { /* 强制更新 */ }
  const file = await downloadFile(p.url); // url 已是完整地址
  if (sha256(file) === p.sha256) {
    // 启动安装
  }
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
var json = await http.GetStringAsync($"{BASE}/api/data.json");
var data = JsonDocument.Parse(json).RootElement;
var app = data.GetProperty("apps").EnumerateArray()
    .First(a => a.GetProperty("id").GetString() == APP_ID);
var win = app.GetProperty("platforms").GetProperty("windows");
var url = win.GetProperty("url").GetString(); // 完整地址

if (new Version(win.GetProperty("version").GetString()) > new Version(CurrentVersion))
{
    // 下载 url，校验 SHA256，启动安装
}
```

## 缓存说明

EdgeOne Pages 带 CDN 缓存。发布新版本后可追加时间戳避免缓存：
`api/data.json?t=20260628`
