// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig as defineVitestConfig, mergeConfig } from 'vitest/config';

const vitestConfig = defineVitestConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js', // Or .ts if using TypeScript
    css: true, // If you want to process CSS during tests
  },
});

export default mergeConfig(
  defineConfig({
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Planificateur de Repas Familial',
          short_name: 'RepasFamille',
          description: 'Une application pour planifier les repas en famille et gérer les listes de courses.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'Logo1.png', // Assuming this is in the public folder
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'Logo1.png', // Assuming this is in the public folder
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        }
      })
    ],
    // ... other Vite config
  }),
  vitestConfig
);
