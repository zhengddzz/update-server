# update-server · ddzz软件更新服务

提供相关软件自动更新检测 API 与下载服务。基于 EdgeOne Pages 静态托管（域名 `u.zdzz.top`），无需服务器、无需数据库。

> 每个软件单独一个 API 文件（`api/<appid>.json`），客户端只需请求自己软件的接口。`api/data.json` 仅作为全局索引供首页列表使用。安装包直接引用 GitHub Releases 完整链接，不入库。

## 工作原理

```
客户端  --GET /api/data.json-->  EdgeOne Pages(静态文件)  --返回所有软件版本信息-->
客户端  --GET <github releases url>-->  GitHub  --下载安装包-->
客户端  校验 SHA256 → 启动安装
```

## 目录结构

```
update-server/
├── api/
│   ├── data.json          # ★ 全局索引（站点配置 + 软件轻量列表）
│   └── <appid>.json      # ★ 每个软件独立 API（完整数据：版本+平台+changelog）
├── scripts/
│   └── publish.js         # 交互式发布脚本（新建/发布，同步维护索引与单软件文件）
├── docs/
│   └── API.md             # API 接口文档与客户端集成示例
├── index.html             # 软件列表页（首页）
├── app.html               # 软件详情页（?id=<appid>，含版本历史）
├── .nojekyll
├── TODO.md                # 待办事项
└── README.md
```

## 快速开始（本地）

### 1. 本地预览

```bash
python -m http.server 8765
```

- http://127.0.0.1:8765/ — 软件列表页
- http://127.0.0.1:8765/app.html?id=node-selector — 节点推荐器详情页（含版本历史）
- http://127.0.0.1:8765/api/data.json — API 接口

### 2. 发布软件 / 新版本

```bash
node scripts/publish.js
```

脚本会同时维护 `api/data.json`（索引）和 `api/<appid>.json`（单软件完整数据）：

- **[1] 新建软件** — 输入 ID、名称、版本号，为各平台录入安装包（本地文件或完整 URL），自动计算 size 和 SHA-256，生成 `api/<id>.json` 并追加索引
- **[2] 发布新版本** — 选择已有软件，输入新版本号，为需要的平台更换安装包，自动追加 changelog，更新单软件文件与索引

## 部署到 EdgeOne Pages

### 1. 推送到 GitHub

```bash
git add .
git commit -m "release: node-selector v1.2.1"
git push
```

### 2. 在 EdgeOne Pages 接入仓库

1. 登录腾讯云 EdgeOne 控制台 → EdgeOne Pages
2. 新建项目，从 GitHub 导入 `zhengddzz/update-server` 仓库
3. 框架预设选「静态站点」，构建命令留空，输出目录 `.`
4. 绑定域名 `u.zdzz.top`

> 每次 `git push` 自动部署，约 1 分钟生效。

### 3. 客户端配置

客户端直接请求自己软件的独立 API：`https://u.zdzz.top/api/<appid>.json`。完整接入见 [docs/API.md](docs/API.md)。

## 发布新版本的日常流程

```bash
node scripts/publish.js   # 交互式发布（自动修改 data.json）
git add .
git commit -m "release: node-selector v1.3.0"
git push                  # 自动触发 EdgeOne Pages 部署
```

## 关于安装包

安装包**不入库**，`url` 字段直接填写完整下载链接（当前指向 GitHub Releases）。原因：
- 避免 git 仓库膨胀（单个 AppImage 可达 77MB，多版本累计过大）
- GitHub 单文件 100MB 上限限制
- 安装包走 GitHub CDN，下载速度有保障

若后续需托管私有安装包，可在 `url` 字段填写任意对象存储的完整直链。

## 客户端接入

参见 [docs/API.md](docs/API.md)，含 JavaScript/Electron 与 C#/.NET 示例。
