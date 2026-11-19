# Global Buy

中文 | [English](README.en.md)

多站点购物表格。公开页面展示已发布的商品、分类和代购链接。本机的查询、新增、修改和删除使用 SQLite。部署到 Vercel 后，这些操作改为使用 Supabase 数据库。

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

### 数据放在哪里

| 位置 | 作用 |
| --- | --- |
| `data/admin.sqlite` | 本机后台的商品、网站配置和 HioBuy 密钥。已加入 `.gitignore`。只在本机使用。 |
| Supabase | Vercel 上的商品、网站配置、HioBuy 密钥和发布快照。 |
| `data/catalog.json` | 仓库里的公开站快照。Supabase 里还没有发布快照时，线上页面用它回退。 |
| `public/` | 样式、字体、平台图标和商品图片。部署时要带上。 |

改完商品或网站配置后，公开页不会立刻变化。公开页面只读取仓库里的 `data/catalog.json`，构建成静态页面，打开时不连接 Supabase。本机点 **Update website** 会重新生成这个文件并推到 `main`，Vercel 随之重新构建静态页面。线上后台的新增和修改只写入 Supabase。

本机上，这个按钮会按顺序执行：

1. `git reset --hard HEAD`
2. `git clean -fd`
3. `git checkout main`
4. `git clean -fd`
5. `git pull --no-edit origin main`
6. 用本地 SQLite 重新生成 `data/catalog.json`
7. `git add .`，提交信息为 `System auto push platform code time:` 加上本机时间 `Y-m-d H:i:s`，再 `git push origin main`

第 1 步会丢掉尚未提交的代码。功能改动要先单独提交，再点这个按钮。目录必须是 git 仓库，并且本机能向 `origin` 的 `main` 推送。没有新文件时，生成结束后不会再提交或推送。

### 部署到 Vercel

Vercel 的运行目录是只读的，不能创建或修改 `data/admin.sqlite`。线上检测到 `VERCEL=1` 后，查询、新增、修改和删除都连接 Supabase 的 Postgres。本机运行不会读取这个连接，始终使用 SQLite。

1. 把本仓库推到 GitHub。当前远程是 `origin` 的 `main`。
2. 在 [Vercel](https://vercel.com) 里 Import 这个仓库，框架选 **Next.js**。构建命令保持 `npm run build`，安装命令保持 `npm install`。
3. 在 Vercel 项目里安装 [Supabase](https://vercel.com/marketplace/supabase) 集成，并选中要使用的 Supabase 项目。集成写入的 `POSTGRES_URL`，或带前缀的 `WEIDIAN_POSTGRES_URL`，程序都会读取。也可以改为在环境变量里设置 `SUPABASE_DB_URL`，值用 Supabase 控制台里的数据库连接串（Database → Connection string，选 Transaction pooler）。
4. 重新部署一次，让连接串进入运行环境。确认仓库里包含 `data/catalog.json` 和 `public/`。商品图在 `public` 下。
5. 打开线上的 `/admin/products`。第一次进入会把 `catalog.json` 里的站点和商品写入 Supabase。之后新增、修改、删除和查询都走这张库。
6. 在线上点 **Update website** 时，不再执行 git 提交，只把当前商品写入 Supabase。首页、站点页和商品详情不读这张库，它们是用 `data/catalog.json` 生成的静态页面。要更新这些页面，在本机点 **Update website**，推送后的重新部署会带上新的静态文件。

HioBuy 密钥保存在当前环境使用的数据库里。换到 Supabase 后要在 **HioBuy settings** 里重新保存一次。`HIOBUY_API_KEY` 和 `HIOBUY_API_BASE` 仍可作为环境变量备用。

### Supabase 配置

当前 Vercel 项目 `global-buy` 已在 **Storage** 里连接 Supabase 数据库 `supabase-cordovan-envelope`，环境包括 Preview 和 Production。集成创建变量时使用了前缀 `WEIDIAN_`。这些值留在 Vercel 的环境变量里，不要写进仓库。

打开 **Storage → supabase-cordovan-envelope**，在 **Quickstart** 里可以看到全部变量。程序只使用数据库连接串，按下面的顺序取第一个有值的变量：

| 顺序 | 变量 | 作用 |
| --- | --- | --- |
| 1 | `SUPABASE_DB_URL` | 手动指定的连接串。没有这项时跳过。 |
| 2 | `WEIDIAN_POSTGRES_URL` | 当前集成提供的 Transaction pooler，端口 `6543`。线上默认使用这一项。 |
| 3 | `WEIDIAN_POSTGRES_URL_NON_POOLING` | Session pooler，端口 `5432`。上一项为空时使用。 |
| 4 | `WEIDIAN_POSTGRES_PRISMA_URL` | 带 `pgbouncer=true` 的连接串。前两项都为空时使用。 |
| 5 | `POSTGRES_URL`、`POSTGRES_PRISMA_URL`、`DATABASE_URL`、`POSTGRES_URL_NON_POOLING` | 没有 `WEIDIAN_` 前缀时的同一组变量。 |

`WEIDIAN_POSTGRES_URL` 的格式是：

```text
postgres://postgres.<项目ID>:<数据库密码>@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

连接串里的 `pgbouncer`、`connection_limit` 和其他查询参数会在连接前去掉，只保留 `sslmode=require`。

下面这些变量会出现在 Quickstart 里，本项目的商品保存和查询不会读取它们：

| 变量 | 说明 |
| --- | --- |
| `NEXT_PUBLIC_WEIDIAN_SUPABASE_URL` | Supabase 项目地址，形如 `https://<项目ID>.supabase.co`。 |
| `NEXT_PUBLIC_WEIDIAN_SUPABASE_ANON_KEY` | 匿名公钥。 |
| `NEXT_PUBLIC_WEIDIAN_SUPABASE_PUBLISHABLE_KEY` | 可公开的 publishable key。 |
| `WEIDIAN_SUPABASE_SERVICE_ROLE_KEY` | 服务端密钥，权限很高。 |
| `WEIDIAN_SUPABASE_SECRET_KEY` | 服务端 secret key。 |
| `WEIDIAN_SUPABASE_JWT_SECRET` | JWT 签名密钥。 |
| `WEIDIAN_POSTGRES_HOST` | 数据库主机，形如 `db.<项目ID>.supabase.co`。 |
| `WEIDIAN_POSTGRES_USER` | 数据库用户，通常是 `postgres`。 |
| `WEIDIAN_POSTGRES_PASSWORD` | 数据库密码。 |
| `WEIDIAN_POSTGRES_DATABASE` | 数据库名，通常是 `postgres`。 |

已经通过集成连上数据库时，不需要再新建 `SUPABASE_DB_URL`。确认 **Environment Variables** 里 Production 和 Preview 都有 `WEIDIAN_POSTGRES_URL`，然后重新部署一次。部署完成后再打开线上的 `/admin/products`。

第一次打开后台时，程序会在 Supabase 里创建 `sites`、`menus`、`products`、`meta` 四张表，并把仓库中的 `data/catalog.json` 导入进去。不需要在 Supabase 的 Table Editor 里手工建表。之后后台的查询、新增、修改和删除都写入这四张表。公开页面不读取这些表。

## 二、对接 HioBuy 查询商品

商品资料来自 [HioBuy 公开 API](https://hiobuy.com/zh/api-docs)。机器可读说明在 [openapi.json](https://api.hiobuy.com/openapi.json)。本项目只用商品详情：`POST https://api.hiobuy.com/v1/products/detail`。

### 准备密钥

在 HioBuy 开发者中心注册并验证邮箱。系统会自动创建第一个应用。打开应用，创建 API Key。完整密钥只显示一次，请求头使用：

```http
Authorization: Bearer YOUR_API_KEY
```

当前密钥前缀是 `hio_live_`。商品查询返回 1688、淘宝、微店的真实数据，不需要自己做平台 OAuth。试用从第一个应用开始算 7 天，1688 和微店每天共享 100 个计费 units（按 UTC 日）。商品详情通常消耗 1 unit，搜索消耗 2 units。淘宝接口需要有效付费订阅，试用额度不包含淘宝。套餐、额度和采购服务费以文档页面为准。支持邮箱是 support@hiobuy.com。

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
| `images` 里 `type` 为 `main` 的 `url` | 主图 |
| 其余图片 `url`，逗号拼接 | 附图 |
| `channel`：`weidian` 记为 `WD`，`taobao` 记为 `TB`，1688 保留 `1688` | 来源 |
| `metadata.brand` | 品牌 |
| `source_product_id` | 来源商品 ID |
| `source_url`，没有则用用户粘贴的链接 | 原始链接，也作为主购买链接 |

名称或价格缺失时，这次查询记为失败，不会写入半条商品。查到的结果只填进表单，还要点保存才会写入当前数据库：本机是 SQLite，Vercel 是 Supabase。公开站要再点 **Update website** 才会更新。

## 三、商品详情页的操作

详情页地址是 `/{站点 slug}/products/{商品 slug}`，例如首页商品卡片点进去的页面。页面数据来自已发布的 `catalog.json`，不连接数据库。

### 浏览和跳转

- **面包屑**：`{站点名} Spreadsheet / 分类 / 品牌 / 商品名`。前三段分别回到该站首页、该分类的全部商品、该品牌列表。
- **品牌名**：详情标题上方的品牌链接，进入同一分类下的该品牌。
- **说明标题**：`You can buy this {商品名} go to {站点名}`。
- **分类标签**：该站全部菜单。当前分类高亮。点其他分类进入该分类的 All 列表；点 Home 回到该站首页。
- **主图、Best Selling、价格、商品名**：展示已发布的图片和价格，价格前带 `$`。

### Select Buy On Platform

打开「Please choose a platform」。每一行有平台名和 **Buy Now**，都在新标签打开同一个链接。点遮罩或 **Close** 关闭。

TaooBuy 使用商品里保存的 `tao_buy_link`，并标为 **REC**。其余平台用原始链接或来源商品 ID 拼地址：

| 平台 | 打开的地址 |
| --- | --- |
| TaooBuy | 商品的 `tao_buy_link` |
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

除 TaooBuy、AlChinaBuy、SuperBuy 外，链接按微店商品 ID 拼接。淘宝或 1688 商品如果也走这些按钮，代购站可能认不出 ID，应优先用带完整原始链接的 TaooBuy、KakoBuy、AlChinaBuy 或 SuperBuy。

### Copy original link

把商品的原始链接写入剪贴板，并弹出 `{链接} copied successfully`。浏览器不允许剪贴板 API 时，改用页面内的临时文本框复制。

### Join discord for more discounts

打开说明层，两行文字：把商品照片发给客服帮忙找货；准备下单时联系客服获取折扣。**Join {站点名}** 在新标签打开该站配置里的网址。右上角关闭图片可关掉这层。页头的 Join 按钮打开的是同一个说明层。

### 绕过不可购买提示

详情下方有 Chrome 扩展入口，文案是 How to bypass “Non - purchasable item” warning automatically。**Download chrome extension** 打开 Chrome 网上应用店的 Risk Reminder Remover：

`https://chromewebstore.google.com/detail/risk-reminder-remover/afgegfoedkeffjkkkjkbpnegceleakeo`

### 相关商品

底部 **{品牌} Product More** 链到当前品牌列表。旁边最多 5 个商品：先取同分类、同品牌的其他商品；不够再用同分类的其他品牌；仍不够再用全站其余商品。点卡片进入对应详情。
