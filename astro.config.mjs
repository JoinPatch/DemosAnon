import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Only apply GitHub Pages config when building in CI
const isCI = process.env.CI === 'true';
const repository = process.env.GITHUB_REPOSITORY;

export default defineConfig({
  // Only set site and base when building for GitHub Pages (in CI)
  ...(isCI && repository && {
    site: 'https://julek.github.io',
    base: `/${repository.split('/')[1]}`,
  }),
  integrations: [react()],
  vite: {
    assetsInclude: ['**/*.md']
  }
});
