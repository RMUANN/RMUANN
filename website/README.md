# Zeyuan Fan academic portfolio

The site uses Next.js App Router and exports static pages. Node.js 22 or newer is required.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The root displays the English homepage. The canonical English and Chinese routes begin with `/en/` and `/zh/`. Language switching preserves the current page or case study.

## Updating the site

Edit `content/site.ts` to update profile details, research themes, papers, case studies, education, or contact links. Keep project slugs consistent in both languages. Add interface translations in `content/ui.ts`. Put media cleared for publication in `public/`.

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run verify:export
```

## Deploying on Vercel

Import `RMUANN/RMUANN`, set the root directory to `website`, and select the Next.js preset. Set `SITE_URL` to the public HTTPS origin when a canonical domain is available. Otherwise the build uses the Vercel production hostname when Vercel supplies it. The deployment serves the static export from `out/`. For other static hosts, set `SITE_URL` at build time and serve `out/` at the domain root with directory indexes enabled.

Run `python -m http.server 4181 --bind 127.0.0.1 --directory out` from this directory to inspect a local build. Set `SITE_URL=http://127.0.0.1:4181` before building if you also want to inspect the local sitemap and social metadata.

Check `/en/`, `/zh/`, `/sitemap.xml`, `/robots.txt`, and both versions of a project case study on the deployed host.
