# GHAZAL AI Agent — Intelligent Project Oversight

تطبيق مفتوح المصدر (سطح مكتب + ويب + أداة CLI) للإشراف الذكي والتدقيق التلقائي على المشاريع البرمجية باستخدام مزودي الذكاء الاصطناعي المتعددين (**Google Gemini**، **Anthropic Claude**، **OpenAI ChatGPT**) عبر مفاتيح API الخاصة بالمستخدم والمشفرة محلياً.

## المميزات الأساسية
- **مصادقة متعددة المزودين (Multi-AI Vault):** تخزين مشفر محلياً (AES-256-GCM) لمفاتيح Gemini و Claude و OpenAI وتوجيه الطلبات مباشرة عبر حسابك.
- **إشراف تلقائي متعدد الوكلاء (Multi-Agent Oversight):** 3 وكلاء متخصصين (`SECURITY_SENTINEL`، `CODE_HEALTH`، `TASK_DELEGATOR`) يعملون بشكل مجدول (كل ساعة أو حسب الطلب).
- **إضافة الأداة إلى مجلد أي مشروع:** يمكنك ربط GHAZAL بأي مجلد مشروع بطريقتين:
  1. **من الواجهة الرسومية:** اضغط على اختيار مجلد المشروع ثم **"إرفاق الأداة بالمشروع" (Attach to Project)** ليتم إنشاء ملف `.ghazal.json` ومجلد `.ghazal/reports/` تلقائياً داخل مشروعك.
  2. **عبر سطر الأوامر (CLI):**
     ```bash
     npm link
     ghazal attach /path/to/your/project
     ghazal start /path/to/your/project
     ```
  3. **كـمجلد مدمج (Drop-in):** يمكنك أيضاً نسخ مجلد `ghazal/` مباشرة داخل أي مشروع وتشغيله، وسيقوم الفاحص باستبعاد مجلد `ghazal` تلقائياً وفحص مشروعك.

## التشغيل السريع

```bash
# 1. تثبيت الحزم
npm install

# 2. تشغيل الويب والخادم المحلي
npm run dev

# 3. أو تشغيل تطبيق سطح المكتب (Electron)
npm run dev:desktop
```

افتح `http://localhost:5173` وأضف مفتاح API الخاص بك في **Provider Vault**.
