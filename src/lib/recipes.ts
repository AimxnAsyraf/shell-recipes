import { getCollection, type CollectionEntry } from 'astro:content';

export type Recipe = CollectionEntry<'recipes'>;

const EXTRA = /^(troubleshooting|next steps|clean ?up|going further|undo)/i;

/** Number of numbered steps (## headings that are not Troubleshooting / Next steps / …). */
export function stepCount(recipe: Recipe): number {
  const body = (recipe.body ?? '').replace(/```[\s\S]*?```/g, '');
  return body
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .filter((l) => !EXTRA.test(l.replace(/^##\s+/, '').trim())).length;
}

export async function allRecipes(): Promise<Recipe[]> {
  const list = await getCollection('recipes');
  return list.sort(
    (a, b) => Number(b.data.featured) - Number(a.data.featured) || a.data.title.localeCompare(b.data.title),
  );
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
