# نشر استوديو غزال على Cloudflare Pages مجاناً (بدون علامة مائية)

1. ضع الملفات الأربعة المرفقة في جذر مستودع `ghazal-studio` على GitHub:
   - `wrangler.toml`
   - `public/_redirects`
   - `public/_headers`
   - `functions/api/state.ts`
2. افتح لوحة تحكم **Cloudflare Dashboard** -> **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git**.
3. اختر مستودعك واضبط الإعدادات التالية:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. اضغط **Save and Deploy** — ستحصل فوراً على رابط نظيف بصيغة `https://ghazal-studio.pages.dev` بدون أي علامة مائية أو حدود زمنية.
