# 🔧 حل مشكلة "Invalid login credentials"

## 🎯 سبب المشكلة

الخطأ يظهر لأن:
- ❌ الحساب غير موجود في Supabase
- ❌ أو البريد/كلمة المرور غير صحيحة

---

## ✅ الحل (خطوتين فقط!)

### الخطوة 1: تنفيذ SQL Schema في Supabase

1. **افتح Supabase Dashboard:**
   - اذهب إلى [supabase.com](https://supabase.com)
   - افتح مشروعك: `qchuzlphsabbuelwhqav`

2. **SQL Editor → New Query:**
   - انسخ محتوى ملف `schema.sql` بالكامل
   - الصقه في SQL Editor
   - اضغط **Run** (F5)

3. **تأكد من النجاح:**
   - يجب أن ترى "Success" ✅
   - اذهب إلى **Table Editor**
   - تحقق من وجود الجداول:
     - ✅ user_profiles
     - ✅ products
     - ✅ orders
     - ✅ order_items
     - ✅ cart_items

### الخطوة 2: إنشاء حساب جديد

1. **افتح الموقع:**
   ```
   http://localhost:8000
   ```

2. **اضغط "تسجيل الدخول" → "إنشاء حساب جديد"**

3. **املأ البيانات:**
   - الاسم: `أحمد محمد`
   - البريد: `admin@test.com`
   - كلمة المرور: `123456`

4. **اضغط "إنشاء حساب"**

5. **الآن سجل دخول بنفس البيانات!** ✅

---

## 🎯 ملاحظات مهمة

### إذا كنت تستخدم Email Confirmation:
- افتح **Authentication** → **Email Templates**
- عطّل **Confirm email** مؤقتاً للاختبار
- أو تحقق من بريدك الإلكتروني

### لجعل نفسك Admin:
بعد تسجيل الدخول:
1. **Supabase** → **Table Editor** → **user_profiles**
2. ابحث عن `admin@test.com`
3. غيّر `role` من `customer` إلى `admin`
4. احفظ

---

## 🐛 إذا استمرت المشكلة

### تحقق من Console (F12):
```javascript
// افتح Console واكتب:
console.log('Supabase URL:', SUPABASE_URL);
console.log('Has Anon Key:', !!SUPABASE_ANON_KEY);
```

### تأكد من:
- ✅ تم تنفيذ schema.sql
- ✅ Email Auth مفعّل في Supabase
- ✅ البريد وكلمة المرور صحيحة
- ✅ الحساب موجود في Authentication → Users

---

**الحل السريع:** أنشئ حساب جديد من الموقع! 🚀
