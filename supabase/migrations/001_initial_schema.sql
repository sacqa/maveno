-- ====================================================================
-- SUPABASE POSTGRESQL PRODUCTION MIGRATION
-- Migration: 001_initial_schema.sql
-- Description: Core tables, foreign keys, constraints, indexes, and RLS policies
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Core Tables
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN (
        'super_admin', 'administrator', 'product_manager',
        'order_manager', 'content_manager', 'compliance_manager', 'customer'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state_or_province TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    is_default_shipping BOOLEAN DEFAULT FALSE,
    is_default_billing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.store_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'global_config',
    store_name TEXT NOT NULL,
    tagline TEXT,
    logo_text TEXT,
    logo_image_url TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    support_address TEXT,
    base_currency_code VARCHAR(3) DEFAULT 'USD',
    primary_color VARCHAR(20) DEFAULT '#171717',
    secondary_color VARCHAR(20) DEFAULT '#525252',
    accent_color VARCHAR(20) DEFAULT '#b45309',
    heading_font TEXT DEFAULT 'Poppins',
    announcement_bar_text TEXT,
    announcement_bar_enabled BOOLEAN DEFAULT TRUE,
    age_disclaimer_header TEXT,
    age_disclaimer_body TEXT,
    free_shipping_threshold_minor_units BIGINT DEFAULT 15000,
    enable_sandbox_payment BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. International & Compliance Tables
CREATE TABLE IF NOT EXISTS public.countries (
    code VARCHAR(2) PRIMARY KEY, -- ISO 3166-1 alpha-2
    name TEXT NOT NULL,
    flag_emoji VARCHAR(10),
    default_currency_code VARCHAR(3) NOT NULL,
    supported_currency_codes TEXT[] NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('approved', 'restricted', 'blocked', 'pending_legal_review')),
    minimum_age INT NOT NULL DEFAULT 18,
    age_verification_required BOOLEAN DEFAULT TRUE,
    verification_method TEXT NOT NULL,
    sales_eligible BOOLEAN DEFAULT FALSE,
    import_restrictions TEXT,
    shipping_available BOOLEAN DEFAULT FALSE,
    standard_tax_rate NUMERIC(5,4) DEFAULT 0.0000,
    customs_duty_rate NUMERIC(5,4) DEFAULT 0.0000,
    compliance_notes TEXT,
    legal_review_approved_by TEXT,
    legal_review_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.currencies (
    code VARCHAR(3) PRIMARY KEY, -- ISO 4217
    symbol VARCHAR(10) NOT NULL,
    name TEXT NOT NULL,
    exchange_rate_to_base NUMERIC(12,6) NOT NULL,
    decimal_precision INT DEFAULT 2,
    symbol_position VARCHAR(10) DEFAULT 'before',
    is_base_currency BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.age_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    country_code VARCHAR(2) REFERENCES public.countries(code),
    date_of_birth DATE NOT NULL,
    verified_age INT NOT NULL,
    provider TEXT NOT NULL,
    provider_reference TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'pending')),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    compliance_audit_hash TEXT NOT NULL
);

-- 4. Catalogue Tables
CREATE TABLE IF NOT EXISTS public.categories (
    id VARCHAR(100) PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_category_id VARCHAR(100) REFERENCES public.categories(id),
    image TEXT,
    sort_order INT DEFAULT 0,
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.brands (
    id VARCHAR(100) PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    origin_country TEXT,
    logo TEXT,
    description TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id VARCHAR(100) PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    brand_id VARCHAR(100) REFERENCES public.brands(id),
    category_id VARCHAR(100) REFERENCES public.categories(id),
    product_type TEXT NOT NULL,
    short_description TEXT,
    full_description TEXT,
    gallery_images TEXT[],
    specs JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('published', 'draft', 'archived', 'discontinued')),
    base_price_minor_units BIGINT NOT NULL, -- in USD cents
    country_specific_prices JSONB DEFAULT '{}'::jsonb,
    currency_specific_prices JSONB DEFAULT '{}'::jsonb,
    restricted_countries TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_age_restricted BOOLEAN DEFAULT TRUE,
    compliance_warning TEXT,
    featured BOOLEAN DEFAULT FALSE,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_variants (
    id VARCHAR(100) PRIMARY KEY,
    product_id VARCHAR(100) REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    attributes JSONB NOT NULL,
    price_minor_units BIGINT NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    weight_grams INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Orders & Financial Records
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id),
    customer_info JSONB NOT NULL,
    shipping_address JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'pending', 'awaiting_verification', 'awaiting_payment',
        'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
    )),
    financial_snapshot JSONB NOT NULL, -- immutable currency, exchange rate, tax, shipping, totals
    compliance_snapshot JSONB NOT NULL, -- verified age, provider ref, audit hash
    payment_snapshot JSONB NOT NULL,
    shipping_snapshot JSONB NOT NULL,
    timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id VARCHAR(100),
    variant_id VARCHAR(100),
    product_name TEXT NOT NULL,
    variant_title TEXT,
    sku TEXT NOT NULL,
    quantity INT NOT NULL,
    unit_price_minor_units BIGINT NOT NULL,
    total_price_minor_units BIGINT NOT NULL,
    product_snapshot JSONB NOT NULL
);

-- 6. Content & CMS
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id VARCHAR(100) PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    published_date TIMESTAMPTZ DEFAULT NOW(),
    category TEXT,
    tags TEXT[],
    read_time TEXT,
    image TEXT,
    seo_title TEXT,
    seo_description TEXT
);

-- 7. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_verifications_email ON public.age_verifications(customer_email);

-- 8. Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public can read published products
CREATE POLICY "Public products viewable by anyone" ON public.products
    FOR SELECT USING (status = 'published');

-- Authenticated users can view their own orders
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

-- Staff / Admins can manage all records
CREATE POLICY "Admins full access on orders" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('super_admin', 'administrator', 'order_manager')
        )
    );

CREATE POLICY "Compliance managers access verification records" ON public.age_verifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('super_admin', 'administrator', 'compliance_manager')
        )
    );
