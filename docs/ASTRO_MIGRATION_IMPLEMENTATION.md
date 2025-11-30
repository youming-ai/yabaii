# Astro Migration Implementation Guide

## 概要

本指南提供从当前Vite+React技术栈迁移到Astro的具体实施步骤，包括代码示例和最佳实践。

---

## 📋 迁移实施清单

### 阶段1: 项目准备 (第1-2天)

#### 1.1 创建新Astro项目
```bash
# 在项目根目录外创建临时文件夹
cd /tmp
npm create astro@latest yabaii-astro-temp

# 选择配置
# ✔ Which template would you like to use? › Empty
# ✔ Install dependencies? › Yes
# ✔ Do you plan to write TypeScript? › Yes
# ✔ How strict should TypeScript be? › Strict
# ✔ Initialize a new git repository? › Yes
```

#### 1.2 安装必要的依赖
```bash
cd yabaii-astro-temp

# 核心依赖
npm install @astrojs/react @astrojs/tailwind @astrojs/sitemap @astrojs/cloudflare
npm install react react-dom

# 工具依赖
npm install @types/react @types/react-dom
npm install lucide-react clsx

# 开发工具
npm install -D @astrojs/check
```

#### 1.3 配置Astro
```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    mode: 'directory',
    functionPerRoute: false
  }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false
    }),
    sitemap({
      customPages: [
        'https://yabaii.ai/search',
        'https://yabaii.ai/compare',
        'https://yabaii.ai/deals'
      ]
    })
  ],
  vite: {
    optimizeDeps: {
      include: ['react', 'react-dom']
    }
  }
});
```

#### 1.4 迁移项目结构
```bash
# 将临时项目移动到主项目中
mv /tmp/yabaii-astro-temp /Users/youming/GitHub/yabaii-ai/apps/astro

# 更新根目录package.json
cd /Users/youming/GitHub/yabaii-ai
```

### 阶段2: 基础设置 (第3-4天)

#### 2.1 创建Tailwind配置
```javascript
// apps/astro/tailwind.config.mjs
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          900: '#111827',
        }
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

#### 2.2 设置TypeScript配置
```json
// apps/astro/tsconfig.json
{
  "extends": "astro/tsconfigs/strict",
  "include": [
    "src/**/*",
    "src/**/*.d.ts"
  ],
  "exclude": ["node_modules"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@pages/*": ["./src/pages/*"],
      "@utils/*": ["./src/utils/*"],
      "@types/*": ["./src/types/*"]
    }
  }
}
```

#### 2.3 创建全局样式
```css
/* apps/astro/src/styles/global.css */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap');

/* 自定义组件样式 */
@layer components {
  .container {
    @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
  }
  
  .btn {
    @apply inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors;
  }
  
  .btn-primary {
    @apply btn bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500;
  }
  
  .btn-secondary {
    @apply btn bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500;
  }
}

/* 动画和过渡 */
@layer utilities {
  .transition-all {
    @apply transition-all duration-300 ease-in-out;
  }
}
```

### 阶段3: 布局和页面迁移 (第5-7天)

#### 3.1 创建基础布局
```astro
---
// src/layouts/BaseLayout.astro
import Header from '@components/ui/Header.astro';
import Footer from '@components/ui/Footer.astro';
import '@styles/global.css';

export interface Props {
  title: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
}

const { title, description, image, noIndex = false } = Astro.props;
const siteTitle = 'Yabaii - 日本価格比較アプリ';
const siteDescription = 'Amazon、楽天、Yahoo!ショッピングなど主要ECサイトの価格をリアルタイムで比較';
---

<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title ? `${title} | ${siteTitle}` : siteTitle}</title>
  <meta name="description" content={description || siteDescription} />
  
  <!-- SEO Meta Tags -->
  <meta property="og:title" content={title || siteTitle} />
  <meta property="og:description" content={description || siteDescription} />
  <meta property="og:image" content={image || '/og-image.png'} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  
  {noIndex && <meta name="robots" content="noindex, nofollow" />}
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  
  <!-- Preconnect to external domains -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://images.yabaii.ai" />
</head>
<body class="font-sans text-gray-900">
  <div class="min-h-screen flex flex-col">
    <Header />
    <main class="flex-1">
      <slot />
    </main>
    <Footer />
  </div>
</body>
</html>
```

#### 3.2 创建Header组件
```astro
---
// src/components/ui/Header.astro
import { Link } from '@astrojs/router';

const currentPage = Astro.url.pathname;
---

<header class="bg-white shadow-sm border-b border-gray-200">
  <div class="container">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <Link href="/" class="flex items-center space-x-2">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-lg">Y</span>
        </div>
        <span class="font-bold text-xl text-gray-900">Yabaii</span>
      </Link>

      <!-- Navigation -->
      <nav class="hidden md:flex items-center space-x-8">
        <Link 
          href="/" 
          class={`text-sm font-medium ${currentPage === '/' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
        >
          ホーム
        </Link>
        <Link 
          href="/search" 
          class={`text-sm font-medium ${currentPage === '/search' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
        >
          検索
        </Link>
        <Link 
          href="/compare" 
          class={`text-sm font-medium ${currentPage === '/compare' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
        >
          比較
        </Link>
        <Link 
          href="/deals" 
          class={`text-sm font-medium ${currentPage === '/deals' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
        >
          お得な情報
        </Link>
      </nav>

      <!-- User Menu -->
      <div class="flex items-center space-x-4">
        <Link href="/profile" class="text-gray-700 hover:text-blue-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </Link>
      </div>
    </div>
  </div>
</header>
```

#### 3.3 首页迁移
```astro
---
// src/pages/index.astro
import BaseLayout from '@layouts/BaseLayout.astro';
import SearchBar from '@components/islands/SearchBar.jsx';
import ProductCard from '@components/ui/ProductCard.astro';
import CategoryGrid from '@components/ui/CategoryGrid.astro';
import FeaturedDeals from '@components/ui/FeaturedDeals.astro';

// 获取静态数据
const categories = [
  { name: '家電', icon: '📱', count: '15,234' },
  { name: 'ファッション', icon: '👕', count: '23,456' },
  { name: '食品・飲料', icon: '🍱', count: '8,901' },
  { name: '美容・コスメ', icon: '💄', count: '12,345' },
  { name: '本・雑誌', icon: '📚', count: '5,678' },
  { name: 'スポーツ・アウトドア', icon: '⚽', count: '9,012' },
];

const featuredDeals = [
  {
    id: '1',
    title: 'iPhone 15 Pro',
    originalPrice: '148,800',
    currentPrice: '129,800',
    discount: '13%',
    platform: 'Amazon',
    rating: 4.8,
    image: '/images/products/iphone-15-pro.jpg'
  },
  // ... 更多产品
];
---

<BaseLayout 
  title="日本の価格比較アプリ" 
  description="Amazon、楽天、Yahoo!ショッピングなど主要ECサイトの価格をリアルタイムで比較"
>
  <!-- Hero Section -->
  <section class="py-12 px-4 text-center bg-gradient-to-b from-blue-50 to-white">
    <div class="container">
      <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
        日本の<span class="text-blue-600">価格比較</span>アプリ
      </h1>
      <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
        Amazon、楽天、Yahoo!ショッピングなど主要ECサイトの価格をリアルタイムで比較。
        お得な商品を見つけて、スマートに買い物をしましょう。
      </p>
      
      <!-- Search Bar Island -->
      <SearchBar client:load />
    </div>
  </section>

  <!-- Features -->
  <section class="py-12">
    <div class="container">
      <h2 class="text-3xl font-bold text-center text-gray-900 mb-8">
        なぜYabaiiが選ばれる？
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="text-center">
          <div class="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">リアルタイム価格比較</h3>
          <p class="text-gray-600">
            5大主要ECサイトの価格を常に監視し、最新の価格情報を提供します。
          </p>
        </div>
        <div class="text-center">
          <div class="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">お得な情報</h3>
          <p class="text-gray-600">
            セールや割引クーポンを見逃さず、最高の買い物タイミングをお知らせします。
          </p>
        </div>
        <div class="text-center">
          <div class="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">AIレビュー要約</h3>
          <p class="text-gray-600">
            多数のレビューをAIが分析し、重要なポイントを分かりやすくまとめます。
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Categories -->
  <section class="py-12 bg-gray-50">
    <div class="container">
      <h2 class="text-3xl font-bold text-center text-gray-900 mb-8">
        人気カテゴリー
      </h2>
      <CategoryGrid categories={categories} />
    </div>
  </section>

  <!-- Featured Deals -->
  <section class="py-12">
    <div class="container">
      <div class="flex justify-between items-center mb-8">
        <h2 class="text-3xl font-bold text-gray-900">
          今週のお得な情報
        </h2>
        <a 
          href="/deals" 
          class="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
        >
          <span>もっと見る</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
      <FeaturedDeals deals={featuredDeals} />
    </div>
  </section>
</BaseLayout>
```

### 阶段4: React岛屿组件 (第8-10天)

#### 4.1 搜索栏组件
```jsx
// src/components/islands/SearchBar.jsx
import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 获取搜索建议
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search-suggestions?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    window.location.href = `/search?q=${encodeURIComponent(suggestion)}`;
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="商品名やJANコードで検索..."
            className="w-full px-12 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
          
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-16 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            検索
          </button>
        </div>
      </form>

      {/* 搜索建议 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="flex items-center space-x-3">
                <Search className="w-4 h-4 text-gray-400" />
                <span>{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 4.2 产品卡片组件
```jsx
// src/components/islands/PriceChart.jsx
import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function PriceChart({ productId, height = 300 }) {
  const canvasRef = useRef(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchPriceHistory();
  }, [productId, timeRange]);

  const fetchPriceHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${productId}/price-history?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setPriceHistory(data.prices || []);
      }
    } catch (error) {
      console.error('Failed to fetch price history:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentPrice = priceHistory[priceHistory.length - 1]?.price || 0;
  const previousPrice = priceHistory[0]?.price || 0;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice ? (priceChange / previousPrice) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 价格变化指示器 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            ¥{currentPrice.toLocaleString()}
          </div>
          <div className="flex items-center space-x-1 text-sm">
            {priceChange > 0 ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : priceChange < 0 ? (
              <TrendingDown className="w-4 h-4 text-green-500" />
            ) : (
              <Minus className="w-4 h-4 text-gray-400" />
            )}
            <span className={
              priceChange > 0 ? 'text-red-500' : 
              priceChange < 0 ? 'text-green-500' : 'text-gray-400'
            }>
              {priceChange > 0 ? '+' : ''}{priceChangePercent.toFixed(1)}%
            </span>
            <span className="text-gray-500">
              ({timeRange === '7d' ? '過去7日間' : timeRange === '30d' ? '過去30日間' : '過去90日間'})
            </span>
          </div>
        </div>

        {/* 时间范围选择器 */}
        <div className="flex space-x-2">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? '7日' : range === '30d' ? '30日' : '90日'}
            </button>
          ))}
        </div>
      </div>

      {/* 价格图表 */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          height={height}
          className="w-full"
          style={{ height: `${height}px` }}
        />
      </div>

      {/* 最低价提示 */}
      {priceHistory.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800">
              最低価格: ¥{Math.min(...priceHistory.map(p => p.price)).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 阶段5: API和数据层 (第11-14天)

#### 5.1 搜索API端点
```javascript
// src/pages/api/search.json.js
import { json } from '@astrojs/core';

export async function GET({ url }) {
  const query = url.searchParams.get('q') || '';
  const category = url.searchParams.get('category');
  const page = parseInt(url.searchParams.get('page')) || 1;
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 50);

  if (!query || query.length < 2) {
    return json({ error: 'Invalid query' }, { status: 400 });
  }

  try {
    // 这里可以连接到实际的搜索服务
    // 例如 Algolia, Elasticsearch, 或自定义搜索引擎
    
    // 模拟搜索结果
    const results = await mockSearch(query, category, page, limit);
    
    return json({
      query,
      category,
      page,
      limit,
      total: results.total,
      results: results.items,
      hasMore: page * limit < results.total
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return json({ error: 'Search failed' }, { status: 500 });
  }
}

async function mockSearch(query, category, page, limit) {
  // 模拟搜索逻辑
  const mockResults = [
    {
      id: '1',
      name: `${query}関連商品 1`,
      price: 12980,
      originalPrice: 15800,
      discount: 18,
      platform: 'Amazon',
      rating: 4.5,
      image: '/images/mock-product-1.jpg',
      category: '家電',
    },
    // ... 更多模拟结果
  ];

  const filtered = category 
    ? mockResults.filter(item => item.category === category)
    : mockResults;

  return {
    total: filtered.length,
    items: filtered.slice((page - 1) * limit, page * limit)
  };
}
```

#### 5.2 产品详情API
```javascript
// src/pages/api/products/[id].json.js
import { json } from '@astrojs/core';

export async function GET({ params }) {
  const { id } = params;

  if (!id) {
    return json({ error: 'Product ID required' }, { status: 400 });
  }

  try {
    const product = await getProduct(id);
    
    if (!product) {
      return json({ error: 'Product not found' }, { status: 404 });
    }

    return json(product);
    
  } catch (error) {
    console.error('Product fetch error:', error);
    return json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function POST({ params, request }) {
  const { id } = params;
  const body = await request.json();

  try {
    // 更新产品信息（价格、库存等）
    const updatedProduct = await updateProduct(id, body);
    return json(updatedProduct);
    
  } catch (error) {
    console.error('Product update error:', error);
    return json({ error: 'Failed to update product' }, { status: 500 });
  }
}

async function getProduct(id) {
  // 实际项目中，这里会从数据库或外部API获取产品信息
  return {
    id,
    name: 'iPhone 15 Pro',
    description: '最新のiPhoneモデル',
    price: 129800,
    originalPrice: 148800,
    discount: 13,
    platform: 'Amazon',
    rating: 4.8,
    reviewCount: 1234,
    images: [
      '/images/iphone-15-pro-1.jpg',
      '/images/iphone-15-pro-2.jpg',
      '/images/iphone-15-pro-3.jpg'
    ],
    specifications: {
      '画面サイズ': '6.1インチ',
      'ストレージ': '128GB',
      'カラー': 'ブラック',
      'カメラ': '48MP + 12MP + 12MP'
    },
    priceHistory: [
      { date: '2024-01-01', price: 148800 },
      { date: '2024-01-15', price: 145000 },
      { date: '2024-02-01', price: 138000 },
      { date: '2024-02-15', price: 129800 }
    ],
    retailers: [
      {
        platform: 'Amazon',
        price: 129800,
        url: 'https://amazon.co.jp/dp/B0CHX2Z1Q2',
        availability: '在庫あり',
        shipping: '無料配送'
      },
      {
        platform: '楽天',
        price: 132800,
        url: 'https://item.rakuten.co.jp/example/iphone15pro/',
        availability: '在庫あり',
        shipping: '送料別途'
      }
    ]
  };
}
```

### 阶段6: 性能优化 (第15-17天)

#### 6.1 图片优化
```astro
---
// src/components/ui/OptimizedImage.astro
import { Image } from 'astro:assets';

export interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  widths?: number[];
  formats?: string[];
  loading?: 'lazy' | 'eager';
  sizes?: string;
  class?: string;
}

const { 
  src, 
  alt, 
  width, 
  height, 
  widths = [400, 800, 1200], 
  formats = ['webp', 'avif'],
  loading = 'lazy',
  sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
  class: className = ''
} = Astro.props;
---

<figure class={`relative ${className}`}>
  <Image 
    src={src}
    alt={alt}
    width={width}
    height={height}
    widths={widths}
    formats={formats}
    loading={loading}
    sizes={sizes}
    class="w-full h-auto object-cover rounded-lg"
  />
</figure>
```

#### 6.2 预加载关键资源
```astro
---
// src/pages/index.astro 中的预加载
---

<!-- 在 <head> 中预加载关键资源 -->
<link rel="preload" href="/images/hero-bg.webp" as="image" type="image/webp" />
<link rel="preload" href="/api/featured-products" as="fetch" crossorigin />

<!-- 预连接到外部域名 -->
<link rel="preconnect" href="https://api.yabaii.ai" />
<link rel="preconnect" href="https://images.yabaii.ai" />
```

#### 6.3 代码分割
```jsx
// src/components/islands/LazyComponent.jsx
import { lazy, Suspense } from 'react';

// 懒加载组件
const HeavyComponent = lazy(() => import('./HeavyComponent.jsx'));

export default function LazyWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 阶段7: 测试和部署 (第18-21天)

#### 7.1 创建测试脚本
```javascript
// scripts/test-deployment.js
import { execSync } from 'child_process';

async function testDeployment() {
  console.log('🧪 开始测试部署...');
  
  // 1. 构建测试
  console.log('📦 构建项目...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ 构建成功');
  } catch (error) {
    console.error('❌ 构建失败');
    process.exit(1);
  }
  
  // 2. 预览测试
  console.log('🔍 启动预览服务器...');
  execSync('npm run preview', { stdio: 'inherit' });
  
  // 3. 性能测试
  console.log('⚡ 性能测试...');
  // 可以集成 Lighthouse CLI 进行性能测试
  
  console.log('✅ 测试完成');
}

testDeployment().catch(console.error);
```

#### 7.2 部署脚本
```json
{
  "scripts": {
    "build": "astro build",
    "preview": "astro preview",
    "deploy:staging": "npm run build && wrangler pages deploy dist --project-name yabaii-staging",
    "deploy:production": "npm run build && wrangler pages deploy dist --project-name yabaii",
    "test:deployment": "node scripts/test-deployment.js"
  }
}
```

---

## 🎯 迁移检查清单

### 代码迁移
- [ ] 所有页面组件已迁移到Astro
- [ ] React组件正确转换为岛屿
- [ ] 样式系统已配置
- [ ] 图片优化已实现
- [ ] API端点已迁移

### 功能验证
- [ ] 搜索功能正常工作
- [ ] 产品详情页显示正确
- [ ] 价格图表渲染正常
- [ ] 响应式设计适配
- [ ] 可访问性标准满足

### 性能优化
- [ ] Core Web Vitals达到目标
- [ ] 图片优化配置正确
- [ ] 代码分割实现
- [ ] 缓存策略配置
- [ ] SEO设置完成

### 部署准备
- [ ] Cloudflare配置正确
- [ ] 环境变量设置完成
- [ ] 域名配置正确
- [ ] 监控和分析配置
- [ ] 错误处理机制

---

## 📞 技术支持

如果在迁移过程中遇到问题，请参考：

- [Astro官方文档](https://docs.astro.build/)
- [Cloudflare Pages指南](https://developers.cloudflare.com/pages/)
- [React岛屿架构文档](https://docs.astro.build/en/concepts/islands-architecture/)
- 项目技术支持: dev@yabaii.ai

---

*本实施指南将根据实际迁移进展持续更新。最后更新时间: 2024-11-30*