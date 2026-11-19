# Global Buy

English | [中文](README.zh.md)

A Weidian product spreadsheet. Public pages show Weidian products, categories, and the buying link for the current agent site. One published catalog can be shown on several agent sites. Local admin queries, creates, updates, and deletes use SQLite. After deployment to Vercel, those admin operations use Supabase.

## 1. Deployment

### Run locally

Node.js and npm are required. In the project directory:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home page is the primary site from the website configuration. All sites are listed at [http://localhost:3000/spreadsheet](http://localhost:3000/spreadsheet). Product admin is at [http://localhost:3000/admin/products](http://localhost:3000/admin/products). **Manage WebSite** in the home page header opens the same page.

Production mode:

```bash
npm run build
npm start
```

### Pull the latest code

On the local machine, update the project from the remote `main` branch:

```bash
git checkout main
git pull origin main
```

Run this in the project directory before starting local work. Commit or set aside local edits first, so the pull can finish. The remote is `origin`, and the branch is `main`.

### Where data lives

| Location | Purpose |
| --- | --- |
| `data/admin.sqlite` | Local products, website settings, and the HioBuy key. It is listed in `.gitignore` and is used only on this machine. |
| Supabase | Products, website settings, and the HioBuy key on Vercel. |
| `data/catalog.json` | The published snapshot in the repository. Public pages are built from this file. |
| `public/` | Styles, fonts, platform icons, and product images. Main images live in `public/products/{product slug}/main.png`. Include this directory in the deployment. |

Public pages read `data/catalog.json` and are built as static pages. Opening them does not connect to Supabase. Creates and edits in the live admin are stored in Supabase. Those edits appear on the public site after the catalog and image files are regenerated on the local machine and pushed to `main`.

### Update website

On the local machine, **Update website** runs these steps in order:

1. `git reset --hard HEAD`
2. `git clean -fd`
3. `git checkout main`
4. `git clean -fd`
5. `git pull --no-edit origin main`
6. Regenerate `data/catalog.json` from the local SQLite database, and download any product image that is still a remote URL into `public/products/{product slug}/main.png`
7. `git add .`, commit with the message `System auto push platform code time:` plus the local time `Y-m-d H:i:s`, then `git push origin main`

Step 1 discards uncommitted code. Commit feature changes before clicking the button. The directory must be a git repository, and this machine must be able to push `main` to `origin`. If there is nothing new to commit, generation finishes without a commit or a push.

On Vercel, **Update website** cannot be clicked. The deployment filesystem is read-only, so the live site cannot create or change `catalog.json`, product images, or other project files. Admin product and website changes are saved in Supabase. The home page, site pages, and product details do not read Supabase. They are the static files already deployed from the repository. To refresh them, pull the latest code on the local machine and click **Update website** there. The redeploy after that push includes the new static files.

### Deploy on Vercel

1. Push this repository to GitHub. The current remote is `origin` on `main`.
2. Import the repository in [Vercel](https://vercel.com) and choose the **Next.js** framework. Keep the build command as `npm run build` and the install command as `npm install`.
3. Connect Supabase from the Vercel project **Storage** page. The integration writes variables with the `WEIDIAN_` prefix for Preview and Production. The app already reads `WEIDIAN_POSTGRES_URL`. Leave those values in Vercel. Do not copy them into the repository.
4. Redeploy once so the connection string is available at runtime. The repository must include `data/catalog.json` and `public/`.
5. Open the live `/admin/products` page. The first visit creates the tables and imports the sites and products from `catalog.json`. Later creates, updates, deletes, and queries use Supabase.

The HioBuy key is stored in whichever database the current environment uses. After switching to Supabase, save it again in **HioBuy settings**. `HIOBUY_API_KEY` and `HIOBUY_API_BASE` remain available as environment-variable fallbacks.

### Supabase

Local development keeps using SQLite. No Supabase setup is required on the local machine.

On Vercel, connect the Supabase database in **Storage**. The integration creates `WEIDIAN_POSTGRES_URL` for Preview and Production. The code already accepts that `WEIDIAN_` prefix, so there is no separate connection string to add. Confirm the variable exists, then redeploy.

The first admin visit creates `sites`, `menus`, `products`, and `meta`, and imports `data/catalog.json`. Tables do not need to be created by hand. Public pages do not read these tables.

## 2. HioBuy product lookup

Product data comes from the [HioBuy public API](https://hiobuy.com/zh/api-docs). The machine-readable description is [openapi.json](https://api.hiobuy.com/openapi.json). This project uses only product detail: `POST https://api.hiobuy.com/v1/products/detail`.

Open the developer center at [https://developers.hiobuy.com/](https://developers.hiobuy.com/) to register, create an application, and manage the API key.

### Create a key

In the [developer center](https://developers.hiobuy.com/), register and verify the email address. The system creates the first application automatically. Open the application and create an API key. The full key is shown only once. Send it in the request header:

```http
Authorization: Bearer YOUR_API_KEY
```

Current keys use the `hio_live_` prefix. Product lookup returns live 1688, Taobao, and Weidian data. A personal marketplace OAuth flow is not required. The trial lasts 7 days from the first application. 1688 and Weidian share 100 billable units per UTC day. Product detail normally costs 1 unit, and search costs 2 units. The Taobao API requires an active paid subscription. The trial quota does not include Taobao. Plans, quotas, and the purchasing service fee are described on the documentation page.

### Save the settings in this project

Open `/admin/products` and click **HioBuy settings** on the first row:

- **API Key**: the key created above.
- **API address**: `https://api.hiobuy.com` by default, without a trailing slash.

Saving writes the `meta` table in the current database (`hiobuy_api_key` and `hiobuy_api_base`). Locally that database is SQLite. On Vercel it is Supabase. When the database has no key, the app falls back to `HIOBUY_API_KEY` and `HIOBUY_API_BASE`.

### The request this project sends

When adding a product, paste a 1688, Taobao, Tmall, or Weidian link into the product form. The page calls `POST /admin/api/products/fetch`, and the server calls HioBuy. Link import uses the same lookup, with at most 5 requests at a time and a 40-second timeout for each request.

The link is matched to a channel first:

| Link | `channel` |
| --- | --- |
| Contains `1688.com` | `1688` |
| Contains `weidian.com` | `weidian` |
| Contains `taobao.com`, `tmall.com`, or `tb.cn` | `taobao` |

A link that matches none of these is rejected. The request body is fixed as:

```json
{
  "channel": "weidian",
  "url": "https://weidian.com/item.html?itemID=123",
  "language": "en",
  "response_format": "standard"
}
```

`channel` is required by the API. `language` chooses the translated text and is fixed to English here. `response_format` is `standard`, which returns HioBuy's unified shape. `upstream` would return the marketplace's raw JSON, and this project does not use it. A successful response is:

```json
{
  "product": {},
  "request_id": "req_abc123"
}
```

On failure, the page shows the `message` returned by the API. Common statuses: 401 for an invalid key, 403 for a missing channel permission or an exhausted quota, 404 when the product cannot be found, and 503 when the channel is not ready.

### How fields fill a product

| HioBuy `product` | Field in this site |
| --- | --- |
| `title.translated`, or `title.original` when the translation is missing | Product name |
| `price.promotion_amount`, then `display_amount`, then `original_amount` | Price |
| `url` of the image whose `type` is `main` | Main image. A remote URL is downloaded and saved as `public/products/{product slug}/main.png` |
| The other image `url` values, joined with commas | Extra images |
| `channel`: `weidian` is stored as `WD`, `taobao` as `TB`, and 1688 stays `1688` | Source |
| `metadata.brand` | Brand |
| `source_product_id` | Source product ID |
| `source_url`, or the link the user pasted | Original link, also used as the main buy link |

If the name or the price is missing, that lookup fails and no partial product is stored. When the main image is a remote URL, it is downloaded immediately and saved as `public/products/{product slug}/main.png`. The form then stores `/products/{product slug}/main.png`. Creating, editing, and importing a product do the same whenever the main image is a URL. The other looked-up fields only fill the form and are written after Save: SQLite locally, Supabase on Vercel. The public site updates after **Update website** on the local machine. The Vercel filesystem is read-only, so creating or importing a product there cannot write `public/products`. Do that on the local machine.

## 3. Website settings

Open `/admin/products` and click **Website settings**. The page is `/admin/products/website`. Saving writes the current database: SQLite locally, Supabase on Vercel. Public pages use these values after a local **Update website** publishes `data/catalog.json`.

| Field | What to enter |
| --- | --- |
| 每页商品数量 | How many products a public listing shows on one page. |
| 默认语言 | The default language code, such as `en`. |
| 语言 | The label shown for each language code. |
| 网站名称 | The site name shown in the header and on the product page. |
| 网站标识 | The URL slug, such as `kakobuy`. The public site is `/{slug}`. Leave it empty to generate the slug from the site name. |
| 网站链接 | The site URL opened by **Join**. |
| 网站标题 | The browser title for that site. |
| 网站商品链接 | The product-link template used by **Select Buy On Platform**. See below. |

**添加网站** adds another site. **删除网站** removes a site that has no products and no categories. **保存** writes the form.

### 网站商品链接

This template is the address opened when a visitor clicks **Select Buy On Platform** on that site. Three tokens are replaced for the current product:

| Token | Replaced with |
| --- | --- |
| `{商品ID}` | The source product ID |
| `{原始链接}` | The original product URL |
| `{tao_buy_link}` | The TaooBuy link saved on that product |

A site whose name matches a known agent starts with that agent's template. The field can be edited. Use one of these templates:

| Site | Template |
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

TaooBuy uses the product's own `tao_buy_link`. KakoBuy, AlChinaBuy, and SuperBuy place the original product URL in the address. Mulebuy sends both the product ID and the original URL. JoyagooBuy, oopBuy, Hooby, CnfansBuy, CssBuy, and AcBuy build the address from the Weidian product ID. A site name that matches none of these starts with an empty field. Paste the matching template from the table.

## 4. Product detail actions

The detail URL is `/{site slug}/products/{product slug}`, the page opened from a product card. The page reads the published `catalog.json` and does not connect to a database.

### Browsing

- **Breadcrumb**: `{site name} Spreadsheet / category / brand / product name`. The first three parts return to the site home, all products in that category, and that brand list.
- **Brand name**: the brand link above the detail title opens the same brand inside the same category.
- **Heading**: `You can buy this {product name} go to {site name}`.
- **Category tabs**: every menu on the site. The current category is highlighted. Another category opens its All list. Home returns to the site home page.
- **Main image, Best Selling, price, and product name**: the published image and price. The price is prefixed with `$`.

### Select Buy On Platform

The button opens the current website's product link in a new tab. It uses the **网站商品链接** template saved for that site. `{商品ID}`, `{原始链接}`, and `{tao_buy_link}` are filled from the product being viewed. The button does not open a list of other agent sites. The templates and the website fields are described in [Website settings](#3-website-settings). After the template is changed, click **Update website** on the local machine so the public page uses the new address.

### Copy original link

Copies the product's original link and shows `{link} copied successfully`. If the browser blocks the clipboard API, the page copies the link with a temporary text field.

### Join discord for more discounts

Opens a panel with two lines: send product photos to customer service so they can help find the item, and contact customer service on Discord before ordering to get a discount. **Join {site name}** opens the site URL from the website configuration in a new tab. The close image at the top right dismisses the panel. The Join button in the page header opens the same panel.

### Bypass the not-purchasable warning

Under the detail, a Chrome extension block says How to bypass “Non - purchasable item” warning automatically. **Download chrome extension** opens Risk Reminder Remover in the Chrome Web Store:

`https://chromewebstore.google.com/detail/risk-reminder-remover/afgegfoedkeffjkkkjkbpnegceleakeo`

### Related products

**{brand} Product More** at the bottom links to the current brand list. Up to five products are shown beside it: other products in the same category and brand first, then other brands in the same category, then products from the rest of the site. A card opens that product's detail page.
