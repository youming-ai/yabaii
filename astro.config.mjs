// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';


// https://astro.build/config
export default defineConfig({
  site: 'https://yabaii.ai',
  output: 'static',
  // Cloudflare Pages doesn't require adapter for static sites
  // Uncomment and configure when using Cloudflare Functions:
  // adapter: cloudflare({
  //   mode: 'directory',
  //   functionPerRoute: false
  // }),
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
        'https://yabaii.ai/deals',
        'https://yabaii.ai/alerts',
        'https://yabaii.ai/profile'
      ]
    })
  ],
  vite: {
    optimizeDeps: {
      include: ['react', 'react-dom', '@tanstack/react-query', 'zustand']
    }
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    },
    domains: ['yabaii.ai', 'cdn.yabaii.ai', 'images.unsplash.com']
  }
});
