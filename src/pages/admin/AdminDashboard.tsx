import React, { useEffect, useState } from 'react';
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp,
  Package,
  AlertCircle,
  Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminStats, Order, Product } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Terminal log simulation
    const interval = setInterval(() => {
      addTerminalLog();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load basic stats
      const [usersResult, ordersResult, productsResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('orders').select('id, total_amount', { count: 'exact' }),
        supabase.from('products').select('*').order('rating', { ascending: false }).limit(5)
      ]);

      // Load recent orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          users (name, email),
          order_items (
            *,
            products (name, image_url)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Load low stock products
      const { data: lowStockData } = await supabase
        .from('products')
        .select('*')
        .lt('stock', 10)
        .order('stock', { ascending: true })
        .limit(10);

      // Calculate total revenue
      const totalRevenue = ordersResult.data?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      setStats({
        total_users: usersResult.count || 0,
        total_orders: ordersResult.count || 0,
        total_revenue: totalRevenue,
        popular_products: productsResult.data || [],
        recent_orders: ordersData || []
      });

      setRecentOrders(ordersData || []);
      setLowStockProducts(lowStockData || []);

      // Generate sample sales data
      const sampleSalesData = generateSalesData();
      setSalesData(sampleSalesData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSalesData = () => {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz'];
    return months.map(month => ({
      month,
      sales: Math.floor(Math.random() * 100000) + 50000,
      orders: Math.floor(Math.random() * 500) + 200
    }));
  };

  const addTerminalLog = () => {
    const logs = [
      'Yeni sipariş alındı: #12345 - 299.99 TL',
      'Ürün stoku güncellendi: Nike Air Max - 15 adet',
      'Kullanıcı kaydı: yeni@email.com',
      'Ödeme işlemi tamamlandı: #12346',
      'Kargo takip numarası oluşturuldu: TK123456789',
      'İade talebi alındı: #12340',
      'Kategori güncellendi: Spor Ayakkabıları',
      'AI öneri motoru çalıştırıldı',
      'Stok uyarısı: Adidas Ultraboost - 3 adet kaldı',
      'Kampanya başlatıldı: %20 indirim'
    ];
    
    const randomLog = logs[Math.floor(Math.random() * logs.length)];
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    const logEntry = `[${timestamp}] ${randomLog}`;
    
    setTerminalLogs(prev => [logEntry, ...prev.slice(0, 19)]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Activity className="h-4 w-4" />
          <span>Anlık Veri</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_users.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShoppingBag className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Toplam Sipariş</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_orders.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
              <p className="text-2xl font-bold text-gray-900">₺{stats?.total_revenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Düşük Stok</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockProducts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Satış Trendi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`₺${value.toLocaleString()}`, 'Satış']} />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sipariş Sayısı</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Terminal and Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Terminal */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            AI Sistem Terminali
          </h3>
          <div className="terminal rounded-lg p-4 h-80 overflow-y-auto">
            <div className="text-green-400 text-sm font-mono space-y-1">
              {terminalLogs.map((log, index) => (
                <div key={index} className="opacity-90 hover:opacity-100 transition-opacity">
                  {log}
                </div>
              ))}
              {terminalLogs.length === 0 && (
                <div className="text-gray-400">Sistem logları yükleniyor...</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Siparişler</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">#{order.id.slice(0, 8)}</p>
                  <p className="text-sm text-gray-600">
                    {order.users?.name || 'Kullanıcı'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">₺{order.total_amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status === 'delivered' ? 'Teslim Edildi' :
                     order.status === 'shipped' ? 'Kargoda' :
                     order.status === 'processing' ? 'İşleniyor' :
                     'Bekliyor'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
            Düşük Stok Uyarısı
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                  <p className="text-red-600 text-sm font-medium">
                    {product.stock} adet kaldı
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}