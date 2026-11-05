import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import categories from './data/categories.json';

const os = z.enum(['linux', 'macos', 'windows']);

const recipes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/recipes' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    // Fixed list in src/data/categories.json (also used by the submission form and checker).
    category: z.enum(categories as [string, ...string[]]),
    // GitHub username of the contributor, shown as "Contributed by @name".
    author: z.string().regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/).optional(),
    tags: z.array(z.string()).default([]),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    time: z.string(),
    os: z.array(os).min(1),
    // Date the commands were last checked against the sources (YYYY-MM-DD).
    // YAML turns 2026-11-04 into a Date, so accept both and normalise to "YYYY-MM-DD".
    verified: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.date()])
      .transform((d) => (typeof d === 'string' ? d : d.toISOString().slice(0, 10))),
    featured: z.boolean().default(false),
    prerequisites: z.array(z.string()).default([]),
    variables: z
      .array(
        z.object({
          key: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
          label: z.string(),
          default: z.string(),
          hint: z.string().optional(),
        }),
      )
      .default([]),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.url(),
          publisher: z.string(),
          // Date of the source itself (page update or release date), if known.
          date: z.string().optional(),
        }),
      )
      .min(1),
  }),
});

export const collections = { recipes };
