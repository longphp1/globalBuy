# Global Buy

Next.js spreadsheet for the buying-agent sites. Pages, filters, product details, and the how-to guide follow the static HTML sites. The app is ready to deploy on Vercel.

## Refresh data

From the `lpadmin` project:

```bash
php artisan generate:website_next
```

The command writes `data/catalog.json` and copies CSS, images, fonts, and product photos into this directory. It does not replace the Next.js source, `node_modules`, or git history.

## Local preview

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the TaooBuy spreadsheet. The other spreadsheets are listed at [http://localhost:3000/spreadsheet](http://localhost:3000/spreadsheet).

## Deploy on Vercel

1. Push this directory to its own Git repository.
2. Import that repository in Vercel and leave the framework preset as Next.js.
3. Include `data/catalog.json` and the `public` assets in the deployment. Product photos live in `public/products`.

No extra environment variables are required.
