import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// AI-powered recommendation engine
export class AIRecommendationEngine {
  static async getPersonalizedRecommendations(userId: string, limit = 10) {
    // Kullanıcının geçmiş alışverişlerini analiz et
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Kullanıcının tarama geçmişini al
    const { data: browsingHistory } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // AI algoritması ile öneriler oluştur
    return this.generateRecommendations(orders, browsingHistory, limit);
  }

  static async generateRecommendations(orders: any[], browsing: any[], limit: number) {
    // Basit öneri algoritması - gerçek projede daha karmaşık ML modeli kullanılabilir
    const categoryPreferences = this.analyzeCategoryPreferences(orders);
    const brandPreferences = this.analyzeBrandPreferences(orders);
    
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('category_id', categoryPreferences.slice(0, 3))
      .order('rating', { ascending: false })
      .limit(limit);

    return products || [];
  }

  static analyzeCategoryPreferences(orders: any[]) {
    const categoryCount: { [key: string]: number } = {};
    
    orders?.forEach(order => {
      order.order_items?.forEach((item: any) => {
        const categoryId = item.products?.category_id;
        if (categoryId) {
          categoryCount[categoryId] = (categoryCount[categoryId] || 0) + 1;
        }
      });
    });

    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .map(([categoryId]) => categoryId);
  }

  static analyzeBrandPreferences(orders: any[]) {
    const brandCount: { [key: string]: number } = {};
    
    orders?.forEach(order => {
      order.order_items?.forEach((item: any) => {
        const brand = item.products?.brand;
        if (brand) {
          brandCount[brand] = (brandCount[brand] || 0) + 1;
        }
      });
    });

    return Object.entries(brandCount)
      .sort(([,a], [,b]) => b - a)
      .map(([brand]) => brand);
  }

  static async trackUserActivity(userId: string, activityType: string, productId?: string) {
    await supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        activity_type: activityType,
        product_id: productId,
        created_at: new Date().toISOString()
      });
  }
}

// Search and filtering with AI
export class AISearchEngine {
  static async searchProducts(query: string, filters: any = {}, userId?: string) {
    let searchQuery = supabase
      .from('products')
      .select(`
        *,
        categories (name)
      `);

    // Temel arama
    if (query) {
      searchQuery = searchQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%`);
    }

    // Filtreler
    if (filters.category) {
      searchQuery = searchQuery.eq('category_id', filters.category);
    }
    if (filters.brand) {
      searchQuery = searchQuery.eq('brand', filters.brand);
    }
    if (filters.price_min) {
      searchQuery = searchQuery.gte('price', filters.price_min);
    }
    if (filters.price_max) {
      searchQuery = searchQuery.lte('price', filters.price_max);
    }
    if (filters.rating) {
      searchQuery = searchQuery.gte('rating', filters.rating);
    }

    // Sıralama
    switch (filters.sort_by) {
      case 'price_asc':
        searchQuery = searchQuery.order('price', { ascending: true });
        break;
      case 'price_desc':
        searchQuery = searchQuery.order('price', { ascending: false });
        break;
      case 'rating':
        searchQuery = searchQuery.order('rating', { ascending: false });
        break;
      default:
        searchQuery = searchQuery.order('created_at', { ascending: false });
    }

    const { data: products } = await searchQuery;

    // Kullanıcı aktivitesini kaydet
    if (userId && query) {
      await AIRecommendationEngine.trackUserActivity(userId, 'search', undefined);
    }

    return products || [];
  }
}