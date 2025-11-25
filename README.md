# متجر ابن أيوب للهدايا

متجر إلكتروني حديث ومتكامل لبيع الهدايا والتحف الفنية.

## 🚀 المميزات

- ✨ تصميم عصري وجذاب
- 🔐 نظام مصادقة متكامل (Supabase Auth)
- 🛒 سلة تسوق ديناميكية
- 📱 تصميم متجاوب (Responsive)
- 🎨 واجهة مستخدم حديثة
- 📊 لوحة تحكم إدارية (Dashboard)
- 🔔 نظام إشعارات Toast
- 🎯 تصنيفات متعددة للمنتجات

## 📋 المتطلبات

- Python 3 (لتشغيل الخادم المحلي)
- حساب Supabase (مجاني)
- متصفح حديث

## ⚙️ إعداد المشروع

### 1. إعداد Supabase

1. اذهب إلى [supabase.com](https://supabase.com)
2. سجل دخول أو أنشئ حساب جديد
3. اضغط "New Project"
4. املأ البيانات:
   - اسم المشروع: `ibn-ayyub-store`
   - كلمة مرور قاعدة البيانات (احفظها!)
   - المنطقة: اختر الأقرب لك
5. انتظر 2-3 دقائق حتى يتم إنشاء المشروع

### 2. إنشاء قاعدة البيانات

1. في لوحة تحكم Supabase، اذهب إلى **SQL Editor**
2. انسخ محتوى ملف `schema.sql` من المشروع
3. الصق الكود في SQL Editor
4. اضغط **Run** لتنفيذ الكود

### 3. الحصول على مفاتيح API

1. اذهب إلى **Settings** → **API**
2. انسخ:
   - `Project URL`
   - `anon public` key

### 4. تحديث ملف الإعدادات

افتح ملف `js/config.js` وعدّل:

```javascript
const SUPABASE_URL = 'YOUR_PROJECT_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

export { SUPABASE_URL, SUPABASE_ANON_KEY };
```

## 🏃 تشغيل المشروع

### الطريقة 1: Python HTTP Server

```bash
cd /path/to/Ibn-ayyub
python3 -m http.server 8000
```

ثم افتح المتصفح على: `http://localhost:8000`

### الطريقة 2: Live Server (VS Code)

1. ثبت إضافة "Live Server" في VS Code
2. انقر بزر الماوس الأيمن على `index.html`
3. اختر "Open with Live Server"

## 📁 هيكل المشروع

```
Ibn-ayyub/
├── index.html              # الصفحة الرئيسية
├── schema.sql              # قاعدة البيانات
├── Front-End/
│   ├── Appearance/
│   │   ├── index.css       # التصميم الرئيسي
│   │   ├── login.css       # تصميم صفحات Auth
│   │   └── dashboard.css   # تصميم Dashboard
│   └── Interaction/
│       ├── main.js         # الوظائف الرئيسية
│       ├── auth.js         # المصادقة
│       ├── products.js     # المنتجات
│       └── dashboard.js    # Dashboard
├── js/
│   ├── config.js           # إعدادات Supabase
│   ├── supabase-client.js  # عميل Supabase
│   ├── utils.js            # دوال مساعدة
│   └── toast.js            # نظام الإشعارات
├── pages/
│   ├── login.html          # تسجيل الدخول
│   ├── sign.html           # إنشاء حساب
│   ├── products.html       # صفحة المنتجات
│   ├── product.html        # تفاصيل المنتج
│   ├── cart.html           # سلة التسوق
│   └── dashboard/          # لوحة التحكم
│       ├── index.html      # الرئيسية
│       ├── products.html   # إدارة المنتجات
│       ├── orders.html     # إدارة الطلبات
│       └── users.html      # إدارة المستخدمين
└── assets/
    └── images/             # الصور
```

## 🎨 التصميم

التصميم يعتمد على:
- نظام ألوان عصري ومتناسق
- خط Cairo من Google Fonts
- Animations سلسة
- تصميم متجاوب لجميع الأجهزة

### الألوان الرئيسية

```css
--primary: #E63946      /* الأحمر الأساسي */
--primary-dark: #C1121F /* أحمر داكن */
--secondary: #457B9D    /* أزرق */
--black: #1D3557        /* أسود مزرق */
```

## 🔐 المصادقة

الموقع يستخدم Supabase Auth مع:
- تسجيل دخول بالبريد الإلكتروني
- تسجيل دخول بـ Google OAuth
- إدارة الجلسات
- Row Level Security (RLS)

## 📊 Dashboard

لوحة التحكم تتضمن:
- إحصائيات المبيعات
- إدارة المنتجات (إضافة/تعديل/حذف)
- إدارة الطلبات
- عرض المستخدمين
- رسوم بيانية

### الوصول للـ Dashboard

1. سجل دخول كمستخدم
2. في قاعدة البيانات، غيّر `role` للمستخدم إلى `admin` في جدول `user_profiles`
3. اذهب إلى `/pages/dashboard/`

## 🛠️ التقنيات المستخدمة

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Icons**: Font Awesome 6
- **Fonts**: Google Fonts (Cairo)
- **Charts**: Chart.js (للرسوم البيانية)

## 📝 الملاحظات

- تأكد من تحديث `config.js` بمعلومات Supabase الصحيحة
- البيانات التجريبية موجودة في `schema.sql`
- لإضافة مستخدم كـ admin، عدّل جدول `user_profiles` مباشرة

## 🐛 استكشاف الأخطاء

### المنتجات لا تظهر
- تأكد من تنفيذ `schema.sql` بالكامل
- تحقق من صحة مفاتيح Supabase في `config.js`
- افتح Console (F12) وتحقق من الأخطاء

### لا يمكن تسجيل الدخول
- تأكد من تفعيل Email Auth في Supabase
- تحقق من RLS Policies

### الصور لا تظهر
- الصور الحالية من Unsplash (تحتاج إنترنت)
- يمكنك رفع صور خاصة لـ Supabase Storage

## 📞 الدعم

للمساعدة أو الاستفسارات، افتح Issue في GitHub أو تواصل معنا.

## 📄 الترخيص

هذا المشروع مفتوح المصدر ومتاح للاستخدام الشخصي والتجاري.

---

صُنع بـ ❤️ في السعودية
