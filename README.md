# HAGY AI Creative Studio (MVP prototype)

Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · Lucide. Bilingual TR/EN. **Demo mode only: no real videos are generated, no payments exist, pricing is placeholder.**

## Run locally
```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

## Structure
- `src/app/` pages: home, `templates`, `templates/[id]`, `create`, `api/generate`
- `src/lib/provider.ts` server-side video provider interface (add real AI API or Python/FFmpeg/Remotion worker here)
- `src/lib/data.ts` mock templates · `src/lib/i18n.tsx` TR/EN dictionary
- Secrets stay server-side in `.env.local`; never use `NEXT_PUBLIC_` for keys.

## Deploy
1. `git init && git add . && git commit -m "init"`; create a GitHub repo, `git remote add origin <url>`, `git push -u origin main`.
2. On vercel.com: Add New → Project → import the repo → add env vars from `.env.example` → Deploy.

## Not yet built
Dashboard, partnership/referral UI, dedicated TikTok Gift Edit and Gaming Studio pages, Supabase auth/storage.
