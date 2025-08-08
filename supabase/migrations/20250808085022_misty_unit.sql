/*
  # E-Ticaret Platformu İlk Şema

  1. Yeni Tablolar
    - `users` - Kullanıcı bilgileri ve rolleri
    - `categories` - Ürün kategorileri
    - `products` - Ürün bilgileri
    - `orders` - Sipariş bilgileri
    - `order_items` - Sipariş detayları
    - `user_activity` - Kullanıcı aktivite takibi (AI için)
    - `user_preferences` - Kullanıcı tercihleri (AI için)

  2. Güvenlik
    - Tüm tablolar için RLS etkinleştirildi
    - Kullanıcı rolleri ve yetkilendirme politikaları

  3. AI Özellikleri
    - Kullanıcı aktivite takibi
    - Tercih analizi için veri yapıları
*/

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  phone text,
  address jsonb,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  parent_id uuid REFERENCES categories(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  category_id uuid REFERENCES categories(id),
  brand text,
  image_url text,
  images jsonb DEFAULT '[]',
  stock integer DEFAULT 0,
  rating decimal(3,2) DEFAULT 0,
  reviews_count integer DEFAULT 0,
  specifications jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  total_amount decimal(10,2) NOT NULL,
  shipping_address jsonb NOT NULL,
  billing_address jsonb,
  payment_method text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  tracking_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity integer NOT NULL,
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- User activity table (for AI recommendations)
CREATE TABLE IF NOT EXISTS user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('view', 'search', 'add_to_cart', 'purchase', 'like', 'review')),
  product_id uuid REFERENCES products(id),
  category_id uuid REFERENCES categories(id),
  search_query text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- User preferences table (for AI personalization)
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  preferred_categories uuid[] DEFAULT '{}',
  preferred_brands text[] DEFAULT '{}',
  price_range_min decimal(10,2),
  price_range_max decimal(10,2),
  demographics jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Categories policies (public read)
CREATE POLICY "Anyone can read categories"
  ON categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Products policies (public read)
CREATE POLICY "Anyone can read active products"
  ON products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Orders policies
CREATE POLICY "Users can read own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Order items policies
CREATE POLICY "Users can read own order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items for own orders"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all order items"
  ON order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User activity policies
CREATE POLICY "Users can read own activity"
  ON user_activity
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own activity"
  ON user_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all activity"
  ON user_activity
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User preferences policies
CREATE POLICY "Users can manage own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity(created_at);

-- Sample data
INSERT INTO categories (id, name, description, image_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Elektronik', 'Teknoloji ürünleri', 'https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Giyim', 'Kadın ve erkek giyim', 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Spor', 'Spor malzemeleri', 'https://images.pexels.com/photos/2827392/pexels-photo-2827392.jpeg'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Ev & Yaşam', 'Ev dekorasyonu', 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Kitap', 'Kitaplar ve dergiler', 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Oyuncak', 'Çocuk oyuncakları', 'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg');

INSERT INTO products (name, description, price, category_id, brand, image_url, stock, rating, reviews_count) VALUES
  ('iPhone 15 Pro', 'Apple iPhone 15 Pro 128GB', 45999.99, '550e8400-e29b-41d4-a716-446655440001', 'Apple', 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg', 25, 4.8, 156),
  ('Samsung Galaxy S24', 'Samsung Galaxy S24 256GB', 38999.99, '550e8400-e29b-41d4-a716-446655440001', 'Samsung', 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg', 30, 4.6, 89),
  ('Nike Air Max 270', 'Nike Air Max 270 Spor Ayakkabı', 2499.99, '550e8400-e29b-41d4-a716-446655440003', 'Nike', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 15, 4.7, 234),
  ('Adidas Ultraboost 22', 'Adidas Ultraboost 22 Koşu Ayakkabısı', 2899.99, '550e8400-e29b-41d4-a716-446655440003', 'Adidas', 'https://images.pexels.com/photos/1464625/pexels-photo-1464625.jpeg', 8, 4.5, 167),
  ('Levi\'s 501 Jeans', 'Klasik Levi\'s 501 Kot Pantolon', 899.99, '550e8400-e29b-41d4-a716-446655440002', 'Levi\'s', 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg', 45, 4.4, 78),
  ('MacBook Air M2', 'Apple MacBook Air M2 13" 256GB', 32999.99, '550e8400-e29b-41d4-a716-446655440001', 'Apple', 'https://images.pexels.com/photos/18105/pexels-photo.jpg', 12, 4.9, 203),
  ('Sony WH-1000XM5', 'Sony Gürültü Önleyici Kulaklık', 4999.99, '550e8400-e29b-41d4-a716-446655440001', 'Sony', 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg', 22, 4.8, 145),
  ('IKEA MALM Yatak', 'IKEA MALM Çift Kişilik Yatak Çerçevesi', 1299.99, '550e8400-e29b-41d4-a716-446655440004', 'IKEA', 'https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg', 18, 4.3, 92);

-- Create admin user (you'll need to sign up first, then update the role)
-- This is just a placeholder - actual admin creation should be done after user signup
-- UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';