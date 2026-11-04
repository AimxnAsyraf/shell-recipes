// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkRecipe from './src/plugins/remark-recipe.mjs';
import rehypeSteps from './src/plugins/rehype-steps.mjs';

// GitHub Pages project site: https://aimxnasyraf.github.io/shell-recipes/
// If you deploy to your own domain (or Vercel/Netlify), set SITE_BASE=/ when building.
const base = process.env.SITE_BASE ?? '/shell-recipes';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://aimxnasyraf.github.io',
  base,
  markdown: {
    // We render command blocks ourselves (OS tabs, copy buttons, fill-in variables).
    syntaxHighlight: false,
    processor: unified({ remarkPlugins: [remarkRecipe], rehypePlugins: [rehypeSteps] }),
  },
});
