import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Vitest configuration.
 *
 * - jsdom env: needed for component tests (PricingSection renders DOM).
 * - `@/...` alias: mirrors tsconfig path mapping so test files import like
 *   the rest of the codebase.
 * - setup file registers @testing-library/jest-dom matchers.
 *
 * Tests are co-located in `__tests__` folders next to the code they test.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: [
      'src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
      'supabase/functions/**/__tests__/**/*.{test,spec}.{ts,tsx}',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
