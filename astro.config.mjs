// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkRecipe from './src/plugins/remark-recipe.mjs';
import rehypeSteps from './src/plugins/rehype-steps.mjs';

// Deployed on Cloudflare Pages at the domain root (https://shell-recipes.pages.dev).
// Serving from a sub-path instead (e.g. GitHub Pages)? Build with SITE_BASE=/shell-recipes.
const base = process.env.SITE_BASE ?? '/';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://shell-recipes.pages.dev',
  base,
  markdown: {
    // We render command blocks ourselves (OS tabs, copy buttons, fill-in variables).
    syntaxHighlight: false,
    processor: unified({ remarkPlugins: [remarkRecipe], rehypePlugins: [rehypeSteps] }),
  },
});
