# 🚀 دليل إعداد Supabase الكامل - خطوة بخطوة

## المطلوب عمله في Supabase

---

## الخطوة 1: إنشاء مشروع Supabase

1. **اذهب إلى** [supabase.com](https://supabase.com)
2. **سجل دخول** أو أنشئ حساب جديد
3. **اضغط "New Project"**
4. **املأ البيانات:**
   - Project Name: `Ibn-Ayyub-Store`
   - Database Password: (احفظها في مكان آمن!)
   - Region: اختر الأقرب لك
5. **اضغط "Create new project"**
6. **انتظر** حتى يكتمل الإعداد (2-3 دقائق)

---

## الخطوة 2: تنفيذ SQL Schema (إنشاء الجداول)

### 2.1 افتح SQL Editor
1. من القائمة الجانبية → **SQL Editor**
2. اضغط **"New query"**

### 2.2 انسخ والصق الكود التالي

```sql
-- =============================================
-- Ibn Ayyub Gift Store Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. User Profiles Table
-- =============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    address TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. Products Table
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    category TEXT NOT NULL,
    image_url TEXT,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. Orders Table
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. Order Items Table
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. Cart Items Table
-- =============================================
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- =============================================
-- Triggers for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Products Policies (Everyone can view, only admins can modify)
CREATE POLICY "Anyone can view products" ON products
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert products" ON products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update products" ON products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete products" ON products
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Orders Policies
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Order Items Policies
CREATE POLICY "Users can view their order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create order items" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- Cart Items Policies
CREATE POLICY "Users can view their cart" ON cart_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their cart" ON cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their cart" ON cart_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their cart" ON cart_items
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Sample Data (للاختبار)
-- =============================================

-- Insert sample products
INSERT INTO products (title, description, price, stock, category, featured) VALUES
('باقة ورد فاخرة', 'باقة ورد جميلة مكونة من 50 وردة حمراء', 299.99, 20, 'flowers', true),
('علبة شوكولاتة بلجيكية', 'شوكولاتة فاخرة من بلجيكا', 149.99, 50, 'chocolate', true),
('عطر فرنسي راقي', 'عطر أصلي من فرنسا', 499.99, 15, 'perfumes', true),
('دبدوب كبير', 'دبدوب ناعم ولطيف', 199.99, 30, 'toys', false),
('سوار ذهبي', 'سوار ذهب عيار 21', 899.99, 10, 'accessories', false),
('باقة ورد صغيرة', 'باقة ورد مكونة من 12 وردة', 99.99, 40, 'flowers', false),
('علبة شوكولاتة صغيرة', 'شوكولاتة لذيذة', 49.99, 100, 'chocolate', false),
('عطر عربي', 'عطر عربي أصيل', 299.99, 25, 'perfumes', false);
```

### 2.3 تنفيذ الكود
1. **اضغط "Run"** أو اضغط **F5**
2. **انتظر** حتى يظهر "Success"
3. **تأكد** من عدم وجود أخطاء

---

## الخطوة 3: تفعيل Authentication

### 3.1 إعدادات Email Auth
1. من القائمة → **Authentication** → **Providers**
2. تأكد من تفعيل **Email**
3. في **Email Templates** → عدّل الرسائل إذا أردت

### 3.2 إعداد Google OAuth (اختياري)
1. في **Providers** → **Google**
2. اضغط **Enable**
3. أدخل **Client ID** و **Client Secret** من Google Cloud Console
4. احفظ

---

## الخطوة 4: الحصول على المفاتيح

### 4.1 Project URL و API Keys
1. من القائمة → **Settings** → **API**
2. **انسخ:**
   - **Project URL** (مثل: `https://xxxxx.supabase.co`)
   - **anon public key** (مفتاح طويل يبدأ بـ `eyJ...`)

⚠️ **مهم:** لا تشارك `service_role` key أبداً!

---

## الخطوة 5: تحديث ملف config.js

1. **افتح** `js/config.js`
2. **استبدل** القيم:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co'; // ضع Project URL هنا
const SUPABASE_ANON_KEY = 'eyJhbGc...'; // ضع anon key هنا

export { SUPABASE_URL, SUPABASE_ANON_KEY };
```

---

## الخطوة 6: جعل نفسك Admin

### الطريقة 1: من Table Editor
1. **سجل دخول** في الموقع أولاً
2. في Supabase → **Table Editor** → **user_profiles**
3. **ابحث** عن بريدك الإلكتروني
4. **غيّر** `role` من `customer` إلى `admin`
5. **احفظ**

### الطريقة 2: من SQL Editor
```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'بريدك@example.com';
```

---

## ✅ قائمة التحقق النهائية

- [ ] إنشاء مشروع Supabase
- [ ] تنفيذ SQL Schema (جميع الجداول)
- [ ] تفعيل Email Authentication
- [ ] نسخ Project URL و anon key
- [ ] تحديث js/config.js
- [ ] تسجيل حساب في الموقع
- [ ] جعل نفسك admin

---

## 🎯 اختبار التشغيل

بعد إكمال جميع الخطوات:

```bash
# شغّل الخادم
python3 -m http.server 8000

# افتح المتصفح
http://localhost:8000
```

**اختبر:**
- ✅ تسجيل حساب جديد
- ✅ تسجيل الدخول
- ✅ عرض المنتجات (يجب أن تظهر 8 منتجات تجريبية)
- ✅ إضافة منتج للسلة
- ✅ الدخول للـ Dashboard (بعد جعل نفسك admin)

---

## 🐛 حل المشاكل

### المنتجات لا تظهر
- تأكد من تنفيذ SQL Schema بالكامل
- راجع Console (F12) للأخطاء
- تحقق من صحة SUPABASE_URL و SUPABASE_ANON_KEY

### لا أستطيع تسجيل الدخول
- تأكد من تفعيل Email Auth
- راجع Console للأخطاء
- تحقق من صحة المفاتيح

### "لوحة التحكم" لا تظهر
- تأكد من تغيير role إلى admin
- سجل خروج ودخول مرة أخرى
- امسح cache (Ctrl + Shift + R)

---

## 📞 دعم إضافي

إذا واجهت مشاكل:
1. راجع [Supabase Docs](https://supabase.com/docs)
2. تحقق من Console (F12) للأخطاء
3. راجع ملف SUPABASE_SETUP.md

---

**مبروك! متجرك جاهز للعمل!** 🎉
