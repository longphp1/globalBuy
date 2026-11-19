# Global Buy

[中文](README.md) | English

A multi-site shopping spreadsheet. Public pages show the published products, categories, and agent links. On a local machine, queries, creates, updates, and deletes use SQLite. After the app is deployed to Vercel, those operations use Supabase.

## 1. Deployment

### Run locally

Node.js and npm are required. In the project directory:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home page is the primary site from the website configuration. All sites are listed at [http://localhost:3000/spreadsheet](http://localhost:3000/spreadsheet). Product admin is at [http://localhost:3000/admin/products](http://localhost:3000/admin/products). The **Manage WebSite** button in the home page header opens the same page.

Production mode:

```bash
npm run build
npm start
```

### Where data lives

| Location | Purpose |
| --- | --- |
| `data/admin.sqlite` | Local products, website settings, and the HioBuy key. It is listed in `.gitignore` and is used only on the local machine. |
| Supabase | Products, website settings, the HioBuy key, and the published snapshot on Vercel. |
| `data/catalog.json` | The published snapshot stored in the repository. Live pages fall back to this file when Supabase does not yet have a snapshot. |
| `public/` | Styles, fonts, platform icons, and product images. Include this directory in the deployment. |

The public pages do not change immediately after a product or website setting is edited. Those pages read only `data/catalog.json` and are built as static pages, so opening them does not connect to Supabase. Locally, **Update website** regenerates that file and pushes `main`, and Vercel rebuilds the static pages. Creates and edits in the live admin are stored only in Supabase.

On the local machine, the button runs these steps in order:

1. `git reset --hard HEAD`
2. `git clean -fd`
3. `git checkout main`
4. `git clean -fd`
5. `git pull --no-edit origin main`
6. Regenerate `data/catalog.json` from the local SQLite database
7. `git add .`, commit with the message `System auto push platform code time:` plus the local time `Y-m-d H:i:s`, then `git push origin main`

Step 1 discards uncommitted code. Commit feature changes before clicking the button. The directory must be a git repository, and this machine must be able to push `main` to `origin`. If there is nothing new to commit, generation finishes without a commit or a push.

### Deploy on Vercel

The Vercel runtime filesystem is read-only, so it cannot create or modify `data/admin.sqlite`. When `VERCEL=1`, queries, creates, updates, and deletes connect to Supabase Postgres. A local run never reads that connection and always uses SQLite.

1. Push this repository to GitHub. The current remote is `origin` on `main`.
2. Import the repository in [Vercel](https://vercel.com) and choose the **Next.js** framework. Keep the build command as `npm run build` and the install command as `npm install`.
3. Install the [Supabase](https://vercel.com/marketplace/supabase) integration on the Vercel project and select the Supabase project. The app reads either `POSTGRES_URL` or the prefixed `WEIDIAN_POSTGRES_URL`. You can instead set `SUPABASE_DB_URL` to the connection string from the Supabase dashboard (Database → Connection string, Transaction pooler).
4. Redeploy once so the connection string is available at runtime. The repository must include `data/catalog.json` and `public/`. Product images live under `public`.
5. Open the live `/admin/products` page. The first visit imports the sites and products from `catalog.json` into Supabase. Later creates, updates, deletes, and queries use that database.
6. On Vercel, **Update website** does not run git. It writes the current products to Supabase only. The home page, site pages, and product details do not read that database. They are static pages built from `data/catalog.json`. To refresh them, click **Update website** on the local machine. The redeploy after that push includes the new static files.

The HioBuy key is stored in whichever database the current environment uses. After switching to Supabase, save it again in **HioBuy settings**. `HIOBUY_API_KEY` and `HIOBUY_API_BASE` remain available as environment-variable fallbacks.

### Supabase settings

The Vercel project `global-buy` already has the Supabase database `supabase-cordovan-envelope` connected under **Storage**, for both Preview and Production. The integration created the variables with the `WEIDIAN_` prefix. Leave those values in the Vercel environment variables. Do not commit them to the repository.

Open **Storage → supabase-cordovan-envelope**. **Quickstart** lists every variable. The app uses only the database connection string and takes the first one that has a value:

| Order | Variable | Purpose |
| --- | --- | --- |
| 1 | `SUPABASE_DB_URL` | A connection string set by hand. Skipped when it is empty. |
| 2 | `WEIDIAN_POSTGRES_URL` | The Transaction pooler from this integration, port `6543`. This is the default on Vercel. |
| 3 | `WEIDIAN_POSTGRES_URL_NON_POOLING` | The Session pooler, port `5432`. Used when the previous value is empty. |
| 4 | `WEIDIAN_POSTGRES_PRISMA_URL` | The connection string that includes `pgbouncer=true`. Used when the two values above are empty. |
| 5 | `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `DATABASE_URL`, `POSTGRES_URL_NON_POOLING` | The same variables without the `WEIDIAN_` prefix. |

`WEIDIAN_POSTGRES_URL` has this shape:

```text
postgres://postgres.<project-id>:<database-password>@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

Before connecting, the app removes `pgbouncer`, `connection_limit`, and any other query parameters, and keeps `sslmode=require`.

Quickstart also shows the variables below. Product saves and queries in this project do not read them:

| Variable | Meaning |
| --- | --- |
| `NEXT_PUBLIC_WEIDIAN_SUPABASE_URL` | Supabase project URL, such as `https://<project-id>.supabase.co`. |
| `NEXT_PUBLIC_WEIDIAN_SUPABASE_ANON_KEY` | Anonymous public key. |
| `NEXT_PUBLIC_WEIDIAN_SUPABASE_PUBLISHABLE_KEY` | Publishable key that can be exposed to the browser. |
| `WEIDIAN_SUPABASE_SERVICE_ROLE_KEY` | Server key with full access. |
| `WEIDIAN_SUPABASE_SECRET_KEY` | Server secret key. |
| `WEIDIAN_SUPABASE_JWT_SECRET` | JWT signing secret. |
| `WEIDIAN_POSTGRES_HOST` | Database host, such as `db.<project-id>.supabase.co`. |
| `WEIDIAN_POSTGRES_USER` | Database user, usually `postgres`. |
| `WEIDIAN_POSTGRES_PASSWORD` | Database password. |
| `WEIDIAN_POSTGRES_DATABASE` | Database name, usually `postgres`. |

When the integration is already connected, do not create another `SUPABASE_DB_URL`. Confirm that **Environment Variables** has `WEIDIAN_POSTGRES_URL` for both Production and Preview, then redeploy. After that deployment finishes, open the live `/admin/products` page.

On the first admin visit, the app creates the `sites`, `menus`, `products`, and `meta` tables in Supabase and imports `data/catalog.json` from the repository. You do not need to create those tables in the Supabase Table Editor. Later admin queries, creates, updates, and deletes write to these four tables. Public pages do not read them.

## 2. HioBuy product lookup

Product data comes from the [HioBuy public API](https://hiobuy.com/zh/api-docs). The machine-readable description is [openapi.json](https://api.hiobuy.com/openapi.json). This project uses only product detail: `POST https://api.hiobuy.com/v1/products/detail`.

### Create a key

Register in the HioBuy developer center and verify the email address. The system creates the first application automatically. Open the application and create an API key. The full key is shown only once. Send it in the request header:

```http
Authorization: Bearer YOUR_API_KEY
```

Current keys use the `hio_live_` prefix. Product lookup returns live 1688, Taobao, and Weidian data. A personal marketplace OAuth flow is not required. The trial lasts 7 days from the first application. 1688 and Weidian share 100 billable units per UTC day. Product detail normally costs 1 unit, and search costs 2 units. The Taobao API requires an active paid subscription. The trial quota does not include Taobao. Plans, quotas, and the purchasing service fee are described on the documentation page. Support email: support@hiobuy.com.

### Save the settings in this project

Open `/admin/products` and click **HioBuy settings** on the first row:

- **API Key**: the key created above.
- **API address**: `https://api.hiobuy.com` by default, without a trailing slash.

Saving writes the `meta` table in the current database (`hiobuy_api_key` and `hiobuy_api_base`). Locally that database is SQLite. On Vercel it is Supabase. When the database has no key, the app falls back to `HIOBUY_API_KEY` and `HIOBUY_API_BASE`.

### The request this project sends

When adding a product, paste a 1688, Taobao, Tmall, or Weidian link into the product form. The page calls `POST /admin/api/products/fetch`, and the server calls HioBuy. Link import uses the same lookup, with at most 5 requests at a time and a 40-second timeout for each request.

The link is mapped to a channel first:

| Link | `channel` |
| --- | --- |
| Contains `1688.com` | `1688` |
| Contains `weidian.com` | `weidian` |
| Contains `taobao.com`, `tmall.com`, or `tb.cn` | `taobao` |

Any other link is rejected. The request body is always:

```json
{
  "channel": "weidian",
  "url": "https://weidian.com/item.html?itemID=123",
  "language": "en",
  "response_format": "standard"
}
```

`channel` is required by the API. `language` selects the translated text and is fixed to English here. `response_format` is `standard`, which returns the unified HioBuy shape. `upstream` would return the marketplace's raw JSON, and this project does not use it. A successful response is:

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
| `url` of the image whose `type` is `main` | Main image |
| The other image `url` values, joined with commas | Extra images |
| `channel`: `weidian` is stored as `WD`, `taobao` as `TB`, and 1688 stays `1688` | Source |
| `metadata.brand` | Brand |
| `source_product_id` | Source product ID |
| `source_url`, or the link the user pasted | Original link, also used as the main buy link |

If the name or the price is missing, that lookup fails and no partial product is stored. A successful lookup only fills the form. It is written to the current database after Save: SQLite locally, Supabase on Vercel. The public site updates after **Update website**.

## 3. Product detail actions

The detail URL is `/{site slug}/products/{product slug}`, the page opened from a product card. The page reads the published `catalog.json` and does not connect to a database.

### Browsing

- **Breadcrumb**: `{site name} Spreadsheet / category / brand / product name`. The first three parts return to the site home, all products in that category, and that brand list.
- **Brand name**: the brand link above the detail title opens the same brand inside the same category.
- **Heading**: `You can buy this {product name} go to {site name}`.
- **Category tabs**: every menu on the site. The current category is highlighted. Another category opens its All list. Home returns to the site home page.
- **Main image, Best Selling, price, and product name**: the published image and price. The price is prefixed with `$`.

### Select Buy On Platform

This opens “Please choose a platform”. Each row has the platform name and **Buy Now**, and both open the same link in a new tab. Click the backdrop or **Close** to dismiss it.

TaooBuy uses the product's saved `tao_buy_link` and is marked **REC**. The other platforms build a URL from the original link or the source product ID:

| Platform | URL |
| --- | --- |
| TaooBuy | The product's `tao_buy_link` |
| KakoBuy | `https://kakobuy.com/item/details?url={original link}` |
| Mulebuy | `https://mulebuy.com/product?id={product id}&platform=WEIDIAN&searchInfo={original link}` |
| JoyagooBuy | `https://joyagoo.com/product?id={product id}&platform=WEIDIAN` |
| oopBuy | `https://oopbuy.com/product/weidian/{product id}` |
| Hooby | `https://hoobuy.com/product/2/{product id}` |
| CnfansBuy | `https://cnfans.com/product?id={product id}&platform=WEIDIAN` |
| CssBuy | `https://www.cssbuy.com/item-micro-{product id}.html` |
| AcBuy | `https://acbuy.com/product?id={product id}&source=WD` |
| AlChinaBuy | `https://www.allchinabuy.com/en/page/buy/?nTag=Home-search&from=search-input&_search=url&position=&url={original link}` |
| SuperBuy | `https://www.superbuy.com/en/page/buy/?nTag=Home-search&from=search-input&url={original link}` |

Except for TaooBuy, AlChinaBuy, and SuperBuy, the links are built from a Weidian product ID. For a Taobao or 1688 product, prefer TaooBuy, KakoBuy, AlChinaBuy, or SuperBuy, because those URLs carry the full original link.

### Copy original link

Copies the product's original link and shows `{link} copied successfully`. If the browser blocks the clipboard API, the page copies the link with a temporary text field.

### Join discord for more discounts

Opens a panel with two lines: send product photos to customer service so they can help find the item, and contact customer service on Discord before ordering to get a discount. **Join {site name}** opens the site URL from the website configuration in a new tab. The close image at the top right dismisses the panel. The Join button in the page header opens the same panel.

### Bypass the not-purchasable warning

Below the detail there is a Chrome extension entry, “How to bypass ‘Non - purchasable item’ warning automatically”. **Download chrome extension** opens Risk Reminder Remover in the Chrome Web Store:

`https://chromewebstore.google.com/detail/risk-reminder-remover/afgegfoedkeffjkkkjkbpnegceleakeo`

### Related products

**{brand} Product More** at the bottom links to the current brand list. Up to 5 products are shown beside it: other products in the same category and brand first, then other brands in the same category, then products from the rest of the site. A card opens that product's detail page.
