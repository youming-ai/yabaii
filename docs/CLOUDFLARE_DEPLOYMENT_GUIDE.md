# Cloudflare 部署指南

本指南详细说明如何将Astro版本的Yabaii价格比较网站部署到Cloudflare Pages，并提供生产环境的最佳实践。

---

## 🚀 快速开始

### 前提条件
- Cloudflare账户（免费版即可）
- Git仓库（GitHub/GitLab/Bitbucket）
- Node.js 18+ 环境
- Wrangler CLI（可选）

### 一键部署流程

1. **登录Cloudflare Dashboard**
   ```
   https://dash.cloudflare.com/
   ```

2. **创建新项目**
   - 点击 "Pages" → "Create application"
   - 连接Git仓库
   - 选择 `yabaii-astro` 项目

3. **构建设置**
   ```bash
   # Build command
   npm run build
   
   # Build output directory  
   dist
   
   # Root directory (optional)
   /
   ```

4. **环境变量**
   ```bash
   NODE_ENV=production
   API_URL=https://api.yabaii.ai
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   ```

---

## ⚙️ 项目配置

### 1. Astro配置

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'hybrid',  // 混合模式：静态页面+SSR
  adapter: cloudflare({
    mode: 'directory',        // 适合Pages部署
    functionPerRoute: false   // 减少冷启动
  }),
  integrations: [
    react({
      jsxImportSource: 'react',
      jsxRuntime: 'automatic'
    }),
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
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    },
    domains: ['yabaii.ai', 'cdn.yabaii.ai']
  }
});
```

### 2. Wrangler配置

```toml
# wrangler.toml
name = "yabaii"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"

[env.production]
name = "yabaii-prod"
vars = { NODE_ENV = "production" }

[env.preview]
name = "yabaii-preview" 
vars = { NODE_ENV = "development" }

# KV存储（用于缓存）
[[kv_namespaces]]
binding = "YABAI_CACHE"
id = "your_kv_namespace_id"
preview_id = "your_preview_kv_namespace_id"

# D1数据库（用于产品数据）
[[d1_databases]]
binding = "DB"
database_name = "yabaii-products"
database_id = "your_database_id"
```

### 3. package.json脚本

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "deploy": "npm run build && wrangler pages deploy dist",
    "deploy:staging": "npm run build && wrangler pages deploy dist --env preview",
    "cf:login": "wrangler auth login",
    "cf:whoami": "wrangler whoami"
  }
}
```

---

## 🌐 环境配置

### 生产环境变量

在Cloudflare Pages设置中添加以下环境变量：

```bash
# API配置
API_URL=https://api.yabaii.ai
API_TIMEOUT=10000

# 第三方服务
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=yabaii-images

# 搜索服务
ALGOLIA_APP_ID=your_algolia_id
ALGOLIA_API_KEY=your_algolia_key

# 分析服务
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
Vercel_ANALYTICS_ID=your_vercel_id

# Cloudflare特定
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
```

### 本地开发环境

```bash
# .env.local
NODE_ENV=development
API_URL=http://localhost:8787
CLOUDFLARE_API_TOKEN=your_dev_token
```

---

## 📁 项目结构优化

```
yabaii-astro/
├── src/
│   ├── components/
│   │   ├── islands/          # React交互组件
│   │   │   ├── SearchBar.jsx
│   │   │   ├── PriceChart.jsx
│   │   │   └── FilterPanel.jsx
│   │   ├── ui/               # 静态组件
│   │   │   ├── Header.astro
│   │   │   ├── Footer.astro
│   │   │   └── ProductCard.astro
│   │   └── layout/           # 布局组件
│   │       ├── BaseLayout.astro
│   │       └── ProductLayout.astro
│   ├── pages/
│   │   ├── index.astro       # 首页
│   │   ├── search.astro      # 搜索页
│   │   ├── compare.astro     # 比较页
│   │   └── api/              # API端点
│   │       ├── search.json   # 搜索API
│   │       └── products.json # 产品API
│   ├── lib/
│   │   ├── db.js             # 数据库连接
│   │   ├── cache.js          # 缓存逻辑
│   │   └── api.js            # API工具
│   └── utils/
│       ├── images.js         # 图片优化
│       └── seo.js            # SEO工具
├── public/                   # 静态资源
│   ├── images/
│   ├── icons/
│   └── favicon.ico
├── functions/                # Cloudflare函数
│   ├── search.js
│   └── products.js
└── astro.config.mjs
```

---

## 🔧 性能优化

### 1. 图片优化

```astro
---
import { Image } from 'astro:assets';
import { getProductImage } from '../lib/images.js';

const productImage = await getProductImage(product.id);
---
<Image 
  src={productImage} 
  alt={product.name}
  widths={[400, 800, 1200]}
  formats={['webp', 'avif']}
  loading="lazy"
  decoding="async"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### 2. 代码分割

```astro
---
// 动态导入React组件
const PriceChart = await import('../components/islands/PriceChart.jsx');
const FilterPanel = await import('../components/islands/FilterPanel.jsx');
---

<!-- 使用时才加载 -->
<PriceChart client:visible data={priceData} />
<FilterPanel client:idle filters={availableFilters} />
```

### 3. 缓存策略

```javascript
// src/lib/cache.js
export async function getCachedData(key, fetcher, ttl = 3600) {
  const cacheKey = `yabaii:${key}`;
  
  try {
    // 尝试从KV获取缓存数据
    const cached = await YABAI_CACHE.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 获取新数据
    const data = await fetcher();
    
    // 存储到缓存
    await YABAI_CACHE.put(cacheKey, JSON.stringify(data), {
      expirationTtl: ttl
    });
    
    return data;
  } catch (error) {
    console.error('Cache error:', error);
    return null;
  }
}
```

---

## 🛠️ API端点

### 搜索API

```javascript
// src/pages/api/search.json.js
import { json } from '@astrojs/core';
import { searchProducts } from '../../lib/api.js';
import { getCachedData } from '../../lib/cache.js';

export async function GET({ url }) {
  const query = url.searchParams.get('q') || '';
  const category = url.searchParams.get('category');
  
  if (!query) {
    return json({ error: 'Query required' }, { status: 400 });
  }
  
  const cacheKey = `search:${query}:${category || 'all'}`;
  const results = await getCachedData(cacheKey, () => 
    searchProducts(query, category),
    1800 // 30分钟缓存
  );
  
  return json(results);
}
```

### 产品详情API

```javascript
// src/pages/api/products/[id].json.js
import { json } from '@astrojs/core';
import { getProduct } from '../../../lib/api.js';
import { getCachedData } from '../../../lib/cache.js';

export async function GET({ params }) {
  const { id } = params;
  
  if (!id) {
    return json({ error: 'Product ID required' }, { status: 400 });
  }
  
  const product = await getCachedData(`product:${id}`, () => 
    getProduct(id),
    7200 // 2小时缓存
  );
  
  if (!product) {
    return json({ error: 'Product not found' }, { status: 404 });
  }
  
  return json(product);
}
```

---

## 🔒 安全配置

### 1. CORS设置

```javascript
// src/middleware.js
export function onRequest({ request, next }) {
  const response = next();
  
  // 设置CORS头
  response.headers.set('Access-Control-Allow-Origin', 'https://yabaii.ai');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 安全头
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}
```

### 2. 环境变量保护

```javascript
// src/lib/config.js
export const config = {
  api: {
    url: import.meta.env.API_URL,
    timeout: parseInt(import.meta.env.API_TIMEOUT) || 10000,
  },
  auth: {
    jwtSecret: import.meta.env.JWT_SECRET,
    sessionMaxAge: 86400, // 24小时
  },
  services: {
    algolia: {
      appId: import.meta.env.ALGOLIA_APP_ID,
      apiKey: import.meta.env.ALGOLIA_API_KEY,
    },
    aws: {
      accessKeyId: import.meta.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.AWS_SECRET_ACCESS_KEY,
      s3Bucket: import.meta.env.AWS_S3_BUCKET,
    }
  }
};
```

---

## 📊 监控和分析

### 1. Analytics配置

```astro
---
// src/components/Analytics.astro
import { GOOGLE_ANALYTICS_ID } from '../lib/config.js';
---

<!-- Google Analytics -->
<script async src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GOOGLE_ANALYTICS_ID}');
</script>

<!-- Cloudflare Web Analytics -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "your-beacon-token"}'></script>
```

### 2. 性能监控

```javascript
// src/lib/analytics.js
export function trackPageView(path) {
  gtag('config', GA_ID, { page_path: path });
}

export function trackSearch(query, resultCount) {
  gtag('event', 'search', {
    search_term: query,
    results_count: resultCount
  });
}

export function trackProductView(productId, productName) {
  gtag('event', 'view_item', {
    item_id: productId,
    item_name: productName
  });
}
```

---

## 🚀 部署流程

### 1. 自动部署设置

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build project
        run: npm run build
        env:
          NODE_ENV: production
          API_URL: ${{ secrets.API_URL }}
          
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: yabaii
          directory: dist
```

### 2. 手动部署

```bash
# 1. 安装Wrangler
npm install -g wrangler

# 2. 登录Cloudflare
wrangler auth login

# 3. 构建项目
npm run build

# 4. 部署到生产环境
wrangler pages deploy dist --project-name yabaii

# 5. 部署到预览环境
wrangler pages deploy dist --project-name yabaii-preview
```

### 3. 域名配置

```bash
# 添加自定义域名
wrangler pages project create yabaii --production-branch main
wrangler pages domain add yabaii.ai www.yabaii.ai

# DNS记录配置
# CNAME www -> yabaii.pages.dev
# A record -> Cloudflare IP addresses
```

---

## 🔧 故障排除

### 常见问题

1. **构建失败**
   ```bash
   # 检查Node.js版本
   node --version  # 应该是18+
   
   # 清除缓存
   rm -rf node_modules dist
   npm install
   npm run build
   ```

2. **环境变量未生效**
   - 检查Cloudflare Pages环境变量设置
   - 确保变量名正确
   - 重新部署以应用更改

3. **图片加载失败**
   - 检查图片域名配置
   - 确认图片路径正确
   - 验证Cloudflare图片优化配置

4. **API调用失败**
   - 检查CORS设置
   - 验证API URL配置
   - 检查网络请求权限

### 调试工具

```bash
# 本地调试
wrangler pages dev dist

# 查看日志
wrangler pages deployment tail --project-name yabaii

# 检查配置
wrangler pages project list
```

---

## 💰 成本优化

### 免费额度利用

```javascript
// 优化KV存储使用
export async function getOptimizedCache(key, fetcher) {
  // 使用更短的TTL减少存储成本
  return getCachedData(key, fetcher, 1800);
}

// 压缩数据减少存储
function compressData(data) {
  return JSON.stringify(data).replace(/["]/g, '').replace(/[:,]/g, '');
}
```

### 成本监控

```javascript
// src/lib/metrics.js
export function trackAPIUsage(endpoint, responseTime) {
  // 记录API使用情况
  console.log(`API: ${endpoint}, Time: ${responseTime}ms`);
}

export function trackCacheHit(key, hit) {
  // 监控缓存命中率
  const metric = hit ? 'cache_hit' : 'cache_miss';
  console.log(`Cache: ${key}, ${metric}`);
}
```

---

## 📋 部署清单

### 部署前检查

- [ ] 所有环境变量已配置
- [ ] 构建成功无错误
- [ ] 本地测试通过
- [ ] 图片优化配置完成
- [ ] SEO设置正确
- [ ] 性能测试通过
- [ ] 安全配置生效

### 部署后验证

- [ ] 网站可正常访问
- [ ] 所有页面加载正常
- [ ] API端点工作正常
- [ ] 图片显示正确
- [ ] SEO标签正确
- [ ] 分析数据收集正常
- [ ] 错误监控工作

---

## 📞 支持和联系

如有部署相关问题，请联系：

- **技术支持**: dev@yabaii.ai
- **Cloudflare文档**: https://developers.cloudflare.com/pages/
- **Astro部署指南**: https://docs.astro.build/en/guides/deploy/cloudflare-pages/

---

*本指南将根据Cloudflare平台的更新持续维护。最后更新时间: 2024-11-30*