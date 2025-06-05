// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
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
    plugins: [react()],
    // ... other Vite config
  }),
  vitestConfig
);
