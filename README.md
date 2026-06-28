# update-server · 多软件自动更新服务

一个**无需服务器**的静态更新服务，为多款客户端软件提供版本检测与安装包下载。
基于 EdgeOne Pages 静态托管（域名 `u.zdzz.top`），支持 Windows / macOS / Linux 三平台。

> 所有软件版本信息统一维护在一个文件 `api/data.json` 中，发布新版本只需运行脚本修改这一个文件。

## 工作原理

```
客户端  --GET /api/data.json-->  EdgeOne Pages(静态文件)  --返回所有软件版本信息-->
客户端  --GET /releases/.../xxx.exe-->  EdgeOne Pages  --下载安装包-->
客户端  校验 SHA256 → 启动安装
```

## 目录结构

```
update-server/
├── api/
│   └── data.json          # ★ 唯一数据源（全局配置 + 所有软件版本 + 历史版本）
├── releases/              # 安装包存放目录
│   └── node-selector/     # 按软件 ID 分目录
│       ├── windows/
│       ├── macos/
│       └── linux/
├── scripts/
│   └── publish.js         # 交互式发布脚本（新建软件 / 发布新版本，操作 data.json）
├── docs/
│   └── API.md             # API 接口文档与客户端集成示例
├── index.html             # 软件列表页（首页）
├── app.html               # 软件详情页（?id=<appid>，含版本历史）
├── .nojekyll
├── TODO.md                # 待办事项
└── README.md
```

## 快速开始（本地）

### 1. 修改配置

编辑 [api/data.json](api/data.json)，确认 `baseUrl`：

```json
{ "baseUrl": "https://u.zdzz.top", "siteName": "软件更新服务", ... }
```

### 2. 发布软件 / 新版本

```bash
node scripts/publish.js
```

脚本只读写 `api/data.json` 这一个文件：

- **[1] 新建软件** — 输入 ID、名称、版本号，为各平台指定安装包，自动计算 size 和 SHA-256，下载链接用 baseUrl 拼成完整地址
- **[2] 发布新版本** — 选择已有软件，输入新版本号，为需要的平台更换安装包，自动追加 changelog

### 3. 本地预览

```bash
python -m http.server 3000
```

- `http://localhost:3000/` — 软件列表页
- `http://localhost:3000/app.html?id=node-selector` — 节点推荐器详情页（含版本历史）
- `http://localhost:3000/api/data.json` — API 接口

## 部署到 EdgeOne Pages

### 1. 创建 GitHub 仓库并推送

```bash
cd update-server
git init
git add .
git commit -m "init: 多软件更新服务"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

### 2. 在 EdgeOne Pages 接入仓库

1. 登录腾讯云 EdgeOne 控制台 → EdgeOne Pages
2. 新建项目，从 GitHub 导入仓库
3. 框架预设选「静态站点」，构建命令留空，输出目录 `.`
4. 绑定域名 `u.zdzz.top`

> 每次 `git push` 自动部署，约 1 分钟生效。

### 3. 客户端配置

请求 `https://u.zdzz.top/api/data.json`，从 `apps` 中找到自己软件的 ID。完整接入见 [docs/API.md](docs/API.md)。

## 发布新版本的日常流程

```bash
node scripts/publish.js   # 交互式发布（自动修改 data.json + 复制安装包）
git add .
git commit -m "release: node-selector v1.1.0"
git push                 # 自动触发 EdgeOne Pages 部署
```

## 关于安装包大小

安装包直接放仓库 `releases/` 目录。若单文件较大（接近 Git 100 MB 限制），建议用 Git LFS 或对象存储（在 `url` 字段填完整直链）。

## 客户端接入

参见 [docs/API.md](docs/API.md)，含 JavaScript/Electron 与 C#/.NET 示例。
