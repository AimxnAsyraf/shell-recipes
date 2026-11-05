// Lints recipe Markdown files for common authoring mistakes.
// Usage: npm run check:recipes
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { hasUnsafeLink } from './issue-to-recipe.mjs';

const root = new URL('../', import.meta.url).pathname;
const dir = join(root, 'src/recipes/');
const CATEGORIES = JSON.parse(readFileSync(join(root, 'src/data/categories.json'), 'utf8'));
const ALLOWED_PREREQ_TAGS = ['strong', 'em', 'code', 'kbd'];
const OSES = ['linux', 'macos', 'windows'];
let problems = 0;
const fail = (file, msg) => {
  problems++;
  console.error(`✗ ${file}: ${msg}`);
};

for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
  const text = readFileSync(join(dir, file), 'utf8');
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!fm) {
    fail(file, 'missing frontmatter');
    continue;
  }
  const body = text.slice(fm[0].length);

  // Declared variables vs. used variables
  const declared = new Set([...fm[1].matchAll(/^\s*-\s*key:\s*([A-Z][A-Z0-9_]*)/gm)].map((m) => m[1]));
  const used = new Set([...body.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)].map((m) => m[1]));
  for (const v of used) if (!declared.has(v)) fail(file, `{{${v}}} is used but not declared in variables`);
  for (const v of declared) if (!used.has(v)) fail(file, `variable ${v} is declared but never used`);

  // Sources and verified date
  if (!/^sources:\s*\n\s*-\s*title:/m.test(fm[1])) fail(file, 'needs at least one source');
  if (!/^verified:\s*\d{4}-\d{2}-\d{2}\s*$/m.test(fm[1])) fail(file, 'verified must be YYYY-MM-DD');

  // Code fences must be closed, and OS tokens must be valid
  const fences = [...body.matchAll(/^```(.*)$/gm)];
  if (fences.length % 2 !== 0) fail(file, 'unclosed ``` code fence');
  fences
    .filter((_, i) => i % 2 === 0)
    .forEach((m) => {
      const meta = m[1].replace(/title="[^"]*"/, '').trim().split(/[\s,]+/).slice(1);
      for (const t of meta) if (t && !OSES.includes(t)) fail(file, `unknown OS "${t}" in \`\`\`${m[1]}`);
    });

  if (!/^##\s+/m.test(body)) fail(file, 'no ## steps found');

  // Fixed category list and contributor credit
  const category = /^category:\s*"?(.+?)"?\s*$/m.exec(fm[1])?.[1];
  if (!CATEGORIES.includes(category)) fail(file, `category "${category}" is not in src/data/categories.json`);
  const author = /^author:\s*"?(.+?)"?\s*$/m.exec(fm[1])?.[1];
  if (author && !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(author)) fail(file, `author "${author}" is not a GitHub username`);

  // Safety: no raw HTML in the body (outside code), no javascript:/data: links,
  // and only simple formatting tags in prerequisites (they are rendered as HTML).
  let inFence = false;
  body.split('\n').forEach((line, i) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    const prose = line.replace(/`[^`]*`/g, '');
    if (/<[A-Za-z!/?]/.test(prose)) fail(file, `raw HTML on body line ${i + 1}: ${line.trim().slice(0, 60)}`);
  });
  if (hasUnsafeLink(body)) fail(file, 'javascript:/data:/vbscript: links are not allowed');
  const prereqBlock = /^prerequisites:\s*\n((?:\s+-.*\n?)+)/m.exec(fm[1])?.[1] ?? '';
  const plainTag = new RegExp(`^</?(${ALLOWED_PREREQ_TAGS.join('|')})>$`, 'i');
  for (const m of prereqBlock.matchAll(/<[^>]*>?/g)) {
    if (!plainTag.test(m[0])) fail(file, `prerequisites may only use plain <${ALLOWED_PREREQ_TAGS.join('>, <')}> tags (found ${m[0]})`);
  }
  if (problems === 0) console.log(`✓ ${file}`);
}

// The submission form's category dropdown must match the site's category list.
const form = readFileSync(join(root, '.github/ISSUE_TEMPLATE/new-recipe.yml'), 'utf8');
const formCats = /id: category[\s\S]*?options:\n((?:\s+- .+\n)+)/.exec(form)?.[1].split('\n').map((l) => l.replace(/^\s+- /, '').trim()).filter(Boolean) ?? [];
if (JSON.stringify(formCats) !== JSON.stringify(CATEGORIES)) {
  fail('new-recipe.yml', `category options ${JSON.stringify(formCats)} don't match src/data/categories.json`);
}

if (problems) {
  console.error(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log('\nAll recipes look good.');
