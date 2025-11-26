# دليل النشر - Ibn Ayyub Gift Store

## 🚀 خيارات النشر

### الخيار 1: Vercel (موصى به)

**المميزات:**
- ✅ مجاني للمشاريع الصغيرة
- ✅ نشر تلقائي من GitHub
- ✅ SSL مجاني
- ✅ CDN عالمي
- ✅ سهل جداً

**الخطوات:**

1. **رفع المشروع على GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO
   git push -u origin main
   ```

2. **النشر على Vercel**
   - اذهب إلى [vercel.com](https://vercel.com)
   - سجل دخول بحساب GitHub
   - اضغط "New Project"
   - اختر المشروع من GitHub
   - اضغط "Deploy"

3. **إعداد المتغيرات البيئية**
   - في لوحة تحكم Vercel، اذهب إلى Settings → Environment Variables
   - أضف:
     ```
     SUPABASE_URL=your_project_url
     SUPABASE_ANON_KEY=your_anon_key
     ```

4. **تحديث config.js**
   - استخدم environment variables بدلاً من القيم المباشرة:
   ```javascript
   const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
   ```

---

### الخيار 2: Netlify

**الخطوات:**

1. **رفع على GitHub** (نفس الخطوات أعلاه)

2. **النشر على Netlify**
   - اذهب إلى [netlify.com](https://netlify.com)
   - سجل دخول بحساب GitHub
   - اضغط "New site from Git"
   - اختر المشروع
   - Build settings:
     ```
     Build command: (leave empty)
     Publish directory: .
     ```
   - اضغط "Deploy site"

3. **إعداد المتغيرات البيئية**
   - Site settings → Environment variables
   - أضف SUPABASE_URL و SUPABASE_ANON_KEY

---

### الخيار 3: GitHub Pages

**الخطوات:**

1. **رفع على GitHub**

2. **تفعيل GitHub Pages**
   - اذهب إلى Settings → Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
   - Save

3. **الوصول للموقع**
   - سيكون متاح على: `https://username.github.io/Ibn-ayyub`

⚠️ **ملاحظة**: لا يمكن استخدام environment variables في GitHub Pages، لذا يجب تحديث `config.js` مباشرة.

---

## 🔒 الأمان

### قبل النشر

1. **تحديث Supabase RLS**
   - تأكد من تفعيل Row Level Security
   - راجع جميع Policies

2. **إخفاء المفاتيح الحساسة**
   - لا تنشر `service_role` key أبداً
   - استخدم environment variables

3. **تحديث CORS**
   - في Supabase، اذهب إلى Settings → API
   - أضف domain الموقع المنشور إلى Allowed origins

---

## ✅ قائمة التحقق قبل النشر

- [ ] تحديث `config.js` بمعلومات Supabase الصحيحة
- [ ] تطبيق `schema.sql` على قاعدة البيانات
- [ ] اختبار جميع الوظائف محلياً
- [ ] مراجعة RLS Policies
- [ ] تحديث meta tags في HTML
- [ ] اختبار على أجهزة مختلفة
- [ ] التأكد من عمل الصور
- [ ] مراجعة Console للأخطاء
- [ ] اختبار تسجيل الدخول
- [ ] اختبار إضافة منتجات للسلة

---

## 🔧 بعد النشر

### 1. اختبار الموقع
- افتح الموقع المنشور
- جرب جميع الوظائف
- تحقق من Console (F12)

### 2. إعداد Google OAuth (اختياري)
- في Google Cloud Console
- أضف domain الموقع المنشور إلى Authorized redirect URIs

### 3. إعداد Domain مخصص (اختياري)
- في Vercel/Netlify
- اذهب إلى Domains
- أضف domain الخاص بك
- حدّث DNS records

---

## 📊 المراقبة

### Vercel Analytics
- مجاني للمشاريع الصغيرة
- يعرض الزيارات والأداء

### Google Analytics (اختياري)
1. أنشئ حساب في [analytics.google.com](https://analytics.google.com)
2. احصل على Tracking ID
3. أضف الكود في `<head>` لجميع الصفحات:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 🐛 حل المشاكل

### الموقع لا يعمل بعد النشر
- تحقق من Console للأخطاء
- تأكد من صحة مسارات الملفات
- راجع environment variables

### Supabase لا يعمل
- تحقق من CORS settings
- راجع RLS Policies
- تأكد من صحة المفاتيح

### الصور لا تظهر
- استخدم مسارات مطلقة
- ارفع الصور على Supabase Storage
- أو استخدم CDN خارجي

---

## 📞 الدعم

إذا واجهت مشاكل:
1. راجع [توثيق Vercel](https://vercel.com/docs)
2. راجع [توثيق Supabase](https://supabase.com/docs)
3. افتح Issue في GitHub

---

**ملاحظة**: هذا الدليل للنشر الأساسي. للإنتاج الكامل، قد تحتاج إلى إعدادات إضافية مثل CDN، Caching، وغيرها.
