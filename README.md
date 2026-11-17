# 遗产保护与城市更新 · 专题资料库

面向遗产保护与城市更新领域的法规、政策、案例、动态汇编检索站点。

- **在线站点（尚未上线，GitHub 仓库与 Pages 待发布）**：<https://stellamiracle.github.io/heritage-renewal-portal/>
- **完整检索版**（含全文搜索与组合筛选）：<https://stellamiracle.github.io/heritage-renewal-portal/app/>
- 单文件离线版：`publish/app/index.html`，双击即可打开，无需服务器与网络

## 数据现状

- 已公开条目 **60 条**：法规 18 / 政策 38 / 案例 3 / 动态 1
- 行政层级：国家级 52 / 地方级 8；覆盖 22 个地区、57 个主题
- 每条标注：发布机关、文号、发布日期、效力状态、行政层级、地区、原文链接

## 来源说明

- 法规：中国政府网公布的行政法规与国务院文件，按文号（如「国令第 xxx 号」）识别
- 政策：国务院各部委与地方政府官方网站公开文本
- 案例：已核验的官方或权威媒体原文（苏州 32 号街坊、开封宋都古城国家文物保护利用示范区、福建屏南传统村落）
- 北京、重庆、武汉 3 条地方研究条目暂无官方公开 URL，已在后台标注来源局限，正式引用前请回查官方原文

## 站点结构

```
publish/
├── index.html      # 静态首页（SEO 友好，每条目独立 HTML）
├── about/          # 关于本站
├── browse/         # 检索列表页（分页）
├── entry/          # 60 个条目详情页
├── data/           # entries.json（结构化数据）
├── public/         # 样式与脚本
├── app/index.html  # 单文件完整检索版（内联 CSS + 60 条数据 + 哈希路由）
└── robots.txt
```

## 本地重建

```
node scripts/build_static.js      # 静态快照 -> dist/
node scripts/build_singlefile.js  # 单文件检索版 -> dist-single/
node scripts/build_publish.js     # 发布包 -> publish/
node scripts/_e2e2.js             # 60 项端到端自检
```

## 版权与免责

条目正文来自中国政府网及各官方媒体公开页面，**著作权归原发布单位**；
本站仅作检索与索引之用并标注来源链接，不构成法律意见。
案例内容涉及其中的第三方表述，二次转载前请确认授权并做必要脱敏。