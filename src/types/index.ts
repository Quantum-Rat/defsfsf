export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'customer';
  preferences?: UserPreferences;
  created_at: string;
}

export interface UserPreferences {
  categories: string[];
  brands: string[];
  price_range: {
    min: number;
    max: number;
  };
  demographics: {
    age?: number;
    gender?: string;
    location?: string;
  };
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  brand: string;
  image_url: string;
  stock: number;
  rating: number;
  reviews_count: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image_url: string;
  parent_id?: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  items: OrderItem[];
  shipping_address: Address;
  tracking_number?: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  product: Product;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SearchFilters {
  category?: string;
  brand?: string;
  price_min?: number;
  price_max?: number;
  rating?: number;
  sort_by?: 'price_asc' | 'price_desc' | 'rating' | 'popularity';
}

export interface AdminStats {
  total_users: number;
  total_orders: number;
  total_revenue: number;
  popular_products: Product[];
  recent_orders: Order[];
}