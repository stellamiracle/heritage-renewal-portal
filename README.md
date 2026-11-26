# 遗产保护与城市更新 · 专题网站

一个面向遗产保护与城市更新领域的**法规 / 政策 / 案例 / 动态**四类内容专题站，
自带后台管理系统，可登录维护条目、上传附件、审核入库、批量导入导出。

## 一、数据现状（首版）

| 类型 | 条数 |
| --- | --- |
| 法规 regulation | 18 |
| 政策 policy | 38 |
| 案例 case | 3 |
| 动态 news | 1 |
| **合计** | **60** |

- 时间跨度：2021-07-30 ~ 2026-11-09；无未来日期记录
- 层级：国家级 52 条、地方级 8 条
- 覆盖地区：全国、北京、重庆、武汉、苏州、开封、屏南、潍坊、眉山、芷江、
  东莞、西安、佛山、拉萨、无锡、常州、兴化等 20+ 省市/区域
- 主题标签 57 个；57 条带官方原文链接，3 条为工作区研究稿（已标注）
- 正文：全部条目正文均超过 120 字，多数为官方全文抓取后清洗

## 二、目录结构

`
heritage-renewal-portal_1116_1524/
├── src/
│   ├── server.js        # 主服务：公共站点 + /admin 后台（零 npm 依赖）
│   ├── db.js            # node:sqlite 数据层：条目/收件箱/会话/审计
│   ├── views.js         # 公共页与后台页模板
│   ├── md.js            # 轻量 Markdown 渲染
│   ├── parts/           # 上述文件的分片源（改分片后用 scripts/_mk.js 重拼）
│   └── single/          # 单文件离线版前端（app_00~02.js，输出前由构建器展开占位符）
├── public/
│   ├── style.css        # 档案馆式克制配色 + 响应式（760px 断点）
│   └── app.js           # 前端交互：搜索跳转、自动提交、删除确认、附件上传
├── data/
│   ├── portal.db        # SQLite 数据库（运行时数据）
│   ├── uploads/         # 后台上传附件
│   ├── selected.json    # 人工筛定的 52 条政策法规候选
│   ├── guoling_full.json# 137 条行政法规候选池
│   ├── bodies.json      # 56 篇官方正文抓取结果
│   ├── seed.json        # 建库用种子集（60 条，已补齐 source_url）
│   └── seed_cases.json / seed_extra.json  # 案例与地方资料补充
├── scripts/             # 抓取、整理、建库、自检、静态构建脚本
├── dist/                # 静态快照产物（node scripts/build_static.js 生成）
├── dist-single/         # 单文件离线版产物（node scripts/build_singlefile.js 生成）
└── README.md
`

## 三、快速开始

### 方式 A：单文件离线版（零端口，推荐先用这个）

本机实测结论：**新建的任何本机端口都会被 TCP 层丢弃**——
80 / 8080 / 8000 / 3000 / 5000 / 9000 / 8787 / 8788 等 14 个端口的
回环与局域网地址全部 `ETIMEDOUT`（同进程连自己的 listener 也超时），
只有 OpenClaw 网关自身的 18789 可连。因此「让浏览器打开
`http://127.0.0.1:xxxx`」这条路在当前机器上走不通。

已改为**零端口交付**：样式、60 条数据、渲染脚本全部内嵌进一个 HTML 文件，
双击即可在任意浏览器打开，不依赖任何服务、端口或网络。

```
heritage-portal-single_11-16_1837.html   # 双击直接打开
```

- 位置：项目根目录 `dist-single/`，同时复制一份到 workspace 根目录
- 内容：60 条公开条目全文 + 类别/层级/地区/主题/效力状态/时间组合筛选 + 前端全文检索
- 路由：哈希路由 `#/`、`#/browse?...`、`#/entry/<slug>`、`#/about`，可直接分享锚点
- 重新生成：`node scripts/build_singlefile.js`（输出文件名带时间戳）
- 自检：`node scripts/_verify_single.js`（解析数据 + DOM 仿真渲染）
- 限制：**只读**，不含后台管理；后台需要 HTTP 服务（见方式 B）

### 方式 B：Node 服务版（公共站 + 后台一体）

环境要求：Node.js **22+ / 24 / 26 均可**（需内置 `node:sqlite`），无需 npm install。

`
cd heritage-renewal-portal_1116_1524
node src/server.js
`

- 默认地址：http://127.0.0.1:8787
- 环境变量：`PORT`（端口）、`HOST`（监听地址）、`PORTAL_ADMIN_PASSWORD`（初始后台密码）
- 首次启动若未设置 `PORTAL_ADMIN_PASSWORD`，会**随机生成并打印一次**初始密码：
  `[portal] 初始后台密码（仅显示一次）: xxxxxxxx`
  该密码用 scrypt 加盐哈希存入 `settings` 表，只在终端显示一次，请自行保存。

## 四、公共站点路由

| 路由 | 说明 |
| --- | --- |
| `/` | 首页：分类概览、最新收录、筛选面板 |
| `/browse` | 资料检索：关键词 + 类型 + 层级 + 地区 + 时间 + 效力状态 |
| `/browse?q=…&type=case&region=苏州&from=2024-01-01&to=2026-12-31` | 组合筛选 |
| `/entry/<slug>` | 条目详情（正文、来源、附件、相关条目） |
| `/about` | 关于本站：数据来源、收录原则、免责声明 |
| `/health` | 健康检查（含条目统计 JSON） |
| `/public/*`、`/uploads/*` | 静态资源与附件 |

## 五、后台管理系统（`/admin`）

登录：`http://127.0.0.1:8787/admin` → 输入密码。
会话为 24 小时 `sid` Cookie（HttpOnly + SameSite=Lax），登出立即失效。

后台功能：

1. **仪表盘** `/admin` —— 条目总量、分类统计、最新待审、最近审计日志
2. **条目管理** `/admin/entries` —— 列表可见**草稿**（`visibility=all`），
   支持按类型/关键词筛选、分页；新建 `/admin/entries/new`；
   编辑 `/admin/entries/<slug>/edit`；删除为 **POST 表单**（GET 不触发）
3. **发布状态** —— 表单字段 `visibility`：`public` 公开 / `draft` 草稿；
   草稿在公共站点检索与详情页均不可见，后台列表与 CSV 导出可见
4. **附件上传** `/admin/upload?name=文件名&slug=条目slug` ——
   写入 `data/uploads/` 并挂到条目附件列表，可经 `/uploads/<文件>` 访问
5. **待审队列** `/admin/inbox` —— 导入记录先进收件箱，
   逐条「公开」或「驳回」，公开时写入 entries 并保留审核轨迹
6. **JSON 导入** `/admin/inbox/import` —— POST 数组或 `{records:[…]}`
7. **CSV 导出** `/admin/export.csv` —— 含全部条目（含草稿），UTF-8 BOM，Excel 直开
8. **审计日志** `/admin/audit` —— 登录、增删改、导入、审核、附件全量留痕

## 六、如何新增条目

### 方式 A：后台手工新增（推荐）

1. 登录 `/admin` → 条目管理 → 新建条目
2. 填写字段（带 * 为建议必填）：

| 字段 | 说明 |
| --- | --- |
| 标题 title | 必填，留空会提示「标题不能为空」 |
| URL 别名 slug | 留空自动生成（类型-日期-短哈希） |
| 类型 type | regulation 法规 / policy 政策 / case 案例 / news 动态 |
| 文号 doc_no | 如 国办发〔2023〕25号 |
| 发布机关 issuer / 行政层级 level / 地区 region | 支撑分面筛选 |
| 发布日期 publish_date / 施行日期 effective_date | YYYY-MM-DD |
| 效力状态 status | 如 现行有效 / 已废止 |
| 资料来源 source_name / 原文链接 source_url | 官方出处，建议必填 |
| 主题标签 themes | 多个用英文逗号分隔 |
| 摘要 summary / 正文 body | 支持 Markdown |
| 发布状态 visibility | public 公开 / draft 草稿 |
| 责任作者 author | 记录录入人 |
| 设为推荐条目 featured | 首页与检索优先展示 |

3. 保存后自动跳到编辑页，可继续上传附件、改发布状态。

### 方式 B：后台 JSON 批量导入（带审核）

POST `/admin/inbox/import`，请求体为 JSON 数组：

`
[
  {
    "title": "示例文件标题",
    "doc_no": "示例〔2026〕1号",
    "issuer": "示例发布机关",
    "publish_date": "2026-01-01",
    "summary": "一句话摘要",
    "url": "https://www.gov.cn/..."
  }
]
`

导入后记录进入**待审队列**，逐条审核通过后才进入公开站点。

### 方式 C：脚本化建库（批量补充）

`
node scripts/build_seed.js   # 汇总 selected/bodies/cases/extra → data/seed.json
node scripts/seed.js          # 按待审→通过流程写入 data/portal.db（可重复执行）
node scripts/backfill_urls.js # 按标题回填 source_url / source_name
`

## 七、数据层与持续扩充

抓取 → 整理 → 建库 三段式，全部脚本化，可反复跑：

`
node scripts/fetch_official.py    # 国务院/部门政策库 → data/gov_records.json（231 条）
node scripts/fetch_guoling2.py    # 行政法规候选 → data/guoling_full.json（137 条）
python scripts/curate.py          # 人工筛定清单 → data/selected.json（52 条）
node scripts/fetch_bodies.py      # 抓正文 → data/bodies.json（56 篇）
node scripts/build_seed.js        # 合成种子集 → data/seed.json（60 条）
node scripts/seed.js              # 写库（走 inbox→approved 审核流）
`

数据库表（`data/portal.db`，SQLite）：

- `entries` —— 条目主表（slug、type、title、doc_no、issuer、level、region、
  publish_date、effective_date、status、themes、tags、summary、body、
  source_name、source_url、attachments、featured、visibility、author、时间戳）
- `inbox` —— 导入收件箱（指纹去重、状态 pending/approved/rejected、原始 JSON）
- `settings` —— 键值配置（含后台密码哈希）
- `sessions` —— 后台登录会话
- `audit` —— 操作审计日志

扩充建议：抓取器加关键词 → 人工过一遍标题（宽泛关键词会带回无关记录）→
剔除未来日期与重复项 → 补正文 → 走审核流入库。

## 八、法规与案例来源说明

**法规来源**：

- 中国政府网政策库检索接口（国务院文件 / 部门文件 / 法律法规库）：
  `https://sousuo.www.gov.cn/search-gov/data?t=zhengcelibrary_gw&q=城市更新`
  返回标题、文号、发布日期、发文机关与官方链接，可稳定复现
- 行政法规按「国令第xxx号」标识，经 `scripts/fetch_guoling*.py` 抓取，
  归入 `type=regulation`
- **国家法律法规数据库 `search/list` 接口已停止探测**：五种 body 变体均返回
  HTTP 500，无法作为稳定数据源；法规类统一改用中国政府网兜底

**案例来源**（均已核验 HTTP 200 且标题吻合）：

| 案例 | 来源 |
| --- | --- |
| 苏州古城 32 号街坊 | 新华日报 `https://www.xhby.net/content/s67569662e4b09f022e598ed0.html` |
| 开封宋都古城国家文物保护利用示范区 | 开封市人民政府（示范区建设方案，汴政〔2024〕14号）/ 新华网实践报道 |
| 福建屏南传统村落 | 福建日报 `https://share.fjdaily.com/displayTemplate/news/newsDetail/1161/2976236.html` / 屏南县政府动态 |

**无官方链接的 3 条**（北京 `DB11/T 2296-2024`、重庆 `DBJ50/T-518-2025`、
武汉「五改四好」行动方案）来自工作区既有研究材料，条目内已注明，
公开引用前请回查官方发布版本与文号；其中武汉条目发布日期暂缺，
检索排序中置于末尾。

## 九、静态构建

`
node scripts/build_static.js
`

输出 `dist/`：`index.html`、`about/index.html`、`browse/index.html` 与
`browse/page-N.html`、每个条目 `entry/<slug>.html`、`data/entries.json`、
静态资源与 `robots.txt`（共 69 个文件）。

构建时会把站内链接改写为静态路径（`/entry/x → /entry/x.html`、
`/browse?page=2 → /browse/page-2.html`），部署在**域名根目录**即可直接打开；
关键词检索与组合筛选属于服务端能力，静态快照不提供，请回到 Node 服务使用。

## 十、自检

`
node scripts/_e2e2.js
`

共 60 项断言，覆盖：公共页与筛选、登录与 Cookie、条目新建/编辑/删除、
草稿可见性（后台可见、公共端不可见、详情 404）、附件上传与回读、
JSON 导入、待审队列、CSV 导出、审计日志、登出失效、目录穿越防护。

说明：本机执行环境**过滤新建的回环端口**（能连到既有 18789，连不上新监听端口），
故自检改为进程内直接调用 `handle(req, res)`，覆盖全部路由与业务逻辑，
不依赖 TCP 层；在普通终端运行 `node src/server.js` 即为真实 HTTP 服务。
真实 HTTP 冒烟（可选）：`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/_smoke.ps1`，
会启动服务并逐个探测首页、检索、详情、静态资源与后台跳转。
若本机执行环境拦截新建回环端口，可用对照实验确认：`scripts/_control.ps1` + `scripts/_probe_ports.js`，
实测**既有 18789 端口 3ms 连通、新绑定端口 312ms 超时**——即入站被环境拦截，
服务端本身 bind 成功（日志打印 listening），换普通终端即可正常访问。
端口级全量对照见 `scripts/_port_scan.js`：14 个候选端口回环与局域网**全部** `ETIMEDOUT`，
仅 18789 可连，说明这是主机侧过滤而非应用问题。
单文件离线版的渲染核验：`node scripts/_verify_single.js`（DOM 仿真）+ Edge headless 渲染。

## 十一、已知限制

- 60 条为首版基线，仍需持续抓取扩充；宽泛关键词会带来无关记录，入库前须人工核验
- 正文为官方全文抓取后清洗的**纯文本/Markdown**，长文未做分节编号与图表内嵌
- 静态快照不含后台，也不含搜索能力
- 单文件离线版只读，不含后台；且**当前机器上除 18789 外的新端口均不可连**，
  需以后台功能时请改用方式 B 在普通桌面终端启动并直接访问该端口
- 案例正文涉及其中的第三方表述，公开转载前请确认授权并做必要脱敏

## 十二、版权与使用提示

条目正文来自中国政府网及各官方媒体公开页面，**著作权归原发布单位**，
本站仅作检索与索引之用，并标注来源与链接；案例图片与二次引用请自行确认授权。

## 附：scripts 目录说明

- 正式脚本：`build_seed.js`、`seed.js`、`backfill_urls.js`、`build_static.js`、
  `fetch_official.py`、`fetch_guoling.py`、`fetch_guoling2.py`、`fetch_bodies.py`、
  `curate.py`
- 一次性排查脚本：`_*.py` / `_*.js`（链接探测、URL 核验、补丁与拼装辅助），
  保留以便复现排查过程，日常运行不依赖