# Global Buy

[English](README.md) | 中文

微店商品表格。公开页面展示微店商品、分类，以及当前代购站的购买链接。一份已发布目录可以展示在多个代购站上。本机后台的查询、新增、修改和删除使用 SQLite。部署到 Vercel 后，这些后台操作使用 Supabase。

## 一、部署

### 本地运行

需要 Node.js 和 npm。在项目目录执行：

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。首页是网站配置里的主站。全部站点在 [http://localhost:3000/spreadsheet](http://localhost:3000/spreadsheet)。商品后台在 [http://localhost:3000/admin/products](http://localhost:3000/admin/products)，首页标题栏的 **Manage WebSite** 也进入这个页面。

生产模式：

```bash
npm run build
npm start
```

### 拉取最新代码

在本机项目目录把远程 `main` 分支拉下来：

```bash
git checkout main
git pull origin main
```

开始本地工作前先执行这两条。本地已有修改时，先提交或暂存，拉取才能完成。远程是 `origin`，分支是 `main`。

### 数据放在哪里

| 位置 | 作用 |
| --- | --- |
| `data/admin.sqlite` | 本机后台的商品、网站配置和 HioBuy 密钥。已加入 `.gitignore`。只在本机使用。 |
| Supabase | Vercel 上的商品、网站配置和 HioBuy 密钥。 |
| `data/catalog.json` | 仓库里的公开站快照。公开页面用这个文件构建。 |
| `public/` | 样式、字体、平台图标和商品图片。商品主图在 `public/products/{商品 slug}/main.png`。部署时要带上。 |

公开页面只读取仓库里的 `data/catalog.json`，构建成静态页面，打开时不连接 Supabase。线上后台的新增和修改写入 Supabase。这些修改要在本机重新生成目录和图片并推到 `main` 之后，才会出现在公开页面上。

### Update website

本机上，这个按钮会按顺序执行：

1. `git reset --hard HEAD`
2. `git clean -fd`
3. `git checkout main`
4. `git clean -fd`
5. `git pull --no-edit origin main`
6. 用本地 SQLite 重新生成 `data/catalog.json`，并把仍是外链的商品主图下载到 `public/products/{商品 slug}/main.png`
7. `git add .`，提交信息为 `System auto push platform code time:` 加上本机时间 `Y-m-d H:i:s`，再 `git push origin main`

第 1 步会丢掉尚未提交的代码。功能改动要先单独提交，再点这个按钮。目录必须是 git 仓库，并且本机能向 `origin` 的 `main` 推送。没有新文件时，生成结束后不会再提交或推送。

部署到 Vercel 后，**Update website** 不能点击。线上目录是只读的，不能创建或修改 `catalog.json`、商品图片和其他项目文件。后台的商品和网站修改保存在 Supabase。首页、站点页和商品详情不读取 Supabase，它们是仓库里已经部署的静态文件。要更新这些页面，先在本机拉取最新代码，再点 **Update website**。推送后的重新部署会带上新的静态文件。

### 部署到 Vercel

1. 把本仓库推到 GitHub。当前远程是 `origin` 的 `main`。
2. 在 [Vercel](https://vercel.com) 里 Import 这个仓库，框架选 **Next.js**。构建命令保持 `npm run build`，安装命令保持 `npm install`。
3. 在 Vercel 项目的 **Storage** 里连接 Supabase。集成会为 Preview 和 Production 写入带 `WEIDIAN_` 前缀的变量。程序已经读取 `WEIDIAN_POSTGRES_URL`。这些值留在 Vercel，不要写进仓库。
4. 重新部署一次，让连接串进入运行环境。确认仓库里包含 `data/catalog.json` 和 `public/`。
5. 打开线上的 `/admin/products`。第一次进入会建表，并把 `catalog.json` 里的站点和商品导入 Supabase。之后新增、修改、删除和查询都走 Supabase。

HioBuy 密钥保存在当前环境使用的数据库里。换到 Supabase 后要在 **HioBuy settings** 里重新保存一次。`HIOBUY_API_KEY` 和 `HIOBUY_API_BASE` 仍可作为环境变量备用。

### Supabase

本地继续使用 SQLite，本机不需要配置 Supabase。

在 Vercel 的 **Storage** 里连接 Supabase 数据库。集成会为 Preview 和 Production 创建 `WEIDIAN_POSTGRES_URL`。代码已经兼容 `WEIDIAN_` 前缀，不需要再单独添加连接串。确认这个变量存在后重新部署一次。

第一次打开后台时，程序会创建 `sites`、`menus`、`products`、`meta` 四张表，并把 `data/catalog.json` 导入进去。不需要手工建表。公开页面不读取这些表。

## 二、对接 HioBuy 查询商品

商品资料来自 [HioBuy 公开 API](https://hiobuy.com/zh/api-docs)。机器可读说明在 [openapi.json](https://api.hiobuy.com/openapi.json)。本项目只用商品详情：`POST https://api.hiobuy.com/v1/products/detail`。

到开发者中心 [https://developers.hiobuy.com/](https://developers.hiobuy.com/) 注册、创建应用并管理 API Key。

### 准备密钥

在[开发者中心](https://developers.hiobuy.com/)注册并验证邮箱。系统会自动创建第一个应用。打开应用，创建 API Key。完整密钥只显示一次，请求头使用：

```http
Authorization: Bearer YOUR_API_KEY
```

当前密钥前缀是 `hio_live_`。商品查询返回 1688、淘宝、微店的真实数据，不需要自己做平台 OAuth。试用从第一个应用开始算 7 天，1688 和微店每天共享 100 个计费 units（按 UTC 日）。商品详情通常消耗 1 unit，搜索消耗 2 units。淘宝接口需要有效付费订阅，试用额度不包含淘宝。套餐、额度和采购服务费以文档页面为准。

### 在本项目里保存配置

打开 `/admin/products`，第一行点 **HioBuy settings**：

- **API Key**：上面创建的密钥。
- **API address**：默认 `https://api.hiobuy.com`，不要带末尾斜杠。

保存后写入当前数据库的 `meta` 表（`hiobuy_api_key`、`hiobuy_api_base`）。本机写入 SQLite，Vercel 写入 Supabase。没填数据库时，才回退到环境变量 `HIOBUY_API_KEY`、`HIOBUY_API_BASE`。

### 本项目发出的请求

新增商品时，在商品表单里粘贴 1688、淘宝、天猫或微店链接。页面会请求本机 `POST /admin/api/products/fetch`，服务端再调用 HioBuy。批量导入里的链接查询走同一套逻辑，最多 5 个并发，单次超时 40 秒。

链接会先识别渠道：

| 链接 | `channel` |
| --- | --- |
| 含 `1688.com` | `1688` |
| 含 `weidian.com` | `weidian` |
| 含 `taobao.com`、`tmall.com` 或 `tb.cn` | `taobao` |

识别不了就拒绝查询。请求体固定为：

```json
{
  "channel": "weidian",
  "url": "https://weidian.com/item.html?itemID=123",
  "language": "en",
  "response_format": "standard"
}
```

`channel` 是接口必填项。`language` 决定翻译文案，这里固定英文。`response_format` 用 `standard`，返回 HioBuy 统一结构；`upstream` 才会返回平台原始 JSON，本项目不用。成功时响应是：

```json
{
  "product": {},
  "request_id": "req_abc123"
}
```

失败时页面显示接口返回的 `message`。常见状态：401 密钥无效，403 无渠道权限或额度不足，404 找不到商品，503 渠道未就绪。

### 字段如何填进商品

| HioBuy `product` | 本站商品字段 |
| --- | --- |
| `title.translated`，没有则用 `title.original` | 商品名称 |
| `price.promotion_amount`，其次 `display_amount`，再其次 `original_amount` | 价格 |
| `images` 里 `type` 为 `main` 的 `url` | 主图。这是图片地址时，会下载并保存为 `public/products/{商品 slug}/main.png` |
| 其余图片 `url`，逗号拼接 | 附图 |
| `channel`：`weidian` 记为 `WD`，`taobao` 记为 `TB`，1688 保留 `1688` | 来源 |
| `metadata.brand` | 品牌 |
| `source_product_id` | 来源商品 ID |
| `source_url`，没有则用用户粘贴的链接 | 原始链接，也作为主购买链接 |

名称或价格缺失时，这次查询记为失败，不会写入半条商品。查到主图地址后，会立刻下载并保存为 `public/products/{商品 slug}/main.png`，表单里的主图改为 `/products/{商品 slug}/main.png`。新增商品、修改商品和导入商品时，主图只要是网址，也会保存到同一位置。查到的其他结果只填进表单，还要点保存才会写入当前数据库：本机是 SQLite，Vercel 是 Supabase。公开站要在本机点 **Update website** 才会更新。Vercel 的目录是只读的，线上新增或导入不能把图片写入 `public/products`，这类操作放在本机完成。

## 三、网站配置

打开 `/admin/products`，点击 **Website settings**。页面地址是 `/admin/products/website`。保存写入当前数据库：本机是 SQLite，Vercel 是 Supabase。公开页面要等本机 **Update website** 重新发布 `data/catalog.json` 后才会使用这些值。

| 输入框 | 填写内容 |
| --- | --- |
| 每页商品数量 | 公开列表每一页展示多少个商品。 |
| 默认语言 | 默认语言代码，例如 `en`。 |
| 语言 | 每个语言代码对应的显示名称。 |
| 网站名称 | 页头和商品页上显示的站点名称。 |
| 网站标识 | 地址里的 slug，例如 `kakobuy`。公开站地址是 `/{slug}`。留空时按网站名称生成。 |
| 网站链接 | **Join** 按钮打开的站点网址。 |
| 网站标题 | 该站的浏览器标题。 |
| 网站商品链接 | **Select Buy On Platform** 使用的商品链接模板。说明见下面。 |

**添加网站** 增加一个站点。**删除网站** 只能删除没有商品、也没有分类的站点。**保存** 写入当前表单。

### 网站商品链接

这个模板是访客在该站点击 **Select Buy On Platform** 时打开的地址。当前商品会替换三个占位符：

| 占位符 | 替换成 |
| --- | --- |
| `{商品ID}` | 来源商品 ID |
| `{原始链接}` | 原始商品地址 |
| `{tao_buy_link}` | 该商品保存的 TaooBuy 链接 |

网站名称能对应到已知代购站时，输入框会带上该站的模板，也可以再改。按下面几种情况填写：

| 网站 | 模板 |
| --- | --- |
| TaooBuy | `{tao_buy_link}` |
| KakoBuy | `https://kakobuy.com/item/details?url={原始链接}` |
| Mulebuy | `https://mulebuy.com/product?id={商品ID}&platform=WEIDIAN&searchInfo={原始链接}` |
| JoyagooBuy | `https://joyagoo.com/product?id={商品ID}&platform=WEIDIAN` |
| oopBuy | `https://oopbuy.com/product/weidian/{商品ID}` |
| Hooby | `https://hoobuy.com/product/2/{商品ID}` |
| CnfansBuy | `https://cnfans.com/product?id={商品ID}&platform=WEIDIAN` |
| CssBuy | `https://www.cssbuy.com/item-micro-{商品ID}.html` |
| AcBuy | `https://acbuy.com/product?id={商品ID}&source=WD` |
| AlChinaBuy | `https://www.allchinabuy.com/en/page/buy/?nTag=Home-search&from=search-input&_search=url&position=&url={原始链接}` |
| SuperBuy | `https://www.superbuy.com/en/page/buy/?nTag=Home-search&from=search-input&url={原始链接}` |

TaooBuy 使用商品自己的 `tao_buy_link`。KakoBuy、AlChinaBuy 和 SuperBuy 把原始商品地址放进链接。Mulebuy 同时带上商品 ID 和原始地址。JoyagooBuy、oopBuy、Hooby、CnfansBuy、CssBuy 和 AcBuy 用来源商品 ID 拼地址。名称对不上这些网站时，输入框一开始是空的，从上面的表里贴入对应模板。

## 四、商品详情页的操作

详情页地址是 `/{站点 slug}/products/{商品 slug}`，例如首页商品卡片点进去的页面。页面数据来自已发布的 `catalog.json`，不连接数据库。

### 浏览和跳转

- **面包屑**：`{站点名} Spreadsheet / 分类 / 品牌 / 商品名`。前三段分别回到该站首页、该分类的全部商品、该品牌列表。
- **品牌名**：详情标题上方的品牌链接，进入同一分类下的该品牌。
- **说明标题**：`You can buy this {商品名} go to {站点名}`。
- **分类标签**：该站全部菜单。当前分类高亮。点其他分类进入该分类的 All 列表；点 Home 回到该站首页。
- **主图、Best Selling、价格、商品名**：展示已发布的图片和价格，价格前带 `$`。

### Select Buy On Platform

按钮在新标签打开当前网站的商品链接。地址来自该站保存的 **网站商品链接**。`{商品ID}`、`{原始链接}` 和 `{tao_buy_link}` 用正在查看的商品填入。按钮不再列出其他代购站。模板和网站输入框的说明在[网站配置](#三网站配置)。模板改完后，在本机点 **Update website**，公开页面才会使用新地址。

### Copy original link

把商品的原始链接写入剪贴板，并弹出 `{链接} copied successfully`。浏览器不允许剪贴板 API 时，改用页面内的临时文本框复制。

### Join discord for more discounts

打开说明层，两行文字：把商品照片发给客服帮忙找货；准备下单时联系客服获取折扣。**Join {站点名}** 在新标签打开该站配置里的网址。右上角关闭图片可关掉这层。页头的 Join 按钮打开的是同一个说明层。

### 绕过不可购买提示

详情下方有 Chrome 扩展入口，文案是 How to bypass “Non - purchasable item” warning automatically。**Download chrome extension** 打开 Chrome 网上应用店的 Risk Reminder Remover：

`https://chromewebstore.google.com/detail/risk-reminder-remover/afgegfoedkeffjkkkjkbpnegceleakeo`

### 相关商品

底部 **{品牌} Product More** 链到当前品牌列表。旁边最多 5 个商品：先取同分类、同品牌的其他商品；不够再用同分类的其他品牌；仍不够再用全站其余商品。点卡片进入对应详情。
