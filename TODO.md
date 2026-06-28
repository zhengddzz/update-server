# 待办事项 · 软件更新服务

> 记录用户提出的需求，防止遗忘。最新需求会同步追加到「需求清单」末尾。

## 需求清单（按提出顺序）

1. ~~在本地先实现并给出文档，用户确认后再部署到 GitHub~~ ✅
2. ~~支持 Windows / macOS / Linux 三平台安装包~~ ✅
3. **支持多款软件**（不止一个），第一款叫「节点推荐器」(id: `node-selector`) ✅
4. **API 中使用完整链接**，不要相对链接 ✅
5. **baseUrl 为 `https://u.zdzz.top`**（EdgeOne Pages 部署）✅
6. **部署在 EdgeOne Pages**（非 GitHub Pages），安装包只能放仓库里作为普通文件（GitHub 仓库部署在 EO 上面，不支持发行版 Releases）✅
7. **使用白色主题美化界面**（Fraunces + Spline Sans + JetBrains Mono，teal accent）✅
8. **优化页面逻辑**（单次 fetch、Promise 并行、独立错误处理、CSS 过渡动画）✅
9. **footer 加上备案信息**：粤ICP备2025464402号-1、粤公网安备44060502004003号 ✅
10. **每个软件单独一个页面**（首页列表 `index.html` + 详情页 `app.html?id=`）✅
11. **详情页显示历史版本**（版本历史区域，含当前/强制标记）✅
12. **使用一个文件 `api/data.json` 统一维护所有软件版本信息**，方便发布新版本（配套 `scripts/publish.js` 交互式发布脚本）✅
13. **顶部横条改为加载进度条**（非常驻，加载完淡出 `opacity:0`）✅
14. **品牌文案改为「ddzz软件更新服务」「提供相关软件自动更新检测API与下载服务」**，删除「基于 EdgeOne Pages 静态托管」字样 ✅
15. **导入 ChmlFrp-NodeSpeedTest 全部 6 个版本到 `api/data.json`**（v1.0.0 → v1.2.1，安装包链接指向 GitHub Releases）✅
16. **releaseNotes 中的 markdown 正常渲染**（标题/加粗/链接/列表/表格/分隔线等，详情页用 marked 解析）✅
17. **安装包种类扩展**：每个平台支持多个安装包变体（exe/msi/dmg/app.tar.gz/AppImage/deb/rpm），`platforms.<os>` 改为数组 ✅
18. **版本介绍过长自动折叠**（默认限高 150px + 渐变遮罩 + "展开/收起"按钮，点击切换）✅
19. **每个软件单独一个 API**：`api/<appid>.json` 存完整数据，`api/data.json` 仅作全局索引（首页列表用），客户端只请求自己软件的接口 ✅

## 待办

- [ ] 本地启动服务验证两个页面正常工作（含进度条淡出、详情页历史版本展示）
- [ ] 用户确认后部署到 GitHub

## 维护约定

- 所有软件信息只修改 `api/data.json` 一个文件（不要拆分多文件）
- 新增软件 / 发布新版本统一通过 `node scripts/publish.js` 交互完成
- 文档（`docs/API.md`、`README.md`）随数据结构调整同步更新
