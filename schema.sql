-- Users & Profiles (Handled by Supabase Auth usually, but here for reference)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    role TEXT DEFAULT 'customer', -- 'admin', 'cashier', 'customer'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    barcode TEXT UNIQUE,
    category TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    start_cash DECIMAL(10, 2) DEFAULT 0,
    end_cash DECIMAL(10, 2),
    status TEXT DEFAULT 'open' -- 'open', 'closed'
);

-- Invoices (Sales & Returns)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shift_id UUID REFERENCES shifts(id),
    user_id UUID REFERENCES auth.users(id),
    customer_name TEXT,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    type TEXT DEFAULT 'sale', -- 'sale', 'return'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) DEFAULT 0
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shift_id UUID REFERENCES shifts(id),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Purchases (Imports)
CREATE TABLE IF NOT EXISTS purchases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    supplier_name TEXT,
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL
);

-- Site Settings
CREATE TABLE IF NOT EXISTS site_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    sender_type TEXT NOT NULL, -- 'user', 'admin', 'bot'
    content TEXT,
    message_type TEXT DEFAULT 'text', -- 'text', 'image', 'product'
    image_url TEXT,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_shift_id ON invoices(shift_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
