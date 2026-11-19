# ترقية مستودع GHAZAL إلى الإصدار v2.0 (Mobile & Command Center)

بما أنك قمت برفع الملفات القديمة بالفعل على GitHub، اتبع هذه الخطوات البسيطة لدمج التحديث الضخم:

## 1. فك الضغط والاستبدال
فك ضغط ملف `ghazal-v2-upgrade.zip` مباشرة داخل مجلد مشروع `ghazal/` المحلي ووافق على استبدال الملفات المتطابقة (Replace All).

## 2. تثبيت التحديثات وتشغيل وضع الهواتف + الكمبيوتر
```bash
npm install

# للتشغيل المحلي مع إتاحة الوصول من الهاتف على نفس الشبكة (Wi-Fi):
npm run dev:mobile
```

## 3. رفع التحديثات إلى GitHub
```bash
git status
git add .
git commit -m "feat(v2): add mobile PWA/Capacitor support, analytics, scheduler, kanban, chat & alerts"
git push origin main
```

## 4. التشغيل على الهاتف (3 طرق)
1. **كتطبيق PWA فوري (أندرويد و iOS):** افتح رابط الشبكة الظاهر في تبويب `Mobile Connect` من متصفح هاتفك واضغط **إضافة إلى الشاشة الرئيسية (Add to Home Screen)**.
2. **تشغيل مباشر على Android عبر Termux:**
   ```bash
   bash scripts/termux-setup.sh
   ```
3. **بناء تطبيق Android APK حقيقي عبر Capacitor:**
   ```bash
   cd apps/mobile
   npm install
   npx cap add android
   npm run build:mobile
   npx cap open android
   ```
