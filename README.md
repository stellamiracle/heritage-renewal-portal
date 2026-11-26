# 遗产保护与城市更新 · 专题资料库

面向遗产保护与城市更新领域的法规、政策、案例与行业动态汇编检索站点，配套交互式全球遗产地图与案例现场照片。

- **在线站点**：https://stellamiracle.github.io/heritage-renewal-portal/
- **完整检索版**（全文搜索 + 组合筛选）：https://stellamiracle.github.io/heritage-renewal-portal/app/
- **全球遗产地图**（1270 处 UNESCO 遗产地点 + 案例定位）：https://stellamiracle.github.io/heritage-renewal-portal/map/
- **单文件离线版**：`publish/app/index.html`，双击即可打开，无需服务器与网络；39 张案例现场照片已压缩后以 base64 内嵌，离线也能看图

## 一、数据现状

- 已公开条目 **141 条**：case 67 / policy 41 / regulation 18 / news 15
- 行政层级分布：国家级 63 / 国际级 60 / 地方级 15 / 中央级 3
- 行业动态 **20 条**（`publish/data/events.json`）
- 案例自绘图示：**已全部移除**，站内不再提供任何示意图，只展示来源方发布的现场照片
- 案例现场照片 **39 张**，覆盖 **6 个案例**（见下节）
- 每条标注：发布机关、文号、发布日期、效力状态、行政层级、地区、原文链接

## 二、案例现场照片

- **39 张现场照片**覆盖 **6 个案例**，按 `public/photos/<slug>/NN.jpg` 组织；清单见 `public/photos/manifest.json`（39 张 JPG + 1 份清单，共 **40 个文件**）
- 案例卡片优先显示现场照片封面；条目详情页提供照片图集、逐张图注与「原图链接」
- 来源与署名以清单的**条目级** `source_name` / `source_url` 为准：

| 案例 | 来源 | 原文链接 |
| --- | --- | --- |
| 福州烟台山历史风貌区保护更新与活化利用实践 | 福州市历史文化名城管委会（名城保护专题） | https://www.fuzhou.gov.cn/zgfzzt/lswhmcgwh/zwgk/ztzl/bhqy/202311/t20231129_4726786.htm |
| 苏州姑苏区32号街坊保护更新项目入选《习近平文化思想实践案例选编（2024年）》 | 新华网·新华日报电子版 | https://www.xhby.net/content/s67569662e4b09f022e598ed0.html |
| 上海虹口欧阳路文化街区更新：百年欧阳的街区记忆营造 | 文汇网（百家号官方账号） | https://baijiahao.baidu.com/s?id=1821833824693888132&wfr=spider&for=pc |
| 上海虹口欧阳路街道255、254片区城市更新：“针灸织补”式微更新与“甜蜜街区”人文环线 | 上海城市空间艺术季（微信公众号） | https://mp.weixin.qq.com/s?__biz=MzAwMDU1ODY4MA==&mid=2650415529&idx=1&sn=454afea01d2069232a4c5c |
| 解码文化自信的城市样本丨与古为新尽风华——解码“一城宋韵”开封的文化自信样本 | 新华网（人民网河南频道同文转载） | https://www.news.cn/local/20260406/07652a19b0874253869119f03752f1db/c.html |
| 宜兴丁蜀陶二厂文化街区更新：老厂房里的陶式生活 | 第一财经（百家号官方账号） | https://baijiahao.baidu.com/s?id=1871475611884790295&wfr=spider&for=pc |

- 未取得现场照片的案例不配图，条目页仅保留文字记录，本站不用自绘示意图替代现场照片
- 照片著作权归原拍摄 / 发布方，本站仅作案例现场示意并标注来源链接，二次转载前请确认授权

## 三、来源说明

- 法规：中国政府网公布的行政法规与国务院文件，按文号（如「国令第 xxx 号」）识别
- 政策：国务院各部委与地方政府官方网站公开文本
- 案例：已核验的官方或权威媒体原文（苏州 32 号街坊、开封宋都古城国家文物保护利用示范区、福建屏南传统村落等）
- 照片：各案例来源页所发布的现场图片，逐张图注标明来源方

## 四、目录结构

```
src/            # Node 服务与页面模板（公共站 + /admin 后台）
scripts/        # 静态构建、单文件打包与事件脚本
public/         # 样式、脚本、地图数据与案例照片（39 张 + 清单）
data/           # 地图与事件种子数据（wh_map.json / events_seed.json 等）
publish/        # 发布产物，即 GitHub Pages 站点根目录
```

## 五、站点结构

```
publish/
├── index.html          # 静态首页
├── about/              # 关于本站
├── browse/             # 检索列表页（8 个分页）
├── entry/              # 141 个条目详情页
├── map/                # 全球遗产地图（UNESCO 地点 + 案例定位）
├── data/               # entries.json / events.json / case_points.json / wh_map.json
├── public/             # 样式、脚本、photos/（39 张照片 + 清单）
├── app/index.html      # 单文件完整检索版（内联 CSS + 141 条数据 + 39 张内嵌照片 + 哈希路由）
└── robots.txt
```

## 六、快速开始

**方式 A：单文件离线版（最省事）**

直接打开 `publish/app/index.html`，全部功能与数据（含 39 张照片）都在单个 HTML 文件内。

**方式 B：Node 服务版（可编辑 + 后台）**

```
node src/server.js          # 公共站 + 后台，默认 http://127.0.0.1:8787（PORT 可覆盖）
```

- Node.js 22+ / 24 / 26 均可：`src/db.js` 使用内置 `node:sqlite`，零 npm 依赖
- 后台 `/admin`：登录后维护条目、处理待审队列、上传附件、导出 CSV 并留审计日志
- 运行时数据库为 `data/portal.db`（已由 `.gitignore` 排除）；条目 `photos` 字段为 JSON 数组

## 七、静态构建与发布

```
node scripts/build_static.js         # 静态快照     -> dist/
node scripts/build_singlefile.js     # 单文件检索版 -> dist-single/
node scripts/build_publish.js        # 发布包       -> publish/（自动写 .nojekyll）
node scripts/_patch_static_search.js # 静态检索脚本 -> publish/public/search.js
```

- 单文件版的照片先用 FFmpeg 压缩（宽度上限 1200px、JPEG `-q:v 5`，缓存于 `dist-single/.photo_opt`），再转成 `data:image/jpeg;base64` 内嵌；FFmpeg 不可用时回退原图
- `scripts/seed_events.js` 写入行业动态
- 发布由 GitHub Actions 完成：`.github/workflows/pages.yml` 先上传 `publish` 产物，再以 `.github/scripts/deploy-pages-rest.sh` 走 REST 部署，失败等待 90 秒后回退 `deploy-pages@v4`

## 八、自检

- 构建后核对：`dist/` 与 `publish/` 页数一致、`publish/public/photos/` 文件数 = 39 + 1、`publish/app/index.html` 内嵌 39 个 JPEG Data URI；且 `publish/public/figures/` 不存在、页面无「图示」区段与 `figures/` 引用
- 线上核对：条目详情页含 `photo-grid` 图集与来源说明，browse 分页含 `card-fig-photo` 封面，抽样图片返回 200 且具有 JPEG 文件头
- 已知限制：站点为静态快照，后台写入不直接反映到线上；地图交互依赖 `public/map.js` 与 `data/wh_map.json`

## 九、版权与免责

条目正文来自中国政府网及各官方媒体公开页面，**著作权归原发布单位**；本站仅作检索与索引之用并标注来源链接，不构成法律意见。案例内容涉及其中的第三方表述，二次转载前请确认授权并做必要脱敏。
